from typing import Any, List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.api.deps import get_current_user_optional
from app.models.sitter import (
    SitterProfile, 
    SitterSearchParams, 
    NearbySittersParams, 
    PaginatedNearbySittersResponse,
    NearbySitterResponse
)
from app.services.recommendation_engine import RecommendationEngine
from app.models.user import User
from app.crud.crud_sitter import sitter as sitter_crud
from app.services.reliable_geocoding import production_geocoding_service
from datetime import date, datetime, timedelta
import asyncio
import math

from app.services import recommendation_engine

router = APIRouter()


@router.get("/", response_model=List[SitterProfile])
async def search_sitters(
    zip_code: Optional[str] = Query(None, description="ZIP code or campus area"),
    campus_area: Optional[str] = Query(None, description="Campus area (Homewood, Medical, etc.)"),
    start_date: Optional[date] = Query(None, description="Start date for care"),
    end_date: Optional[date] = Query(None, description="End date for care"),
    plant_type: Optional[str] = Query(None, description="Type of plant"),
    min_price: Optional[float] = Query(None, description="Minimum price per visit"),
    max_price: Optional[float] = Query(None, description="Maximum price per visit"),
    min_rating: Optional[float] = Query(None, description="Minimum rating"),
    specialties: Optional[List[str]] = Query(None, description="List of required plant specialties"),
    experience_levels: Optional[List[str]] = Query(None, description="Experience levels to include"),
    max_service_radius: Optional[float] = Query(None, ge=0, description="Maximum service radius in miles"),
    verified_only: bool = Query(False, description="Only include verified sitters"),
    background_checked_only: bool = Query(False, description="Only include background checked sitters"),
    available_only: bool = Query(True, description="Show only available sitters"),
    current_user: Optional[User] = Depends(get_current_user_optional)
) -> Any:
    """
    Search for plant sitters based on criteria
    """
    search_params = SitterSearchParams(
        zip_code=zip_code,
        campus_area=campus_area,
        start_date=start_date,
        end_date=end_date,
        plant_type=plant_type,
        min_price=min_price,
        max_price=max_price,
        min_rating=min_rating,
        specialties=specialties,
        experience_levels=experience_levels,
        max_service_radius=max_service_radius,
        verified_only=verified_only,
        background_checked_only=background_checked_only,
        available_only=available_only
    )
    
    # Use database query instead of get_multi() to avoid limit issues
    # Build filter for database query
    db_filter: Dict[str, Any] = {}
    
    if available_only:
        db_filter["is_available"] = True
        db_filter["is_active"] = True
    
    if zip_code:
        db_filter["service_areas"] = {"$in": [zip_code]}
    
    if campus_area:
        db_filter["campus_area"] = campus_area
    
    # Get sitters from database with filter
    from app.core.database import get_database
    db = await get_database()
    cursor = db.sitters.find(db_filter)
    sitter_docs = await cursor.to_list(length=1000)  # Increased limit
    
    # Convert to SitterProfile models
    all_sitters = []
    for doc in sitter_docs:
        try:
            sitter = SitterProfile(**doc)
            all_sitters.append(sitter)
        except Exception as e:
            # Skip invalid documents
            continue
    
    # Apply additional client-side filtering for complex criteria
    filtered_sitters = []
    requested_specialties = set()
    if plant_type:
        requested_specialties.add(plant_type.lower())
    if specialties:
        requested_specialties.update(s.lower() for s in specialties)
    requested_experience_levels = (
        {level.lower() for level in experience_levels} if experience_levels else set()
    )

    for sitter in all_sitters:
        # Note: availability, zip_code, and campus_area are already filtered in database query
        # Only apply additional filters here
            
        sitter_specialties = {spec.lower() for spec in sitter.specialties or []}
        if requested_specialties and not requested_specialties.issubset(sitter_specialties):
            continue
            
        # Filter by price range
        if min_price is not None and sitter.price_per_visit < min_price:
            continue
        if max_price is not None and sitter.price_per_visit > max_price:
            continue
            
        # Filter by rating
        if min_rating is not None and sitter.rating < min_rating:
            continue

        # Filter by experience level
        if requested_experience_levels:
            sitter_level = (sitter.experience_level or "").lower()
            if sitter_level not in requested_experience_levels:
                continue

        # Filter by max service radius
        if max_service_radius is not None and sitter.service_radius_miles > max_service_radius:
            continue

        if verified_only and not sitter.is_verified:
            continue
        if background_checked_only and not sitter.background_checked:
            continue
            
        filtered_sitters.append(sitter)
    
    #return filtered_sitters
    recommendation_engine = RecommendationEngine()
    ranked_sitters = recommendation_engine.rank_sitters(filtered_sitters, search_params)
    return ranked_sitters

