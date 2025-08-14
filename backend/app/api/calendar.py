from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.models.database import User
from app.services.calendar_service import calendar_service
from pydantic import BaseModel
from typing import Optional
import json
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class CalendarAuthResponse(BaseModel):
    """Response for calendar authorization"""
    authorization_url: str

class CalendarTokenRequest(BaseModel):
    """Request to store calendar token"""
    auth_code: str

class CalendarStatusResponse(BaseModel):
    """Response for calendar status"""
    enabled: bool
    connected: bool

@router.get("/authorize", response_model=CalendarAuthResponse)
async def get_calendar_authorization_url(
    current_user: User = Depends(get_current_active_user)
):
    """Get Google Calendar authorization URL"""
    try:
        auth_url = calendar_service.get_authorization_url()
        return CalendarAuthResponse(authorization_url=auth_url)
    except Exception as e:
        logger.error(f"Failed to get authorization URL: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate authorization URL"
        )

@router.post("/connect")
async def connect_calendar(
    token_request: CalendarTokenRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Connect user's Google Calendar"""
    try:
        # Exchange authorization code for token
        token_data = calendar_service.exchange_code_for_token(token_request.auth_code)
        
        # Validate token by making a test API call
        if not calendar_service.validate_token(token_data):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid calendar authorization"
            )
        
        # Store token in user record
        current_user.google_calendar_token = json.dumps(token_data)
        current_user.google_calendar_enabled = True
        
        db.commit()
        
        return {"message": "Calendar connected successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to connect calendar: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to connect calendar"
        )

@router.post("/disconnect")
async def disconnect_calendar(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Disconnect user's Google Calendar"""
    try:
        current_user.google_calendar_token = None
        current_user.google_calendar_enabled = False
        
        db.commit()
        
        return {"message": "Calendar disconnected successfully"}
        
    except Exception as e:
        logger.error(f"Failed to disconnect calendar: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to disconnect calendar"
        )

@router.get("/status", response_model=CalendarStatusResponse)
async def get_calendar_status(
    current_user: User = Depends(get_current_active_user)
):
    """Get user's calendar connection status"""
    connected = False
    
    if current_user.google_calendar_token:
        try:
            token_data = json.loads(current_user.google_calendar_token)
            connected = calendar_service.validate_token(token_data)
        except Exception as e:
            logger.error(f"Failed to validate calendar token: {e}")
            connected = False
    
    return CalendarStatusResponse(
        enabled=current_user.google_calendar_enabled or False,
        connected=connected
    )

@router.post("/toggle")
async def toggle_calendar_sync(
    enabled: bool = Query(..., description="Enable or disable calendar sync"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Enable or disable calendar synchronization"""
    try:
        if enabled and not current_user.google_calendar_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Calendar must be connected before enabling sync"
            )
        
        current_user.google_calendar_enabled = enabled
        db.commit()
        
        return {"message": f"Calendar sync {'enabled' if enabled else 'disabled'}"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to toggle calendar sync: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update calendar settings"
        )
