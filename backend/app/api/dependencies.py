from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.auth import get_current_active_user
from app.core.database import get_db
from app.models.database import User, ServiceProvider

def get_current_provider(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> ServiceProvider:
    """
    Dependency to get the current user's service provider profile.
    Raises HTTPException if the user is not a service provider or has no profile.
    """
    if current_user.user_type != "service_provider":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to service providers only."
        )

    provider = db.query(ServiceProvider).filter(ServiceProvider.user_id == current_user.id).first()
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service provider profile not found for the current user."
        )

    return provider
