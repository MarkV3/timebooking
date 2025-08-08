"""Tests for the time slots service module."""

import pytest
from datetime import date, time, datetime, timedelta
from fastapi import HTTPException

from app.services.time_slots import (
    generate_time_slots_for_date,
    get_provider_time_slots,
    get_service_time_slots,
    get_provider_schedule_slots,
    cleanup_orphaned_slots,
    validate_provider_id,
    validate_service_id,
    validate_date_range,
)
from app.models.database import TimeSlot, AvailabilityTemplate


class TestTimeSlotValidation:
    """Test validation functions."""

    def test_validate_provider_id_valid(self, db_session, test_service_provider):
        """Test validate_provider_id with valid provider."""
        # Should not raise exception
        validate_provider_id(db_session, test_service_provider.id)

    def test_validate_provider_id_invalid(self, db_session):
        """Test validate_provider_id with invalid provider."""
        with pytest.raises(HTTPException) as exc_info:
            validate_provider_id(db_session, "invalid-id")
        assert exc_info.value.status_code == 404

    def test_validate_provider_id_empty(self, db_session):
        """Test validate_provider_id with empty string."""
        with pytest.raises(HTTPException) as exc_info:
            validate_provider_id(db_session, "")
        assert exc_info.value.status_code == 400

    def test_validate_service_id_valid(self, db_session, test_service):
        """Test validate_service_id with valid service."""
        service = validate_service_id(db_session, test_service.id)
        assert service.id == test_service.id

    def test_validate_service_id_invalid(self, db_session):
        """Test validate_service_id with invalid service."""
        with pytest.raises(HTTPException) as exc_info:
            validate_service_id(db_session, "invalid-id")
        assert exc_info.value.status_code == 404

    def test_validate_date_range_valid(self):
        """Test validate_date_range with valid dates."""
        start = date.today()
        end = start + timedelta(days=7)
        validated_start, validated_end = validate_date_range(start, end)
        assert validated_start == start
        assert validated_end == end

    def test_validate_date_range_swapped(self):
        """Test validate_date_range with swapped dates."""
        start = date.today() + timedelta(days=7)
        end = date.today()
        validated_start, validated_end = validate_date_range(start, end)
        assert validated_start == end  # Should be swapped
        assert validated_end == start

    def test_validate_date_range_none_end(self):
        """Test validate_date_range with None end date."""
        start = date.today()
        validated_start, validated_end = validate_date_range(start, None)
        assert validated_start == start
        assert validated_end == start

    def test_validate_date_range_excessive(self):
        """Test validate_date_range with excessive range."""
        start = date.today()
        end = start + timedelta(days=400)  # More than 365 days
        with pytest.raises(HTTPException) as exc_info:
            validate_date_range(start, end)
        assert exc_info.value.status_code == 400


