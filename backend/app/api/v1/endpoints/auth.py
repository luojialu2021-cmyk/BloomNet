from typing import Any, List, Optional

import random
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pydantic import BaseModel

from app.api.deps import get_current_active_user, get_current_user_stub, get_database
from app.crud.crud_user import user as user_crud
from app.models.user import User
from app.services.dev_seed import (
    DEV_EMAIL_CONFIG,
    ensure_dev_data,
    get_dev_user_by_token,
)

from .utils import EmailRequest, VerifyCodeRequest, create_jwt_token, send_verification_code


router = APIRouter()


class DevLoginRequest(BaseModel):
    email: str
    password: Optional[str] = None


@router.post("/verify-code")
async def verify_code(data: VerifyCodeRequest):
    email = data.email.lower()
    dev_config = DEV_EMAIL_CONFIG.get(email)
    if dev_config:
        if data.code != dev_config["code"]:
            raise HTTPException(status_code=400, detail="Invalid or expired code")

        await ensure_dev_data()
        token = dev_config["token"]
        dev_user = await get_dev_user_by_token(token)
        return {
            "token": token,
            "email": dev_user.email if dev_user else email,
        }

    db = AsyncIOMotorClient().bloomnet
    record = await db.verifications.find_one({"email": email, "code": data.code})

    if not record or record["expires"] < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    user = await db.users.find_one({"email": email})
    if not user:
        new_user = {
            "email": email,
            "username": data.username,
            "created_at": datetime.utcnow()
        }
        await db.users.insert_one(new_user)

    token = create_jwt_token({"email": email})
    return {"token": token, "email": email}


@router.post("/request-code")
async def request_code(data: EmailRequest):
    email = data.email.lower()
    if not email.endswith("@jh.edu"):
        raise HTTPException(status_code=400, detail="Only JHU emails allowed")

    dev_config = DEV_EMAIL_CONFIG.get(email)
    if dev_config:
        await ensure_dev_data()
        return {
            "message": f"Development login: use code {dev_config['code']} to sign in."
        }

    code = str(random.randint(100000, 999999))
    await send_verification_code(email, code)

    db = AsyncIOMotorClient().bloomnet
    await db.verifications.insert_one({
        "email": email,
        "code": code,
        "expires": datetime.utcnow() + timedelta(minutes=10)
    })
    return {"message": "Verification code sent to your JHU email"}


@router.get("/me", response_model=User)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Any:
    """
    Get current user information, including profile data from user_profiles
    """
    from bson import ObjectId
    
    # Get user profile to include preferred_plant_types and other profile data
    try:
        user_id = str(current_user.id)
        profile = await db.user_profiles.find_one({"user_id": user_id})
        
        if profile:
            # Merge profile data into current_user
            if profile.get("preferred_plant_types"):
                current_user.preferred_plant_types = profile.get("preferred_plant_types", [])
            if profile.get("bio") and not current_user.bio:
                current_user.bio = profile.get("bio")
            if profile.get("phone") and not current_user.phone:
                current_user.phone = profile.get("phone")
            if profile.get("profile_image") and not current_user.profile_image:
                current_user.profile_image = profile.get("profile_image")
    except Exception as e:
        print(f"[get_current_user_info] Error fetching profile: {e}")
    
    return current_user


