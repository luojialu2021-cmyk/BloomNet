from fastapi import APIRouter, HTTPException, Depends
from google.oauth2 import id_token
from google.auth.transport import requests
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime

from app.core.config import settings
from app.core.security import create_access_token
from app.models.auth import GoogleAuthRequest, AuthResponse, AuthUser, UserRole
from app.api.deps import get_database
from app.services.dev_seed import (
    ensure_dev_data,
    DEV_OWNER_EMAIL,
    DEV_OWNER_ID,
    DEV_SITTER_EMAIL,
    DEV_SITTER_ID,
)

router = APIRouter()


@router.post("/google", response_model=AuthResponse)
async def google_auth(
    auth_request: GoogleAuthRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Authenticate user with Google OAuth
    
    This endpoint:
    1. Verifies the Google ID token
    2. Creates or updates user in database
    3. Returns JWT access token
    """
    try:
        # Verify Google token
        idinfo = id_token.verify_oauth2_token(
            auth_request.credential,
            requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )
        
        # Extract user information from Google
        google_user_id = idinfo['sub']
        email = idinfo.get('email')
        name = idinfo.get('name', email.split('@')[0])
        profile_image = idinfo.get('picture')
        
        if not email:
            raise HTTPException(status_code=400, detail="Email not provided by Google")
        
        dev_account_map = {
            DEV_OWNER_EMAIL: (str(DEV_OWNER_ID), UserRole.USER),
            DEV_SITTER_EMAIL: (str(DEV_SITTER_ID), UserRole.SITTER),
        }

        # Check if this email matches a seeded development account
        if email in dev_account_map:
            target_user_id, expected_role = dev_account_map[email]
            # Ensure dev data is present (users, sitter profile, reservations)
            await ensure_dev_data()

            users_collection = db.auth_users
            await users_collection.update_one(
                {"_id": DEV_OWNER_ID if email == DEV_OWNER_EMAIL else DEV_SITTER_ID},
                {
                    "$set": {
                        "email": email,
                        "name": name,
                        "google_id": google_user_id,
                        "profile_image": profile_image,
                        "role": expected_role,
                        "last_login": datetime.utcnow(),
                    },
                    "$setOnInsert": {"created_at": datetime.utcnow()},
                },
                upsert=True,
            )

            access_token = create_access_token(
                user_id=target_user_id,
                email=email,
                role=expected_role,
            )

            return AuthResponse(
                access_token=access_token,
                user_id=target_user_id,
                email=email,
                name=name,
                role=expected_role,
                is_new_user=False,
            )

        # Check if user exists (non-dev accounts)
        users_collection = db.auth_users
        existing_user = await users_collection.find_one({"google_id": google_user_id})
        if not existing_user:
            existing_user = await users_collection.find_one({"email": email})
        
        is_new_user = False
        user_id = None
        
        if existing_user:
            # Update last login
            # Handle both ObjectId and string _id
            user_id_obj = existing_user["_id"]
            user_id = str(user_id_obj) if isinstance(user_id_obj, ObjectId) else user_id_obj
            await users_collection.update_one(
                {"_id": user_id_obj},
                {"$set": {"last_login": datetime.utcnow()}}
            )
            
            # Check if user has completed their profile based on role
            if auth_request.role == UserRole.SITTER:
                sitter_profile = await db.sitter_profiles.find_one({"user_id": user_id})
                is_new_user = not (sitter_profile and sitter_profile.get("is_complete", False))
            elif auth_request.role == UserRole.USER:
                user_profile = await db.user_profiles.find_one({"user_id": user_id})
                is_new_user = not (user_profile and user_profile.get("is_complete", False))
        else:
            # Create new user
            is_new_user = True
            new_user = AuthUser(
                email=email,
                name=name,
                google_id=google_user_id,
                profile_image=profile_image,
                role=auth_request.role,
                created_at=datetime.utcnow(),
                last_login=datetime.utcnow()
            )
            
            result = await users_collection.insert_one(new_user.model_dump(exclude={'id'}))
            user_id = str(result.inserted_id)
        
        # Create JWT token
        access_token = create_access_token(
            user_id=user_id,
            email=email,
            role=auth_request.role
        )
        
        return AuthResponse(
            access_token=access_token,
            user_id=user_id,
            email=email,
            name=name,
            role=auth_request.role,
            is_new_user=is_new_user
        )
        
    except ValueError as e:
        # Invalid token
        print(f"[Google Auth Error] ValueError: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")
    except Exception as e:
        # Log full error details for debugging
        import traceback
        error_trace = traceback.format_exc()
        print(f"[Google Auth Error] Exception: {str(e)}")
        print(f"[Google Auth Error] Traceback:\n{error_trace}")
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")


@router.get("/google/config")
async def get_google_config():
    """Get Google OAuth configuration for frontend"""
    return {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": f"http://localhost:3000/auth/callback"
    }


@router.get("/me")
async def get_current_user(
    db: AsyncIOMotorDatabase = Depends(get_database),
    # TODO: Add authentication dependency here
):
    """Get current authenticated user information"""
    # This is a placeholder - you'll need to implement proper auth middleware
    return {"message": "This endpoint requires authentication"}
