from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, ForeignKey, Time, Date, Float, ARRAY
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    user_type = Column(String, nullable=False)  # "customer" or "service_provider"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    service_provider = relationship("ServiceProvider", back_populates="user", uselist=False)
    bookings = relationship("Booking", back_populates="customer")

class ServiceProvider(Base):
    __tablename__ = "service_providers"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    business_name = Column(String, nullable=False)
    description = Column(Text)
    phone = Column(String)
    address = Column(String)
    city = Column(String)
    state = Column(String)
    zip_code = Column(String)
    profile_image_url = Column(String)
    rating = Column(Float, default=0.0)
    total_reviews = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="service_provider")
    services = relationship("Service", back_populates="provider")
    availability_templates = relationship("AvailabilityTemplate", back_populates="provider")
    availability_overrides = relationship("AvailabilityOverride", back_populates="provider")
    time_slots = relationship("TimeSlot", back_populates="provider")

class Service(Base):
    __tablename__ = "services"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    provider_id = Column(String, ForeignKey("service_providers.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    duration = Column(Integer, nullable=False)  # Duration in minutes
    price = Column(Float, nullable=False)
    category = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    provider = relationship("ServiceProvider", back_populates="services")
    bookings = relationship("Booking", back_populates="service")

class AvailabilityTemplate(Base):
    __tablename__ = "availability_templates"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    provider_id = Column(String, ForeignKey("service_providers.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0=Sunday, 6=Saturday
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    slot_duration = Column(Integer, nullable=False)  # in minutes
    break_start_time = Column(Time)
    break_end_time = Column(Time)
    is_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    provider = relationship("ServiceProvider", back_populates="availability_templates")

class AvailabilityOverride(Base):
    __tablename__ = "availability_overrides"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    provider_id = Column(String, ForeignKey("service_providers.id"), nullable=False)
    override_date = Column(Date, nullable=False)
    is_unavailable = Column(Boolean, default=False)
    reason = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    provider = relationship("ServiceProvider", back_populates="availability_overrides")
    custom_slots = relationship("CustomTimeSlot", back_populates="availability_override")

class CustomTimeSlot(Base):
    __tablename__ = "custom_time_slots"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    availability_override_id = Column(String, ForeignKey("availability_overrides.id"), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    is_available = Column(Boolean, default=True)
    
    # Relationships
    availability_override = relationship("AvailabilityOverride", back_populates="custom_slots")

class TimeSlot(Base):
    __tablename__ = "time_slots"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    provider_id = Column(String, ForeignKey("service_providers.id"), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    is_booked = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    provider = relationship("ServiceProvider", back_populates="time_slots")
    booking = relationship("Booking", back_populates="time_slot", uselist=False)

class Booking(Base):
    __tablename__ = "bookings"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_id = Column(String, ForeignKey("users.id"), nullable=False)
    service_id = Column(String, ForeignKey("services.id"), nullable=False)
    time_slot_id = Column(String, ForeignKey("time_slots.id"), nullable=False)
    status = Column(String, default="confirmed")  # confirmed, cancelled, completed
    notes = Column(Text)
    cancellation_reason = Column(Text)
    total_price = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    customer = relationship("User", back_populates="bookings")
    service = relationship("Service", back_populates="bookings")
    time_slot = relationship("TimeSlot", back_populates="booking")