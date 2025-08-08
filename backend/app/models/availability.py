# This module has been moved to app.schemas.availability for better separation of concerns.
# Keeping this proxy to avoid breaking existing imports until all references are updated.

from app.schemas.availability import *  # re-export for backward compatibility

from datetime import datetime, time, date
from typing import List, Optional
from pydantic import BaseModel, Field


class AvailabilityTemplateBase(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6, description="Day of week (0=Sunday, 6=Saturday)")
    start_time: time = Field(..., description="Start time for the day")
    end_time: time = Field(..., description="End time for the day")
    slot_duration: int = Field(..., gt=0, description="Slot duration in minutes")
    break_start_time: Optional[time] = Field(None, description="Break start time")
    break_end_time: Optional[time] = Field(None, description="Break end time")
    is_enabled: bool = Field(True, description="Whether this day is available")


class AvailabilityTemplateCreate(AvailabilityTemplateBase):
    pass


class AvailabilityTemplateUpdate(BaseModel):
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    slot_duration: Optional[int] = Field(None, gt=0)
    break_start_time: Optional[time] = None
    break_end_time: Optional[time] = None
    is_enabled: Optional[bool] = None


class AvailabilityTemplateResponse(AvailabilityTemplateBase):
    id: str
    provider_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CustomTimeSlot(BaseModel):
    start_time: time = Field(..., description="Slot start time")
    end_time: time = Field(..., description="Slot end time")
    is_available: bool = Field(True, description="Whether this slot is available")


class AvailabilityOverrideBase(BaseModel):
    override_date: date = Field(..., description="Date for the override")
    custom_slots: List[CustomTimeSlot] = Field(default_factory=list, description="Custom time slots")
    is_unavailable: bool = Field(False, description="Mark the entire day as unavailable")
    reason: Optional[str] = Field(None, description="Reason for the override")


class AvailabilityOverrideCreate(AvailabilityOverrideBase):
    pass


class AvailabilityOverrideUpdate(BaseModel):
    override_date: Optional[date] = None
    custom_slots: Optional[List[CustomTimeSlot]] = None
    is_unavailable: Optional[bool] = None
    reason: Optional[str] = None


class AvailabilityOverrideResponse(AvailabilityOverrideBase):
    id: str
    provider_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class GeneratedTimeSlot(BaseModel):
    start_time: datetime
    end_time: datetime
    is_available: bool
    is_booked: bool = False


class AvailabilityResponse(BaseModel):
    response_date: date
    slots: List[GeneratedTimeSlot]
    source: str = Field(..., description="Source of availability: 'template', 'override', or 'unavailable'")


class BulkAvailabilityRequest(BaseModel):
    start_date: date
    end_date: date


class BulkAvailabilityResponse(BaseModel):
    dates: List[AvailabilityResponse] 