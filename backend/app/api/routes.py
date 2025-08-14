from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api import auth, providers, bookings, categories, google_auth, payments, calendar
from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.models.database import User
from app.services.availability import AvailabilityService
from app.models.availability import (
    AvailabilityTemplateResponse,
    AvailabilityTemplateCreate,
    AvailabilityTemplateUpdate,
    AvailabilityOverrideResponse,
    AvailabilityOverrideCreate,
    AvailabilityOverrideUpdate,
    BulkAvailabilityRequest,
    BulkAvailabilityResponse,
)
from typing import List

api_router = APIRouter()

# Include routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(providers.router, prefix="/providers", tags=["Service Providers"])
api_router.include_router(bookings.router, prefix="/bookings", tags=["Bookings"])
api_router.include_router(categories.router, prefix="/categories", tags=["Categories"])
api_router.include_router(google_auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(payments.router, prefix="/payments", tags=["Payments"])
api_router.include_router(calendar.router, prefix="/calendar", tags=["Calendar"])

@api_router.get("/")
async def api_root():
    return {"message": "TimeBooking API v1"}

@api_router.get("/services")
async def get_services():
    """Get list of all services - placeholder for future implementation"""
    return {"message": "Services endpoint - to be implemented"}

# Availability Management Routes - Now Implemented with Database
@api_router.get(
    "/providers/{provider_id}/availability/templates",
    response_model=List[AvailabilityTemplateResponse],
    summary="Get availability templates",
    description="Get all availability templates for a service provider"
)
async def get_availability_templates(
    provider_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all availability templates for a provider"""
    try:
        templates = AvailabilityService.get_availability_templates(db, provider_id)
        return templates
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error occurred while fetching availability templates"
        )

@api_router.post(
    "/providers/{provider_id}/availability/templates",
    response_model=AvailabilityTemplateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create availability template",
    description="Create a new availability template for a service provider"
)
async def create_availability_template(
    provider_id: str,
    template: AvailabilityTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new availability template"""
    try:
        created_template = AvailabilityService.create_availability_template(
            db, provider_id, template
        )
        return created_template
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error occurred while creating availability template"
        )

@api_router.put(
    "/providers/{provider_id}/availability/templates/{template_id}",
    response_model=AvailabilityTemplateResponse,
    summary="Update availability template",
    description="Update an existing availability template"
)
async def update_availability_template(
    provider_id: str,
    template_id: str,
    template: AvailabilityTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update an existing availability template"""
    try:
        updated_template = AvailabilityService.update_availability_template(
            db, provider_id, template_id, template
        )
        return updated_template
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error occurred while updating availability template"
        )

@api_router.delete(
    "/providers/{provider_id}/availability/templates/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete availability template",
    description="Delete an availability template"
)
async def delete_availability_template(
    provider_id: str,
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete an availability template"""
    try:
        AvailabilityService.delete_availability_template(db, provider_id, template_id)
        return
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error occurred while deleting availability template"
        )

@api_router.get(
    "/providers/{provider_id}/availability/overrides",
    response_model=List[AvailabilityOverrideResponse],
    summary="Get availability overrides",
    description="Get all availability overrides for a service provider"
)
async def get_availability_overrides(
    provider_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all availability overrides for a provider"""
    try:
        overrides = AvailabilityService.get_availability_overrides(db, provider_id)
        return overrides
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error occurred while fetching availability overrides"
        )

@api_router.post(
    "/providers/{provider_id}/availability/overrides",
    response_model=AvailabilityOverrideResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create availability override",
    description="Create a new availability override for a service provider"
)
async def create_availability_override(
    provider_id: str,
    override: AvailabilityOverrideCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new availability override"""
    try:
        created_override = AvailabilityService.create_availability_override(
            db, provider_id, override
        )
        return created_override
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error occurred while creating availability override"
        )

@api_router.put(
    "/providers/{provider_id}/availability/overrides/{override_id}",
    response_model=AvailabilityOverrideResponse,
    summary="Update availability override",
    description="Update an existing availability override"
)
async def update_availability_override(
    provider_id: str,
    override_id: str,
    override: AvailabilityOverrideUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update an existing availability override"""
    try:
        updated_override = AvailabilityService.update_availability_override(
            db, provider_id, override_id, override
        )
        return updated_override
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error occurred while updating availability override"
        )

@api_router.delete(
    "/providers/{provider_id}/availability/overrides/{override_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete availability override",
    description="Delete an availability override"
)
async def delete_availability_override(
    provider_id: str,
    override_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete an availability override"""
    try:
        AvailabilityService.delete_availability_override(db, provider_id, override_id)
        return
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error occurred while deleting availability override"
        )

@api_router.post(
    "/providers/{provider_id}/availability/generate",
    response_model=BulkAvailabilityResponse,
    summary="Generate availability slots",
    description="Generate available time slots for a date range based on templates and overrides"
)
async def generate_availability_slots(
    provider_id: str,
    request: BulkAvailabilityRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Generate available time slots for a date range based on templates and overrides"""
    try:
        availability = AvailabilityService.generate_availability_slots(
            db, provider_id, request
        )
        return availability
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error occurred while generating availability slots"
        ) 