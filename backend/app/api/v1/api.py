from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth, sitters, listings, reservations, payments, uploads, 
    sitter_portal, google_auth, chat, user_profile,
    sitter_profile_management, sitter_availability_management, messages, reviews,
    validation_test, address_validation, explore
)

api_router = APIRouter()

# Authentication routes
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])

# Google OAuth routes
api_router.include_router(google_auth.router, prefix="/auth", tags=["google-auth"])

# User Profile routes
api_router.include_router(user_profile.router, prefix="/user", tags=["user-profile"])

# Sitter Profile Management routes
api_router.include_router(sitter_profile_management.router, prefix="/sitter", tags=["sitter-profile"])

# Sitter Availability Management routes
api_router.include_router(sitter_availability_management.router, prefix="/sitter", tags=["sitter-availability"])

# Chat routes
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])

# Messages routes (simplified chat API)
api_router.include_router(messages.router, prefix="/messages", tags=["messages"])

# User and sitter routes
api_router.include_router(sitters.router, prefix="/sitters", tags=["sitters"])

# Sitter portal routes (for sitters to manage their profiles)
api_router.include_router(sitter_portal.router, prefix="/sitter-portal", tags=["sitter-portal"])

# Listing routes
api_router.include_router(listings.router, prefix="/listings", tags=["listings"])

# Reservation/booking routes
api_router.include_router(reservations.router, prefix="/reservations", tags=["reservations"])

# Payment routes (stub)
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])

# Upload routes (stub)
api_router.include_router(uploads.router, prefix="/uploads", tags=["uploads"])

# Reviews routes
api_router.include_router(reviews.router, prefix="/reviews", tags=["reviews"])

# Validation test routes (no auth required)
api_router.include_router(validation_test.router, prefix="", tags=["validation-test"])

# Address validation routes
api_router.include_router(address_validation.router, prefix="/address", tags=["address-validation"])

# User explore routes
api_router.include_router(explore.router, prefix="/explore", tags=["explore"])
