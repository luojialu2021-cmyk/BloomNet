from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Body
from pydantic import BaseModel
from app.api.deps import get_current_active_user
from app.models.reservation import (
    Reservation,
    ReservationCreate,
    ReservationUpdate,
    ReservationStatus,
    CareUpdateCreate,
    ReservationRating,
    CareCommentCreate,
    CareChecklistUpdate
)
from app.models.auth import UserRole
from app.models.user import User
from app.crud.crud_reservation import reservation as reservation_crud
from app.services.dev_seed import (
    ensure_dev_data,
    DEV_OWNER_ID,
    DEV_SITTER_ID,
    ensure_sample_reservations_for_sitter,
)
from app.crud.crud_sitter import sitter as sitter_crud


router = APIRouter()


async def check_reservation_access(reservation: Reservation, current_user: User) -> tuple[bool, bool]:
    """
    Check if current user is the owner or sitter of the reservation.
    Returns (is_owner, is_sitter) tuple.
    Supports multiple matching methods:
    - Direct ID matching (owner_id/sitter_id)
    - Via sitter profile (sitter_profile_id -> user_id)
    - Via email matching (sitter_email)
    """
    is_owner = str(reservation.owner_id) == str(current_user.id)
    is_sitter = str(reservation.sitter_id) == str(current_user.id)
    
    # Also check via sitter profile (if reservation has sitter_profile_id)
    if not is_sitter and reservation.sitter_profile_id:
        try:
            sitter_profile = await sitter_crud.get(str(reservation.sitter_profile_id))
            if sitter_profile and str(sitter_profile.user_id) == str(current_user.id):
                is_sitter = True
        except Exception:
            pass
    
    # Also check via email (if reservation has sitter_email)
    if not is_sitter and reservation.sitter_email and current_user.email:
        if current_user.email.lower() == reservation.sitter_email.lower():
            is_sitter = True
    
    return is_owner, is_sitter


class CancelReservationRequest(BaseModel):
    reason: Optional[str] = None


