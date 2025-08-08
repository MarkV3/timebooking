from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime

class BookingBase(BaseModel):
    service_id: str
    time_slot_id: str
    notes: Optional[str] = None

class BookingCreate(BookingBase):
    pass

class BookingCancel(BaseModel):
    reason: Optional[str] = None

class BookingUpdate(BaseModel):
    status: Optional[str] = None  # confirmed, cancelled, completed
    notes: Optional[str] = None

class BookingResponse(BookingBase):
    id: str
    customer_id: str
    status: str
    total_price: float
    created_at: datetime
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat() if dt else None
        }

class BookingWithCustomerResponse(BookingResponse):
    customer_name: str
    customer_email: str
    service_name: str
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat() if dt else None
        }

class BookingWithDetailsResponse(BookingResponse):
    service_name: str
    service_description: Optional[str] = None
    provider_name: str
    provider_id: str
    appointment_start_time: datetime
    appointment_end_time: datetime
    customer_name: Optional[str] = None  # Only present for service providers
    customer_email: Optional[str] = None  # Only present for service providers
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat() if dt else None
        }

class TimeSlotBase(BaseModel):
    start_time: datetime
    end_time: datetime

class TimeSlotResponse(TimeSlotBase):
    id: str
    provider_id: str
    is_booked: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat() if dt else None
        }

class ProviderScheduleSlotResponse(TimeSlotBase):
    id: str
    provider_id: str
    is_booked: bool
    created_at: datetime
    booking: Optional[BookingWithCustomerResponse] = None
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat() if dt else None
        } 