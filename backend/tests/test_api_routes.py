"""Tests for the API routes."""

import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient

from main import app


class TestAvailabilityTemplateRoutes:
    """Test availability template API routes."""

    def test_get_availability_templates_success(self, client, test_service_provider, test_availability_template, provider_auth_headers):
        """Test successful retrieval of availability templates."""
        response = client.get(
            f"/api/v1/providers/{test_service_provider.id}/availability/templates",
            headers=provider_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == test_availability_template.id

    def test_get_availability_templates_not_found(self, client, provider_auth_headers):
        """Test get availability templates for non-existent provider."""
        response = client.get(
            "/api/v1/providers/invalid-id/availability/templates",
            headers=provider_auth_headers
        )
        
        assert response.status_code == 404

    def test_create_availability_template_success(self, client, test_service_provider, provider_auth_headers, sample_availability_template_data):
        """Test successful creation of availability template."""
        response = client.post(
            f"/api/v1/providers/{test_service_provider.id}/availability/templates",
            json=sample_availability_template_data,
            headers=provider_auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["provider_id"] == test_service_provider.id
        assert data["day_of_week"] == sample_availability_template_data["day_of_week"]

    def test_create_availability_template_duplicate(self, client, test_service_provider, test_availability_template, provider_auth_headers):
        """Test creating duplicate availability template."""
        duplicate_data = {
            "day_of_week": test_availability_template.day_of_week,  # Same day
            "start_time": "10:00:00",
            "end_time": "18:00:00",
            "slot_duration": 30,
            "is_enabled": True
        }
        
        response = client.post(
            f"/api/v1/providers/{test_service_provider.id}/availability/templates",
            json=duplicate_data,
            headers=provider_auth_headers
        )
        
        assert response.status_code == 409

    def test_create_availability_template_invalid_times(self, client, test_service_provider, provider_auth_headers):
        """Test creating availability template with invalid times."""
        invalid_data = {
            "day_of_week": 3,
            "start_time": "18:00:00",  # Start after end
            "end_time": "10:00:00",
            "slot_duration": 30,
            "is_enabled": True
        }
        
        response = client.post(
            f"/api/v1/providers/{test_service_provider.id}/availability/templates",
            json=invalid_data,
            headers=provider_auth_headers
        )
        
        assert response.status_code == 400

    def test_update_availability_template_success(self, client, test_service_provider, test_availability_template, provider_auth_headers):
        """Test successful update of availability template."""
        update_data = {
            "start_time": "08:00:00",
            "slot_duration": 45
        }
        
        response = client.put(
            f"/api/v1/providers/{test_service_provider.id}/availability/templates/{test_availability_template.id}",
            json=update_data,
            headers=provider_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["start_time"] == "08:00:00"
        assert data["slot_duration"] == 45

    def test_update_availability_template_not_found(self, client, test_service_provider, provider_auth_headers):
        """Test updating non-existent availability template."""
        update_data = {"start_time": "08:00:00"}
        
        response = client.put(
            f"/api/v1/providers/{test_service_provider.id}/availability/templates/invalid-id",
            json=update_data,
            headers=provider_auth_headers
        )
        
        assert response.status_code == 404

    def test_delete_availability_template_success(self, client, test_service_provider, test_availability_template, provider_auth_headers):
        """Test successful deletion of availability template."""
        response = client.delete(
            f"/api/v1/providers/{test_service_provider.id}/availability/templates/{test_availability_template.id}",
            headers=provider_auth_headers
        )
        
        assert response.status_code == 204

    def test_delete_availability_template_not_found(self, client, test_service_provider, provider_auth_headers):
        """Test deleting non-existent availability template."""
        response = client.delete(
            f"/api/v1/providers/{test_service_provider.id}/availability/templates/invalid-id",
            headers=provider_auth_headers
        )
        
        assert response.status_code == 404


class TestAvailabilityOverrideRoutes:
    """Test availability override API routes."""

    def test_get_availability_overrides_empty(self, client, test_service_provider, provider_auth_headers):
        """Test get availability overrides when none exist."""
        response = client.get(
            f"/api/v1/providers/{test_service_provider.id}/availability/overrides",
            headers=provider_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0

    def test_create_availability_override_success(self, client, test_service_provider, provider_auth_headers, sample_availability_override_data):
        """Test successful creation of availability override."""
        response = client.post(
            f"/api/v1/providers/{test_service_provider.id}/availability/overrides",
            json=sample_availability_override_data,
            headers=provider_auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["provider_id"] == test_service_provider.id
        assert data["override_date"] == sample_availability_override_data["override_date"]

    def test_create_availability_override_duplicate(self, client, test_service_provider, provider_auth_headers, sample_availability_override_data):
        """Test creating duplicate availability override."""
        # Create first override
        client.post(
            f"/api/v1/providers/{test_service_provider.id}/availability/overrides",
            json=sample_availability_override_data,
            headers=provider_auth_headers
        )
        
        # Try to create another for same date
        response = client.post(
            f"/api/v1/providers/{test_service_provider.id}/availability/overrides",
            json=sample_availability_override_data,
            headers=provider_auth_headers
        )
        
        assert response.status_code == 409

    def test_get_availability_overrides_with_data(self, client, test_service_provider, provider_auth_headers, sample_availability_override_data):
        """Test get availability overrides after creating one."""
        # Create override first
        create_response = client.post(
            f"/api/v1/providers/{test_service_provider.id}/availability/overrides",
            json=sample_availability_override_data,
            headers=provider_auth_headers
        )
        created_override = create_response.json()
        
        # Get overrides
        response = client.get(
            f"/api/v1/providers/{test_service_provider.id}/availability/overrides",
            headers=provider_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == created_override["id"]

    def test_update_availability_override_success(self, client, test_service_provider, provider_auth_headers, sample_availability_override_data):
        """Test successful update of availability override."""
        # Create override first
        create_response = client.post(
            f"/api/v1/providers/{test_service_provider.id}/availability/overrides",
            json=sample_availability_override_data,
            headers=provider_auth_headers
        )
        created_override = create_response.json()
        
        # Update override
        update_data = {
            "reason": "Updated reason",
            "is_unavailable": True
        }
        
        response = client.put(
            f"/api/v1/providers/{test_service_provider.id}/availability/overrides/{created_override['id']}",
            json=update_data,
            headers=provider_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["reason"] == "Updated reason"
        assert data["is_unavailable"] is True

    def test_delete_availability_override_success(self, client, test_service_provider, provider_auth_headers, sample_availability_override_data):
        """Test successful deletion of availability override."""
        # Create override first
        create_response = client.post(
            f"/api/v1/providers/{test_service_provider.id}/availability/overrides",
            json=sample_availability_override_data,
            headers=provider_auth_headers
        )
        created_override = create_response.json()
        
        # Delete override
        response = client.delete(
            f"/api/v1/providers/{test_service_provider.id}/availability/overrides/{created_override['id']}",
            headers=provider_auth_headers
        )
        
        assert response.status_code == 204


class TestAvailabilityGenerationRoutes:
    """Test availability generation API routes."""

    def test_generate_availability_slots_success(self, client, test_service_provider, test_availability_template, provider_auth_headers):
        """Test successful generation of availability slots."""
        start_date = date.today() + timedelta(days=1)
        end_date = start_date + timedelta(days=3)
        
        request_data = {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        }
        
        response = client.post(
            f"/api/v1/providers/{test_service_provider.id}/availability/generate",
            json=request_data,
            headers=provider_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "dates" in data
        assert len(data["dates"]) == 4  # 4 days total

    def test_generate_availability_slots_invalid_date_range(self, client, test_service_provider, provider_auth_headers):
        """Test generate availability slots with invalid date range."""
        start_date = date.today() + timedelta(days=3)
        end_date = date.today() + timedelta(days=1)  # End before start
        
        request_data = {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        }
        
        response = client.post(
            f"/api/v1/providers/{test_service_provider.id}/availability/generate",
            json=request_data,
            headers=provider_auth_headers
        )
        
        assert response.status_code == 400

    def test_generate_availability_slots_provider_not_found(self, client, provider_auth_headers):
        """Test generate availability slots for non-existent provider."""
        start_date = date.today() + timedelta(days=1)
        end_date = start_date + timedelta(days=3)
        
        request_data = {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        }
        
        response = client.post(
            "/api/v1/providers/invalid-id/availability/generate",
            json=request_data,
            headers=provider_auth_headers
        )
        
        assert response.status_code == 404


class TestRouteAuthorization:
    """Test route authorization requirements."""

    def test_availability_templates_requires_auth(self, client, test_service_provider):
        """Test that availability template routes require authentication."""
        response = client.get(
            f"/api/v1/providers/{test_service_provider.id}/availability/templates"
        )
        
        assert response.status_code in [401, 403]  # Either unauthorized or forbidden

    def test_availability_overrides_requires_auth(self, client, test_service_provider):
        """Test that availability override routes require authentication."""
        response = client.get(
            f"/api/v1/providers/{test_service_provider.id}/availability/overrides"
        )
        
        assert response.status_code in [401, 403]  # Either unauthorized or forbidden

    def test_availability_generation_requires_auth(self, client, test_service_provider):
        """Test that availability generation routes require authentication."""
        request_data = {
            "start_date": date.today().isoformat(),
            "end_date": date.today().isoformat()
        }
        
        response = client.post(
            f"/api/v1/providers/{test_service_provider.id}/availability/generate",
            json=request_data
        )
        
        assert response.status_code in [401, 403]  # Either unauthorized or forbidden


class TestApiRootRoute:
    """Test API root route."""

    def test_api_root(self, client):
        """Test API root endpoint."""
        response = client.get("/api/v1/")
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "TimeBooking API v1" in data["message"]


class TestServicesRoute:
    """Test services route (placeholder)."""

    def test_get_services_placeholder(self, client):
        """Test services placeholder endpoint."""
        response = client.get("/api/v1/services")
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "to be implemented" in data["message"] 