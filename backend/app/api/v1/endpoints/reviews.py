from fastapi import APIRouter, HTTPException, Path
from bson import ObjectId
from typing import List
from app.models.review import Review, ReviewCreate
from app.crud.crud_reviews import review_crud

router = APIRouter()

@router.post("/", response_model=Review)
async def create_review(review: ReviewCreate):
    try:
        # Validate that all required fields are provided
        if not review.reviewer_id or not review.reviewee_id or not review.rating or not review.review_txt:
            raise HTTPException(status_code=400, detail="Missing required review fields.")

        # Directly store the review data
        created_review = await review_crud.create(obj_in=review)
        return created_review
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{reservation_id}/", response_model=Review)
async def get_review_by_reservation(reservation_id: str = Path(..., description="Reservation ID as a string")):
    try:
        # Query the database using the reservation_id as a string
        review = await review_crud.get_by_reservation_id(reservation_id)
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        return review
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/delete/{id}/", response_model=dict)
async def delete_review(id: str = Path(..., description="Review _id as a valid ObjectId")):
    try:
        # Convert _id to ObjectId
        try:
            id_obj = ObjectId(id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid _id format")

        # Attempt to delete the review
        deleted = await review_crud.remove(id_obj)
        if not deleted:
            raise HTTPException(status_code=404, detail="Review not found")
        return {"message": "Review deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))