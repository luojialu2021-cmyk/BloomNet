from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Database
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "BloomNet"
    
    # CORS - can be set via ALLOWED_ORIGINS env var (comma-separated) or defaults below
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3002,http://127.0.0.1:3002,https://this-team-1.onrender.com"
    
    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse ALLOWED_ORIGINS string into a list"""
        if isinstance(self.ALLOWED_ORIGINS, list):
            return self.ALLOWED_ORIGINS
        origins = self.ALLOWED_ORIGINS.split(',') if self.ALLOWED_ORIGINS else []
        return [origin.strip() for origin in origins if origin.strip()]
    
    # Stripe
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_SECRET_KEY: str = ""
    
    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    
    # JWT Settings
    JWT_SECRET_KEY: str = "your-jwt-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # Socket.IO
    SOCKETIO_CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,https://this-team-1.onrender.com,https://this-team.onrender.com"
    
    # Environment
    ENVIRONMENT: str = "development"
    
    # Redis (optional, for multi-instance Socket.IO)
    REDIS_URL: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
