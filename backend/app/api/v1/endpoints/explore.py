from fastapi import APIRouter, HTTPException
from app.services.explore_service import generate_user_recommendations

router = APIRouter()

@router.get("/{user_id}")
async def recommend_users(user_id: str):
    try:
        reco = await generate_user_recommendations(user_id)
        return {
            "user_id": user_id,
            "recommendations": reco
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
