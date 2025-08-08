"""Test configuration and fixtures for the TimeBooking backend tests."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import tempfile
import os
import uuid
from datetime import date, time

from main import app
from app.core.database import get_db, Base
from app.models.database import User, ServiceProvider, Service, AvailabilityTemplate, TimeSlot
from app.core.auth import create_access_token


# Create test database
TEST_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for testing."""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session")
def setup_database():
    """Set up test database tables."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    # Clean up test database file
    if os.path.exists("./test.db"):
        os.remove("./test.db")


@pytest.fixture
def db_session(setup_database):
    """Create a fresh database session for each test."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client():
    """Create test client."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def test_user(db_session):
    """Create a test customer user."""
    unique_email = f"test-{uuid.uuid4()}@example.com"
    user = User(
        email=unique_email,
        full_name="Test User",
        hashed_password="hashed_password_123",
        user_type="customer",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_provider_user(db_session):
    """Create a test service provider user."""
    unique_email = f"provider-{uuid.uuid4()}@example.com"
    user = User(
        email=unique_email,
        full_name="Test Provider",
        hashed_password="hashed_password_456",
        user_type="service_provider",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_service_provider(db_session, test_provider_user):
    """Create a test service provider."""
    provider = ServiceProvider(
        user_id=test_provider_user.id,
        business_name="Test Business",
        description="A test business",
        city="Test City",
        state="Test State",
        rating=4.5,
        total_reviews=10
    )
    db_session.add(provider)
    db_session.commit()
    db_session.refresh(provider)
    return provider


@pytest.fixture
def test_service(db_session, test_service_provider):
    """Create a test service."""
    service = Service(
        provider_id=test_service_provider.id,
        name="Test Service",
        description="A test service",
        duration=60,
        price=50.0,
        category="Test Category",
        is_active=True
    )
    db_session.add(service)
    db_session.commit()
    db_session.refresh(service)
    return service


@pytest.fixture
def test_availability_template(db_session, test_service_provider):
    """Create a test availability template."""
    template = AvailabilityTemplate(
        provider_id=test_service_provider.id,
        day_of_week=1,  # Monday
        start_time=time(9, 0),
        end_time=time(17, 0),
        slot_duration=60,
        is_enabled=True
    )
    db_session.add(template)
    db_session.commit()
    db_session.refresh(template)
    return template


@pytest.fixture
def auth_headers(test_user):
    """Create authentication headers for test user."""
    token = create_access_token(data={"sub": str(test_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def provider_auth_headers(test_provider_user):
    """Create authentication headers for test provider."""
    token = create_access_token(data={"sub": str(test_provider_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sample_availability_template_data():
    """Sample data for creating availability templates."""
    return {
        "day_of_week": 2,  # Tuesday
        "start_time": "10:00:00",
        "end_time": "18:00:00",
        "slot_duration": 30,
        "break_start_time": "12:00:00",
        "break_end_time": "13:00:00",
        "is_enabled": True
    }


@pytest.fixture
def sample_availability_override_data():
    """Sample data for creating availability overrides."""
    tomorrow = date.today().replace(day=date.today().day + 1)
    return {
        "override_date": tomorrow.isoformat(),
        "is_unavailable": False,
        "reason": "Special hours",
        "custom_slots": [
            {
                "start_time": "14:00:00",
                "end_time": "15:00:00",
                "is_available": True
            },
            {
                "start_time": "15:00:00",
                "end_time": "16:00:00",
                "is_available": True
            }
        ]
    } 