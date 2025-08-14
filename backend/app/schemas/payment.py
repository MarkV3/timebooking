from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PaymentIntentCreate(BaseModel):
    """Schema for creating a payment intent"""
    booking_id: str
    amount: float  # Amount in dollars
    currency: str = "usd"

class PaymentIntentResponse(BaseModel):
    """Response schema for payment intent creation"""
    client_secret: str
    payment_intent_id: str
    amount: float
    currency: str

class PaymentConfirm(BaseModel):
    """Schema for confirming a payment"""
    payment_intent_id: str
    booking_id: str

class PaymentResponse(BaseModel):
    """Response schema for payment information"""
    id: str
    booking_id: str
    stripe_payment_intent_id: str
    amount: float
    currency: str
    status: str
    payment_method: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class RefundCreate(BaseModel):
    """Schema for creating a refund"""
    payment_intent_id: str
    amount: Optional[float] = None  # None for full refund
    reason: Optional[str] = None

class RefundResponse(BaseModel):
    """Response schema for refund information"""
    id: str
    payment_intent_id: str
    amount: float
    status: str
    reason: Optional[str] = None
