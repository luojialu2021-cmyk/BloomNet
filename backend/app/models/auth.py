from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    """User role enum"""
    USER = "user"
    SITTER = "sitter"
    ADMIN = "admin"


class AuthProvider(str, Enum):
    """Authentication provider enum"""
    GOOGLE = "google"
    EMAIL = "email"


class TokenData(BaseModel):
    """JWT token data"""
    user_id: str
    email: str
    role: UserRole
    exp: Optional[datetime] = None


class GoogleAuthRequest(BaseModel):
    """Google OAuth authentication request"""
    credential: str  # Google ID token
    role: UserRole = UserRole.USER  # Whether registering as user or sitter

    class Config:
        json_schema_extra = {
            "example": {
                "credential": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
                "role": "user"
            }
        }


class AuthResponse(BaseModel):
    """Authentication response"""
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    name: str
    role: UserRole
    is_new_user: bool = False

    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIs...",
                "token_type": "bearer",
                "user_id": "user_123",
                "email": "john@example.com",
                "name": "John Doe",
                "role": "user",
                "is_new_user": False
            }
        }


class AuthUser(BaseModel):
    """Authenticated user information"""
    id: Optional[str] = None
    email: EmailStr
    name: str
    google_id: Optional[str] = None
    profile_image: Optional[str] = None
    role: UserRole = UserRole.USER
    auth_provider: AuthProvider = AuthProvider.GOOGLE
    is_active: bool = True
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

    class Config:
        json_schema_extra = {
            "example": {
                "email": "john@example.com",
                "name": "John Doe",
                "google_id": "1234567890",
                "profile_image": "https://lh3.googleusercontent.com/...",
                "role": "user",
                "auth_provider": "google"
            }
        }

