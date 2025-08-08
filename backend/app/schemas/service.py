from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class ServiceBase(BaseModel):
    name: str
    description: Optional[str] = None
    duration: int  # Duration in minutes
    price: float
    category: Optional[str] = None

class ServiceCreate(ServiceBase):
    pass

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[int] = None
    price: Optional[float] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None

class ServiceResponse(ServiceBase):
    id: str
    provider_id: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True 