from pydantic import BaseModel, Field
from bson import ObjectId
from datetime import datetime
from typing import Any, Optional
from app.models.user import PyObjectId
from enum import Enum

class CreatorIdentity(str, Enum):
    USER = "user"
    SITTER = "sitter"

class Review(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    reviewer_id: str  # ID of the user writing the review
    reviewee_id: str  # ID of the user or sitter being reviewed
    reservation_id: str  # Corresponds to the Reservation model's ID
    rating: float  # Rating given in the review
    review_txt: str  # Text content of the review
    created_at: datetime = Field(default_factory=datetime.utcnow)  # Timestamp of review creation
    creator_identity: CreatorIdentity  # Identity of the reviewer, either 'user' or 'sitter'

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {
            ObjectId: str,
            CreatorIdentity: lambda ci: ci.value  # Serialize CreatorIdentity Enum to its string value
        }
    }


class ReviewCreate(BaseModel):
    reviewer_id: str
    reviewee_id: str
    reservation_id: str
    rating: float
    review_txt: str
    creator_identity: CreatorIdentity  # Identity of the reviewer, either 'user' or 'sitter'