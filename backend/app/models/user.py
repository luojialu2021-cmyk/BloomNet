from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field, GetJsonSchemaHandler
from pydantic.json_schema import JsonSchemaValue
from pydantic_core import core_schema
from datetime import datetime
from bson import ObjectId

class PaymentRequest(BaseModel):
    amount: float
    payment_method_id: str

class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(
        cls, source_type: Any, handler: Any
    ) -> core_schema.CoreSchema:
        return core_schema.no_info_plain_validator_function(cls.validate)

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(
        cls, field_schema: JsonSchemaValue, handler: GetJsonSchemaHandler
    ) -> JsonSchemaValue:
        field_schema.update(type="string")
        return field_schema


class User(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    email: str
    full_name: str
    jhu_id: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    
    # Ratings and reviews
    rating: float = 0.0
    total_reviews: int = 0
    
    # Plant care preferences and specialties
    specialties: List[str] = []
    service_areas: List[str] = []
    
    # Availability and preferences
    is_available: bool = True
    preferred_plant_types: List[str] = []
    
    # Account info
    is_active: bool = True
    is_verified: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str}
    }


class UserCreate(BaseModel):
    email: str
    full_name: str
    jhu_id: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    specialties: Optional[List[str]] = None
    service_areas: Optional[List[str]] = None
    is_available: Optional[bool] = None
    preferred_plant_types: Optional[List[str]] = None


class UserInDB(User):
    hashed_password: str
