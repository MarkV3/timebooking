from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from datetime import date
from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.api.dependencies import get_current_provider
from app.models.database import User, ServiceProvider, Service, Booking, TimeSlot
from app.schemas.service_provider import (
    ServiceProviderResponse, 
    ServiceProviderUpdate, 
    ServiceProviderSearchResponse
)
from app.schemas.service import ServiceCreate, ServiceResponse, ServiceUpdate
from app.schemas.booking import ProviderScheduleSlotResponse, BookingWithCustomerResponse
from app.models.availability import AvailabilityTemplateResponse, AvailabilityOverrideResponse
from app.services.time_slots import get_provider_schedule_slots

router = APIRouter()

@router.get("/search", response_model=List[ServiceProviderSearchResponse])
async def search_service_providers(
    query: Optional[str] = Query(None, description="Search query for business name or description"),
    city: Optional[str] = Query(None, description="Filter by city"),
    state: Optional[str] = Query(None, description="Filter by state"),
    limit: int = Query(10, le=50, description="Number of results to return"),
    skip: int = Query(0, description="Number of results to skip"),
    db: Session = Depends(get_db)
):
    """Search for service providers"""
    query_filter = db.query(ServiceProvider)
    
    if query:
        query_filter = query_filter.filter(
            or_(
                ServiceProvider.business_name.ilike(f"%{query}%"),
                ServiceProvider.description.ilike(f"%{query}%")
            )
        )
    
    if city:
        query_filter = query_filter.filter(ServiceProvider.city.ilike(f"%{city}%"))
    
    if state:
        query_filter = query_filter.filter(ServiceProvider.state.ilike(f"%{state}%"))
    
    providers = query_filter.offset(skip).limit(limit).all()
    return providers

@router.get("/me", response_model=ServiceProviderResponse)
async def get_my_provider_profile(
    provider: ServiceProvider = Depends(get_current_provider)
):
    """Get current user's service provider profile"""
    return provider

@router.get("/user/{user_id}", response_model=ServiceProviderResponse)
async def get_service_provider_by_user_id(user_id: str, db: Session = Depends(get_db)):
    """Get service provider by user ID"""
    provider = db.query(ServiceProvider).filter(ServiceProvider.user_id == user_id).first()
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service provider not found for this user"
        )
    
    return provider

@router.put("/me", response_model=ServiceProviderResponse)
async def update_my_provider_profile(
    provider_update: ServiceProviderUpdate,
    provider: ServiceProvider = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Update current user's service provider profile"""
    # Update fields
    for field, value in provider_update.dict(exclude_unset=True).items():
        setattr(provider, field, value)
    
    db.commit()
    db.refresh(provider)
    
    return provider

@router.get("/{provider_id}", response_model=ServiceProviderResponse)
async def get_service_provider(provider_id: str, db: Session = Depends(get_db)):
    """Get service provider by ID"""
    provider = db.query(ServiceProvider).filter(ServiceProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service provider not found"
        )
    
    return provider

@router.post("/me/services", response_model=ServiceResponse)
async def create_service(
    service: ServiceCreate,
    provider: ServiceProvider = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Create a new service for current service provider"""
    db_service = Service(
        provider_id=provider.id,
        name=service.name,
        description=service.description,
        duration=service.duration,
        price=service.price,
        category=service.category
    )
    
    db.add(db_service)
    db.commit()
    db.refresh(db_service)
    
    return db_service

@router.get("/me/services", response_model=List[ServiceResponse])
async def get_my_services(
    provider: ServiceProvider = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Get all services for current service provider"""
    services = db.query(Service).filter(Service.provider_id == provider.id).all()
    return services

@router.get("/{provider_id}/services", response_model=List[ServiceResponse])
async def get_provider_services(provider_id: str, db: Session = Depends(get_db)):
    """Get all services for a specific service provider"""
    provider = db.query(ServiceProvider).filter(ServiceProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service provider not found"
        )
    
    services = db.query(Service).filter(
        Service.provider_id == provider_id,
        Service.is_active == True
    ).all()
    return services

@router.get("/me/schedule", response_model=List[ProviderScheduleSlotResponse])
async def get_my_provider_schedule(
    provider: ServiceProvider = Depends(get_current_provider),
    start_date: date = Query(..., description="Start date for schedule"),
    end_date: Optional[date] = Query(None, description="End date for schedule (defaults to start_date)"),
    db: Session = Depends(get_db)
):
    """Get the complete schedule for current service provider including bookings"""
    if end_date is None:
        end_date = start_date
    
    # Get all slots (both available and booked) for the date range
    all_slots = get_provider_schedule_slots(provider.id, start_date, end_date, db)
    
    # N+1 problem optimization:
    # 1. Get all booked slot IDs
    booked_slot_ids = [slot.id for slot in all_slots if slot.is_booked]

    # 2. Fetch all relevant bookings in one query
    bookings_map = {}
    if booked_slot_ids:
        bookings = db.query(Booking).options(
            joinedload(Booking.customer),
            joinedload(Booking.service)
        ).filter(
            Booking.time_slot_id.in_(booked_slot_ids),
            Booking.status != "cancelled"
        ).all()
        bookings_map = {b.time_slot_id: b for b in bookings}

    # 3. Build the response without N+1 queries
    schedule_responses = []
    for slot in all_slots:
        booking_info = None
        booking = bookings_map.get(slot.id)

        if booking and booking.customer and booking.service:
            booking_info = BookingWithCustomerResponse(
                id=booking.id,
                service_id=booking.service_id,
                time_slot_id=booking.time_slot_id,
                customer_id=booking.customer_id,
                customer_name=booking.customer.full_name,
                customer_email=booking.customer.email,
                service_name=booking.service.name,
                status=booking.status,
                total_price=booking.total_price,
                created_at=booking.created_at,
                notes=booking.notes
            )
        
        schedule_responses.append(ProviderScheduleSlotResponse(
            id=slot.id,
            provider_id=slot.provider_id,
            start_time=slot.start_time,
            end_time=slot.end_time,
            is_booked=slot.is_booked,
            created_at=slot.created_at,
            booking=booking_info
        ))
    
    return schedule_responses

# Availability endpoints for current user
@router.get("/me/availability/templates", response_model=List[AvailabilityTemplateResponse])
async def get_my_availability_templates(
    provider: ServiceProvider = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Get availability templates for current service provider"""
    from app.services.availability import AvailabilityService
    templates = AvailabilityService.get_availability_templates(db, provider.id)
    return templates

@router.get("/me/availability/overrides", response_model=List[AvailabilityOverrideResponse])
async def get_my_availability_overrides(
    provider: ServiceProvider = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Get availability overrides for current service provider"""
    from app.services.availability import AvailabilityService
    overrides = AvailabilityService.get_availability_overrides(db, provider.id)
    return overrides 