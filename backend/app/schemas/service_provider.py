from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from app.schemas.user import UserResponse

class ServiceProviderBase(BaseModel):
    business_name: str
    description: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    profile_image_url: Optional[str] = None

class ServiceProviderCreate(ServiceProviderBase):
    pass

class ServiceProviderUpdate(BaseModel):
    business_name: Optional[str] = None
    description: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    profile_image_url: Optional[str] = None

class ServiceProviderResponse(ServiceProviderBase):
    id: str
    user_id: str
    rating: float
    total_reviews: int
    created_at: datetime
    user: Optional[UserResponse] = None
    
    class Config:
        from_attributes = True

class ServiceProviderSearchResponse(BaseModel):
    id: str
    business_name: str
    description: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    rating: float
    total_reviews: int
    profile_image_url: Optional[str] = None
    
    class Config:
        from_attributes = True 