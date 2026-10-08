from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime, date
from enum import Enum
from bson import ObjectId
from app.models.user import PyObjectId


class PlantCareType(str, Enum):
    WATERING = "watering"
    FERTILIZING = "fertilizing"
    PRUNING = "pruning"
    REPOTTING = "repotting"
    PEST_CONTROL = "pest_control"
    GENERAL_CARE = "general_care"


class ListingStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class PlantInfo(BaseModel):
    name: str
    species: Optional[str] = None
    plant_type: str  # e.g., "succulent", "flowering", "tropical"
    size: Optional[str] = None  # e.g., "small", "medium", "large"
    location: str  # e.g., "indoor", "outdoor", "balcony"
    special_instructions: Optional[str] = None
    photo_urls: List[str] = []


class CareRequirements(BaseModel):
    care_types: List[PlantCareType]
    frequency: str  # e.g., "daily", "every 2 days", "weekly"
    duration_weeks: int
    start_date: date
    end_date: date
    daily_time_required: Optional[int] = None  # minutes
    special_notes: Optional[str] = None

    # Custom JSON encoder for date fields   
    model_config = {
        "json_encoders": {
            date: lambda v: v.isoformat()
        }
    }



class LocationInfo(BaseModel):
    address: str
    city: str = "Baltimore"
    state: str = "MD"
    zip_code: str
    campus_area: Optional[str] = None  # e.g., "Homewood", "Medical", "Peabody"
    access_instructions: Optional[str] = None


class Listing(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    owner_id: PyObjectId
    
    # Basic listing info
    title: str
    description: str
    
    # Plant and care details
    plants: List[PlantInfo]
    care_requirements: CareRequirements
    
    # Location
    location: LocationInfo
    
    # Pricing
    total_payment: float
    payment_per_visit: Optional[float] = None
    payment_per_day: Optional[float] = None
    
    # Status and availability
    status: ListingStatus = ListingStatus.ACTIVE
    is_urgent: bool = False
    
    # Application and selection
    applications_count: int = 0
    selected_sitter_id: Optional[PyObjectId] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str, date: str}
    }


class ListingCreate(BaseModel):
    owner_id: str
    title: str
    description: str
    plants: List[PlantInfo]
    care_requirements: CareRequirements
    location: LocationInfo
    total_payment: float
    payment_per_visit: Optional[float] = None
    payment_per_day: Optional[float] = None
    is_urgent: bool = False


class ListingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    total_payment: Optional[float] = None
    status: Optional[ListingStatus] = None
    is_urgent: Optional[bool] = None


class ListingSearchParams(BaseModel):
    zip_code: Optional[str] = None
    campus_area: Optional[str] = None
    plant_type: Optional[str] = None
    care_type: Optional[PlantCareType] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    min_payment: Optional[float] = None
    max_payment: Optional[float] = None
    is_urgent_only: Optional[bool] = None
    status: Optional[ListingStatus] = ListingStatus.ACTIVE