@router.post("/", response_model=Reservation)
async def create_reservation(
    reservation_in: ReservationCreate,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Create a new plant care reservation
    """
    # Verify sitter exists
    sitter = await sitter_crud.get(reservation_in.sitter_id)
    if not sitter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sitter not found"
        )
    
    sitter_user_id = getattr(sitter, "user_id", None)
    if not sitter_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sitter profile is missing an associated user account"
        )
    
    # Attach owner id and timestamps to the request payload before persisting
    from datetime import datetime
    now = datetime.utcnow()
    reservation_with_owner = reservation_in.model_copy(
        update={
            "owner_id": str(current_user.id),
            "sitter_profile_id": str(reservation_in.sitter_id),
            "sitter_id": str(sitter_user_id),
        }
    )
    
    # Convert to dict and add timestamps
    reservation_dict = reservation_with_owner.model_dump()
    reservation_dict["created_at"] = now
    reservation_dict["updated_at"] = now

    created_reservation = await reservation_crud.create(obj_in=reservation_dict)
    return created_reservation


@router.get("/me/reservations", response_model=List[Reservation])
async def get_my_reservations(
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get current user's reservations (as owner or sitter)
    Supports multiple matching methods:
    - Direct sitter_id matching
    - Sitter profile ID matching
    - Sitter email matching (for sitter portal)
    """
    # Get reservations where user is owner
    owner_reservations = await reservation_crud.get_by_owner_id(str(current_user.id))
    
    # Get reservations where user is sitter (by sitter_id)
    sitter_reservations = await reservation_crud.get_by_sitter_id(str(current_user.id))

    # Include reservations tied to this user's sitter profile (if any)
    sitter_profile = await sitter_crud.get_by_user_id(str(current_user.id))
    profile_sitter_reservations: List[Reservation] = []
    email_sitter_reservations: List[Reservation] = []
    
    if sitter_profile:
        # Get reservations by sitter_profile_id
        profile_sitter_reservations = await reservation_crud.get_by_sitter_profile_id(
            str(sitter_profile.id)
        )
        
        # Also get reservations by sitter_email from sitter profile (for sitter portal)
        # Use sitter profile email instead of current_user.email to get all reservations
        # for this sitter, regardless of which user account is logged in
        sitter_email = None
        if hasattr(sitter_profile, 'email') and sitter_profile.email:
            sitter_email = sitter_profile.email
        elif isinstance(sitter_profile, dict):
            sitter_email = sitter_profile.get('email')
        
        if sitter_email:
            email_sitter_reservations = await reservation_crud.get_by_sitter_email(
                sitter_email
            )
            print(f"[get_my_reservations] Found sitter profile, querying by sitter_email: {sitter_email}, found {len(email_sitter_reservations)} reservations")
    
    # Fallback: if no sitter profile, use current_user.email
    if not email_sitter_reservations and current_user.email:
        email_sitter_reservations = await reservation_crud.get_by_sitter_email(
            current_user.email
        )
        print(f"[get_my_reservations] No sitter profile, using current_user.email: {current_user.email}")
    
    # Combine and sort by creation date
    combined: dict[str, Reservation] = {}
    for reservation in owner_reservations + sitter_reservations + profile_sitter_reservations + email_sitter_reservations:
        combined[str(reservation.id)] = reservation

    all_reservations = list(combined.values())
    all_reservations.sort(key=lambda x: x.created_at, reverse=True)
    
    return all_reservations


@router.get("/me/active", response_model=List[Reservation])
async def get_my_active_reservations(
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get current user's active reservations
    """
    reservations = await reservation_crud.get_active_reservations(str(current_user.id))

    sitter_profile = await sitter_crud.get_by_user_id(str(current_user.id))
    if sitter_profile:
        profile_reservations = await reservation_crud.get_active_reservations(str(sitter_profile.id))
        merged: dict[str, Reservation] = {str(res.id): res for res in reservations}
        for reservation in profile_reservations:
            merged[str(reservation.id)] = reservation
        return list(merged.values())

    return reservations


@router.get("/{reservation_id}", response_model=Reservation)
async def get_reservation_detail(
    reservation_id: str,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get detailed information about a specific reservation
    """
    print(f"[get_reservation_detail] Fetching reservation {reservation_id} for user {current_user.id} ({current_user.email})")
    print(f"Fetching reservation with ID: {reservation_id} (type: {type(reservation_id)})")
    reservation = await reservation_crud.get(reservation_id)
    
    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation not found"
        )
    
    # Check if user is involved in this reservation
    is_owner, is_sitter = await check_reservation_access(reservation, current_user)
    
    print(f"[get_reservation_detail] Access check for reservation {reservation_id}:")
    print(f"  current_user.id: {current_user.id}")
    print(f"  current_user.email: {current_user.email}")
    print(f"  reservation.owner_id: {reservation.owner_id}")
    print(f"  reservation.sitter_id: {reservation.sitter_id}")
    print(f"  reservation.sitter_email: {reservation.sitter_email}")
    print(f"  is_owner: {is_owner}")
    print(f"  is_sitter: {is_sitter}")
    
    if not is_owner and not is_sitter:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. User {current_user.id} ({current_user.email}) is not owner ({reservation.owner_id}) or sitter ({reservation.sitter_id} or {reservation.sitter_email})"
        )
    
    return reservation


