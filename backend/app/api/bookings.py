from typing import List, Optional
from datetime import datetime, date, time, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.models.database import User, ServiceProvider, Service, TimeSlot, Booking
from app.schemas.booking import (
    BookingCreate, 
    BookingResponse, 
    TimeSlotResponse, 
    BookingWithDetailsResponse,
    BookingCancel
)
from app.schemas.service import ServiceResponse
from app.services.time_slots import (
    get_provider_time_slots as _svc_get_provider_slots,
    get_service_time_slots as _svc_get_service_slots,
    get_provider_schedule_slots as _svc_get_provider_schedule_slots,
    cleanup_orphaned_slots,
)
from app.services.calendar_service import calendar_service
import json

router = APIRouter()

@router.get("/providers/{provider_id}/time-slots", response_model=List[TimeSlotResponse])
async def get_provider_time_slots(
    provider_id: str,
    start_date: date = Query(..., description="Start date for time slots"),
    end_date: Optional[date] = Query(None, description="End date for time slots (defaults to start_date)"),
    db: Session = Depends(get_db)
):
    """Get available time slots for a service provider"""
    if end_date is None:
        end_date = start_date
    
    # Verify provider exists
    provider = db.query(ServiceProvider).filter(ServiceProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service provider not found"
        )
    
    return _svc_get_provider_slots(provider_id, start_date, end_date, db)

@router.post("/book", response_model=BookingResponse)
async def create_booking(
    booking: BookingCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new booking"""
    if current_user.user_type != "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only customers can create bookings"
        )
    
    # Verify service exists
    service = db.query(Service).filter(Service.id == booking.service_id).first()
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    # Verify time slot exists and is available
    time_slot = db.query(TimeSlot).filter(TimeSlot.id == booking.time_slot_id).first()
    if not time_slot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Time slot not found"
        )
    
    if time_slot.is_booked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Time slot is already booked"
        )
    
    # Verify time slot belongs to service provider
    if time_slot.provider_id != service.provider_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Time slot does not belong to service provider"
        )
    
    # Create booking
    db_booking = Booking(
        customer_id=current_user.id,
        service_id=booking.service_id,
        time_slot_id=booking.time_slot_id,
        notes=booking.notes,
        total_price=service.price,
        status="confirmed",
        cancellation_reason=None
    )
    
    # Mark time slot as booked
    time_slot.is_booked = True
    
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    
    # Create calendar events if enabled
    try:
        # Customer calendar event
        if current_user.google_calendar_enabled and current_user.google_calendar_token:
            try:
                token_data = json.loads(current_user.google_calendar_token)
                event_details = {
                    'summary': f'Appointment: {service.name}',
                    'description': f'Appointment with {service.provider.business_name if service.provider else "Service Provider"}\n\nService: {service.name}\nBooking ID: {db_booking.id}',
                    'start_time': time_slot.start_time,
                    'end_time': time_slot.end_time,
                    'location': f'{service.provider.address}, {service.provider.city}, {service.provider.state}' if service.provider and service.provider.address else None
                }
                
                calendar_event_id = await calendar_service.create_calendar_event(
                    token_data=token_data,
                    event_details=event_details
                )
                
                if calendar_event_id:
                    db_booking.google_calendar_event_id = calendar_event_id
                    db.commit()
                    
            except Exception as e:
                print(f"Failed to create customer calendar event: {e}")
        
        # Provider calendar event (if they have calendar enabled)
        if (service.provider and service.provider.user and 
            service.provider.user.google_calendar_enabled and 
            service.provider.user.google_calendar_token):
            try:
                token_data = json.loads(service.provider.user.google_calendar_token)
                event_details = {
                    'summary': f'Booking: {service.name}',
                    'description': f'Appointment with {current_user.full_name}\n\nService: {service.name}\nCustomer Email: {current_user.email}\nBooking ID: {db_booking.id}',
                    'start_time': time_slot.start_time,
                    'end_time': time_slot.end_time,
                    'attendees': [current_user.email]
                }
                
                await calendar_service.create_calendar_event(
                    token_data=token_data,
                    event_details=event_details
                )
                    
            except Exception as e:
                print(f"Failed to create provider calendar event: {e}")
                
    except Exception as e:
        # Log error but don't fail the booking
        print(f"Failed to create calendar events: {e}")
    
    return db_booking

@router.get("/my-bookings", response_model=List[BookingWithDetailsResponse])
async def get_my_bookings(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all bookings for the current user with full details."""
    
    query = db.query(Booking).options(
        joinedload(Booking.service).joinedload(Service.provider),
        joinedload(Booking.time_slot),
        joinedload(Booking.customer)
    )

    if current_user.user_type == "customer":
        query = query.filter(Booking.customer_id == current_user.id)
    elif current_user.user_type == "service_provider":
        # It's more efficient to get the provider ID from the user's relationships if possible,
        # but a direct query is also fine and explicit.
        provider = db.query(ServiceProvider).filter(ServiceProvider.user_id == current_user.id).first()
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Service provider profile not found for the current user."
            )
        # We need to join the service to filter by provider_id
        query = query.join(Booking.service).filter(Service.provider_id == provider.id)
    else:
        # This case should ideally not be reached if user types are limited
        return []

    # The join to TimeSlot is necessary for ordering
    bookings = query.join(Booking.time_slot).order_by(TimeSlot.start_time.desc()).all()

    # The conversion to the response model is now much cleaner
    detailed_bookings = [
        BookingWithDetailsResponse(
            id=booking.id,
            customer_id=booking.customer_id,
            service_id=booking.service_id,
            time_slot_id=booking.time_slot_id,
            status=booking.status,
            notes=booking.notes,
            total_price=booking.total_price,
            created_at=booking.created_at,
            cancellation_reason=booking.cancellation_reason,
            # Accessing related objects is now efficient
            service_name=booking.service.name,
            service_description=booking.service.description,
            provider_name=booking.service.provider.business_name,
            provider_id=booking.service.provider.id,
            appointment_start_time=booking.time_slot.start_time,
            appointment_end_time=booking.time_slot.end_time,
            customer_name=booking.customer.full_name if booking.customer else None,
            customer_email=booking.customer.email if booking.customer else None,
        )
        for booking in bookings
        if booking.service and booking.time_slot and booking.customer and booking.service.provider
    ]

    return detailed_bookings

