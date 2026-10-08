from app.crud.crud_user_profile import CRUDUserProfile as UserProfile
from app.utils.explore_engine import UserExploreEngine

engine = UserExploreEngine()

user_profiles = UserProfile()
async def generate_user_recommendations(target_user_id: str):
    rows = await user_profiles.get_all()
    users_data = []
    for row in rows:
        users_data.append({
            "id": str(row.get("user_id", "")),
            "preferred_plant_types": row.get("preferred_plant_types", []),
            "bio": row.get("bio", ""),
            "email": row.get("email", ""),
            "name": row.get("name", ""),
            "profile_image": row.get("profile_image","")

        })
    return engine.get_recommendations(users_data, target_user_id)