@router.get("/nearby", response_model=PaginatedNearbySittersResponse)
async def get_nearby_sitters(
    user_address: str = Query(..., description="Full user address for distance calculation"),
    page: int = Query(1, ge=1, description="Page number (starts from 1)"),
    page_size: int = Query(10, ge=1, le=10, description="Number of sitters per page (maximum 10)"),
    max_distance_miles: float = Query(25.0, ge=1, le=100, description="Maximum search radius in miles"),
    available_only: bool = Query(True, description="Show only available sitters"),
    current_user: Optional[User] = Depends(get_current_user_optional)
) -> Any:
    """
    Get nearby sitters sorted by distance from user location.
    
    Returns paginated list of sitters with distance information and availability.
    """
    try:
        # Get all sitters from database
        all_sitters = await sitter_crud.get_multi()
        
        if not all_sitters:
            return PaginatedNearbySittersResponse(
                sitters=[],
                total_count=0,
                page=page,
                page_size=page_size,
                total_pages=0,
                has_next=False,
                has_previous=False
            )
        
        # Filter available sitters if requested
        if available_only:
            all_sitters = [s for s in all_sitters if s.is_available and s.is_active]
        
        # Calculate distances for all sitters
        sitters_with_distance = []
        distance_tasks = []
        
        # Create tasks for concurrent geocoding
        for sitter in all_sitters:
            if hasattr(sitter, 'address') and sitter.address:
                sitter_address = sitter.address.full_address()
                # Use high-precision pre-computed geocoding service (production-ready)
                task = production_geocoding_service.calculate_distance_between_addresses(user_address, sitter_address)
                distance_tasks.append((sitter, task))
        
        # Execute all distance calculations concurrently
        if distance_tasks:
            distance_results = await asyncio.gather(*[task for _, task in distance_tasks], return_exceptions=True)
            
            for (sitter, _), distance_result in zip(distance_tasks, distance_results):
                if isinstance(distance_result, Exception):
                    # Skip sitters where distance calculation failed
                    continue
                    
                if distance_result is not None and distance_result <= max_distance_miles:
                    # Generate available time slots (next 7 days)
                    available_slots = _generate_available_time_slots(sitter)
                    
                    sitter_response = NearbySitterResponse(
                        sitter=sitter,
                        distance_miles=distance_result,
                        available_time_slots=available_slots
                    )
                    sitters_with_distance.append(sitter_response)
        
        # Sort by distance (nearest first)
        sitters_with_distance.sort(key=lambda x: x.distance_miles)
        
        # Apply pagination
        total_count = len(sitters_with_distance)
        total_pages = math.ceil(total_count / page_size)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_sitters = sitters_with_distance[start_idx:end_idx]
        
        return PaginatedNearbySittersResponse(
            sitters=paginated_sitters,
            total_count=total_count,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_previous=page > 1
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error finding nearby sitters: {str(e)}"
        )


@router.get("/{sitter_id}", response_model=SitterProfile)
async def get_sitter_detail(
    sitter_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional)
) -> Any:
    """
    Get detailed information about a specific sitter
    """
    sitter = await sitter_crud.get(sitter_id)
    if not sitter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sitter not found"
        )
    return sitter


@router.get("/{sitter_id}/availability")
async def get_sitter_availability(
    sitter_id: str,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user: Optional[User] = Depends(get_current_user_optional)
) -> Any:
    """
    Get sitter's availability calendar
    """
    sitter = await sitter_crud.get(sitter_id)
    if not sitter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sitter not found"
        )
    
    # For now, return basic availability info
    # In the future, this could include detailed calendar data
    availability = {
        "sitter_id": sitter_id,
        "is_available": sitter.is_available,
        "unavailable_dates": sitter.unavailable_dates,
        "service_areas": sitter.service_areas,
        "specialties": sitter.specialties
    }
    
    return availability


# For development - create sample sitters



def _generate_available_time_slots(sitter: SitterProfile) -> List[str]:
    """
    Generate available time slots based on sitter's availability calendar and unavailable dates.
    Supports long-term availability for users who book far in advance.
    
    Priority:
    1. Use availability_calendar if available (specific dates with time slots)
    2. Generate general availability excluding unavailable_dates
    3. Show reasonable time periods for booking
    """
    if not sitter.is_available:
        return []
    
    slots = []
    today = datetime.now().date()
    
    # If sitter has specific availability calendar, use that
    if sitter.availability_calendar:
        # Sort by date and take available slots
        sorted_availability = sorted(sitter.availability_calendar, key=lambda x: x.date)
        
        for avail in sorted_availability:
            # Only include future dates and available slots
            if avail.date >= today and avail.available:
                date_str = avail.date.strftime("%Y-%m-%d")
                
                if avail.time_slots:
                    # Use specific time slots if provided
                    for time_slot in avail.time_slots:
                        slots.append(f"{date_str} {time_slot}")
                else:
                    # Add default time periods if no specific slots
                    slots.extend([
                        f"{date_str} morning (9AM-12PM)",
                        f"{date_str} afternoon (1PM-5PM)",
                        f"{date_str} evening (6PM-8PM)"
                    ])
        
        # Limit to reasonable number of slots for display
        return slots[:15]
    
    # If no specific calendar, generate availability for next 30 days (excluding unavailable dates)
    unavailable_date_strings = [d.strftime("%Y-%m-%d") for d in sitter.unavailable_dates]
    
    # Generate availability for next 30 days to support advance booking
    # This allows users to book sitters well in advance for planned trips
    available_days = []
    for i in range(30):
        check_date = today + timedelta(days=i)
        date_str = check_date.strftime("%Y-%m-%d")
        
        # Exclude dates that sitter has marked as unavailable
        if date_str not in unavailable_date_strings:
            available_days.append(check_date)
    
    # Generate time slots for available days
    for avail_date in available_days[:10]:  # Show first 10 available days
        date_str = avail_date.strftime("%Y-%m-%d")
        
        # Add standard time slots (can be customized per sitter in the future)
        slots.extend([
            f"{date_str} morning (9AM-12PM)",
            f"{date_str} afternoon (1PM-5PM)",
            f"{date_str} evening (6PM-8PM)"
        ])
    
    # Return summary of availability periods for better UX
    if len(available_days) > 10:
        # Add summary for extended availability
        extended_start = available_days[10].strftime("%Y-%m-%d")
        extended_end = available_days[-1].strftime("%Y-%m-%d")
        slots.append(f"Extended availability: {extended_start} to {extended_end}")
    
    return slots[:20]  # Reasonable limit for API response
