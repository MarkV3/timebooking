"""Tests for the availability service module."""

import pytest
from datetime import date, time, timedelta
from fastapi import HTTPException

from app.services.availability import AvailabilityService
from app.models.availability import (
    AvailabilityTemplateCreate,
    AvailabilityTemplateUpdate,
    AvailabilityOverrideCreate,
    AvailabilityOverrideUpdate,
    BulkAvailabilityRequest,
    CustomTimeSlot,
)
from app.models.database import AvailabilityTemplate, AvailabilityOverride


class TestAvailabilityService:
    """Test cases for AvailabilityService."""

    def test_validate_provider_exists_valid(self, db_session, test_service_provider):
        """Test that validate_provider_exists works with valid provider."""
        # Should not raise an exception
        provider = AvailabilityService.validate_provider_exists(db_session, test_service_provider.id)
        assert provider.id == test_service_provider.id

    def test_validate_provider_exists_invalid(self, db_session):
        """Test that validate_provider_exists raises exception for invalid provider."""
        with pytest.raises(HTTPException) as exc_info:
            AvailabilityService.validate_provider_exists(db_session, "invalid-id")
        assert exc_info.value.status_code == 404

    def test_validate_time_range_valid(self):
        """Test time range validation with valid times."""
        # Should not raise an exception
        AvailabilityService.validate_time_range(time(9, 0), time(17, 0))

    def test_validate_time_range_invalid(self):
        """Test time range validation with invalid times."""
        with pytest.raises(HTTPException) as exc_info:
            AvailabilityService.validate_time_range(time(17, 0), time(9, 0))
        assert exc_info.value.status_code == 400

    def test_validate_break_times_valid(self):
        """Test break time validation with valid times."""
        # Should not raise an exception
        AvailabilityService.validate_break_times(
            time(9, 0), time(17, 0), time(12, 0), time(13, 0)
        )

    def test_validate_break_times_invalid_order(self):
        """Test break time validation with invalid order."""
        with pytest.raises(HTTPException) as exc_info:
            AvailabilityService.validate_break_times(
                time(9, 0), time(17, 0), time(13, 0), time(12, 0)
            )
        assert exc_info.value.status_code == 400

    def test_validate_break_times_outside_working_hours(self):
        """Test break time validation outside working hours."""
        with pytest.raises(HTTPException) as exc_info:
            AvailabilityService.validate_break_times(
                time(9, 0), time(17, 0), time(8, 0), time(10, 0)
            )
        assert exc_info.value.status_code == 400

    def test_get_availability_templates(self, db_session, test_service_provider, test_availability_template):
        """Test getting availability templates for a provider."""
        templates = AvailabilityService.get_availability_templates(db_session, test_service_provider.id)
        assert len(templates) == 1
        assert templates[0].id == test_availability_template.id

    def test_get_availability_templates_empty(self, db_session, test_service_provider):
        """Test getting availability templates when none exist."""
        templates = AvailabilityService.get_availability_templates(db_session, test_service_provider.id)
        assert len(templates) == 0

    def test_create_availability_template_success(self, db_session, test_service_provider):
        """Test successful creation of availability template."""
        template_data = AvailabilityTemplateCreate(
            day_of_week=2,
            start_time=time(10, 0),
            end_time=time(18, 0),
            slot_duration=30,
            is_enabled=True
        )

        template = AvailabilityService.create_availability_template(
            db_session, test_service_provider.id, template_data
        )

        assert template.provider_id == test_service_provider.id
        assert template.day_of_week == 2
        assert template.start_time == time(10, 0)
        assert template.slot_duration == 30

    def test_create_availability_template_duplicate(self, db_session, test_service_provider, test_availability_template):
        """Test creating duplicate availability template raises exception."""
        template_data = AvailabilityTemplateCreate(
            day_of_week=test_availability_template.day_of_week,  # Same day as existing
            start_time=time(10, 0),
            end_time=time(18, 0),
            slot_duration=30,
            is_enabled=True
        )

        with pytest.raises(HTTPException) as exc_info:
            AvailabilityService.create_availability_template(
                db_session, test_service_provider.id, template_data
            )
        assert exc_info.value.status_code == 409

    def test_update_availability_template_success(self, db_session, test_service_provider, test_availability_template):
        """Test successful update of availability template."""
        update_data = AvailabilityTemplateUpdate(
            start_time=time(8, 0),
            slot_duration=45
        )

        updated_template = AvailabilityService.update_availability_template(
            db_session, test_service_provider.id, test_availability_template.id, update_data
        )

        assert updated_template.start_time == time(8, 0)
        assert updated_template.slot_duration == 45
        # Other fields should remain unchanged
        assert updated_template.end_time == test_availability_template.end_time

    def test_update_availability_template_not_found(self, db_session, test_service_provider):
        """Test updating non-existent availability template."""
        update_data = AvailabilityTemplateUpdate(start_time=time(8, 0))

        with pytest.raises(HTTPException) as exc_info:
            AvailabilityService.update_availability_template(
                db_session, test_service_provider.id, "invalid-id", update_data
            )
        assert exc_info.value.status_code == 404

    def test_delete_availability_template_success(self, db_session, test_service_provider, test_availability_template):
        """Test successful deletion of availability template."""
        result = AvailabilityService.delete_availability_template(
            db_session, test_service_provider.id, test_availability_template.id
        )

        assert result is True
        # Verify it's actually deleted
        template = db_session.query(AvailabilityTemplate).filter(
            AvailabilityTemplate.id == test_availability_template.id
        ).first()
        assert template is None

    def test_delete_availability_template_not_found(self, db_session, test_service_provider):
        """Test deleting non-existent availability template."""
        with pytest.raises(HTTPException) as exc_info:
            AvailabilityService.delete_availability_template(
                db_session, test_service_provider.id, "invalid-id"
            )
        assert exc_info.value.status_code == 404

    def test_create_availability_override_success(self, db_session, test_service_provider):
        """Test successful creation of availability override."""
        tomorrow = date.today() + timedelta(days=1)
        override_data = AvailabilityOverrideCreate(
            override_date=tomorrow,
            is_unavailable=False,
            reason="Special hours",
            custom_slots=[
                CustomTimeSlot(start_time=time(14, 0), end_time=time(15, 0), is_available=True)
            ]
        )

        override = AvailabilityService.create_availability_override(
            db_session, test_service_provider.id, override_data
        )

        assert override.provider_id == test_service_provider.id
        assert override.override_date == tomorrow
        assert override.reason == "Special hours"
        assert len(override.custom_slots) == 1

    def test_create_availability_override_duplicate(self, db_session, test_service_provider):
        """Test creating duplicate availability override raises exception."""
        tomorrow = date.today() + timedelta(days=1)
        
        # Create first override
        override_data = AvailabilityOverrideCreate(
            override_date=tomorrow,
            is_unavailable=True,
            reason="Closed"
        )
        AvailabilityService.create_availability_override(
            db_session, test_service_provider.id, override_data
        )

        # Try to create another for same date
        with pytest.raises(HTTPException) as exc_info:
            AvailabilityService.create_availability_override(
                db_session, test_service_provider.id, override_data
            )
        assert exc_info.value.status_code == 409

    def test_get_availability_overrides(self, db_session, test_service_provider):
        """Test getting availability overrides for a provider."""
        tomorrow = date.today() + timedelta(days=1)
        override_data = AvailabilityOverrideCreate(
            override_date=tomorrow,
            is_unavailable=True,
            reason="Closed"
        )
        
        created_override = AvailabilityService.create_availability_override(
            db_session, test_service_provider.id, override_data
        )

        overrides = AvailabilityService.get_availability_overrides(db_session, test_service_provider.id)
        assert len(overrides) == 1
        assert overrides[0].id == created_override.id

    def test_update_availability_override_success(self, db_session, test_service_provider):
        """Test successful update of availability override."""
        tomorrow = date.today() + timedelta(days=1)
        override_data = AvailabilityOverrideCreate(
            override_date=tomorrow,
            is_unavailable=False,
            reason="Special hours"
        )
        
        created_override = AvailabilityService.create_availability_override(
            db_session, test_service_provider.id, override_data
        )

        update_data = AvailabilityOverrideUpdate(
            reason="Updated reason",
            is_unavailable=True
        )

        updated_override = AvailabilityService.update_availability_override(
            db_session, test_service_provider.id, created_override.id, update_data
        )

        assert updated_override.reason == "Updated reason"
        assert updated_override.is_unavailable is True

    def test_delete_availability_override_success(self, db_session, test_service_provider):
        """Test successful deletion of availability override."""
        tomorrow = date.today() + timedelta(days=1)
        override_data = AvailabilityOverrideCreate(
            override_date=tomorrow,
            is_unavailable=True,
            reason="Closed"
        )
        
        created_override = AvailabilityService.create_availability_override(
            db_session, test_service_provider.id, override_data
        )

        result = AvailabilityService.delete_availability_override(
            db_session, test_service_provider.id, created_override.id
        )

        assert result is True
        # Verify it's actually deleted
        override = db_session.query(AvailabilityOverride).filter(
            AvailabilityOverride.id == created_override.id
        ).first()
        assert override is None

    def test_generate_availability_slots_success(self, db_session, test_service_provider, test_availability_template):
        """Test successful generation of availability slots."""
        start_date = date.today() + timedelta(days=1)  # Tomorrow
        end_date = start_date + timedelta(days=1)  # Day after tomorrow
        
        request = BulkAvailabilityRequest(
            start_date=start_date,
            end_date=end_date
        )

        response = AvailabilityService.generate_availability_slots(
            db_session, test_service_provider.id, request
        )

        assert len(response.dates) == 2  # Two days
        for availability_response in response.dates:
            assert availability_response.response_date in [start_date, end_date]

    def test_generate_availability_slots_invalid_date_range(self, db_session, test_service_provider):
        """Test generate availability slots with invalid date range."""
        start_date = date.today() + timedelta(days=2)
        end_date = date.today() + timedelta(days=1)  # Earlier than start
        
        request = BulkAvailabilityRequest(
            start_date=start_date,
            end_date=end_date
        )

        with pytest.raises(HTTPException) as exc_info:
            AvailabilityService.generate_availability_slots(
                db_session, test_service_provider.id, request
            )
        assert exc_info.value.status_code == 400 