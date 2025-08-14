from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.models.database import User, Booking, Payment, Service
from app.schemas.payment import (
    PaymentIntentCreate, 
    PaymentIntentResponse, 
    PaymentConfirm,
    PaymentResponse,
    RefundCreate,
    RefundResponse
)
from app.services.stripe_service import StripeService
from typing import List
import json
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/create-payment-intent", response_model=PaymentIntentResponse)
async def create_payment_intent(
    payment_data: PaymentIntentCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a Stripe PaymentIntent for a booking"""
    
    # Verify booking exists and belongs to the user
    booking = db.query(Booking).filter(
        Booking.id == payment_data.booking_id,
        Booking.customer_id == current_user.id
    ).first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found or access denied"
        )
    
    # Check if payment already exists for this booking
    existing_payment = db.query(Payment).filter(Payment.booking_id == booking.id).first()
    if existing_payment and existing_payment.status in ["succeeded", "pending"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment already exists for this booking"
        )
    
    # Ensure user has a Stripe customer ID
    if not current_user.stripe_customer_id:
        try:
            stripe_customer = StripeService.create_customer(
                email=current_user.email,
                name=current_user.full_name,
                metadata={"user_id": current_user.id}
            )
            current_user.stripe_customer_id = stripe_customer.id
            db.commit()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create Stripe customer: {str(e)}"
            )
    
    # Create PaymentIntent
    try:
        amount_cents = int(payment_data.amount * 100)  # Convert to cents
        
        payment_intent = StripeService.create_payment_intent(
            amount=amount_cents,
            currency=payment_data.currency,
            metadata={
                "booking_id": booking.id,
                "user_id": current_user.id,
                "service_name": booking.service.name if booking.service else "Service"
            }
        )
        
        # Create or update payment record
        if existing_payment:
            existing_payment.stripe_payment_intent_id = payment_intent.id
            existing_payment.amount = payment_data.amount
            existing_payment.currency = payment_data.currency
            existing_payment.status = "pending"
            db.commit()
        else:
            payment = Payment(
                booking_id=booking.id,
                stripe_payment_intent_id=payment_intent.id,
                stripe_customer_id=current_user.stripe_customer_id,
                amount=payment_data.amount,
                currency=payment_data.currency,
                status="pending"
            )
            db.add(payment)
            db.commit()
        
        return PaymentIntentResponse(
            client_secret=payment_intent.client_secret,
            payment_intent_id=payment_intent.id,
            amount=payment_data.amount,
            currency=payment_data.currency
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create payment intent: {str(e)}"
        )

@router.post("/confirm-payment", response_model=PaymentResponse)
async def confirm_payment(
    payment_data: PaymentConfirm,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Confirm a payment and update booking status"""
    
    # Find the payment record
    payment = db.query(Payment).filter(
        Payment.stripe_payment_intent_id == payment_data.payment_intent_id,
        Payment.booking_id == payment_data.booking_id
    ).first()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    # Verify the booking belongs to the current user
    booking = db.query(Booking).filter(
        Booking.id == payment.booking_id,
        Booking.customer_id == current_user.id
    ).first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found or access denied"
        )
    
    try:
        # Get the latest payment intent status from Stripe
        stripe_payment = StripeService.get_payment_intent(payment_data.payment_intent_id)
        
        # Update payment status
        payment.status = stripe_payment.status
        if stripe_payment.payment_method:
            payment.payment_method = stripe_payment.payment_method
        
        # If payment succeeded, update booking status
        if stripe_payment.status == "succeeded":
            booking.status = "confirmed"
        elif stripe_payment.status in ["canceled", "failed"]:
            booking.status = "payment_failed"
        
        db.commit()
        
        return PaymentResponse.from_orm(payment)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to confirm payment: {str(e)}"
        )

@router.get("/booking/{booking_id}/payment", response_model=PaymentResponse)
async def get_booking_payment(
    booking_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get payment information for a booking"""
    
    # Verify booking belongs to user
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.customer_id == current_user.id
    ).first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found or access denied"
        )
    
    payment = db.query(Payment).filter(Payment.booking_id == booking_id).first()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found for this booking"
        )
    
    return PaymentResponse.from_orm(payment)

@router.post("/refund", response_model=RefundResponse)
async def create_refund(
    refund_data: RefundCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a refund for a payment"""
    
    # Find the payment
    payment = db.query(Payment).filter(
        Payment.stripe_payment_intent_id == refund_data.payment_intent_id
    ).first()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    # Verify user has access (either customer or service provider)
    booking = db.query(Booking).filter(Booking.id == payment.booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Check if user is either the customer or the service provider
    is_customer = booking.customer_id == current_user.id
    is_provider = False
    if booking.service and booking.service.provider:
        is_provider = booking.service.provider.user_id == current_user.id
    
    if not (is_customer or is_provider):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    try:
        # Create refund in Stripe
        refund_amount_cents = None
        if refund_data.amount:
            refund_amount_cents = int(refund_data.amount * 100)
        
        stripe_refund = StripeService.create_refund(
            payment_intent_id=refund_data.payment_intent_id,
            amount=refund_amount_cents,
            reason=refund_data.reason
        )
        
        # Update payment record
        refund_amount_dollars = stripe_refund.amount / 100
        payment.refund_amount += refund_amount_dollars
        if payment.refund_amount >= payment.amount:
            payment.status = "refunded"
        
        # Update booking status
        booking.status = "refunded"
        
        db.commit()
        
        return RefundResponse(
            id=stripe_refund.id,
            payment_intent_id=refund_data.payment_intent_id,
            amount=refund_amount_dollars,
            status=stripe_refund.status,
            reason=refund_data.reason
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create refund: {str(e)}"
        )

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe webhook events"""
    
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    
    if not sig_header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing stripe-signature header"
        )
    
    try:
        event = StripeService.construct_webhook_event(payload, sig_header)
    except Exception as e:
        logger.error(f"Webhook signature verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    # Handle the event
    if event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        await handle_payment_succeeded(payment_intent, db)
    elif event['type'] == 'payment_intent.payment_failed':
        payment_intent = event['data']['object']
        await handle_payment_failed(payment_intent, db)
    else:
        logger.info(f"Unhandled event type: {event['type']}")
    
    return {"status": "success"}

async def handle_payment_succeeded(payment_intent, db: Session):
    """Handle successful payment"""
    payment = db.query(Payment).filter(
        Payment.stripe_payment_intent_id == payment_intent['id']
    ).first()
    
    if payment:
        payment.status = "succeeded"
        booking = db.query(Booking).filter(Booking.id == payment.booking_id).first()
        if booking:
            booking.status = "confirmed"
        db.commit()

async def handle_payment_failed(payment_intent, db: Session):
    """Handle failed payment"""
    payment = db.query(Payment).filter(
        Payment.stripe_payment_intent_id == payment_intent['id']
    ).first()
    
    if payment:
        payment.status = "failed"
        booking = db.query(Booking).filter(Booking.id == payment.booking_id).first()
        if booking:
            booking.status = "payment_failed"
        db.commit()
