from typing import Optional, List
from pydantic import BaseModel, Field, field_validator
from datetime import datetime, date
from bson import ObjectId
from app.models.user import PyObjectId
from app.models.sitter import Address, Availability


class SitterRegistrationStep1(BaseModel):
    """Step 1: Basic Information"""
    name: str = Field(..., min_length=2, max_length=100, description="Full name")
    email: str = Field(..., description="JHU email address")
    phone: Optional[str] = Field(None, description="Phone number")
    bio: Optional[str] = Field(None, max_length=500, description="Brief bio about yourself")


class SitterRegistrationStep2(BaseModel):
    """Step 2: Location and Service Area"""
    address: Address
    service_radius_miles: float = Field(default=10.0, ge=1, le=50, description="Service radius in miles")
    service_areas: List[str] = Field(default=[], description="Specific zip codes or campus areas you serve")


class SitterRegistrationStep3(BaseModel):
    """Step 3: Experience and Specialties"""
    experience_level: str = Field(..., description="Experience level: beginner, intermediate, expert")
    years_experience: Optional[int] = Field(None, ge=0, le=50, description="Years of plant care experience")
    specialties: List[str] = Field(default=[], description="Plant types or care specialties")
    badges: List[str] = Field(default=[], description="Certifications or achievements")


class SitterRegistrationStep4(BaseModel):
    """Step 4: Pricing and Availability"""
    price_per_visit: float = Field(..., ge=0, description="Price per visit in USD")
    price_per_day: Optional[float] = Field(None, ge=0, description="Price per day in USD")
    price_per_week: Optional[float] = Field(None, ge=0, description="Price per week in USD")
    is_available: bool = Field(default=True, description="Currently accepting new clients")


class SitterRegistrationComplete(BaseModel):
    """Complete registration data"""
    # Step 1
    name: str
    email: str
    phone: Optional[str] = None
    bio: Optional[str] = None
    
    # Step 2
    address: Address
    service_radius_miles: float = 10.0
    service_areas: List[str] = []
    
    # Step 3
    experience_level: str
    years_experience: Optional[int] = None
    specialties: List[str] = []
    badges: List[str] = []
    
    # Step 4
    price_per_visit: float
    price_per_day: Optional[float] = None
    price_per_week: Optional[float] = None
    is_available: bool = True


class SitterAvailabilityUpdate(BaseModel):
    """Update sitter availability calendar"""
    availability_calendar: List[Availability] = Field(default=[], description="Detailed availability calendar")
    unavailable_dates: List[date] = Field(default=[], description="Specific dates when unavailable")


class SitterProfileUpdate(BaseModel):
    """Update sitter profile information"""
    name: Optional[str] = None
    tagline: Optional[str] = None
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    address: Optional[Address] = None
    service_radius_miles: Optional[float] = None
    service_areas: Optional[List[str]] = None
    price_per_visit: Optional[float] = None
    price_per_day: Optional[float] = None
    price_per_week: Optional[float] = None
    specialties: Optional[List[str]] = None
    badges: Optional[List[str]] = None
    experience_level: Optional[str] = None
    years_experience: Optional[int] = None
    is_available: Optional[bool] = None


class SitterDashboardStats(BaseModel):
    """Statistics for sitter dashboard"""
    total_bookings: int = 0
    completed_bookings: int = 0
    pending_bookings: int = 0
    total_earnings: float = 0.0
    average_rating: float = 0.0
    total_reviews: int = 0
    response_rate: float = 0.0
    profile_completion: float = 0.0


class SitterPublicProfile(BaseModel):
    """Public profile view for customers"""
    id: str
    name: str
    tagline: Optional[str] = None
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    price_per_visit: float
    price_per_day: Optional[float] = None
    price_per_week: Optional[float] = None
    service_areas: List[str] = []
    specialties: List[str] = []
    badges: List[str] = []
    experience_level: str
    years_experience: Optional[int] = None
    rating: float = 0.0
    total_reviews: int = 0
    is_available: bool = True
    service_radius_miles: float = 10.0
    created_at: str
    # Note: Address is not included in public profile for privacy