@router.get("/users/similar", response_model=List[User])
async def get_users_with_similar_interests(
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
    limit: int = 10
) -> Any:
    """
    Get users with similar plant type interests (excluding current user)
    Queries user_profiles collection where preferred_plant_types are stored
    """
    from bson import ObjectId
    
    # Get current user's preferred plant types from their profile
    current_user_id = str(current_user.id)
    current_user_profile = await db.user_profiles.find_one({"user_id": current_user_id})
    current_user_types = []
    
    if current_user_profile:
        current_user_types = current_user_profile.get("preferred_plant_types", [])
    elif current_user.preferred_plant_types:
        current_user_types = current_user.preferred_plant_types
    
    if not current_user_types:
        # If user has no preferences, return empty list
        return []
    
    # Build query to find user_profiles with matching plant types
    # Exclude current user
    filter_dict = {
        "user_id": {"$ne": current_user_id},
        "preferred_plant_types": {"$in": current_user_types}
    }
    
    # Query user_profiles collection
    cursor = db.user_profiles.find(filter_dict).limit(limit)
    profile_docs = await cursor.to_list(length=limit)
    
    # Convert to User models by fetching corresponding auth_users data
    # Filter to only include users with actual overlapping interests
    similar_users = []
    for profile_doc in profile_docs:
        try:
            profile_user_id = profile_doc.get("user_id")
            if not profile_user_id:
                continue
            
            # Check if there's actual overlap in plant types
            profile_types = set((profile_doc.get("preferred_plant_types") or []))
            current_types_set = set(current_user_types)
            if not profile_types or not profile_types.intersection(current_types_set):
                continue  # Skip if no matching interests
            
            # Get auth_user data
            try:
                user_oid = ObjectId(profile_user_id)
            except:
                continue
                
            auth_user = await db.auth_users.find_one({"_id": user_oid})
            if not auth_user or not auth_user.get("is_active", True):
                continue
            
            # Combine profile and auth_user data into User model
            user = User(
                id=str(auth_user["_id"]),
                email=profile_doc.get("email") or auth_user.get("email", ""),
                full_name=profile_doc.get("name") or auth_user.get("name", "") or auth_user.get("full_name", ""),
                jhu_id="",
                phone=profile_doc.get("phone", ""),
                bio=profile_doc.get("bio", ""),
                profile_image=profile_doc.get("profile_image") or auth_user.get("profile_image"),
                rating=0,
                total_reviews=0,
                specialties=[],
                service_areas=[],
                is_available=True,
                preferred_plant_types=list(profile_types),
                is_active=auth_user.get("is_active", True),
                is_verified=False,
                created_at=auth_user.get("created_at", datetime.utcnow()),
                updated_at=auth_user.get("updated_at", datetime.utcnow()),
            )
            similar_users.append(user)
            
            # Stop when we have enough
            if len(similar_users) >= limit:
                break
        except Exception as e:
            print(f"[get_users_with_similar_interests] Error converting user: {e}")
            import traceback
            traceback.print_exc()
            continue
    
    return similar_users


@router.get("/users/{user_id}", response_model=User)
async def get_user_by_id(
    user_id: str,
    current_user: User = Depends(get_current_user_stub),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Any:
    """
    Get user by ID - for viewing profiles
    Checks both users and auth_users collections
    """
    from bson import ObjectId
    
    # Try users collection first
    user = await user_crud.get(user_id)
    
    # If not found, try auth_users collection
    if not user:
        try:
            auth_user = await db.auth_users.find_one({"_id": ObjectId(user_id)})
            if auth_user:
                # Convert auth_user to User format
                user = User(
                    id=str(auth_user["_id"]),
                    email=auth_user.get("email", ""),
                    full_name=auth_user.get("name", "") or auth_user.get("full_name", ""),
                    jhu_id="",
                    phone="",
                    bio="",
                    profile_image=auth_user.get("profile_image"),
                    rating=0,
                    total_reviews=0,
                    specialties=[],
                    service_areas=[],
                    is_available=True,
                    preferred_plant_types=[],
                    is_active=auth_user.get("is_active", True),
                    is_verified=False,
                    created_at=auth_user.get("created_at", datetime.utcnow()),
                    updated_at=auth_user.get("updated_at", datetime.utcnow()),
                )
        except Exception as e:
            print(f"[get_user_by_id] Error checking auth_users: {e}")
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


# Stub login endpoint for development
@router.post("/login")
async def login() -> Any:
    """
    Stub login endpoint for development
    Returns a fake token
    """
    return {
        "access_token": "fake-jwt-token-for-development",
        "token_type": "bearer",
        "user": {
            "id": "507f1f77bcf86cd799439011",
            "email": "test@jhu.edu",
            "full_name": "Test User",
            "jhu_id": "tuser1"
        }
    }


@router.post("/logout")
async def logout() -> Any:
    """
    Stub logout endpoint
    """
    return {"message": "Successfully logged out"}


@router.post("/dev-login")
async def dev_login(payload: DevLoginRequest) -> Any:
    """
    Development-only login helper for predefined owner/sitter accounts.
    """
    email = payload.email.lower()
    dev_config = DEV_EMAIL_CONFIG.get(email)
    if not dev_config:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported development account",
        )

    expected_code = dev_config["code"]
    if payload.password and payload.password != expected_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid credentials for development account",
        )

    await ensure_dev_data()
    token = dev_config["token"]
    dev_user = await get_dev_user_by_token(token)
    return {
        "token": token,
        "email": dev_user.email if dev_user else email,
    }
