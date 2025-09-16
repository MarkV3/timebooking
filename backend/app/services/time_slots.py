from __future__ import annotations

"""Time-slot related business logic.

Keeping non-framework logic here separates concerns from FastAPI routes, which now simply orchestrate
request/response handling while deferring complex domain computations to this module.  
All public helpers below are pure functions that operate on a SQLAlchemy `Session` instance supplied by
calling code – this keeps them fully test-able and avoids hidden side-effects.
"""

from datetime import datetime, date, time, timedelta, timezone
from typing import List

from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from fastapi import HTTPException, status

from app.models.database import (
    AvailabilityTemplate,
    AvailabilityOverride,
    TimeSlot,
    Service,
    ServiceProvider,
)

__all__ = [
    "generate_time_slots_for_date",
    "get_provider_time_slots",
    "get_service_time_slots",
    "get_provider_schedule_slots",
    "cleanup_orphaned_slots",
]


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

def validate_provider_id(db: Session, provider_id: str) -> None:
    """Validate that provider_id is valid and exists."""
    if not provider_id or not isinstance(provider_id, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provider ID must be a non-empty string"
        )
    
    provider = db.query(ServiceProvider.id).filter(ServiceProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Service provider with id {provider_id} not found"
        )


def validate_service_id(db: Session, service_id: str) -> Service:
    """Validate that service_id is valid and exists."""
    if not service_id or not isinstance(service_id, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Service ID must be a non-empty string"
        )
    
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Service with id {service_id} not found"
        )
    
    return service


def validate_date_range(start_date: date, end_date: date | None) -> tuple[date, date]:
    """Validate and normalize date range."""
    if end_date is None:
        end_date = start_date
    
    if not isinstance(start_date, date) or not isinstance(end_date, date):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dates must be valid date objects"
        )
    
    if start_date > end_date:
        start_date, end_date = end_date, start_date  # swap for sanity
    
    # Prevent excessive date ranges that could cause performance issues
    max_days = 365  # 1 year max
    if (end_date - start_date).days > max_days:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Date range cannot exceed {max_days} days"
        )
    
    return start_date, end_date


# ---------------------------------------------------------------------------
# Time-slot generation helpers
# ---------------------------------------------------------------------------

def _python_weekday_to_template_index(dt: date) -> int:
    """Convert Python weekday (Mon=0) to our template index (Sun=0)."""
    return 0 if dt.weekday() == 6 else dt.weekday() + 1