class TestTimeSlotGeneration:
    """Test time slot generation functions."""

    def test_generate_time_slots_for_date_success(self, db_session, test_service_provider, test_availability_template):
        """Test successful time slot generation."""
        tomorrow = date.today() + timedelta(days=1)
        
        # Ensure tomorrow is a Monday (matching the test template)
        if tomorrow.weekday() != 0:  # If not Monday
            # Find next Monday
            days_ahead = 0 - tomorrow.weekday()
            if days_ahead <= 0:  # Target day already happened this week
                days_ahead += 7
            tomorrow = tomorrow + timedelta(days_ahead)

        slots = generate_time_slots_for_date(test_service_provider.id, tomorrow, db_session)
        
        assert len(slots) > 0
        assert all(slot.provider_id == test_service_provider.id for slot in slots)
        assert all(not slot.is_booked for slot in slots)

    def test_generate_time_slots_for_date_no_template(self, db_session, test_service_provider):
        """Test time slot generation when no template exists."""
        tomorrow = date.today() + timedelta(days=1)
        
        # Find a day that doesn't have a template (not Monday in our test case)
        if tomorrow.weekday() == 0:  # If Monday, use Tuesday
            tomorrow = tomorrow + timedelta(days=1)

        slots = generate_time_slots_for_date(test_service_provider.id, tomorrow, db_session)
        assert len(slots) == 0

    def test_generate_time_slots_for_date_existing_slots(self, db_session, test_service_provider, test_availability_template):
        """Test that existing slots are returned without regeneration."""
        tomorrow = date.today() + timedelta(days=1)
        
        # Ensure tomorrow is a Monday
        if tomorrow.weekday() != 0:
            days_ahead = 0 - tomorrow.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            tomorrow = tomorrow + timedelta(days_ahead)

        # Generate slots first time
        slots1 = generate_time_slots_for_date(test_service_provider.id, tomorrow, db_session)
        
        # Generate slots second time - should return same slots
        slots2 = generate_time_slots_for_date(test_service_provider.id, tomorrow, db_session)
        
        assert len(slots1) == len(slots2)
        assert [slot.id for slot in slots1] == [slot.id for slot in slots2]

    def test_generate_time_slots_invalid_provider(self, db_session):
        """Test time slot generation with invalid provider."""
        tomorrow = date.today() + timedelta(days=1)
        
        with pytest.raises(HTTPException) as exc_info:
            generate_time_slots_for_date("invalid-id", tomorrow, db_session)
        assert exc_info.value.status_code == 404

    def test_generate_time_slots_invalid_date(self, db_session, test_service_provider):
        """Test time slot generation with invalid date."""
        with pytest.raises(HTTPException) as exc_info:
            generate_time_slots_for_date(test_service_provider.id, "invalid-date", db_session)
        assert exc_info.value.status_code == 400


class TestTimeSlotRetrieval:
    """Test time slot retrieval functions."""

    def test_get_provider_time_slots_success(self, db_session, test_service_provider, test_availability_template):
        """Test successful retrieval of provider time slots."""
        tomorrow = date.today() + timedelta(days=1)
        
        # Ensure tomorrow is a Monday
        if tomorrow.weekday() != 0:
            days_ahead = 0 - tomorrow.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            tomorrow = tomorrow + timedelta(days_ahead)

        slots = get_provider_time_slots(test_service_provider.id, tomorrow, tomorrow, db_session)
        assert len(slots) > 0
        assert all(not slot.is_booked for slot in slots)

    def test_get_provider_time_slots_invalid_provider(self, db_session):
        """Test get_provider_time_slots with invalid provider."""
        tomorrow = date.today() + timedelta(days=1)
        
        with pytest.raises(HTTPException) as exc_info:
            get_provider_time_slots("invalid-id", tomorrow, tomorrow, db_session)
        assert exc_info.value.status_code == 404

    def test_get_service_time_slots_success(self, db_session, test_service, test_availability_template):
        """Test successful retrieval of service time slots."""
        tomorrow = date.today() + timedelta(days=1)
        
        # Ensure tomorrow is a Monday
        if tomorrow.weekday() != 0:
            days_ahead = 0 - tomorrow.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            tomorrow = tomorrow + timedelta(days_ahead)

        slots = get_service_time_slots(test_service.id, tomorrow, tomorrow, db_session)
        assert len(slots) > 0

    def test_get_service_time_slots_invalid_service(self, db_session):
        """Test get_service_time_slots with invalid service."""
        tomorrow = date.today() + timedelta(days=1)
        
        with pytest.raises(HTTPException) as exc_info:
            get_service_time_slots("invalid-id", tomorrow, tomorrow, db_session)
        assert exc_info.value.status_code == 404

    def test_get_provider_schedule_slots_success(self, db_session, test_service_provider, test_availability_template):
        """Test successful retrieval of provider schedule slots."""
        tomorrow = date.today() + timedelta(days=1)
        
        # Ensure tomorrow is a Monday
        if tomorrow.weekday() != 0:
            days_ahead = 0 - tomorrow.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            tomorrow = tomorrow + timedelta(days_ahead)

        slots = get_provider_schedule_slots(test_service_provider.id, tomorrow, tomorrow, db_session)
        assert len(slots) > 0

    def test_get_provider_schedule_slots_includes_booked(self, db_session, test_service_provider, test_availability_template):
        """Test that provider schedule includes both available and booked slots."""
        tomorrow = date.today() + timedelta(days=1)
        
        # Ensure tomorrow is a Monday
        if tomorrow.weekday() != 0:
            days_ahead = 0 - tomorrow.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            tomorrow = tomorrow + timedelta(days_ahead)

        # Generate slots and mark one as booked
        slots = generate_time_slots_for_date(test_service_provider.id, tomorrow, db_session)
        if slots:
            first_slot = slots[0]
            first_slot.is_booked = True
            db_session.commit()

        # Get schedule - should include booked slot
        schedule_slots = get_provider_schedule_slots(test_service_provider.id, tomorrow, tomorrow, db_session)
        
        booked_slots = [slot for slot in schedule_slots if slot.is_booked]
        available_slots = [slot for slot in schedule_slots if not slot.is_booked]
        
        assert len(booked_slots) == 1
        assert len(available_slots) == len(slots) - 1


