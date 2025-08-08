from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from pydantic import BaseModel

from app.core.database import get_db
from app.core.auth import create_access_token, get_password_hash
from app.models.database import User
from app.schemas.user import UserCreate, UserResponse, Token
from app.core.config import settings

router = APIRouter()

class GoogleLoginRequest(BaseModel):
    token: str

@router.post("/google-login", response_model=Token)
async def google_login(request: GoogleLoginRequest, db: Session = Depends(get_db)):
    try:
        idinfo = id_token.verify_oauth2_token(request.token, google_requests.Request(), settings.GOOGLE_CLIENT_ID)
        
        email = idinfo.get("email")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email not found in Google token"
            )

        user = db.query(User).filter(User.email == email).first()

        if not user:
            # Create a new user with a placeholder password (Google auth users don't need passwords)
            # We use a random hash as a placeholder since hashed_password is required
            placeholder_password = get_password_hash("google_auth_placeholder_" + email)
            new_user = User(
                email=email,
                full_name=idinfo.get("name", ""),
                hashed_password=placeholder_password,
                user_type='customer',
                is_active=True
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            user = new_user

        access_token = create_access_token(data={"sub": str(user.id)})
        return {"access_token": access_token, "token_type": "bearer"}

    except ValueError:
        # Invalid token
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token",
            headers={"WWW-Authenticate": "Bearer"},
        )

