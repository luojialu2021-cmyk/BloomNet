#!/usr/bin/env python3
"""
Test data generation script for nearby sitters functionality.
This script creates 100 realistic sitters across Baltimore, MD and Washington, DC.
"""

import asyncio
import sys
import os
from datetime import datetime
from typing import List

# Add the backend directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from app.core.database import connect_to_mongo, close_mongo_connection, get_database
from app.models.sitter import SitterCreate, Address
from app.crud.crud_sitter import sitter as sitter_crud
from bson import ObjectId


TOTAL_SITTERS = 100

BASE_USER_ID = int("67f1f77bcf86cd7994390200", 16)

FIRST_NAMES = [
    "Emma", "Marcus", "Sarah", "David", "Jessica", "Alex", "Maria", "Kevin", "Ashley", "Ryan",
    "Olivia", "Daniel", "Grace", "Tyler", "Sophia", "Noah", "Liam", "Mia", "Ava", "Ethan",
    "Lucas", "Chloe", "Isabella", "Jacob", "Amelia", "Ella", "Mason", "Harper", "Layla", "Nathan"
]

LAST_NAMES = [
    "Rodriguez", "Thompson", "Chen", "Park", "Wang", "Johnson", "Santos", "Liu", "Brown", "Mitchell",
    "Davis", "Kim", "Taylor", "Wilson", "Martinez", "Anderson", "Hernandez", "Scott", "Cooper", "Nguyen",
    "Morales", "King", "Riley", "Brooks", "Bennett", "Rivera", "Hughes", "Lopez", "Morgan", "Campbell"
]

TAGLINES = [
    "Plant lover keeping {neighborhood} greenery happy",
    "Trusted sitter for busy plant parents in {city}",
    "Botany student serving {neighborhood} homes",
    "Houseplant rescuer with a passion for rare species",
    "Your go-to sitter for thriving patio gardens",
    "Detail-obsessed caretaker for delicate plants",
    "Weekend warrior for traveling plant parents",
    "Tech-enabled monitoring for stress-free trips",
    "Organic-first plant care with sustainable methods",
    "Quick response sitter covering {neighborhood}"
]

BIO_TEMPLATES = [
    "{first} has cared for urban balconies and sunny loft greenery for over {years} years. Based in {neighborhood}, they specialize in creating low-stress care routines for busy professionals.",
    "As a lifelong plant parent in {city}, {first} helps neighbors keep everything from fiddle leaf figs to herb gardens thriving with meticulous care plans.",
    "{first} brings a background in horticulture and smart home automation to deliver data-informed watering schedules and rapid health check-ins.",
    "With experience supporting community gardens and indoor jungles, {first} offers thoughtful plant styling suggestions along with consistent care.",
    "From propagation coaching to pest prevention, {first} covers every detail so your plant collection stays vibrant while you're away."
]

CARE_FOCUS = [
    "tropical foliage", "rare aroids", "succulent", "cactus", "flower",
    "herb", "apartment greenery", "pet-friendly plants", "balcony gardens", "fern"
]

# Match the frontend filter options: ["succulent", "fern", "cactus", "flower", "herb", "other"]
SPECIALTY_POOL = [
    "succulent", "cactus", "flower", "herb", "fern", "other",
    "succulent", "cactus", "flower", "herb", "fern",  # Repeat to increase probability
    "low-light care", "propagation", "soil science", "pest management", "hydroponics",
    "organic methods", "water scheduling", "humidity control", "fertilizer planning", "repotting"
]

EXPERIENCE_LEVELS = ["beginner", "intermediate", "expert"]
SERVICE_RADII = [4.0, 6.0, 8.0, 10.0, 12.0, 15.0, 18.0, 20.0]
TRUST_VARIANTS = [
    {"is_verified": True, "background_checked": True},
    {"is_verified": True, "background_checked": False},
    {"is_verified": False, "background_checked": True},
    {"is_verified": False, "background_checked": False},
]
RATING_SEQUENCE = [4.9, 4.7, 4.6, 4.4, 4.2, 4.0, 3.8, 3.6]
REVIEW_SEQUENCE = [95, 72, 56, 44, 31, 24, 18, 12]