class TestOrphanedSlotCleanup:
    """Test orphaned slot cleanup functionality."""

    def test_cleanup_orphaned_slots_success(self, db_session, test_service_provider):
        """Test successful cleanup of orphaned slots."""
        tomorrow = date.today() + timedelta(days=1)
        
        # Create some orphaned slots manually (for a day without template)
        if tomorrow.weekday() == 0:  # If Monday, use Tuesday
            tomorrow = tomorrow + timedelta(days=1)
        
        # Create slots for a day without availability template
        slot1 = TimeSlot(
            provider_id=test_service_provider.id,
            start_time=datetime.combine(tomorrow, time(10, 0)),
            end_time=datetime.combine(tomorrow, time(11, 0)),
            is_booked=False
        )
        slot2 = TimeSlot(
            provider_id=test_service_provider.id,
            start_time=datetime.combine(tomorrow, time(11, 0)),
            end_time=datetime.combine(tomorrow, time(12, 0)),
            is_booked=True  # This should be preserved
        )
        
        db_session.add_all([slot1, slot2])
        db_session.commit()

        # Run cleanup
        cleaned_count = cleanup_orphaned_slots(db_session, test_service_provider.id)
        
        assert cleaned_count == 1  # Only unbooked slot should be cleaned
        
        # Verify results
        remaining_slots = db_session.query(TimeSlot).filter(
            TimeSlot.provider_id == test_service_provider.id
        ).all()
        
        assert len(remaining_slots) == 1
        assert remaining_slots[0].is_booked  # Only booked slot remains

    def test_cleanup_orphaned_slots_all_providers(self, db_session, test_service_provider):
        """Test cleanup for all providers when no provider_id specified."""
        tomorrow = date.today() + timedelta(days=1)
        
        # Create orphaned slot
        if tomorrow.weekday() == 0:  # If Monday, use Tuesday
            tomorrow = tomorrow + timedelta(days=1)
        
        slot = TimeSlot(
            provider_id=test_service_provider.id,
            start_time=datetime.combine(tomorrow, time(10, 0)),
            end_time=datetime.combine(tomorrow, time(11, 0)),
            is_booked=False
        )
        
        db_session.add(slot)
        db_session.commit()

        # Run cleanup for all providers
        cleaned_count = cleanup_orphaned_slots(db_session)
        
        assert cleaned_count >= 1

    def test_cleanup_orphaned_slots_invalid_provider(self, db_session):
        """Test cleanup with invalid provider ID."""
        with pytest.raises(HTTPException) as exc_info:
            cleanup_orphaned_slots(db_session, "invalid-id")
        assert exc_info.value.status_code == 404 