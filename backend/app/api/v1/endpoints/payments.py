from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_current_active_user
from app.models.user import User, PaymentRequest
from app.crud.crud_reservation import reservation as reservation_crud
from pydantic import BaseModel
import stripe
import os
from dotenv import load_dotenv

load_dotenv()
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
router = APIRouter()

@router.post("/")
async def create_payment_intent(
    reservation_id: str,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Create payment intent for a reservation (Stripe integration stub)
    """
    # Verify reservation exists and user has access
    reservation = await reservation_crud.get(reservation_id)
    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation not found"
        )
    
    # Check if current user is the owner (payer)
    if str(reservation.owner_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the reservation owner can initiate payment"
        )
    
    # Stub payment intent creation
    # In production, this would integrate with Stripe
    payment_intent = {
        "id": f"pi_stub_{reservation_id}",
        "client_secret": f"pi_stub_{reservation_id}_secret_123",
        "amount": int(reservation.total_amount * 100),  # Stripe uses cents
        "currency": "usd",
        "status": "requires_payment_method",
        "reservation_id": reservation_id
    }
    
    return {
        "payment_intent": payment_intent,
        "publishable_key": "pk_test_stub_key_for_development"
    }
@router.post("/pay")
async def process_payment(data: PaymentRequest):
    try:
        intent = stripe.PaymentIntent.create(
            amount=int(data.amount * 100),  #cent
            currency="usd",
            payment_method=data.payment_method_id,
            confirm=True,
            automatic_payment_methods={
                "enabled": True,
                "allow_redirects": "never"
            }
        )

        if intent.status == "succeeded":
            return {"status": "success", "payment_id": intent.id}
        else:
            return {"status": "failed", "error": f"Status: {intent.status}"}

    except stripe.error.CardError as e:
        return {"status": "failed", "error": str(e)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

'''
@router.post("/reservations/{reservation_id}/capture")
async def capture_payment(
    reservation_id: str,
    payment_intent_id: str,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Capture/complete payment for a reservation (Stripe integration stub)
    """
    # Verify reservation exists and user has access
    reservation = await reservation_crud.get(reservation_id)
    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation not found"
        )
    
    # Check if current user is the owner (payer)
    if str(reservation.owner_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the reservation owner can complete payment"
        )
    
    # Stub payment capture
    # In production, this would capture the Stripe payment intent
    from app.models.reservation import PaymentStatus
    await reservation_crud.update_payment_status(reservation_id, PaymentStatus.PAID)
    
    return {
        "success": True,
        "payment_intent_id": payment_intent_id,
        "amount_captured": int(reservation.total_amount * 100),
        "message": "Payment captured successfully (stub)"
    }


@router.post("/webhooks/stripe")
async def stripe_webhook() -> Any:
    """
    Stripe webhook handler (stub)
    """
    # In production, this would handle Stripe webhook events
    # to update payment statuses, handle refunds, etc.
    return {"received": True}


@router.post("/refund")
async def process_refund(
    reservation_id: str,
    amount: float = None,
    reason: str = None,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Process refund for a reservation (stub)
    """
    # Verify reservation exists
    reservation = await reservation_crud.get(reservation_id)
    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation not found"
        )
    
    # In production, verify user permissions and process Stripe refund
    
    # Stub refund processing
    refund_amount = amount or reservation.total_amount
    
    from app.models.reservation import PaymentStatus
    await reservation_crud.update_payment_status(reservation_id, PaymentStatus.REFUNDED)
    
    return {
        "success": True,
        "refund_id": f"re_stub_{reservation_id}",
        "amount_refunded": int(refund_amount * 100),
        "reason": reason or "Requested by user",
        "message": "Refund processed successfully (stub)"
    }
'''