from pydantic import BaseModel, EmailStr, Field, validator
from typing import List, Optional
from datetime import datetime
from app.utils.address_validator import (
    validate_address_line1,
    validate_city,
    validate_state,
    validate_zipcode
)

class UserProfileSearchParams(BaseModel):
    id: Optional[str] = None
    user_id: str  # Reference to auth_users
    email: EmailStr
    name: str
    bio: Optional[str] = None
    preferred_plant_types: List[str] = []
    profile_image: Optional[str] = None
class UserProfile(BaseModel):
    """User profile model"""
    id: Optional[str] = None
    user_id: str  # Reference to auth_users
    email: EmailStr
    name: str
    phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zipcode: Optional[str] = None
    bio: Optional[str] = None
    preferred_plant_types: List[str] = []
    profile_image: Optional[str] = None
    is_complete: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "68f98df60e1513a626d47041",
                "email": "john@example.com",
                "name": "John Doe",
                "phone": "123-456-7890",
                "city": "Baltimore",
                "state": "MD",
                "zipcode": "21218",
                "preferred_plant_types": ["succulent", "cactus"],
                "is_complete": True
            }
        }


class UserProfileCreate(BaseModel):
    """Create user profile request"""
    phone: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    zipcode: str = Field(..., description="5-digit or 9-digit US ZIP code")
    bio: Optional[str] = None
    preferred_plant_types: List[str] = []

    @validator("address_line1")
    def validate_address_line1_field(cls, value):
        """Validate street address line 1."""
        return validate_address_line1(value)
    
    @validator("city")
    def validate_city_field(cls, value):
        """Validate city name."""
        return validate_city(value)
    
    @validator("state")
    def validate_state_field(cls, value):
        """Validate US state abbreviation."""
        return validate_state(value)
    
    @validator("zipcode")
    def validate_zipcode_field(cls, value):
        """Validate that the zipcode is in a valid US format."""
        return validate_zipcode(value)


class UserProfileUpdate(BaseModel):
    """Update user profile request"""
    phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zipcode: Optional[str] = None
    bio: Optional[str] = None
    preferred_plant_types: Optional[List[str]] = None

    @validator("address_line1")
    def validate_address_line1_field(cls, value):
        """Validate street address line 1."""
        if value is None:
            return None
        return validate_address_line1(value)
    
    @validator("city")
    def validate_city_field(cls, value):
        """Validate city name."""
        if value is None:
            return None
        return validate_city(value)
    
    @validator("state")
    def validate_state_field(cls, value):
        """Validate US state abbreviation."""
        if value is None:
            return None
        return validate_state(value)
    
    @validator("zipcode")
    def validate_zipcode_field(cls, value):
        """Validate that the zipcode is in a valid US format."""
        if value is None:
            return None
        return validate_zipcode(value)