LOCATIONS = [
    {
        "name": "Homewood Campus",
        "campus_area": "Homewood",
        "address_1": "3400 N Charles St",
        "city": "Baltimore",
        "state": "MD",
        "zipcode": "21218",
        "coverage": ["21218", "21211", "21210"]
    },
    {
        "name": "Station North",
        "campus_area": "Homewood",
        "address_1": "1701 N Charles St",
        "city": "Baltimore",
        "state": "MD",
        "zipcode": "21202",
        "coverage": ["21202", "21217", "21218"]
    },
    {
        "name": "Fells Point",
        "campus_area": "Other",
        "address_1": "907 S Broadway",
        "city": "Baltimore",
        "state": "MD",
        "zipcode": "21231",
        "coverage": ["21231", "21230", "21224"]
    },
    {
        "name": "Hampden",
        "campus_area": "Homewood",
        "address_1": "1025 W 36th St",
        "city": "Baltimore",
        "state": "MD",
        "zipcode": "21211",
        "coverage": ["21211", "21209", "21210"]
    },
    {
        "name": "Charles Village",
        "campus_area": "Homewood",
        "address_1": "3200 St Paul St",
        "city": "Baltimore",
        "state": "MD",
        "zipcode": "21218",
        "coverage": ["21218", "21213", "21205"]
    },
    {
        "name": "Peabody Institute",
        "campus_area": "Peabody",
        "address_1": "1 E Mount Vernon Pl",
        "city": "Baltimore",
        "state": "MD",
        "zipcode": "21202",
        "coverage": ["21202", "21201", "21217"]
    },
    {
        "name": "Mount Vernon Marketplace",
        "campus_area": "Peabody",
        "address_1": "520 Park Ave",
        "city": "Baltimore",
        "state": "MD",
        "zipcode": "21201",
        "coverage": ["21201", "21202", "21217"]
    },
    {
        "name": "Walters Art Museum",
        "campus_area": "Peabody",
        "address_1": "600 N Charles St",
        "city": "Baltimore",
        "state": "MD",
        "zipcode": "21201",
        "coverage": ["21201", "21202", "21217"]
    },
    {
        "name": "Canton Waterfront",
        "campus_area": "Other",
        "address_1": "3001 Boston St",
        "city": "Baltimore",
        "state": "MD",
        "zipcode": "21224",
        "coverage": ["21224", "21231", "21205"]
    },
    {
        "name": "Federal Hill",
        "campus_area": "Other",
        "address_1": "1220 Light St",
        "city": "Baltimore",
        "state": "MD",
        "zipcode": "21230",
        "coverage": ["21230", "21201", "21202"]
    },
    {
        "name": "Hopkins Medical Campus",
        "campus_area": "East Baltimore",
        "address_1": "733 N Broadway",
        "city": "Baltimore",
        "state": "MD",
        "zipcode": "21205",
        "coverage": ["21205", "21202", "21213"]
    },
    {
        "name": "Eager Park",
        "campus_area": "East Baltimore",
        "address_1": "929 N Wolfe St",
        "city": "Baltimore",
        "state": "MD",
        "zipcode": "21205",
        "coverage": ["21205", "21213", "21224"]
    },
    {
        "name": "Bloomberg School",
        "campus_area": "East Baltimore",
        "address_1": "615 N Wolfe St",
        "city": "Baltimore",
        "state": "MD",
        "zipcode": "21205",
        "coverage": ["21205", "21202", "21287"]
    },
    {
        "name": "Capitol Hill",
        "campus_area": "Other",
        "address_1": "700 Pennsylvania Ave SE",
        "city": "Washington",
        "state": "DC",
        "zipcode": "20003",
        "coverage": ["20003", "20002", "22202"]
    },
    {
        "name": "Dupont Circle",
        "campus_area": "Other",
        "address_1": "1350 Connecticut Ave NW",
        "city": "Washington",
        "state": "DC",
        "zipcode": "20036",
        "coverage": ["20036", "20009", "20005"]
    },
    {
        "name": "Georgetown",
        "campus_area": "Other",
        "address_1": "3300 M St NW",
        "city": "Washington",
        "state": "DC",
        "zipcode": "20007",
        "coverage": ["20007", "20057", "20418"]
    },
    {
        "name": "NoMa",
        "campus_area": "Other",
        "address_1": "1200 1st St NE",
        "city": "Washington",
        "state": "DC",
        "zipcode": "20002",
        "coverage": ["20002", "20001", "20017"]
    },
    {
        "name": "Columbia Heights",
        "campus_area": "Other",
        "address_1": "1400 Irving St NW",
        "city": "Washington",
        "state": "DC",
        "zipcode": "20010",
        "coverage": ["20010", "20009", "20011"]
    },
    {
        "name": "Navy Yard",
        "campus_area": "Other",
        "address_1": "1214 4th St SE",
        "city": "Washington",
        "state": "DC",
        "zipcode": "20003",
        "coverage": ["20003", "20024", "20032"]
    },
    {
        "name": "Logan Circle",
        "campus_area": "Other",
        "address_1": "1315 14th St NW",
        "city": "Washington",
        "state": "DC",
        "zipcode": "20005",
        "coverage": ["20005", "20001", "20009"]
    },
    {
        "name": "Friendship Heights",
        "campus_area": "Other",
        "address_1": "5252 Wisconsin Ave NW",
        "city": "Washington",
        "state": "DC",
        "zipcode": "20015",
        "coverage": ["20015", "20815", "20816"]
    }
]


