from typing import List, Union
from pydantic import validator
from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "TimeBooking API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",  # Frontend dev server
        "http://localhost:8000",  # Backend dev server
    ]

    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list):
            return v
        return [v] if isinstance(v, str) else []

    # Database - using SQLite for easier local development
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./timebooking.db"
    )
    
    # Security
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY", 
        "your-super-secret-key-change-this-in-production-to-something-very-long-and-random"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Debug
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"

    # Google Auth
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "your-google-client-id")

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings() 