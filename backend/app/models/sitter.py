from typing import Optional, List
from pydantic import BaseModel, Field, field_validator, validator
from datetime import datetime, date
from bson import ObjectId
from app.models.user import PyObjectId
from app.utils.address_validator import (
    validate_address_line1,
    validate_city,
    validate_state,
    validate_zipcode
)


class Availability(BaseModel):
    date: date
    available: bool = True
    time_slots: List[str] = []  # e.g., ["morning", "afternoon", "evening"]


class Address(BaseModel):
    address_1: str = Field(..., description="Street address line 1")
    address_2: Optional[str] = Field(None, description="Street address line 2 (apartment, suite, etc.)")
    city: str = Field(..., description="City name")
    state: str = Field(..., description="State abbreviation (e.g., MD, CA)")
    zipcode: str = Field(..., description="ZIP code")
    
    @validator("address_1")
    def validate_address_1_field(cls, value):
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
        """Validate ZIP code format."""
        return validate_zipcode(value)
    
    def full_address(self) -> str:
        """Return full address as a single string for geocoding"""
        parts = [self.address_1]
        if self.address_2:
            parts.append(self.address_2)
        parts.extend([self.city, self.state, self.zipcode])
        return ", ".join(parts)


class SitterProfile(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId
    
    # Basic info
    name: str
    email: Optional[str] = None  # Sitter email for matching
    tagline: Optional[str] = None
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    
    # Location details
    address: Address
    campus_area: Optional[str] = Field(None, description="Campus area: Homewood, East Baltimore, Peabody, or Other")
    service_radius_miles: float = Field(default=10.0, description="Service radius in miles")
    
    # Pricing
    price_per_visit: float = 0.0
    price_per_day: Optional[float] = None
    price_per_week: Optional[float] = None
    
    # Service details
    service_areas: List[str] = []  # zip codes or campus areas (keeping for backward compatibility)
    specialties: List[str] = []  # plant types or care specialties
    badges: List[str] = []  # achievements or certifications
    experience_level: str = Field(default="beginner", description="Experience level: beginner, intermediate, expert")
    
    # Ratings and experience
    rating: float = 0.0
    total_reviews: int = 0
    years_experience: Optional[int] = None
    
    # Availability
    is_available: bool = True
    availability_calendar: List[Availability] = []
    unavailable_dates: List[date] = []
    
    # Account status
    is_active: bool = True
    is_verified: bool = False
    background_checked: bool = False
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str, date: str}
    }


class SitterCreate(BaseModel):
    user_id: str
    name: str
    email: Optional[str] = None  # Sitter email for matching
    tagline: Optional[str] = None
    bio: Optional[str] = None
    address: Address
    campus_area: Optional[str] = None
    price_per_visit: float
    service_radius_miles: float = 10.0
    service_areas: List[str] = []  # keeping for backward compatibility
    specialties: List[str] = []
    experience_level: str = "beginner"

    @field_validator("user_id")
    def validate_user_id(cls, v):
        try:
            return ObjectId(v)
        except Exception:
            raise ValueError("Invalid user_id, must be a valid ObjectId string")

class SitterUpdate(BaseModel):
    name: Optional[str] = None
    tagline: Optional[str] = None
    bio: Optional[str] = None
    address: Optional[Address] = None
    campus_area: Optional[str] = None
    price_per_visit: Optional[float] = None
    service_radius_miles: Optional[float] = None
    service_areas: Optional[List[str]] = None
    specialties: Optional[List[str]] = None
    experience_level: Optional[str] = None
    is_available: Optional[bool] = None


class SitterSearchParams(BaseModel):
    zip_code: Optional[str] = None
    campus_area: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    plant_type: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    min_rating: Optional[float] = None
    specialties: Optional[List[str]] = None
    experience_levels: Optional[List[str]] = None
    max_service_radius: Optional[float] = None
    verified_only: bool = False
    background_checked_only: bool = False
    available_only: bool = True


class NearbySitterResponse(BaseModel):
    """Response model for nearby sitters with distance information"""
    sitter: SitterProfile
    distance_miles: float = Field(..., description="Distance from user location in miles")
    available_time_slots: List[str] = Field(default=[], description="Available time slots for next 7 days")


class NearbySittersParams(BaseModel):
    """Parameters for nearby sitters search"""
    user_address: str = Field(..., description="User's full address for distance calculation")
    page: int = Field(default=1, ge=1, description="Page number (starts from 1)")
    page_size: int = Field(default=10, ge=1, le=10, description="Number of sitters per page (maximum 10)")
    max_distance_miles: float = Field(default=25.0, ge=1, le=100, description="Maximum search radius in miles")
    available_only: bool = Field(default=True, description="Show only available sitters")


class PaginatedNearbySittersResponse(BaseModel):
    """Paginated response for nearby sitters"""
    sitters: List[NearbySitterResponse]
    total_count: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_previous: bool