def _ensure_timezone_aware(dt: datetime) -> datetime:
    """Ensure datetime is timezone-aware (assume UTC if naive)."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def generate_time_slots_for_date(
    provider_id: str,
    target_date: date,
    db: Session,
    *,
    commit: bool = True,
    force: bool = False,
) -> List[TimeSlot]:
    """Return *persistent* `TimeSlot` rows for the given provider and date.

    A new set of slots is generated (and inserted) based on the provider's
    `AvailabilityTemplate` if – and only if – they do not already exist.

    Parameters
    ----------
    provider_id: str
        The `ServiceProvider.id` owning the slots.
    target_date: date
        The day for which slots should be generated/retrieved.
    db: Session
        An active SQLAlchemy session.
    commit: bool, default *True*
        Whether the session should be committed when new slots are created.

    Returns
    -------
    List[TimeSlot]
        A *persistent* list of `TimeSlot` objects ordered by `start_time`.
        
    Raises
    ------
    HTTPException
        If provider doesn't exist or database errors occur.
    """
    # Validate inputs
    validate_provider_id(db, provider_id)
    
    if not isinstance(target_date, date):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="target_date must be a valid date object"
        )

    day_of_week = _python_weekday_to_template_index(target_date)

    try:
        template: AvailabilityTemplate | None = (
            db.query(AvailabilityTemplate)
            .filter(
                AvailabilityTemplate.provider_id == provider_id,
                AvailabilityTemplate.day_of_week == day_of_week,
                AvailabilityTemplate.is_enabled.is_(True),
            )
            .first()
        )
        override: AvailabilityOverride | None = (
            db.query(AvailabilityOverride)
            .options(selectinload(AvailabilityOverride.custom_slots))
            .filter(
                AvailabilityOverride.provider_id == provider_id,
                AvailabilityOverride.override_date == target_date,
            )
            .first()
        )
        
        # Use timezone-aware datetime for consistent comparison
        start_of_day = _ensure_timezone_aware(datetime.combine(target_date, time.min))
        end_of_day = _ensure_timezone_aware(datetime.combine(target_date + timedelta(days=1), time.min))

        existing_slots = (
            db.query(TimeSlot)
            .filter(
                TimeSlot.provider_id == provider_id,
                TimeSlot.start_time >= start_of_day,
                TimeSlot.start_time < end_of_day,
            )
            .order_by(TimeSlot.start_time)
            .all()
        )
        booked_slots = [slot for slot in existing_slots if slot.is_booked]
        unbooked_slots = [slot for slot in existing_slots if not slot.is_booked]

        def _finalize() -> List[TimeSlot]:
            try:
                if commit:
                    db.commit()
                else:
                    db.flush()
            except (SQLAlchemyError, IntegrityError):
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Database error occurred while creating time slots"
                )

            return (
                db.query(TimeSlot)
                .filter(
                    TimeSlot.provider_id == provider_id,
                    TimeSlot.start_time >= start_of_day,
                    TimeSlot.start_time < end_of_day,
                )
                .order_by(TimeSlot.start_time)
                .all()
            )

        def _remove_unbooked() -> None:
            if not unbooked_slots:
                return
            for slot in unbooked_slots:
                db.delete(slot)
            unbooked_slots.clear()

        if override:
            _remove_unbooked()

            available_windows = sorted(
                [slot for slot in override.custom_slots if slot.is_available],
                key=lambda slot: slot.start_time,
            )

            if override.is_unavailable or not available_windows:
                return _finalize()

            slot_duration_minutes = template.slot_duration if template else 30
            slot_duration = timedelta(minutes=slot_duration_minutes)

            if slot_duration <= timedelta(0):
                return _finalize()

            booked_start_times = {slot.start_time for slot in booked_slots}
            new_slots: list[TimeSlot] = []

            for custom_slot in available_windows:
                start_dt = _ensure_timezone_aware(datetime.combine(target_date, custom_slot.start_time))
                end_dt = _ensure_timezone_aware(datetime.combine(target_date, custom_slot.end_time))

                if start_dt >= end_dt:
                    continue

                current_time = start_dt
                while current_time + slot_duration <= end_dt:
                    if current_time in booked_start_times:
                        booked_start_times.remove(current_time)
                        current_time += slot_duration
                        continue

                    new_slots.append(
                        TimeSlot(
                            provider_id=provider_id,
                            start_time=current_time,
                            end_time=current_time + slot_duration,
                            is_booked=False,
                        )
                    )
                    current_time += slot_duration

            if new_slots:
                db.add_all(new_slots)

            return _finalize()

        if not template:
            if unbooked_slots:
                _remove_unbooked()
                return _finalize()
            return booked_slots

        if existing_slots and not force:
            return existing_slots

        # Regenerate template-driven slots (either force or no existing slots)
        _remove_unbooked()

        slot_duration = timedelta(minutes=template.slot_duration)
        current_time = _ensure_timezone_aware(datetime.combine(target_date, template.start_time))
        end_time = _ensure_timezone_aware(datetime.combine(target_date, template.end_time))

        if current_time >= end_time:
            return _finalize() if unbooked_slots else booked_slots

        break_start = (
            _ensure_timezone_aware(datetime.combine(target_date, template.break_start_time))
            if template.break_start_time
            else None
        )
        break_end = (
            _ensure_timezone_aware(datetime.combine(target_date, template.break_end_time))
            if template.break_end_time
            else None
        )

        booked_start_times = {slot.start_time for slot in booked_slots}
        new_slots: list[TimeSlot] = []

        while current_time + slot_duration <= end_time:
            if break_start and break_end and break_start <= current_time < break_end:
                current_time = break_end
                continue

            if current_time in booked_start_times:
                booked_start_times.remove(current_time)
                current_time += slot_duration
                continue

            new_slots.append(
                TimeSlot(
                    provider_id=provider_id,
                    start_time=current_time,
                    end_time=current_time + slot_duration,
                    is_booked=False,
                )
            )
            current_time += slot_duration

        if new_slots:
            db.add_all(new_slots)

        return _finalize()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected error occurred while generating time slots"
        )


# ---------------------------------------------------------------------------
# Public query helpers
# ---------------------------------------------------------------------------

def get_provider_time_slots(
    provider_id: str,
    start_date: date,
    end_date: date | None,
    db: Session,
) -> list[TimeSlot]:
    """Return *available* (not booked) slots for a provider in the date range.
    
    Raises
    ------
    HTTPException
        If provider doesn't exist or invalid date range provided.
    """
    # Validate inputs
    validate_provider_id(db, provider_id)
    start_date, end_date = validate_date_range(start_date, end_date)

    try:
        all_slots: list[TimeSlot] = []
        current_date = start_date

        while current_date <= end_date:
            # Only generate slots for today and future dates
            if current_date >= date.today():
                slots = generate_time_slots_for_date(provider_id, current_date, db)
                all_slots.extend(slots)
            current_date += timedelta(days=1)

        # Filter out booked slots and sort by start_time
        available_slots = [slot for slot in all_slots if not slot.is_booked]
        available_slots.sort(key=lambda x: x.start_time)
        
        return available_slots
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected error occurred while fetching provider time slots"
        )


def get_service_time_slots(
    service_id: str,
    start_date: date,
    end_date: date | None,
    db: Session,
) -> list[TimeSlot]:
    """Delegate provider lookup and fetch slots for a specific service.
    
    Raises
    ------
    HTTPException
        If service doesn't exist or invalid date range provided.
    """
    # Validate inputs
    service = validate_service_id(db, service_id)
    start_date, end_date = validate_date_range(start_date, end_date)

    try:
        return get_provider_time_slots(service.provider_id, start_date, end_date, db)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected error occurred while fetching service time slots"
        )


def get_provider_schedule_slots(
    provider_id: str,
    start_date: date,
    end_date: date | None,
    db: Session,
) -> list[TimeSlot]:
    """Return ALL slots (both available and booked) for a provider in the date range.
    
    This is specifically for providers to see their complete schedule including bookings.
    
    Raises
    ------
    HTTPException
        If provider doesn't exist or invalid date range provided.
    """
    # Validate inputs
    validate_provider_id(db, provider_id)
    start_date, end_date = validate_date_range(start_date, end_date)

    try:
        all_slots: list[TimeSlot] = []
        current_date = start_date

        while current_date <= end_date:
            # Only generate slots for today and future dates
            if current_date >= date.today():
                slots = generate_time_slots_for_date(provider_id, current_date, db)
                all_slots.extend(slots)
            current_date += timedelta(days=1)

        # Return ALL slots (both available and booked) sorted by start_time
        all_slots.sort(key=lambda x: x.start_time)
        
        return all_slots
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected error occurred while fetching provider schedule"
        )


def cleanup_orphaned_slots(db: Session, provider_id: str = None) -> int:
    """Clean up time slots that exist for days when providers are not available.
    
    This function removes unbooked slots that exist for days when the provider
    has no enabled availability template. Booked slots are preserved for historical data.
    
    Args:
        db: Database session
        provider_id: Optional provider ID to limit cleanup to specific provider
        
    Returns:
        Number of slots cleaned up
        
    Raises
    ------
    HTTPException
        If provider doesn't exist or database errors occur.
    """
    from app.models.database import AvailabilityTemplate
    
    try:
        # Get all providers to check, or just the specified one
        if provider_id:
            validate_provider_id(db, provider_id)
            provider_ids = [provider_id]
        else:
            providers = db.query(ServiceProvider.id).all()
            provider_ids = [p.id for p in providers]
        
        total_cleaned = 0
        
        for pid in provider_ids:
            # Get all enabled availability templates for this provider
            enabled_templates = db.query(AvailabilityTemplate).filter(
                AvailabilityTemplate.provider_id == pid,
                AvailabilityTemplate.is_enabled.is_(True)
            ).all()
            
            enabled_days = {template.day_of_week for template in enabled_templates}
            
            # Get all time slots for this provider (future dates only)
            today = date.today()
            start_of_today = _ensure_timezone_aware(datetime.combine(today, time.min))
            
            existing_slots = db.query(TimeSlot).filter(
                TimeSlot.provider_id == pid,
                TimeSlot.start_time >= start_of_today,
                TimeSlot.is_booked.is_(False)  # Only consider unbooked slots
            ).all()
            
            # Check each slot to see if it should exist
            slots_to_delete = []
            
            for slot in existing_slots:
                slot_date = slot.start_time.date()
                slot_day_of_week = _python_weekday_to_template_index(slot_date)
                
                # If this day is not enabled, mark slot for deletion
                if slot_day_of_week not in enabled_days:
                    slots_to_delete.append(slot)
            
            # Delete orphaned slots
            for slot in slots_to_delete:
                db.delete(slot)
                total_cleaned += 1
        
        # Commit the changes
        try:
            db.commit()
        except (SQLAlchemyError, IntegrityError):
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database error occurred while cleaning up orphaned slots"
            )
        
        return total_cleaned
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected error occurred during slot cleanup"
        ) 
