"""
Test endpoint for address validation - no authentication required
This endpoint is used for testing Pydantic model validation logic
"""
from fastapi import APIRouter
from app.models.sitter_profile import SitterProfileCreate
from app.models.user_profile import UserProfileCreate

router = APIRouter()


@router.post("/test/sitter-profile-validation")
async def test_sitter_profile_validation(profile_data: SitterProfileCreate):
    """
    Test endpoint for sitter profile validation - no auth required
    Returns validation result without saving to database
    """
    # If we reach here, validation passed
    return {
        "status": "valid",
        "message": "Sitter profile data passed validation",
        "data": profile_data.dict()
    }


@router.post("/test/user-profile-validation")
async def test_user_profile_validation(profile_data: UserProfileCreate):
    """
    Test endpoint for user profile validation - no auth required
    Returns validation result without saving to database
    """
    # If we reach here, validation passed
    return {
        "status": "valid",
        "message": "User profile data passed validation",
        "data": profile_data.dict()
    }

