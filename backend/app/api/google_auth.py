from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from google_auth_oauthlib.flow import Flow
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from pydantic import BaseModel
import json

from app.core.database import get_db
from app.core.auth import create_access_token, get_password_hash
from app.models.database import User
from app.schemas.user import Token
from app.core.config import settings

router = APIRouter()

class GoogleLoginRequest(BaseModel):
    auth_code: str
    redirect_uri: str

@router.post("/google-login", response_model=Token)
async def google_login(request: GoogleLoginRequest, db: Session = Depends(get_db)):
    flow = Flow.from_client_config(
        client_config={
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [request.redirect_uri]
            }
        },
        scopes=[
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/userinfo.email",
            "openid",
            "https://www.googleapis.com/auth/calendar"
        ]
    )
    flow.redirect_uri = request.redirect_uri

    try:
        flow.fetch_token(code=request.auth_code)
        credentials = flow.credentials

        idinfo = id_token.verify_oauth2_token(credentials.id_token, google_requests.Request(), settings.GOOGLE_CLIENT_ID)
        
        email = idinfo.get("email")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email not found in Google token"
            )

        user = db.query(User).filter(User.email == email).first()

        token_data = {
            'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'scopes': credentials.scopes
        }

        if not user:
            # Create a new user
            placeholder_password = get_password_hash("google_auth_placeholder_" + email)
            new_user = User(
                email=email,
                full_name=idinfo.get("name", ""),
                hashed_password=placeholder_password,
                user_type='customer',
                is_active=True,
                auth_provider='google',
                google_calendar_token=json.dumps(token_data),
                google_calendar_enabled=True
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            user = new_user
        else:
            # Update existing user
            user.auth_provider = 'google'
            user.google_calendar_token = json.dumps(token_data)
            user.google_calendar_enabled = True
            db.commit()
            db.refresh(user)

        access_token = create_access_token(data={"sub": str(user.id)})
        return {"access_token": access_token, "token_type": "bearer"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )
