// Backend base URL (without /api/v1)
// REACT_APP_API_URL should be the base URL without /api/v1
// For production: https://this-team.onrender.com
// For development: http://localhost:8000
let backendBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Remove trailing slash if present
backendBaseUrl = backendBaseUrl.replace(/\/$/, '');

// Remove /api/v1 if it's already in the URL (to prevent double /api/v1)
if (backendBaseUrl.endsWith('/api/v1')) {
  backendBaseUrl = backendBaseUrl.replace(/\/api\/v1$/, '');
}

const BACKEND_BASE_URL = backendBaseUrl;

// API Base URL - full URL including /api/v1
export const API_BASE_URL = `${BACKEND_BASE_URL}/api/v1`;

// Socket.IO URL - same as backend base URL (without /api/v1)
export const SOCKET_URL = BACKEND_BASE_URL;

export const API_ENDPOINTS = {
  // Authentication
  REQUEST_CODE: '/auth/request-code',
  VERIFY_CODE: '/auth/verify-code',
  ME: '/auth/me',
  USER_DETAIL: (id: string) => `/auth/users/${id}`,
  USERS_SIMILAR: '/auth/users/similar',
  DEV_LOGIN: '/auth/dev-login',
  GOOGLE_AUTH: '/auth/google',
  
  // Sitters
  SITTERS: '/sitters',
  SITTER_DETAIL: (id: string) => `/sitters/${id}`,
  SITTER_AVAILABILITY: (id: string) => `/sitters/${id}/availability`,
  SITTER_PROFILE_ME: '/sitter/profile',
  
  // Listings
  LISTINGS: '/listings',
  LISTING_DETAIL: (id: string) => `/listings/${id}`,
  CREATE_LISTING: '/listings',
  
  // Reservations
  RESERVATIONS: '/reservations',
  RESERVATION_DETAIL: (id: string) => `/reservations/${id}`,
  MY_RESERVATIONS: '/reservations/me/reservations',
  MY_ACTIVE_RESERVATIONS: '/reservations/me/active',
  RESERVATIONS_SAMPLE: '/reservations/dev/sample',

  // Payments (Stripe stub)
  PAYMENTS: '/payments',
  PAYMENT_CAPTURE: (reservationId: string) => `/payments/reservations/${reservationId}/capture`,
  PAYMENT_REFUND: '/payments/refund',

  // Uploads
  UPLOAD_DIRECT: '/uploads/direct',
  UPLOAD_BATCH: '/uploads/batch',

  //Explore similar users
  EXPLORE: (id: string) => `/explore/${id}`,

  // Sample data for development
  // Note: Use Python script 'python scripts/generate_test_sitters.py' to create test sitters
  SAMPLE_SITTERS: '/sitters/sample-data',
  SAMPLE_LISTINGS: '/listings/sample-data',
  CHAT: '/chat',

} as const;