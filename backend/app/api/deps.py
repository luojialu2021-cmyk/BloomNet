from typing import Optional
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from app.models.user import User
from app.crud.crud_user import user as user_crud
from app.core.database import get_database as get_db
from app.core.security import verify_token
from app.services.dev_seed import (
    DEV_OWNER_TOKEN,
    DEV_SITTER_TOKEN,
    ensure_dev_data,
    get_dev_user_by_token,
)


# For Sprint 1, we'll use stub authentication
security = HTTPBearer(auto_error=False)


async def get_database() -> AsyncIOMotorDatabase:
    """Get database instance"""
    return await get_db()


async def get_current_user_stub(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    """
    Stub function for authentication - returns a fake user for development
    In production, this should validate JWT tokens and return actual user
    """
    token = credentials.credentials if credentials else None

    if token in {DEV_OWNER_TOKEN, DEV_SITTER_TOKEN}:
        # Ensure dev data exists before returning the user
        await ensure_dev_data()
        dev_user = await get_dev_user_by_token(token)
        if dev_user:
            return dev_user

    if token:
        # Try to interpret the token as a signed JWT (e.g. Google login)
        token_data = verify_token(token)
        if token_data:
            print(f"[get_current_user_stub] Token verified, user_id: {token_data.user_id}, email: {token_data.email}")
            db = await get_database()
            if db is not None:
                # First, look for a matching user in the primary users collection
                db_user = await user_crud.get(token_data.user_id)
                if db_user:
                    print(f"[get_current_user_stub] Found user in users collection: {db_user.id}")
                    return db_user
                else:
                    print(f"[get_current_user_stub] User {token_data.user_id} not found in users collection")

                # Fall back to auth_users (Google-authenticated users)
                try:
                    user_oid = ObjectId(token_data.user_id)
                except Exception:
                    user_oid = None

                if user_oid:
                    auth_user = await db.auth_users.find_one({"_id": user_oid})
                    if auth_user:
                        profile = await db.user_profiles.find_one({"user_id": token_data.user_id})

                        email = auth_user.get("email") or token_data.email
                        if not email:
                            email = "user@example.com"

                        full_name = (
                            (profile or {}).get("name")
                            or auth_user.get("name")
                            or email.split("@")[0]
                        )

                        user_payload = {
                            "_id": auth_user["_id"],
                            "email": email,
                            "full_name": full_name,
                            "profile_image": (profile or {}).get("profile_image") or auth_user.get("profile_image"),
                            "bio": (profile or {}).get("bio"),
                            "phone": (profile or {}).get("phone"),
                            "preferred_plant_types": (profile or {}).get("preferred_plant_types", []),
                            "is_active": auth_user.get("is_active", True),
                            "is_verified": True,
                        }
                        return User(**user_payload)

                # As a last resort, try to resolve by email
                if token_data.email:
                    existing_user = await user_crud.get_by_email(token_data.email)
                    if existing_user:
                        return existing_user

    if token:
        # Attempt to interpret token as direct user id reference (dev convenience)
        db_user = await user_crud.get(token)
        if db_user:
            return db_user

    # Return a dummy user for development
    stub_user = User(
        id="507f1f77bcf86cd799439011",  # MongoDB ObjectId format
        email="test@jhu.edu",
        full_name="Test User",
        jhu_id="tuser1",
        is_active=True,
        is_verified=True
    )
    return stub_user


async def get_current_active_user(
    current_user: User = Depends(get_current_user_stub)
) -> User:
    """
    Get current active user - stub version
    """
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


# Optional user dependency for endpoints that work with or without auth
async def get_current_user_optional() -> Optional[User]:
    """
    Optional user dependency - returns None if not authenticated
    """
    try:
        return await get_current_user_stub()
    except:
        return None


# Admin user dependency (stub)
async def get_current_admin_user(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """
    Get current admin user - stub version
    """
    # For development, any user can be admin
    return current_user
