from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.api.deps import get_current_active_user, get_current_user_optional
from app.models.listing import Listing, ListingCreate, ListingUpdate, ListingSearchParams, ListingStatus, PlantCareType
from app.models.user import User
from app.crud.crud_listing import listing as listing_crud
from datetime import date


router = APIRouter()


@router.get("/", response_model=List[Listing])
async def search_listings(
    zip_code: Optional[str] = Query(None, description="ZIP code"),
    campus_area: Optional[str] = Query(None, description="Campus area"),
    plant_type: Optional[str] = Query(None, description="Type of plant"),
    care_type: Optional[PlantCareType] = Query(None, description="Type of care needed"),
    start_date: Optional[date] = Query(None, description="Earliest start date"),
    end_date: Optional[date] = Query(None, description="Latest end date"),
    min_payment: Optional[float] = Query(None, description="Minimum payment"),
    max_payment: Optional[float] = Query(None, description="Maximum payment"),
    is_urgent_only: Optional[bool] = Query(None, description="Show only urgent listings"),
    status: Optional[ListingStatus] = Query(ListingStatus.ACTIVE, description="Listing status"),
    current_user: Optional[User] = Depends(get_current_user_optional)
) -> Any:
    """
    Search for plant care listings
    """
    # Check if any search parameters are provided
    has_search_params = any([
        zip_code, campus_area, plant_type, care_type, 
        start_date, end_date, min_payment, max_payment, is_urgent_only
    ]) or (status and status != ListingStatus.ACTIVE)
    
    if not has_search_params:
        return await listing_crud.get_multi()
    
    # Build complete filter dictionary
    filter_dict = {}
    
    # Location filters
    if zip_code:
        filter_dict["location.zip_code"] = zip_code
    if campus_area:
        filter_dict["location.campus_area"] = campus_area
    
    # Plant filters
    if plant_type:
        filter_dict["plants.plant_type"] = {"$in": [plant_type]}
    
    # Care type filter
    if care_type:
        care_type_value = care_type.value if hasattr(care_type, 'value') else str(care_type)
        filter_dict["care_requirements.care_types"] = {"$in": [care_type_value]}
    
    # Date filters
    if start_date:
        filter_dict["care_requirements.start_date"] = {"$gte": start_date.isoformat()}
    if end_date:
        filter_dict["care_requirements.end_date"] = {"$lte": end_date.isoformat()}
    
    # Payment filters
    if min_payment is not None:
        filter_dict["total_payment"] = {"$gte": min_payment}
    if max_payment is not None:
        if "total_payment" in filter_dict:
            filter_dict["total_payment"]["$lte"] = max_payment
        else:
            filter_dict["total_payment"] = {"$lte": max_payment}
    
    # Urgency filter
    if is_urgent_only:
        filter_dict["is_urgent"] = True
    

    if status and status != ListingStatus.ACTIVE:
        # If a specific status is requested (not ACTIVE), filter by that status
        status_value = status.value if hasattr(status, 'value') else str(status)
        filter_dict["status"] = status_value
    

    return await listing_crud.get_multi(filter_dict=filter_dict)



@router.get("/active", response_model=List[Listing])
async def get_active_listings(
    limit: int = Query(50, description="Maximum number of listings to return"),
    current_user: Optional[User] = Depends(get_current_user_optional)
) -> Any:
    """
    Get active plant care listings
    """
    listings = await listing_crud.get_active_listings(limit=limit)
    return listings


@router.post("/", response_model=Listing)
async def create_listing(
    listing_in: ListingCreate,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Create a new plant care listing
    """
    # Add owner_id from current user
    listing_data = listing_in.model_dump()
    listing_data["owner_id"] = current_user.id
    
    from app.models.listing import Listing as ListingModel
    listing = ListingModel(**listing_data)
    
    created_listing = await listing_crud.create(obj_in=listing_in)
    return created_listing


@router.get("/{listing_id}", response_model=Listing)
async def get_listing_detail(
    listing_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional)
) -> Any:
    """
    Get detailed information about a specific listing
    """
    listing = await listing_crud.get(listing_id)
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )
    return listing


@router.put("/{listing_id}", response_model=Listing)
async def update_listing(
    listing_id: str,
    listing_update: ListingUpdate,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Update a listing (owner only)
    """
    listing = await listing_crud.get(listing_id)
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )
    
    # Check if current user is the owner
    if str(listing.owner_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the listing owner can update this listing"
        )
    
    updated_listing = await listing_crud.update(db_obj=listing, obj_in=listing_update)
    return updated_listing


@router.delete("/{listing_id}")
async def delete_listing(
    listing_id: str,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Delete a listing (owner only)
    """
    listing = await listing_crud.get(listing_id)
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )
    
    # Check if current user is the owner
    if str(listing.owner_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the listing owner can delete this listing"
        )
    
    await listing_crud.remove(id=listing_id)
    return {"message": "Listing deleted successfully"}


@router.get("/my/listings", response_model=List[Listing])
async def get_my_listings(
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get current user's listings
    """
    listings = await listing_crud.get_by_owner_id(str(current_user.id))
    return listings


# For development - create sample listings
@router.post("/sample-data")
async def create_sample_listings() -> Any:
    """
    Create sample listing data for development/testing
    """
    from app.models.listing import PlantInfo, CareRequirements, LocationInfo
    from datetime import date, timedelta
    
    # Check if sample data already exists
    sample_title = "Care for my Monstera while I'm at conference"
    sample_owner_id = "507f1f77bcf86cd799439011"
    
    # Use database query to check for existing sample data more efficiently
    from app.core.database import get_database
    db = await get_database()
    existing_doc = await db.listings.find_one({
        "title": sample_title,
        "owner_id": sample_owner_id
    })
    
    if existing_doc:
        # Convert to Listing model
        existing_listing = Listing(**existing_doc)
        return {
            "message": "Sample data already exists",
            "listings": [existing_listing]
        }
    
    sample_listings = [
        {
            "owner_id": sample_owner_id,
            "title": sample_title,
            "description": "I have a beautiful Monstera deliciosa that needs care while I'm away for a week. Just needs watering and some attention.",
            "plants": [
                {
                    "name": "Monstera deliciosa",
                    "species": "Monstera deliciosa",
                    "plant_type": "tropical",
                    "size": "large",
                    "location": "indoor",
                    "special_instructions": "Water when top inch of soil is dry"
                }
            ],
            "care_requirements": {
                "care_types": ["watering", "general_care"],
                "frequency": "every 3 days",
                "duration_weeks": 1,
                "start_date": (date.today() + timedelta(days=7)).isoformat(),
                "end_date": (date.today() + timedelta(days=14)).isoformat(),
                "daily_time_required": 15,
                "special_notes": "Please send photos!"
            },
            "location": {
                "address": "3400 N Charles St",
                "city": "Baltimore",
                "state": "MD",
                "zip_code": "21218",
                "campus_area": "Homewood",
                "access_instructions": "Key is with building manager"
            },
            "total_payment": 75.0,
            "payment_per_visit": 25.0,
            "is_urgent": False
        }
    ]
    
    created_listings = []
    for listing_data in sample_listings:
        try:
            listing_create = ListingCreate(**listing_data)
            created_listing = await listing_crud.create(obj_in=listing_create)
            created_listings.append(created_listing)
        except Exception as e:
            print(f"Error creating listing: {e}")
            continue
    
    return {
        "message": f"Created {len(created_listings)} sample listings",
        "listings": created_listings
    }

