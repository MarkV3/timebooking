from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import date
from app.core.database import get_db
from app.core.auth import get_current_active_user
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
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current user's service provider profile"""
    if current_user.user_type != "service_provider":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a service provider"
        )
    
    provider = db.query(ServiceProvider).filter(ServiceProvider.user_id == current_user.id).first()
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service provider profile not found"
        )
    
    return provider

@router.put("/me", response_model=ServiceProviderResponse)
async def update_my_provider_profile(
    provider_update: ServiceProviderUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user's service provider profile"""
    if current_user.user_type != "service_provider":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a service provider"
        )
    
    provider = db.query(ServiceProvider).filter(ServiceProvider.user_id == current_user.id).first()
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service provider profile not found"
        )
    
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
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new service for current service provider"""
    if current_user.user_type != "service_provider":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a service provider"
        )
    
    provider = db.query(ServiceProvider).filter(ServiceProvider.user_id == current_user.id).first()
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service provider profile not found"
        )
    
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
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all services for current service provider"""
    if current_user.user_type != "service_provider":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a service provider"
        )
    
    provider = db.query(ServiceProvider).filter(ServiceProvider.user_id == current_user.id).first()
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service provider profile not found"
        )
    
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
    start_date: date = Query(..., description="Start date for schedule"),
    end_date: Optional[date] = Query(None, description="End date for schedule (defaults to start_date)"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get the complete schedule for current service provider including bookings"""
    if current_user.user_type != "service_provider":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a service provider"
        )
    
    provider = db.query(ServiceProvider).filter(ServiceProvider.user_id == current_user.id).first()
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service provider profile not found"
        )
    
    if end_date is None:
        end_date = start_date
    
    # Get all slots (both available and booked) for the date range
    all_slots = get_provider_schedule_slots(provider.id, start_date, end_date, db)
    
    # Build response with booking information
    schedule_responses = []
    for slot in all_slots:
        booking_info = None
        if slot.is_booked:
            # Query the booking separately to ensure it's loaded
            booking = db.query(Booking).filter(Booking.time_slot_id == slot.id).first()
            if booking:
                # Get customer and service information
                customer = db.query(User).filter(User.id == booking.customer_id).first()
                service = db.query(Service).filter(Service.id == booking.service_id).first()
                
                if customer and service:
                    booking_info = BookingWithCustomerResponse(
                        id=booking.id,
                        service_id=booking.service_id,
                        time_slot_id=booking.time_slot_id,
                        customer_id=booking.customer_id,
                        customer_name=customer.full_name,
                        customer_email=customer.email,
                        service_name=service.name,
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
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get availability templates for current service provider"""
    if current_user.user_type != "service_provider":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a service provider"
        )
    
    provider = db.query(ServiceProvider).filter(ServiceProvider.user_id == current_user.id).first()
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service provider profile not found"
        )
    
    from app.services.availability import AvailabilityService
    templates = AvailabilityService.get_availability_templates(db, provider.id)
    return templates

@router.get("/me/availability/overrides", response_model=List[AvailabilityOverrideResponse])
async def get_my_availability_overrides(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get availability overrides for current service provider"""
    if current_user.user_type != "service_provider":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a service provider"
        )
    
    provider = db.query(ServiceProvider).filter(ServiceProvider.user_id == current_user.id).first()
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service provider profile not found"
        )
    
    from app.services.availability import AvailabilityService
    overrides = AvailabilityService.get_availability_overrides(db, provider.id)
    return overrides 