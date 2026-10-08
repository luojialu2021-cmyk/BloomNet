from __future__ import annotations

from datetime import datetime, timedelta
from typing import Dict, Optional, List
import hashlib

from bson import ObjectId

from app.core.database import get_database
from app.models.user import User
from app.models.reservation import Reservation
from app.models.auth import UserRole


# Predefined development user IDs and tokens
DEV_OWNER_ID = ObjectId("64f1f77bcf86cd7994390111")
DEV_SITTER_ID = ObjectId("64f1f77bcf86cd7994390112")

DEV_OWNER_TOKEN = "dev-owner-token"
DEV_SITTER_TOKEN = "dev-sitter-token"

DEV_OWNER_EMAIL = "ownertest@jh.edu"
DEV_SITTER_EMAIL = "sittertest@jh.edu"
DEV_SITTER_GMAIL = "sittertest996@gmail.com"  # OAuth Gmail for test sitter

DEV_OWNER_CODE = "111111"
DEV_SITTER_CODE = "222222"

DEV_SITTER_PROFILE_ID = ObjectId("64f1f77bcf86cd7994390211")

DEV_RESERVATION_IDS = {
    "upcoming": ObjectId("64f1f77bcf86cd7994390311"),
    "in_progress": ObjectId("64f1f77bcf86cd7994390312"),
}


def _deterministic_object_id(seed: str) -> ObjectId:
    """Generate a deterministic ObjectId from a seed string."""
    digest = hashlib.md5(seed.encode("utf-8")).hexdigest()
    return ObjectId(digest[:24])


def _owner_user_doc(now: datetime) -> Dict:
    created_at = now - timedelta(days=45)
    return {
        "_id": DEV_OWNER_ID,
        "email": DEV_OWNER_EMAIL,
        "full_name": "Morgan Reed",
        "jhu_id": "ownertest1",
        "phone": "410-555-1234",
        "bio": "Plant collector in Charles Village. Loves soft music for the foliage.",
        "rating": 4.9,
        "total_reviews": 8,
        "specialties": ["succulents", "indoor palms"],
        "service_areas": ["21218"],
        "is_available": True,
        "preferred_plant_types": ["fern", "tropical"],
        "is_active": True,
        "is_verified": True,
        "created_at": created_at,
        "updated_at": now,
    }


def _sitter_user_doc(now: datetime) -> Dict:
    created_at = now - timedelta(days=60)
    return {
        "_id": DEV_SITTER_ID,
        "email": DEV_SITTER_EMAIL,
        "full_name": "Sitter Test",
        "jhu_id": "sittertest1",
        "phone": "443-555-9876",
        "bio": "Dev sitter account covering indoor tropical plants around Homewood.",
        "rating": 4.8,
        "total_reviews": 24,
        "specialties": ["tropical foliage", "rare aroids", "humidity control"],
        "service_areas": ["21218", "21211", "21210"],
        "is_available": True,
        "preferred_plant_types": ["tropical", "flower"],
        "is_active": True,
        "is_verified": True,
        "created_at": created_at,
        "updated_at": now,
    }


def _sitter_profile_doc(now: datetime) -> Dict:
    return {
        "_id": DEV_SITTER_PROFILE_ID,
        "user_id": str(DEV_SITTER_ID),
        "email": DEV_SITTER_GMAIL,  # Required: matches frontend hardcoded email
        "name": "Sitter Test",
        "tagline": "Reliable plant sitter for Homewood balconies",
        "bio": (
            "Hi! I'm a horticulture student focused on tropical plants and rare aroids. "
            "I love building customized watering schedules using moisture meters and smart alerts."
        ),
        "profile_image": None,
        "address": {
            "address_1": "3200 St Paul St",
            "address_2": "Apt 204",
            "city": "Baltimore",
            "state": "MD",
            "zipcode": "21218",
        },
        "campus_area": "Homewood",
        "service_radius_miles": 6.0,
        "price_per_visit": 28.0,
        "price_per_day": 70.0,
        "price_per_week": 380.0,
        "service_areas": ["21218", "21211", "21210"],
        "specialties": ["tropical foliage", "humidity control", "propagation"],
        "badges": ["Verified", "Background Checked"],
        "experience_level": "expert",
        "rating": 4.8,
        "total_reviews": 24,
        "years_experience": 4,
        "is_available": True,
        "availability_calendar": [],
        "unavailable_dates": [],
        "is_active": True,
        "is_verified": True,
        "background_checked": True,
        "created_at": now - timedelta(days=50),
        "updated_at": now,
    }