@router.post("/{reservation_id}/confirm", response_model=Reservation)
async def confirm_reservation(
    reservation_id: str,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Confirm a reservation (legacy endpoint - reservations now start as confirmed)
    This endpoint is kept for backward compatibility but reservations are already confirmed by default.
    """
    reservation = await reservation_crud.get(reservation_id)
    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation not found"
        )
    
    # Check if current user is the sitter
    if str(reservation.sitter_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned sitter can confirm this reservation"
        )
    
    if reservation.status == ReservationStatus.CONFIRMED:
        return reservation  # Already confirmed
    
    confirmed_reservation = await reservation_crud.confirm_reservation(reservation_id)
    if not confirmed_reservation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to confirm reservation"
        )
    
    return confirmed_reservation


@router.post("/{reservation_id}/start", response_model=Reservation)
async def start_care(
    reservation_id: str,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Start the care period
    """
    reservation = await reservation_crud.get(reservation_id)
    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation not found"
        )
    
    # Check if current user is the sitter (supports multiple matching methods)
    is_owner, is_sitter = await check_reservation_access(reservation, current_user)
    if not is_sitter:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned sitter can start care"
        )
    
    # Check if reservation can be started
    # Allow None status or in_progress (if not already started)
    # Don't allow starting if already completed or cancelled
    if reservation.status is not None:
        if reservation.status == ReservationStatus.COMPLETED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot start care period. Reservation is already completed."
            )
        if reservation.status == ReservationStatus.CANCELLED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot start care period. Reservation is cancelled."
            )
        # If already in_progress and has started_at, don't allow starting again
        if reservation.status == ReservationStatus.IN_PROGRESS and reservation.started_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Care period has already been started."
            )
    
    started_reservation = await reservation_crud.start_care(reservation_id)
    if not started_reservation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to start care period. Please try again."
        )
    
    return started_reservation


@router.post("/{reservation_id}/complete", response_model=Reservation)
async def complete_reservation(
    reservation_id: str,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Mark reservation as completed - only owner can complete
    """
    reservation = await reservation_crud.get(reservation_id)
    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation not found"
        )
    
    # Only owner can complete
    if str(reservation.owner_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner can mark reservation as completed"
        )
    
    # Must have been started before completing
    if not reservation.started_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot complete reservation. Care period has not been started yet."
        )
    
    # Don't allow completing if already completed
    if reservation.status == ReservationStatus.COMPLETED and reservation.completed_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reservation is already completed"
        )
    
    completed_reservation = await reservation_crud.complete_reservation(reservation_id)
    if not completed_reservation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to complete reservation. Please try again."
        )
    
    return completed_reservation


@router.post("/{reservation_id}/cancel", response_model=Reservation)
async def cancel_reservation(
    reservation_id: str,
    cancel_request: Optional[CancelReservationRequest] = Body(default=None),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Cancel a reservation
    """
    reservation = await reservation_crud.get(reservation_id)
    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation not found"
        )
    
    # Either owner or sitter can cancel
    if (str(reservation.owner_id) != str(current_user.id) and 
        str(reservation.sitter_id) != str(current_user.id)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    reason = cancel_request.reason if cancel_request else None

    cancelled_reservation = await reservation_crud.cancel_reservation(reservation_id, reason)
    if not cancelled_reservation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to cancel reservation"
        )
    
    return cancelled_reservation


@router.post("/{reservation_id}/care-updates", response_model=Reservation)
async def add_care_update(
    reservation_id: str,
    care_update: CareUpdateCreate,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Add a care update to a reservation (sitter only)
    """
    reservation = await reservation_crud.get(reservation_id)
    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation not found"
        )
    
    # Check if current user is the sitter
    #if str(reservation.sitter_id) != str(current_user.id):
     #   raise HTTPException(
      #      status_code=status.HTTP_403_FORBIDDEN,
       ##)
    
    #if reservation.status != ReservationStatus.IN_PROGRESS:
     #   raise HTTPException(
      #      status_code=status.HTTP_400_BAD_REQUEST,
       #     detail="Care updates can only be added during active care period"
        #)

    if care_update.photos:
        invalid_images = [
            p for p in care_update.photos if not (isinstance(p, str) and p.strip().startswith("data:image"))
        ]
        if invalid_images:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image format — please upload Base64 encoded images (data:image/*)"
            )

    updated_reservation = await reservation_crud.add_care_update(reservation_id, care_update)
    if not updated_reservation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to add care update"
        )
    
    return updated_reservation


@router.put("/{reservation_id}/care-checklist", response_model=Reservation)
async def update_care_checklist(
    reservation_id: str,
    checklist_update: CareChecklistUpdate,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Update shared care checklist (owner only)"""
    reservation = await reservation_crud.get(reservation_id)
    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation not found"
        )

    if str(reservation.owner_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the reservation owner can update the checklist"
        )

    templates_payload = None
    schedule_payload = None

    if checklist_update.templates is not None:
        templates_payload = [
            template.model_dump(mode="json") for template in checklist_update.templates
        ]

    if checklist_update.schedule is not None:
        schedule_payload = [
            assignment.model_dump(mode="json") for assignment in checklist_update.schedule
        ]

    updated = await reservation_crud.update_care_checklist(
        reservation_id=reservation_id,
        checklist=checklist_update.tasks,
        templates=templates_payload,
        schedule=schedule_payload
    )

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update checklist"
        )

    return updated


