import stripe
from typing import Dict, Any, Optional
from app.core.config import settings

# Configure Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

class StripeService:
    """Service for handling Stripe payment operations"""
    
    @staticmethod
    def create_payment_intent(
        amount: int,  # Amount in cents
        currency: str = "usd",
        metadata: Optional[Dict[str, str]] = None
    ) -> stripe.PaymentIntent:
        """
        Create a Stripe PaymentIntent for processing payments
        
        Args:
            amount: Amount in cents (e.g., 2000 for $20.00)
            currency: Currency code (default: "usd")
            metadata: Optional metadata to attach to the payment
            
        Returns:
            Stripe PaymentIntent object
        """
        try:
            payment_intent = stripe.PaymentIntent.create(
                amount=amount,
                currency=currency,
                metadata=metadata or {},
                automatic_payment_methods={
                    'enabled': True,
                }
            )
            return payment_intent
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")
    
    @staticmethod
    def confirm_payment_intent(payment_intent_id: str) -> stripe.PaymentIntent:
        """
        Confirm a PaymentIntent
        
        Args:
            payment_intent_id: The ID of the PaymentIntent to confirm
            
        Returns:
            Confirmed PaymentIntent object
        """
        try:
            payment_intent = stripe.PaymentIntent.confirm(payment_intent_id)
            return payment_intent
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")
    
    @staticmethod
    def get_payment_intent(payment_intent_id: str) -> stripe.PaymentIntent:
        """
        Retrieve a PaymentIntent by ID
        
        Args:
            payment_intent_id: The ID of the PaymentIntent to retrieve
            
        Returns:
            PaymentIntent object
        """
        try:
            payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            return payment_intent
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")
    
    @staticmethod
    def create_refund(
        payment_intent_id: str,
        amount: Optional[int] = None,
        reason: Optional[str] = None
    ) -> stripe.Refund:
        """
        Create a refund for a payment
        
        Args:
            payment_intent_id: The ID of the PaymentIntent to refund
            amount: Amount to refund in cents (None for full refund)
            reason: Reason for the refund
            
        Returns:
            Refund object
        """
        try:
            refund_data = {"payment_intent": payment_intent_id}
            if amount is not None:
                refund_data["amount"] = amount
            if reason:
                refund_data["reason"] = reason
                
            refund = stripe.Refund.create(**refund_data)
            return refund
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")
    
    @staticmethod
    def create_customer(
        email: str,
        name: Optional[str] = None,
        metadata: Optional[Dict[str, str]] = None
    ) -> stripe.Customer:
        """
        Create a Stripe customer
        
        Args:
            email: Customer's email address
            name: Customer's name
            metadata: Optional metadata
            
        Returns:
            Customer object
        """
        try:
            customer_data = {"email": email}
            if name:
                customer_data["name"] = name
            if metadata:
                customer_data["metadata"] = metadata
                
            customer = stripe.Customer.create(**customer_data)
            return customer
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")
    
    @staticmethod
    def get_customer(customer_id: str) -> stripe.Customer:
        """
        Retrieve a Stripe customer by ID
        
        Args:
            customer_id: The ID of the customer to retrieve
            
        Returns:
            Customer object
        """
        try:
            customer = stripe.Customer.retrieve(customer_id)
            return customer
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")

    @staticmethod
    def construct_webhook_event(payload: bytes, sig_header: str) -> stripe.Event:
        """
        Construct and verify a webhook event from Stripe
        
        Args:
            payload: The raw request body from Stripe
            sig_header: The Stripe-Signature header
            
        Returns:
            Verified Event object
        """
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
            return event
        except ValueError as e:
            raise Exception(f"Invalid payload: {str(e)}")
        except stripe.error.SignatureVerificationError as e:
            raise Exception(f"Invalid signature: {str(e)}")