def _reservation_docs(now: datetime) -> Dict[str, Dict]:
    today = now.date()
    upcoming_start = today + timedelta(days=3)
    upcoming_end = upcoming_start + timedelta(days=2)

    in_progress_start = today - timedelta(days=1)
    in_progress_end = today + timedelta(days=1)

    return {
        "upcoming": {
            "_id": DEV_RESERVATION_IDS["upcoming"],
        "owner_id": str(DEV_OWNER_ID),
        "sitter_id": str(DEV_SITTER_ID),
        "sitter_profile_id": str(DEV_SITTER_PROFILE_ID),
            "listing_id": None,
            "start_date": upcoming_start.isoformat(),
            "end_date": upcoming_end.isoformat(),
            "total_amount": 165.0,
            "plants_info": "6 indoor plants (monsteras, snake plants, herbs)",
            "care_instructions": (
                "Water monsteras every 3 days, mist herbs daily, rotate snake plants once."
            ),
            "location_address": "3400 N Charles St, Baltimore, MD 21218",
            "access_instructions": "Door code 1717#, cat named Pixel is friendly.",
            "status": "confirmed",
            "payment_status": "paid",
            "care_updates": [],
            "special_notes": "Owner returns Sunday night; please leave key on counter.",
            "created_at": now - timedelta(days=2),
            "updated_at": now - timedelta(hours=6),
            "confirmed_at": now - timedelta(days=1, hours=3),
            "started_at": None,
            "completed_at": None,
            "owner_notes": "Excited to have you back! The fern is in the bathroom.",
            "sitter_notes": None,
        },
        "in_progress": {
            "_id": DEV_RESERVATION_IDS["in_progress"],
        "owner_id": str(DEV_OWNER_ID),
        "sitter_id": str(DEV_SITTER_ID),
        "sitter_profile_id": str(DEV_SITTER_PROFILE_ID),
            "listing_id": None,
            "start_date": in_progress_start.isoformat(),
            "end_date": in_progress_end.isoformat(),
            "total_amount": 210.0,
            "plants_info": "10 mixed plants, including orchids and bonsai.",
            "care_instructions": (
                "Orchids need gentle mist in morning, bonsai watering every evening. "
                "Check moisture meter readings and fertilize orchids once this week."
            ),
            "location_address": "1025 W 36th St, Baltimore, MD 21211",
            "access_instructions": "Lockbox by door, code 5530. Watch out for the humidifier sensor.",
            "status": "in_progress",
            "payment_status": "paid",
            "care_updates": [
                {
                    "date": now - timedelta(hours=18),
                    "photos": [
                        "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=400&q=60"
                    ],
                    "notes": "Morning check-in: misted orchids, rotated bonsai for even light.",
                    "care_actions": ["misted orchids", "rotated bonsai", "checked humidity"],
                    "timestamp_verified": True,
                },
                {
                    "date": now - timedelta(hours=6),
                    "photos": [
                        "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=400&q=60"
                    ],
                    "notes": "Evening visit: watered bonsai, verified soil moisture levels, adjusted grow light timers.",
                    "care_actions": ["watered bonsai", "logged moisture", "adjusted lighting"],
                    "timestamp_verified": True,
                },
            ],
            "special_notes": "Owner left extra plant food under the sink.",
            "created_at": now - timedelta(days=3),
            "updated_at": now - timedelta(hours=3),
            "confirmed_at": now - timedelta(days=3, hours=4),
            "started_at": now - timedelta(days=1, hours=5),
            "completed_at": None,
            "owner_notes": None,
            "sitter_notes": "All plants looking vibrant. Will fertilize orchids tomorrow morning.",
        },
    }


