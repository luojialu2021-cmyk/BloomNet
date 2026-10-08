from pydantic import BaseModel, EmailStr, Field, validator
from typing import List, Optional
from datetime import datetime
from app.utils.address_validator import (
    validate_address_line1,
    validate_city,
    validate_state,
    validate_zipcode
)


class SitterProfileData(BaseModel):
    """Sitter profile model for database"""
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
    campus_area: Optional[str] = None
    bio: Optional[str] = None
    tagline: Optional[str] = None
    specialties: List[str] = []
    service_areas: List[str] = []  # ZIP codes or neighborhoods
    years_experience: Optional[int] = None
    price_per_visit: Optional[float] = None
    price_per_day: Optional[float] = None
    price_per_week: Optional[float] = None
    profile_image: Optional[str] = None
    is_complete: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "68f98df60e1513a626d47041",
                "email": "sitter@example.com",
                "name": "Jane Doe",
                "phone": "123-456-7890",
                "city": "Baltimore",
                "state": "MD",
                "zipcode": "21218",
                "campus_area": "Homewood",
                "bio": "Experienced plant sitter",
                "specialties": ["succulent", "cactus"],
                "years_experience": 3,
                "price_per_visit": 15.0,
                "is_complete": True
            }
        }


class SitterProfileCreate(BaseModel):
    """Create sitter profile request"""
    phone: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    zipcode: str = Field(..., description="5-digit or 9-digit US ZIP code")
    campus_area: Optional[str] = None
    bio: Optional[str] = None
    tagline: Optional[str] = None
    specialties: List[str] = []
    # service_areas is auto-generated from zipcode, not user input
    years_experience: Optional[int] = None
    price_per_visit: Optional[float] = None
    price_per_day: Optional[float] = None
    price_per_week: Optional[float] = None

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


class SitterProfileUpdate(BaseModel):
    """Update sitter profile request"""
    phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zipcode: Optional[str] = None
    campus_area: Optional[str] = None
    bio: Optional[str] = None
    tagline: Optional[str] = None
    specialties: Optional[List[str]] = None
    # service_areas is auto-generated from zipcode, not user input
    years_experience: Optional[int] = None
    price_per_visit: Optional[float] = None
    price_per_day: Optional[float] = None
    price_per_week: Optional[float] = None

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

