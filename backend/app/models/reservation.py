from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime, date
from enum import Enum
from bson import ObjectId
from app.models.user import PyObjectId
from app.models.auth import UserRole
import uuid


class ReservationStatus(str, Enum):
    CONFIRMED = "confirmed"  # Sitter confirmed
    IN_PROGRESS = "in_progress"  # Care has started
    COMPLETED = "completed"  # Care finished
    CANCELLED = "cancelled"  # Cancelled by either party
    EXPIRED = "expired"  # Not confirmed in time


class PaymentStatus(str, Enum):
    PAID = "paid"
    REFUNDED = "refunded"
    FAILED = "failed"


class CareUpdate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    # date: datetime
    date: datetime = Field(default_factory=datetime.utcnow)
    # photos: List[str] = Field(default_factory=list)
    photos: Optional[List[str]] = Field(default_factory=list, description="List of base64-encoded image strings")
    # notes: str
    notes: Optional[str] = None
    care_actions: List[str] = Field(default_factory=list)  # e.g., ["watered", "fertilized"]
    timestamp_verified: bool = True
    tasks_completed: List[str] = Field(default_factory=list)
    liked_by: List[str] = Field(default_factory=list)
    comments: List["CareUpdateComment"] = Field(default_factory=list)
    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str, date: str}
    }


class CareUpdateComment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: PyObjectId
    role: UserRole
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    liked_by: List[str] = Field(default_factory=list)
    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str, date: str}
    }

class CareTaskFrequency(str, Enum):
    DAILY = "daily"
    EVERY_X_DAYS = "every_x_days"
    WEEKLY = "weekly"
    CUSTOM = "custom"


class CareTaskTemplate(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    frequency: CareTaskFrequency = CareTaskFrequency.DAILY
    every_x_days: Optional[int] = None
    weekly_days: List[int] = Field(default_factory=list)
    custom_dates: List[str] = Field(default_factory=list)
    start_date: date
    end_date: date
    requires_photo: bool = False
    requires_notes: bool = False
    requires_audio: bool = False
    notes: Optional[str] = None


class CareTaskAssignment(BaseModel):
    id: str
    template_id: str
    task_name: str
    date: date


class Reservation(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    
    # Parties involved
    owner_id: PyObjectId
    sitter_id: PyObjectId
    sitter_name: Optional[str] = None  # Made optional for backward compatibility
    sitter_email: Optional[str] = None  # Sitter email for matching
    sitter_profile_id: Optional[PyObjectId] = None  # profile reference for convenience
    listing_id: Optional[PyObjectId] = None  # If booked from a listing
    
    # Reservation details
    start_date: date
    end_date: date
    total_amount: float
    
    # Service details
    plants_info: str  # Brief description of plants to care for
    care_instructions: str
    location_address: str
    access_instructions: Optional[str] = None
    
    # Status tracking
    status: ReservationStatus = ReservationStatus.CONFIRMED
    payment_status: PaymentStatus = PaymentStatus.PAID
    
    # Care tracking
    care_updates: List[CareUpdate] = Field(default_factory=list)
    care_checklist: Optional[List[str]] = None
    care_task_templates: Optional[List[CareTaskTemplate]] = Field(default_factory=list)
    care_task_schedule: Optional[List[CareTaskAssignment]] = Field(default_factory=list)
    
    # Communication
    special_notes: Optional[str] = None
    owner_notes: Optional[str] = None
    sitter_notes: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    confirmed_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Ratings (after completion)
    owner_rating: Optional[int] = None  # 1-5 stars
    sitter_rating: Optional[int] = None  # 1-5 stars
    owner_review: Optional[str] = None
    sitter_review: Optional[str] = None

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str, date: str}
    }


class ReservationCreate(BaseModel):
    sitter_id: str  # Will be converted to PyObjectId
    sitter_name: Optional[str] = None  # Made optional for backward compatibility
    sitter_email: Optional[str] = None  # Sitter email for matching
    sitter_profile_id: Optional[str] = None
    owner_id: Optional[str] = None
    start_date: date
    end_date: date
    total_amount: float
    plants_info: str
    care_instructions: str
    location_address: str
    access_instructions: Optional[str] = None
    special_notes: Optional[str] = None
    care_checklist: Optional[List[str]] = None
    care_task_templates: Optional[List[CareTaskTemplate]] = None
    care_task_schedule: Optional[List[CareTaskAssignment]] = None


class ReservationUpdate(BaseModel):
    status: Optional[ReservationStatus] = None
    payment_status: Optional[PaymentStatus] = None
    owner_notes: Optional[str] = None
    sitter_notes: Optional[str] = None
    care_checklist: Optional[List[str]] = None
    care_task_templates: Optional[List[CareTaskTemplate]] = None
    care_task_schedule: Optional[List[CareTaskAssignment]] = None


class CareUpdateCreate(BaseModel):
    # photos: List[str] = Field(default_factory=list)
    # notes: str
    photos: Optional[List[str]] = Field(default_factory=list, description="List of base64-encoded image strings")
    notes: Optional[str] = None
    care_actions: List[str] = Field(default_factory=list)
    tasks_completed: List[str] = Field(default_factory=list)


class ReservationRating(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    review: Optional[str] = None


class CareCommentCreate(BaseModel):
    message: str


class CareChecklistUpdate(BaseModel):
    tasks: List[str] = Field(default_factory=list)
    templates: Optional[List[CareTaskTemplate]] = None
    schedule: Optional[List[CareTaskAssignment]] = None


CareUpdate.model_rebuild()