DEV_EMAIL_CONFIG = {
    DEV_OWNER_EMAIL: {
        "token": DEV_OWNER_TOKEN,
        "code": DEV_OWNER_CODE,
    },
    DEV_SITTER_EMAIL: {
        "token": DEV_SITTER_TOKEN,
        "code": DEV_SITTER_CODE,
    },
}

DEV_TOKEN_TO_USER_ID = {
    DEV_OWNER_TOKEN: DEV_OWNER_ID,
    DEV_SITTER_TOKEN: DEV_SITTER_ID,
}


async def ensure_dev_data() -> None:
    """
    Upsert development users, sitter profile, and sample reservations.
    Safe to call multiple times.
    """
    db = await get_database()
    if db is None:
        return

    now = datetime.utcnow()

    # Upsert users
    user_docs = [
        _owner_user_doc(now),
        _sitter_user_doc(now),
    ]
    for doc in user_docs:
        _id = doc["_id"]
        update_doc = {**doc}
        update_doc.pop("_id")
        created_at = update_doc.pop("created_at", now)
        result = await db.users.update_one(
            {"_id": _id},
            {
                "$set": update_doc,
                "$setOnInsert": {"created_at": created_at},
            },
            upsert=True,
        )
        
        # Verify the user was created with correct ID
        verify_user = await db.users.find_one({"_id": _id})
        if not verify_user:
            raise ValueError(f"CRITICAL: Failed to create user with fixed ID {_id}")
    
    # Verify test sitter user ID (CRITICAL for frontend hardcoded values)
    verify_sitter_user = await db.users.find_one({"_id": DEV_SITTER_ID})
    if not verify_sitter_user:
        raise ValueError(
            f"CRITICAL: Test sitter user not found with ID {DEV_SITTER_ID}. "
            f"Frontend hardcodes this ID - it MUST exist!"
        )
    print(f"[dev_seed] ✅ Verified test sitter user ID: {DEV_SITTER_ID} (must match frontend: 64f1f77bcf86cd7994390112)")

    # Upsert sitter profile
    sitter_doc = _sitter_profile_doc(now)
    sitter_id = sitter_doc["_id"]
    profile_update = {**sitter_doc}
    profile_update.pop("_id")
    created_at = profile_update.pop("created_at", now)
    result = await db.sitters.update_one(
        {"_id": sitter_id},
        {
            "$set": profile_update,
            "$setOnInsert": {"created_at": created_at},
        },
        upsert=True,
    )
    
    # CRITICAL: Verify that the sitter profile was created/updated with the correct fixed IDs
    # This ensures consistency across different environments
    verify_profile = await db.sitters.find_one({"_id": sitter_id})
    if not verify_profile:
        raise ValueError(f"CRITICAL: Failed to create sitter profile with fixed ID {sitter_id}")
    if str(verify_profile.get("user_id")) != str(DEV_SITTER_ID):
        raise ValueError(
            f"CRITICAL: Sitter profile user_id mismatch! "
            f"Expected {DEV_SITTER_ID}, got {verify_profile.get('user_id')}"
        )
    if verify_profile.get("email") != DEV_SITTER_GMAIL:
        # Auto-fix email if it doesn't match
        await db.sitters.update_one(
            {"_id": sitter_id},
            {"$set": {"email": DEV_SITTER_GMAIL}}
        )
        print(f"[dev_seed] Auto-fixed sitter profile email to {DEV_SITTER_GMAIL}")
    
    print(f"[dev_seed] ✅ Verified test sitter profile:")
    print(f"   Profile ID: {sitter_id} (must match frontend: 64f1f77bcf86cd7994390211)")
    print(f"   User ID: {verify_profile.get('user_id')} (must match frontend: {DEV_SITTER_ID})")
    print(f"   Email: {verify_profile.get('email')} (must match frontend: {DEV_SITTER_GMAIL})")

    # Upsert reservations
    reservation_docs = _reservation_docs(now)
    for doc in reservation_docs.values():
        _id = doc["_id"]
        update_payload = {**doc}
        update_payload.pop("_id")
        await db.reservations.update_one(
            {"_id": _id},
            {"$set": update_payload},
            upsert=True,
        )