@router.post("/{reservation_id}/care-updates/{care_update_id}/comments", response_model=Reservation)
async def add_care_update_comment(
    reservation_id: str,
    care_update_id: str,
    comment: CareCommentCreate,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Add a comment to a specific care update (owner or sitter)
    """
    reservation = await reservation_crud.get(reservation_id)
    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation not found"
        )

    # Ensure user is participant (support multiple matching methods)
    is_owner, is_sitter = await check_reservation_access(reservation, current_user)
    
    if not (is_owner or is_sitter):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Only reservation participants can comment. User {current_user.id} ({current_user.email}) is not owner ({reservation.owner_id}) or sitter ({reservation.sitter_id} or {reservation.sitter_email})"
        )

    role = UserRole.SITTER if is_sitter else UserRole.USER
    updated_reservation = await reservation_crud.add_care_update_comment(
        reservation_id=reservation_id,
        care_update_id=care_update_id,
        user_id=str(current_user.id),
        role=role,
        comment=comment
    )

    if not updated_reservation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to add comment"
        )

    return updated_reservation


@router.post("/{reservation_id}/rate", response_model=Reservation)
async def rate_reservation(
    reservation_id: str,
    rating_data: ReservationRating,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Rate and review a completed reservation - only owner can rate
    """
    reservation = await reservation_crud.get(reservation_id)
    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation not found"
        )
    
    # Only allow rating if reservation is completed
    if not reservation.completed_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only rate completed reservations"
        )
    
    # Only owner can rate
    if str(reservation.owner_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner can rate this reservation"
        )
    
    # Don't allow updating existing rating
    if reservation.owner_rating is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rating already submitted for this reservation"
        )
    
    # Only owner can rate, so is_owner_rating is always True
    rated_reservation = await reservation_crud.add_rating(
        reservation_id=reservation_id,
        is_owner_rating=True,
        rating=rating_data.rating,
        review=rating_data.review
    )
    
    if not rated_reservation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to add rating"
        )
    
    return rated_reservation
@router.post("/dev/sample", response_model=List[Reservation])
async def seed_dev_reservations(
    sitter_id: Optional[str] = None,
    for_current_user: bool = False,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Ensure sample reservations exist.

    - When `for_current_user` is true, seed a demo reservation for the authenticated sitter.
    - When `sitter_id` is provided, seed for that sitter ID.
    - Otherwise, return the default dev owner/sitter sample reservations.
    """
    await ensure_dev_data()

    target_sitter_id: Optional[str] = None
    if for_current_user:
        target_sitter_id = str(current_user.id)
    elif sitter_id:
        target_sitter_id = sitter_id

    if target_sitter_id:
        seeded = await ensure_sample_reservations_for_sitter(target_sitter_id)
        return seeded

    owner_reservations = await reservation_crud.get_by_owner_id(str(DEV_OWNER_ID))
    sitter_reservations = await reservation_crud.get_by_sitter_id(str(DEV_SITTER_ID))
    combined = {str(res.id): res for res in owner_reservations + sitter_reservations}
    return list(combined.values())
