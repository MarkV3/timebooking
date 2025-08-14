from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth import get_password_hash, verify_password, create_access_token, get_current_active_user
from app.models.database import User, ServiceProvider
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from app.schemas.service_provider import ServiceProviderCreate, ServiceProviderResponse

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if user already exists
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_password,
        user_type=user.user_type
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

@router.post("/register-provider", response_model=UserResponse)
async def register_service_provider(
    user: UserCreate, 
    provider_data: ServiceProviderCreate,
    db: Session = Depends(get_db)
):
    """Register a new service provider with business details"""
    # Check if user already exists
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Force user type to service_provider
    user.user_type = "service_provider"
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_password,
        user_type=user.user_type
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create service provider profile
    db_provider = ServiceProvider(
        user_id=db_user.id,
        business_name=provider_data.business_name,
        description=provider_data.description,
        phone=provider_data.phone,
        address=provider_data.address,
        city=provider_data.city,
        state=provider_data.state,
        zip_code=provider_data.zip_code,
        profile_image_url=provider_data.profile_image_url
    )
    
    db.add(db_provider)
    db.commit()
    db.refresh(db_provider)
    
    return db_user

@router.post("/login", response_model=Token)
async def login_user(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user and return access token"""
    # Find user by email
    db_user = db.query(User).filter(User.email == user_credentials.email).first()
    
    if not db_user or not verify_password(user_credentials.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not db_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": str(db_user.id)})
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_active_user)):
    """Get current authenticated user profile"""
    return current_user

@router.post("/become-provider", response_model=UserResponse)
async def become_service_provider(
    provider_data: ServiceProviderCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upgrade existing user to become a service provider"""
    # Check if user is already a service provider
    if current_user.user_type == "service_provider":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a service provider"
        )
    
    # Check if user already has a provider profile
    existing_provider = db.query(ServiceProvider).filter(ServiceProvider.user_id == current_user.id).first()
    if existing_provider:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Service provider profile already exists"
        )
    
    # Create service provider profile
    db_provider = ServiceProvider(
        user_id=current_user.id,
        business_name=provider_data.business_name,
        description=provider_data.description,
        phone=provider_data.phone,
        address=provider_data.address,
        city=provider_data.city,
        state=provider_data.state,
        zip_code=provider_data.zip_code,
        profile_image_url=provider_data.profile_image_url
    )
    
    # Update user type
    current_user.user_type = "service_provider"
    
    db.add(db_provider)
    db.commit()
    db.refresh(current_user)
    db.refresh(db_provider)
    
    return current_user 