async def get_dev_user_by_token(token: str) -> Optional[User]:
    """
    Fetch the development user associated with a dev token, if available.
    Falls back to static definitions if database is unavailable.
    """
    user_id = DEV_TOKEN_TO_USER_ID.get(token)
    if not user_id:
        return None

    db = await get_database()
    if db is not None:
        doc = await db.users.find_one({"_id": user_id})
        if doc:
            return User(**doc)

    # Fallback to base definitions if DB lookup fails
    now = datetime.utcnow()
    if token == DEV_OWNER_TOKEN:
        return User(**_owner_user_doc(now))
    if token == DEV_SITTER_TOKEN:
        return User(**_sitter_user_doc(now))
    return None


async def ensure_sample_reservations_for_sitter(sitter_id: str) -> List[Reservation]:
    """
    Ensure a demonstration reservation exists for the given sitter_id.
    Returns the sitter's reservations after seeding.
    """
    await ensure_dev_data()
    db = await get_database()
    if db is None:
        return []

    now = datetime.utcnow()
    start_date = now.date()
    end_date = start_date + timedelta(days=3)
    created_at = now - timedelta(days=1)
    latest_update = datetime(
        now.year,
        now.month,
        now.day,
        9,
        15,
        0,
        0,
    )

    reservation_id = _deterministic_object_id(f"{sitter_id}:demo-reservation")

    sitter_profile_doc = await db.sitter_profiles.find_one({"user_id": sitter_id})
    sitter_profile_id = (
        str(sitter_profile_doc["_id"])
        if sitter_profile_doc and "_id" in sitter_profile_doc
        else sitter_id
    )

    reservation_doc = {
        "_id": reservation_id,
        "owner_id": str(DEV_OWNER_ID),
        "sitter_id": sitter_id,
        "sitter_profile_id": sitter_profile_id,
        "listing_id": None,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "total_amount": 180.0,
        "plants_info": "Monstera deliciosa • Snake plant • Peace lily",
        "care_instructions": (
            "Water Monstera when the top inch of soil is dry, mist peace lily every morning, "
            "rotate snake plant every Wednesday."
        ),
        "location_address": "123 Greenhouse Lane, Baltimore, MD 21218",
        "access_instructions": "Lockbox code 1973 under the planter by the door.",
        "status": "in_progress",
        "payment_status": "paid",
        "care_updates": [
            {
                "id": "demo-care-update-1",
                "date": latest_update,
                "photos": [
                    "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=400&q=80"
                ],
                "notes": (
                    "Morning check-in complete. Adjusted the grow light timer and wiped dust "
                    "from Monstera leaves."
                ),
                "care_actions": [
                    "Watered Monstera with 300ml filtered water",
                    "Misted peace lily leaves",
                    "Rotated snake plant 90° toward sunlight",
                ],
                "tasks_completed": ["Water Monstera", "Mist Peace Lily"],
                "timestamp_verified": True,
                "liked_by": [],
                "comments": [
                    {
                        "id": "demo-comment-owner",
                        "user_id": str(DEV_OWNER_ID),
                        "role": UserRole.USER.value,
                        "message": "Thanks for the update! The plants look happy.",
                        "created_at": latest_update + timedelta(minutes=15),
                        "liked_by": [],
                    }
                ],
            }
        ],
        "care_checklist": [
            "Water Monstera if soil is dry",
            "Mist Peace Lily leaves",
            "Check grow light timer",
        ],
        "special_notes": "Bonus points if you play soft music for the plants 🎶",
        "owner_notes": "Please send a quick photo each visit.",
        "sitter_notes": "Remember to bring plant-safe microfiber cloth.",
        "created_at": created_at,
        "confirmed_at": created_at,
        "started_at": created_at,
        "completed_at": None,
        "updated_at": latest_update,
        "owner_rating": None,
        "sitter_rating": None,
        "owner_review": None,
        "sitter_review": None,
    }

    await db.reservations.update_one(
        {"_id": reservation_id},
        {"$set": reservation_doc},
        upsert=True,
    )

    cursor = db.reservations.find({"sitter_id": sitter_id}).sort("created_at", -1)
    docs = await cursor.to_list(length=20)
    return [Reservation(**doc) for doc in docs]
