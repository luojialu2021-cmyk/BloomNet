from fastapi import APIRouter, HTTPException, Depends, Header
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from bson import ObjectId
from typing import Optional

from app.models.user_profile import UserProfile, UserProfileCreate, UserProfileUpdate
from app.api.deps import get_database
from app.core.security import verify_token

router = APIRouter()


async def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    """Extract user ID from authorization header"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace('Bearer ', '')
    token_data = verify_token(token)
    
    if not token_data:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return token_data.user_id


@router.post("/profile", response_model=UserProfile)
async def create_user_profile(
    profile_data: UserProfileCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create or update user profile"""
    # Get user info from auth_users
    auth_user = await db.auth_users.find_one({"_id": ObjectId(user_id)})
    if not auth_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if profile already exists
    existing_profile = await db.user_profiles.find_one({"user_id": user_id})
    
    if existing_profile:
        # Update existing profile
        update_data = profile_data.model_dump(exclude_unset=True)
        update_data['updated_at'] = datetime.utcnow()
        update_data['is_complete'] = True
        
        await db.user_profiles.update_one(
            {"user_id": user_id},
            {"$set": update_data}
        )
        
        updated_profile = await db.user_profiles.find_one({"user_id": user_id})
        updated_profile['id'] = str(updated_profile['_id'])
        return UserProfile(**updated_profile)
    else:
        # Create new profile
        new_profile = UserProfile(
            user_id=user_id,
            email=auth_user['email'],
            name=auth_user['name'],
            **profile_data.model_dump(),
            is_complete=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        result = await db.user_profiles.insert_one(
            new_profile.model_dump(exclude={'id'})
        )
        
        new_profile.id = str(result.inserted_id)
        return new_profile


@router.get("/profile", response_model=UserProfile)
async def get_user_profile(
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get current user's profile"""
    profile = await db.user_profiles.find_one({"user_id": user_id})
    
    if not profile:
        # Return basic profile from auth_users
        auth_user = await db.auth_users.find_one({"_id": ObjectId(user_id)})
        if not auth_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return UserProfile(
            user_id=user_id,
            email=auth_user['email'],
            name=auth_user['name'],
            is_complete=False
        )
    
    profile['id'] = str(profile['_id'])
    return UserProfile(**profile)


@router.put("/profile", response_model=UserProfile)
async def update_user_profile(
    profile_data: UserProfileUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update user profile"""
    existing_profile = await db.user_profiles.find_one({"user_id": user_id})
    
    if not existing_profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    update_data = profile_data.model_dump(exclude_unset=True)
    update_data['updated_at'] = datetime.utcnow()
    
    await db.user_profiles.update_one(
        {"user_id": user_id},
        {"$set": update_data}
    )
    
    updated_profile = await db.user_profiles.find_one({"user_id": user_id})
    updated_profile['id'] = str(updated_profile['_id'])
    return UserProfile(**updated_profile)


@router.get("/profile/bookings")
async def get_user_bookings(
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get user's bookings"""
    try:
        # Try both owner_id and user_id fields for backward compatibility
        # First try owner_id
        reservations_cursor = db.reservations.find(
            {"owner_id": user_id}
        ).sort("created_at", -1)
        
        reservations = await reservations_cursor.to_list(100)
        
        # If no reservations found with owner_id, try user_id
        if not reservations:
            reservations_cursor = db.reservations.find(
                {"user_id": user_id}
            ).sort("created_at", -1)
            reservations = await reservations_cursor.to_list(100)
        
        # Enrich with sitter information
        result = []
        for reservation in reservations:
            try:
                reservation_dict = dict(reservation)
                reservation_dict['id'] = str(reservation_dict['_id'])
                
                # Get sitter info if sitter_id exists
                sitter_id = reservation_dict.get('sitter_id')
                if sitter_id:
                    try:
                        # Try finding by _id first (if it's a profile ID)
                        sitter = await db.sitters.find_one({"_id": ObjectId(sitter_id)})
                        if not sitter:
                            # If not found by _id, try finding by user_id
                            sitter = await db.sitters.find_one({"user_id": ObjectId(sitter_id)})
                        
                        if sitter:
                            reservation_dict['sitter_name'] = sitter.get('name', 'Unknown')
                            reservation_dict['sitter_profile_image'] = sitter.get('profile_image')
                        else:
                            reservation_dict['sitter_name'] = 'Unknown'
                    except Exception as sitter_error:
                        print(f"[get_user_bookings] Error finding sitter {sitter_id}: {sitter_error}")
                        reservation_dict['sitter_name'] = 'Unknown'
                else:
                    reservation_dict['sitter_name'] = 'Unknown'
                
                result.append(reservation_dict)
            except Exception as reservation_error:
                print(f"[get_user_bookings] Error processing reservation {reservation.get('_id', 'unknown')}: {reservation_error}")
                continue
        
        return {"bookings": result}
    except Exception as e:
        print(f"[get_user_bookings] Error fetching bookings for user {user_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch bookings: {str(e)}")

