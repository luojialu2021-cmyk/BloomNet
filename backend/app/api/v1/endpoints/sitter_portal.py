from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.api.deps import get_current_active_user
from app.models.user import User
from app.models.sitter import SitterProfile
from app.models.sitter_registration import (
    SitterRegistrationStep1, SitterRegistrationStep2, SitterRegistrationStep3,
    SitterRegistrationStep4, SitterRegistrationComplete, SitterAvailabilityUpdate,
    SitterProfileUpdate, SitterDashboardStats, SitterPublicProfile
)
from app.crud.crud_sitter import sitter as sitter_crud
from app.crud.crud_user import user as user_crud
from datetime import datetime, date
import uuid

router = APIRouter()


@router.post("/register/step1", response_model=dict)
async def register_step1(
    step1_data: SitterRegistrationStep1,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Step 1: Basic Information Registration
    """
    # Check if user already has a sitter profile
    existing_sitter = await sitter_crud.get_by_user_id(str(current_user.id))
    if existing_sitter:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has a sitter profile"
        )
    
    # Update user information
    user_update_data = {
        "full_name": step1_data.name,
        "phone": step1_data.phone,
        "bio": step1_data.bio
    }
    
    # For now, we'll store this in a temporary way
    # In production, you might want to store this in a separate registration table
    return {
        "message": "Step 1 completed successfully",
        "step": 1,
        "next_step": "step2",
        "data": step1_data.model_dump()
    }


@router.post("/register/step2", response_model=dict)
async def register_step2(
    step2_data: SitterRegistrationStep2,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Step 2: Location and Service Area
    """
    return {
        "message": "Step 2 completed successfully",
        "step": 2,
        "next_step": "step3",
        "data": step2_data.model_dump()
    }


@router.post("/register/step3", response_model=dict)
async def register_step3(
    step3_data: SitterRegistrationStep3,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Step 3: Experience and Specialties
    """
    return {
        "message": "Step 3 completed successfully",
        "step": 3,
        "next_step": "step4",
        "data": step3_data.model_dump()
    }


@router.post("/register/step4", response_model=dict)
async def register_step4(
    step4_data: SitterRegistrationStep4,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Step 4: Pricing and Availability
    """
    return {
        "message": "Step 4 completed successfully",
        "step": 4,
        "next_step": "complete",
        "data": step4_data.model_dump()
    }


@router.post("/register/complete", response_model=SitterProfile)
async def complete_registration(
    registration_data: SitterRegistrationComplete,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Complete sitter registration and create profile
    """
    # Check if user already has a sitter profile
    existing_sitter = await sitter_crud.get_by_user_id(str(current_user.id))
    if existing_sitter:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has a sitter profile"
        )
    
    # Create sitter profile
    sitter_create_data = {
        "user_id": str(current_user.id),
        "name": registration_data.name,
        "bio": registration_data.bio,
        "address": registration_data.address,
        "service_radius_miles": registration_data.service_radius_miles,
        "service_areas": registration_data.service_areas,
        "price_per_visit": registration_data.price_per_visit,
        "price_per_day": registration_data.price_per_day,
        "price_per_week": registration_data.price_per_week,
        "specialties": registration_data.specialties,
        "badges": registration_data.badges,
        "experience_level": registration_data.experience_level,
        "years_experience": registration_data.years_experience,
        "is_available": registration_data.is_available
    }
    
    from app.models.sitter import SitterCreate
    sitter_create = SitterCreate(**sitter_create_data)
    created_sitter = await sitter_crud.create(obj_in=sitter_create)
    
    return created_sitter


@router.get("/profile", response_model=SitterProfile)
async def get_my_sitter_profile(
    current_user: User = Depends(get_current_active_user),
    sitter_email: Optional[str] = Query(None, description="Optional: Get sitter profile by email instead of current user")
) -> Any:
    """
    Get current user's sitter profile
    If sitter_email is provided, get profile by email instead of user_id
    (This allows sitter portal to show a specific sitter's profile regardless of logged-in user)
    """
    sitter_profile = None
    
    # If sitter_email is provided, try to get profile by email first
    if sitter_email:
        sitter_profile = await sitter_crud.get_by_email(sitter_email)
        if sitter_profile:
            print(f"[get_my_sitter_profile] Found profile by email: {sitter_email}, user_id: {sitter_profile.user_id}")
            return sitter_profile
        else:
            print(f"[get_my_sitter_profile] No profile found for email: {sitter_email}, falling back to current user")
    
    # Fallback to current user's profile
    sitter_profile = await sitter_crud.get_by_user_id(str(current_user.id))
    if not sitter_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sitter profile not found. Please complete registration first."
        )
    
    return sitter_profile


@router.put("/profile", response_model=SitterProfile)
async def update_sitter_profile(
    profile_update: SitterProfileUpdate,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Update sitter profile
    """
    sitter_profile = await sitter_crud.get_by_user_id(str(current_user.id))
    if not sitter_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sitter profile not found"
        )
    
    updated_sitter = await sitter_crud.update(db_obj=sitter_profile, obj_in=profile_update)
    return updated_sitter


@router.put("/availability", response_model=SitterProfile)
async def update_availability(
    availability_update: SitterAvailabilityUpdate,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Update sitter availability calendar
    """
    sitter_profile = await sitter_crud.get_by_user_id(str(current_user.id))
    if not sitter_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sitter profile not found"
        )
    
    # Update availability calendar
    update_data = {
        "availability_calendar": availability_update.availability_calendar,
        "unavailable_dates": availability_update.unavailable_dates,
        "updated_at": datetime.utcnow()
    }
    
    updated_sitter = await sitter_crud.update(db_obj=sitter_profile, obj_in=update_data)
    return updated_sitter


@router.get("/dashboard/stats", response_model=SitterDashboardStats)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get sitter dashboard statistics
    """
    sitter_profile = await sitter_crud.get_by_user_id(str(current_user.id))
    if not sitter_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sitter profile not found"
        )
    
    # Calculate profile completion percentage
    profile_fields = [
        sitter_profile.name, sitter_profile.bio, sitter_profile.tagline,
        sitter_profile.specialties, sitter_profile.badges, sitter_profile.years_experience
    ]
    completed_fields = sum(1 for field in profile_fields if field)
    profile_completion = (completed_fields / len(profile_fields)) * 100
    
    # Mock stats for now - in production, calculate from actual data
    stats = SitterDashboardStats(
        total_bookings=0,
        completed_bookings=0,
        pending_bookings=0,
        total_earnings=0.0,
        average_rating=sitter_profile.rating,
        total_reviews=sitter_profile.total_reviews,
        response_rate=95.0,  # Mock data
        profile_completion=profile_completion
    )
    
    return stats


@router.get("/bookings", response_model=List[dict])
async def get_my_bookings(
    status_filter: Optional[str] = Query(None, description="Filter by booking status"),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get sitter's bookings/reservations
    """
    sitter_profile = await sitter_crud.get_by_user_id(str(current_user.id))
    if not sitter_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sitter profile not found"
        )
    
    # Mock bookings for now - in production, fetch from reservations
    mock_bookings = [
        {
            "id": "booking_1",
            "client_name": "Sarah Johnson",
            "start_date": "2024-01-15",
            "end_date": "2024-01-20",
            "total_amount": 150.0,
            "status": "confirmed",
            "plants_info": "2 Monstera plants, 1 Fiddle Leaf Fig",
            "location": "3400 N Charles St, Baltimore, MD"
        },
        {
            "id": "booking_2",
            "client_name": "Mike Chen",
            "start_date": "2024-01-25",
            "end_date": "2024-01-30",
            "total_amount": 200.0,
            "status": "confirmed",
            "plants_info": "5 succulents, 3 herbs",
            "location": "2901 N Charles St, Baltimore, MD"
        }
    ]
    
    if status_filter:
        mock_bookings = [b for b in mock_bookings if b["status"] == status_filter]
    
    return mock_bookings


@router.post("/bookings/{booking_id}/accept")
async def accept_booking(
    booking_id: str,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Accept a booking request
    """
    # Mock implementation - in production, update reservation status
    return {
        "message": f"Booking {booking_id} accepted successfully",
        "booking_id": booking_id,
        "status": "confirmed"
    }


@router.post("/bookings/{booking_id}/decline")
async def decline_booking(
    booking_id: str,
    reason: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Decline a booking request
    """
    # Mock implementation - in production, update reservation status
    return {
        "message": f"Booking {booking_id} declined",
        "booking_id": booking_id,
        "status": "declined",
        "reason": reason
    }


@router.get("/public-profile/{sitter_id}", response_model=SitterPublicProfile)
async def get_public_sitter_profile(
    sitter_id: str,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get public sitter profile for customers to view
    """
    sitter_profile = await sitter_crud.get(sitter_id)
    if not sitter_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sitter profile not found"
        )
    
    # Convert to public profile (exclude sensitive information)
    public_profile = SitterPublicProfile(
        id=str(sitter_profile.id),
        name=sitter_profile.name,
        tagline=sitter_profile.tagline,
        bio=sitter_profile.bio,
        profile_image=sitter_profile.profile_image,
        price_per_visit=sitter_profile.price_per_visit,
        price_per_day=sitter_profile.price_per_day,
        price_per_week=sitter_profile.price_per_week,
        service_areas=sitter_profile.service_areas,
        specialties=sitter_profile.specialties,
        badges=sitter_profile.badges,
        experience_level=sitter_profile.experience_level,
        years_experience=sitter_profile.years_experience,
        rating=sitter_profile.rating,
        total_reviews=sitter_profile.total_reviews,
        is_available=sitter_profile.is_available,
        service_radius_miles=sitter_profile.service_radius_miles,
        created_at=sitter_profile.created_at.isoformat()
    )
    
    return public_profile


@router.get("/search", response_model=List[SitterPublicProfile])
async def search_sitters_public(
    zip_code: Optional[str] = Query(None, description="ZIP code"),
    campus_area: Optional[str] = Query(None, description="Campus area"),
    plant_type: Optional[str] = Query(None, description="Plant type specialty"),
    min_price: Optional[float] = Query(None, description="Minimum price per visit"),
    max_price: Optional[float] = Query(None, description="Maximum price per visit"),
    min_rating: Optional[float] = Query(None, description="Minimum rating"),
    available_only: bool = Query(True, description="Show only available sitters"),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Search for sitters (public view for customers)
    """
    # Get all sitters
    all_sitters = await sitter_crud.get_multi()
    
    # Filter sitters
    filtered_sitters = []
    for sitter in all_sitters:
        # Filter by availability
        if available_only and not sitter.is_available:
            continue
            
        # Filter by zip code
        if zip_code and zip_code not in sitter.service_areas:
            continue
            
        # Filter by campus area
        if campus_area and campus_area not in sitter.service_areas:
            continue
            
        # Filter by plant type
        if plant_type and plant_type not in sitter.specialties:
            continue
            
        # Filter by price range
        if min_price is not None and sitter.price_per_visit < min_price:
            continue
        if max_price is not None and sitter.price_per_visit > max_price:
            continue
            
        # Filter by rating
        if min_rating is not None and sitter.rating < min_rating:
            continue
            
        # Convert to public profile
        public_profile = SitterPublicProfile(
            id=str(sitter.id),
            name=sitter.name,
            tagline=sitter.tagline,
            bio=sitter.bio,
            profile_image=sitter.profile_image,
            price_per_visit=sitter.price_per_visit,
            price_per_day=sitter.price_per_day,
            price_per_week=sitter.price_per_week,
            service_areas=sitter.service_areas,
            specialties=sitter.specialties,
            badges=sitter.badges,
            experience_level=sitter.experience_level,
            years_experience=sitter.years_experience,
            rating=sitter.rating,
            total_reviews=sitter.total_reviews,
            is_available=sitter.is_available,
            service_radius_miles=sitter.service_radius_miles,
            created_at=sitter.created_at.isoformat()
        )
        
        filtered_sitters.append(public_profile)
    
    return filtered_sitters




