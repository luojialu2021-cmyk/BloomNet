from fastapi import APIRouter, HTTPException, Depends, Header
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from bson import ObjectId
from typing import Optional

from app.models.sitter_profile import SitterProfileData, SitterProfileCreate, SitterProfileUpdate
from app.models.sitter import SitterProfile, Address, SitterCreate
from app.api.deps import get_database
from app.core.security import verify_token
from app.crud.crud_sitter import sitter as sitter_crud

router = APIRouter()


async def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    """Extract user ID from authorization header"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace('Bearer ', '')
    token_data = verify_token(token)
    
    if not token_data:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    # Verify user is a sitter
    if token_data.role != 'sitter':
        raise HTTPException(status_code=403, detail="User is not a sitter")
    
    return token_data.user_id


@router.post("/profile", response_model=SitterProfileData)
async def create_sitter_profile(
    profile_data: SitterProfileCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create or update sitter profile and sync to sitters collection for search"""
    # Get user info from auth_users
    auth_user = await db.auth_users.find_one({"_id": ObjectId(user_id)})
    if not auth_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if profile already exists
    existing_profile = await db.sitter_profiles.find_one({"user_id": user_id})
    
    if existing_profile:
        # Update existing profile
        update_data = profile_data.model_dump(exclude_unset=True)
        update_data['updated_at'] = datetime.utcnow()
        update_data['is_complete'] = True
        
        # Always auto-generate service_areas from zipcode (ignore any service_areas in request)
        if update_data.get('zipcode'):
            zipcode = str(update_data['zipcode']).split('-')[0]
            update_data['service_areas'] = [zipcode]
        elif 'service_areas' in update_data:
            # Remove service_areas if zipcode is not provided
            del update_data['service_areas']
        
        await db.sitter_profiles.update_one(
            {"user_id": user_id},
            {"$set": update_data}
        )
        
        updated_profile = await db.sitter_profiles.find_one({"user_id": user_id})
        updated_profile['id'] = str(updated_profile['_id'])
        
        # Sync to sitters collection for search
        await _sync_to_sitters_collection(updated_profile, auth_user, db)
        
        return SitterProfileData(**updated_profile)
    else:
        # Create new profile
        profile_dict = profile_data.model_dump()
        
        # Always auto-generate service_areas from zipcode (ignore any service_areas in request)
        if profile_dict.get('zipcode'):
            zipcode = str(profile_dict['zipcode']).split('-')[0]
            profile_dict['service_areas'] = [zipcode]
        # Remove service_areas from dict if provided (we auto-generate it)
        if 'service_areas' in profile_dict:
            del profile_dict['service_areas']
        
        new_profile = SitterProfileData(
            user_id=user_id,
            email=auth_user['email'],
            name=auth_user['name'],
            **profile_dict,
            is_complete=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        result = await db.sitter_profiles.insert_one(
            new_profile.model_dump(exclude={'id'})
        )
        
        new_profile.id = str(result.inserted_id)
        
        # Sync to sitters collection for search
        await _sync_to_sitters_collection(new_profile.model_dump(), auth_user, db)
        
        return new_profile


async def _sync_to_sitters_collection(profile_data: dict, auth_user: dict, db: AsyncIOMotorDatabase):
    """Sync sitter profile data to sitters collection for search functionality"""
    try:
        user_id = profile_data.get('user_id')
        
        # Convert SitterProfileData format to SitterProfile format
        address = Address(
            address_1=profile_data.get('address_line1', ''),
            address_2=profile_data.get('address_line2'),
            city=profile_data.get('city', ''),
            state=profile_data.get('state', ''),
            zipcode=profile_data.get('zipcode', '')
        )
        
        # Build service_areas from zipcode (always auto-generate from zipcode)
        service_areas = []
        if profile_data.get('zipcode'):
            # Extract 5-digit ZIP code
            zipcode = str(profile_data['zipcode']).split('-')[0]
            service_areas = [zipcode]
        
        # Check if sitter already exists in sitters collection
        # Convert user_id to string if it's ObjectId
        user_id_str = str(user_id) if not isinstance(user_id, str) else user_id
        existing_sitter = await sitter_crud.get_by_user_id(user_id_str)
        
        sitter_data = {
            "user_id": user_id,  # SitterCreate expects string (will be converted to ObjectId by validator)
            "name": profile_data.get('name', auth_user.get('name', '')),
            "email": profile_data.get('email', auth_user.get('email')),
            "tagline": profile_data.get('tagline'),
            "bio": profile_data.get('bio'),
            "address": address,
            "campus_area": profile_data.get('campus_area'),
            "service_radius_miles": 10.0,  # Default, can be updated later
            "price_per_visit": profile_data.get('price_per_visit', 0.0),
            "service_areas": service_areas,
            "specialties": profile_data.get('specialties', []),
            "experience_level": "beginner"  # Default, can be updated later
        }
        
        if existing_sitter:
            # Update existing sitter
            from app.models.sitter import SitterUpdate
            sitter_update = SitterUpdate(**{k: v for k, v in sitter_data.items() if k != 'user_id' and v is not None})
            updated_sitter = await sitter_crud.update(obj=existing_sitter, obj_in=sitter_update)
            
            # Ensure is_available and is_active are set to True
            # Use ObjectId for user_id in query
            from bson import ObjectId
            user_id_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
            await db.sitters.update_one(
                {"user_id": user_id_obj},
                {"$set": {"is_available": True, "is_active": True}}
            )
        else:
            # Create new sitter
            sitter_create = SitterCreate(**sitter_data)
            created_sitter = await sitter_crud.create(obj_in=sitter_create)
            
            # Ensure is_available and is_active are set to True
            await db.sitters.update_one(
                {"_id": created_sitter.id},
                {"$set": {"is_available": True, "is_active": True}}
            )
            
    except Exception as e:
        # Log error but don't fail the request
        print(f"Warning: Failed to sync sitter profile to sitters collection: {str(e)}")
        import traceback
        traceback.print_exc()


@router.get("/profile", response_model=SitterProfileData)
async def get_sitter_profile(
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get current sitter's profile"""
    profile = await db.sitter_profiles.find_one({"user_id": user_id})
    
    if not profile:
        # Return basic profile from auth_users
        auth_user = await db.auth_users.find_one({"_id": ObjectId(user_id)})
        if not auth_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return SitterProfileData(
            user_id=user_id,
            email=auth_user['email'],
            name=auth_user['name'],
            is_complete=False
        )
    
    profile['id'] = str(profile['_id'])
    return SitterProfileData(**profile)


@router.put("/profile", response_model=SitterProfileData)
async def update_sitter_profile(
    profile_data: SitterProfileUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update sitter profile and sync to sitters collection"""
    existing_profile = await db.sitter_profiles.find_one({"user_id": user_id})
    
    if not existing_profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    update_data = profile_data.model_dump(exclude_unset=True)
    update_data['updated_at'] = datetime.utcnow()
    
    await db.sitter_profiles.update_one(
        {"user_id": user_id},
        {"$set": update_data}
    )
    
    updated_profile = await db.sitter_profiles.find_one({"user_id": user_id})
    updated_profile['id'] = str(updated_profile['_id'])
    
    # Sync to sitters collection
    auth_user = await db.auth_users.find_one({"_id": ObjectId(user_id)})
    if auth_user:
        await _sync_to_sitters_collection(updated_profile, auth_user, db)
    
    return SitterProfileData(**updated_profile)


@router.post("/profile/sync-to-search", response_model=dict)
async def sync_profile_to_search(
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Manually sync sitter profile to sitters collection for search functionality.
    This is useful for sitters who registered before the sync feature was added.
    """
    try:
        # Get sitter profile
        profile = await db.sitter_profiles.find_one({"user_id": user_id})
        if not profile:
            raise HTTPException(status_code=404, detail="Sitter profile not found")
        
        # Get auth user
        auth_user = await db.auth_users.find_one({"_id": ObjectId(user_id)})
        if not auth_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Sync to sitters collection
        await _sync_to_sitters_collection(profile, auth_user, db)
        
        return {
            "message": "Profile successfully synced to search collection",
            "success": True
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to sync profile: {str(e)}"
        )