def generate_user_id(index: int) -> str:
    """Return a deterministic 24-char hex string for test user IDs."""
    return f"{BASE_USER_ID + index:024x}"


def build_test_sitter_data(total: int = TOTAL_SITTERS):
    """Programmatically generate sitter seed data covering Baltimore and DC."""
    data = []
    taglines_len = len(TAGLINES)
    bio_len = len(BIO_TEMPLATES)
    specialty_len = len(SPECIALTY_POOL)
    experience_len = len(EXPERIENCE_LEVELS)
    radius_len = len(SERVICE_RADII)
    trust_len = len(TRUST_VARIANTS)
    rating_len = len(RATING_SEQUENCE)
    review_len = len(REVIEW_SEQUENCE)

    for idx in range(total):
        location = LOCATIONS[idx % len(LOCATIONS)]
        first = FIRST_NAMES[idx % len(FIRST_NAMES)]
        last = LAST_NAMES[(idx // len(FIRST_NAMES)) % len(LAST_NAMES)]
        name = f"{first} {last}"

        tagline_template = TAGLINES[idx % taglines_len]
        tagline = tagline_template.format(
            neighborhood=location["name"],
            city=location["city"]
        )

        bio_template = BIO_TEMPLATES[idx % bio_len]
        bio = bio_template.format(
            first=first,
            neighborhood=location["name"],
            city=location["city"],
            years=3 + (idx % 8)
        )

        specialty_indices = [
            (idx + offset * 3) % specialty_len for offset in range(3)
        ]
        specialties = sorted({SPECIALTY_POOL[i] for i in specialty_indices})

        service_radius = SERVICE_RADII[idx % radius_len]
        experience_level = EXPERIENCE_LEVELS[idx % experience_len]
        price_per_visit = round(12 + (idx % 20) * 1.8, 2)

        focus = CARE_FOCUS[idx % len(CARE_FOCUS)]
        bio += f" Their specialty is supporting {focus} with tailored care routines."

        address_suffix = f"Suite {200 + (idx % 50)}"

        # Generate email based on name
        email = f"{first.lower()}.{last.lower()}@gmail.com"
        
        base_payload = {
            "user_id": generate_user_id(idx),
            "name": name,
            "email": email, # Add email field
            "tagline": tagline,
            "bio": bio,
            "address": {
                "address_1": f"{location['address_1']} {address_suffix}",
                "city": location["city"],
                "state": location["state"],
                "zipcode": location["zipcode"]
            },
            "campus_area": location["campus_area"],
            "price_per_visit": price_per_visit,
            "service_radius_miles": service_radius,
            "specialties": specialties,
            "experience_level": experience_level,
            "service_areas": location["coverage"],
        }

        trust_profile = TRUST_VARIANTS[idx % trust_len]
        rating = RATING_SEQUENCE[idx % rating_len]
        review_count = REVIEW_SEQUENCE[idx % review_len]
        years_experience = 2 + (idx % 9)

        badges = []
        if trust_profile["is_verified"]:
            badges.append("Verified")
        if trust_profile["background_checked"]:
            badges.append("Background-checked")
        if experience_level == "expert":
            badges.append("Expert Care")

        extra_fields = {
            "rating": rating,
            "total_reviews": review_count,
            "years_experience": years_experience,
            "is_available": True,
            "is_active": True,
            "badges": badges,
            **trust_profile,
        }

        data.append({
            "create": base_payload,
            "extra": extra_fields
        })

    return data


TEST_SITTERS_DATA = build_test_sitter_data()


async def clear_existing_test_data():
    """Clear existing test sitters to avoid duplicates"""
    try:
        db = await get_database()
        collection = db["sitters"]
        
        # Remove test sitters by user_id pattern
        test_user_ids = [
            ObjectId(entry["create"]["user_id"]) for entry in TEST_SITTERS_DATA
        ]
        result = await collection.delete_many({"user_id": {"$in": test_user_ids}})
        
        print(f"Removed {result.deleted_count} existing test sitters")
        return result.deleted_count
        
    except Exception as e:
        print(f"Error clearing existing data: {str(e)}")
        return 0


async def create_test_sitters():
    """Create test sitters in the database"""
    created_count = 0
    failed_count = 0
    collection = await sitter_crud.get_collection()
    
    for sitter_data in TEST_SITTERS_DATA:
        try:
            create_data = sitter_data["create"].copy()
            extra_fields = sitter_data.get("extra", {})

            # Create Address object
            address = Address(**create_data["address"])
            create_data["address"] = address
            
            # Create SitterCreate object
            sitter_create = SitterCreate(**create_data)
            
            # Create sitter in database
            created_sitter = await sitter_crud.create(obj_in=sitter_create)

            if extra_fields:
                update_payload = {
                    **extra_fields,
                    "updated_at": datetime.utcnow()
                }
                await collection.update_one(
                    {"_id": ObjectId(str(created_sitter.id))},
                    {"$set": update_payload}
                )
            created_count += 1
            
            print(f"✅ Created sitter: {create_data['name']} at {address.full_address()}")
            
        except Exception as e:
            failed_count += 1
            display_name = sitter_data.get("create", {}).get("name", "Unknown")
            print(f"❌ Failed to create sitter {display_name}: {str(e)}")
    
    return created_count, failed_count


async def main():
    """Main function to set up test data"""
    print("🌱 JHU Plant Care Platform - Test Sitters Data Generator")
    print("=" * 60)
    
    try:
        # Connect to database
        print("Connecting to MongoDB...")
        await connect_to_mongo()
        
        # Clear existing test data
        print("Clearing existing test data...")
        cleared_count = await clear_existing_test_data()
        
        # Create new test sitters
        print("Creating test sitters...")
        created_count, failed_count = await create_test_sitters()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 SUMMARY:")
        print(f"   Cleared existing: {cleared_count}")
        print(f"   Successfully created: {created_count}")
        print(f"   Failed: {failed_count}")
        print(f"   Total test sitters: {len(TEST_SITTERS_DATA)}")
        
        if created_count > 0:
            print("\n✅ Test data generation completed successfully!")
            print("You can now test the nearby sitters API with:")
            print("GET /api/v1/sitters/nearby?user_address=3400 N Charles St, Baltimore, MD 21218")
            print("GET /api/v1/sitters/nearby?user_address=1600 Pennsylvania Ave NW, Washington, DC 20500")
        else:
            print("\n❌ No test data was created. Check the errors above.")
            
    except Exception as e:
        print(f"\n💥 Fatal error: {str(e)}")
        
    finally:
        # Close database connection
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(main())