@router.get("/services/{service_id}/time-slots", response_model=List[TimeSlotResponse])
async def get_service_time_slots(
    service_id: str,
    start_date: date = Query(..., description="Start date for time slots"),
    end_date: Optional[date] = Query(None, description="End date for time slots"),
    db: Session = Depends(get_db)
):
    """Get available time slots for a specific service"""
    # Verify service exists
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    return _svc_get_service_slots(service_id, start_date, end_date, db)

@router.get("/providers/{provider_id}/schedule", response_model=List[TimeSlotResponse])
async def get_provider_schedule(
    provider_id: str,
    start_date: date = Query(..., description="Start date for schedule"),
    end_date: Optional[date] = Query(None, description="End date for schedule (defaults to start_date)"),
    db: Session = Depends(get_db)
):
    """Get all time slots (both available and booked) for a provider - used for calendar display"""
    if end_date is None:
        end_date = start_date
    
    # Verify provider exists
    provider = db.query(ServiceProvider).filter(ServiceProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service provider not found"
        )
    
    return _svc_get_provider_schedule_slots(provider_id, start_date, end_date, db)

@router.post("/cleanup-slots")
async def cleanup_orphaned_time_slots(
    provider_id: Optional[str] = Query(None, description="Optional provider ID to limit cleanup"),
    db: Session = Depends(get_db)
):
    """Clean up orphaned time slots that exist for disabled days"""
    try:
        cleaned_count = cleanup_orphaned_slots(db, provider_id)
        return {
            "message": f"Successfully cleaned up {cleaned_count} orphaned time slots",
            "cleaned_count": cleaned_count
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cleanup slots: {str(e)}"
        ) 


@router.post("/{booking_id}/cancel", response_model=BookingResponse)
async def cancel_booking(
    booking_id: str,
    cancel_data: BookingCancel,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Cancel an existing booking and free the associated time slot.

    Permissions:
    - Customer who created the booking can cancel it
    - Service provider who owns the service can cancel it
    """
    # Find booking
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )

    # Prevent cancelling completed or already cancelled bookings
    if booking.status in {"cancelled", "completed"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel a booking with status '{booking.status}'"
        )

    # Load related service and provider for permission check
    service = db.query(Service).filter(Service.id == booking.service_id).first()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")

    # Permission checks
    is_customer_owner = (current_user.user_type == "customer" and booking.customer_id == current_user.id)
    is_provider_owner = False
    if current_user.user_type == "service_provider":
        provider = db.query(ServiceProvider).filter(ServiceProvider.user_id == current_user.id).first()
        if provider and service.provider_id == provider.id:
            is_provider_owner = True

    if not (is_customer_owner or is_provider_owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to cancel this booking"
        )

    # Update booking status and free time slot
    booking.status = "cancelled"
    booking.cancellation_reason = cancel_data.reason
    time_slot = db.query(TimeSlot).filter(TimeSlot.id == booking.time_slot_id).first()
    if time_slot:
        time_slot.is_booked = False

    db.add(booking)
    db.commit()
    db.refresh(booking)

    # Attempt to delete customer's calendar event (non-blocking)
    try:
        if booking.google_calendar_event_id:
            customer_user = db.query(User).filter(User.id == booking.customer_id).first()
            if (
                customer_user
                and customer_user.google_calendar_enabled
                and customer_user.google_calendar_token
            ):
                try:
                    token_data = json.loads(customer_user.google_calendar_token)
                except Exception:
                    token_data = None

                if token_data:
                    try:
                        deleted = await calendar_service.delete_calendar_event(
                            token_data=token_data,
                            event_id=booking.google_calendar_event_id,
                        )
                        if deleted:
                            booking.google_calendar_event_id = None
                            db.add(booking)
                            db.commit()
                            db.refresh(booking)
                    except Exception as e:
                        print(
                            f"Failed to delete Google Calendar event for booking {booking.id}: {e}"
                        )
    except Exception as e:
        # Do not block cancellation if calendar deletion fails
        print(f"Calendar cleanup error for booking {booking.id}: {e}")

    return booking