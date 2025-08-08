"""Availability management service module.

This module handles all business logic for availability templates and overrides,
including CRUD operations and validation.
"""

from datetime import date, datetime, time, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException, status

from app.models.database import (
    AvailabilityTemplate,
    AvailabilityOverride,
    CustomTimeSlot,
    ServiceProvider,
    TimeSlot,
)
from app.models.availability import (
    AvailabilityTemplateCreate,
    AvailabilityTemplateUpdate,
    AvailabilityOverrideCreate,
    AvailabilityOverrideUpdate,
    BulkAvailabilityRequest,
    GeneratedTimeSlot,
    AvailabilityResponse,
    BulkAvailabilityResponse,
)


class AvailabilityService:
    """Service class for availability management operations."""

    @staticmethod
    def validate_provider_exists(db: Session, provider_id: str) -> ServiceProvider:
        """Validate that a service provider exists."""
        provider = db.query(ServiceProvider).filter(ServiceProvider.id == provider_id).first()
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Service provider with id {provider_id} not found"
            )
        return provider

    @staticmethod
    def validate_time_range(start_time: time, end_time: time) -> None:
        """Validate that start time is before end time."""
        if start_time >= end_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start time must be before end time"
            )

    @staticmethod
    def validate_break_times(
        start_time: time, 
        end_time: time, 
        break_start: Optional[time], 
        break_end: Optional[time]
    ) -> None:
        """Validate break times are within working hours and properly ordered."""
        if break_start and break_end:
            if break_start >= break_end:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Break start time must be before break end time"
                )
            if break_start < start_time or break_end > end_time:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Break times must be within working hours"
                )

    # Availability Template Operations
    @staticmethod
    def get_availability_templates(db: Session, provider_id: str) -> List[AvailabilityTemplate]:
        """Get all availability templates for a provider."""
        AvailabilityService.validate_provider_exists(db, provider_id)
        
        return db.query(AvailabilityTemplate).filter(
            AvailabilityTemplate.provider_id == provider_id
        ).order_by(AvailabilityTemplate.day_of_week).all()

    @staticmethod
    def create_availability_template(
        db: Session, 
        provider_id: str, 
        template_data: AvailabilityTemplateCreate
    ) -> AvailabilityTemplate:
        """Create a new availability template."""
        AvailabilityService.validate_provider_exists(db, provider_id)
        
        # Validate time ranges
        AvailabilityService.validate_time_range(template_data.start_time, template_data.end_time)
        AvailabilityService.validate_break_times(
            template_data.start_time,
            template_data.end_time,
            template_data.break_start_time,
            template_data.break_end_time
        )

        # Check if template already exists for this day
        existing = db.query(AvailabilityTemplate).filter(
            AvailabilityTemplate.provider_id == provider_id,
            AvailabilityTemplate.day_of_week == template_data.day_of_week
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Availability template already exists for day {template_data.day_of_week}"
            )

        try:
            template = AvailabilityTemplate(
                provider_id=provider_id,
                **template_data.model_dump()
            )
            db.add(template)
            db.commit()
            db.refresh(template)
            return template
        except SQLAlchemyError as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create availability template"
            )

    @staticmethod
    def update_availability_template(
        db: Session,
        provider_id: str,
        template_id: str,
        template_data: AvailabilityTemplateUpdate
    ) -> AvailabilityTemplate:
        """Update an existing availability template."""
        AvailabilityService.validate_provider_exists(db, provider_id)
        
        template = db.query(AvailabilityTemplate).filter(
            AvailabilityTemplate.id == template_id,
            AvailabilityTemplate.provider_id == provider_id
        ).first()

        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Availability template not found"
            )

        # Validate updated times if provided
        update_data = template_data.model_dump(exclude_unset=True)
        start_time = update_data.get('start_time', template.start_time)
        end_time = update_data.get('end_time', template.end_time)
        break_start = update_data.get('break_start_time', template.break_start_time)
        break_end = update_data.get('break_end_time', template.break_end_time)

        AvailabilityService.validate_time_range(start_time, end_time)
        AvailabilityService.validate_break_times(start_time, end_time, break_start, break_end)

        try:
            for field, value in update_data.items():
                setattr(template, field, value)
            
            db.commit()
            db.refresh(template)
            return template
        except SQLAlchemyError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update availability template"
            )

    @staticmethod
    def delete_availability_template(db: Session, provider_id: str, template_id: str) -> bool:
        """Delete an availability template."""
        AvailabilityService.validate_provider_exists(db, provider_id)
        
        template = db.query(AvailabilityTemplate).filter(
            AvailabilityTemplate.id == template_id,
            AvailabilityTemplate.provider_id == provider_id
        ).first()

        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Availability template not found"
            )

        try:
            db.delete(template)
            db.commit()
            return True
        except SQLAlchemyError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete availability template"
            )

    # Availability Override Operations
    @staticmethod
    def get_availability_overrides(db: Session, provider_id: str) -> List[AvailabilityOverride]:
        """Get all availability overrides for a provider."""
        AvailabilityService.validate_provider_exists(db, provider_id)
        
        return db.query(AvailabilityOverride).filter(
            AvailabilityOverride.provider_id == provider_id
        ).order_by(AvailabilityOverride.override_date).all()

    @staticmethod
    def create_availability_override(
        db: Session,
        provider_id: str,
        override_data: AvailabilityOverrideCreate
    ) -> AvailabilityOverride:
        """Create a new availability override."""
        AvailabilityService.validate_provider_exists(db, provider_id)

        # Check if override already exists for this date
        existing = db.query(AvailabilityOverride).filter(
            AvailabilityOverride.provider_id == provider_id,
            AvailabilityOverride.override_date == override_data.override_date
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Availability override already exists for {override_data.override_date}"
            )

        # Validate custom slots if provided
        for slot in override_data.custom_slots:
            AvailabilityService.validate_time_range(slot.start_time, slot.end_time)

        try:
            override = AvailabilityOverride(
                provider_id=provider_id,
                override_date=override_data.override_date,
                is_unavailable=override_data.is_unavailable,
                reason=override_data.reason
            )
            db.add(override)
            db.flush()  # Get the ID for custom slots

            # Add custom slots
            for slot_data in override_data.custom_slots:
                custom_slot = CustomTimeSlot(
                    availability_override_id=override.id,
                    start_time=slot_data.start_time,
                    end_time=slot_data.end_time,
                    is_available=slot_data.is_available
                )
                db.add(custom_slot)

            db.commit()
            db.refresh(override)
            return override
        except SQLAlchemyError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create availability override"
            )

    @staticmethod
    def update_availability_override(
        db: Session,
        provider_id: str,
        override_id: str,
        override_data: AvailabilityOverrideUpdate
    ) -> AvailabilityOverride:
        """Update an existing availability override."""
        AvailabilityService.validate_provider_exists(db, provider_id)
        
        override = db.query(AvailabilityOverride).filter(
            AvailabilityOverride.id == override_id,
            AvailabilityOverride.provider_id == provider_id
        ).first()

        if not override:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Availability override not found"
            )

        try:
            update_data = override_data.model_dump(exclude_unset=True)
            
            # Handle custom slots update
            if 'custom_slots' in update_data:
                # Remove existing custom slots
                db.query(CustomTimeSlot).filter(
                    CustomTimeSlot.availability_override_id == override_id
                ).delete()
                
                # Add new custom slots
                for slot_data in update_data['custom_slots']:
                    AvailabilityService.validate_time_range(slot_data.start_time, slot_data.end_time)
                    custom_slot = CustomTimeSlot(
                        availability_override_id=override_id,
                        start_time=slot_data.start_time,
                        end_time=slot_data.end_time,
                        is_available=slot_data.is_available
                    )
                    db.add(custom_slot)
                
                del update_data['custom_slots']

            # Update other fields
            for field, value in update_data.items():
                setattr(override, field, value)
            
            db.commit()
            db.refresh(override)
            return override
        except SQLAlchemyError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update availability override"
            )

    @staticmethod
    def delete_availability_override(db: Session, provider_id: str, override_id: str) -> bool:
        """Delete an availability override."""
        AvailabilityService.validate_provider_exists(db, provider_id)
        
        override = db.query(AvailabilityOverride).filter(
            AvailabilityOverride.id == override_id,
            AvailabilityOverride.provider_id == provider_id
        ).first()

        if not override:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Availability override not found"
            )

        try:
            # Delete custom slots first (cascade should handle this, but being explicit)
            db.query(CustomTimeSlot).filter(
                CustomTimeSlot.availability_override_id == override_id
            ).delete()
            
            db.delete(override)
            db.commit()
            return True
        except SQLAlchemyError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete availability override"
            )

    @staticmethod
    def generate_availability_slots(
        db: Session,
        provider_id: str,
        request: BulkAvailabilityRequest
    ) -> BulkAvailabilityResponse:
        """Generate available time slots for a date range."""
        from app.services.time_slots import generate_time_slots_for_date
        
        AvailabilityService.validate_provider_exists(db, provider_id)
        
        if request.start_date > request.end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start date must be before or equal to end date"
            )

        dates = []
        current_date = request.start_date

        try:
            while current_date <= request.end_date:
                # Generate slots for this date
                slots = generate_time_slots_for_date(provider_id, current_date, db)
                
                # Convert to response format
                generated_slots = [
                    GeneratedTimeSlot(
                        start_time=slot.start_time,
                        end_time=slot.end_time,
                        is_available=not slot.is_booked,
                        is_booked=slot.is_booked
                    )
                    for slot in slots
                ]
                
                availability_response = AvailabilityResponse(
                    response_date=current_date,
                    slots=generated_slots,
                    source="template"  # Simplified - could be enhanced to detect source
                )
                
                dates.append(availability_response)
                current_date += timedelta(days=1)

            return BulkAvailabilityResponse(dates=dates)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate availability slots: {str(e)}"
            ) 