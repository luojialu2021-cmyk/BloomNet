// API response types that match the backend models

export interface User {
  id: string;
  email: string;
  full_name: string;
  jhu_id?: string;
  phone?: string;
  bio?: string;
  profile_image?: string;
  rating: number;
  total_reviews: number;
  specialties: string[];
  service_areas: string[];
  is_available: boolean;
  preferred_plant_types: string[];
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Address {
  address_1: string;
  address_2?: string;
  city: string;
  state: string;
  zipcode: string;
}
export interface Explore {
  id: string;
  email: string;
  full_name: string;
  bio?: string;
  profile_image?: string;
  preferred_plant_types: string[];
  score: number;
}
export interface ExploreResponse {
  user_id: string;
  recommendations: Explore[];
}

export interface SitterProfile {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  tagline?: string;
  bio?: string;
  profile_image?: string;
  address?: Address;
  campus_area?: string;
  service_radius_miles?: number;
  price_per_visit: number;
  price_per_day?: number;
  price_per_week?: number;
  service_areas: string[];
  specialties: string[];
  badges: string[];
  experience_level?: string;
  rating: number;
  total_reviews: number;
  years_experience?: number;
  is_available: boolean;
  unavailable_dates: string[];
  is_active: boolean;
  is_verified: boolean;
  background_checked: boolean;
  created_at: string;
  updated_at: string;

  availability_calendar?: Availability[]; // added field
}

export interface PlantInfo {
  name: string;
  species?: string;
  plant_type: string;
  size?: string;
  location: string;
  special_instructions?: string;
  photo_urls: string[];
}


export interface CareRequirements {
  care_types: string[];
  frequency: string;
  duration_weeks: number;
  start_date: string;
  end_date: string;
  daily_time_required?: number;
  special_notes?: string;
}

export interface LocationInfo {
  address: string;
  city: string;
  state: string;
  zip_code: string;
  campus_area?: string;
  access_instructions?: string;
}

export interface Listing {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  plants: PlantInfo[];
  care_requirements: CareRequirements;
  location: LocationInfo;
  total_payment: number;
  payment_per_visit?: number;
  payment_per_day?: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  is_urgent: boolean;
  applications_count: number;
  selected_sitter_id?: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

export interface CareUpdateComment {
  id: string;
  user_id: string;
  role: 'user' | 'sitter' | 'admin';
  message: string;
  created_at: string;
  liked_by: string[];
}

export interface CareUpdate {
  id: string;
  date: string;
  photos: string[];
  notes: string;
  care_actions: string[];
  tasks_completed: string[];
  timestamp_verified: boolean;
  liked_by: string[];
  comments: CareUpdateComment[];
}

export type CareTaskFrequency = 'daily' | 'every_x_days' | 'weekly' | 'custom';

export interface CareTaskTemplate {
  id: string;
  name: string;
  description?: string;
  frequency: CareTaskFrequency;
  every_x_days?: number;
  weekly_days?: number[];
  custom_dates?: string[];
  start_date: string;
  end_date: string;
  requires_photo?: boolean;
  requires_notes?: boolean;
  requires_audio?: boolean;
  notes?: string;
}

export interface CareTaskAssignment {
  id: string;
  template_id: string;
  task_name: string;
  date: string;
}

export interface Reservation {
  id: string;
  owner_id: string;
  sitter_id: string;
  sitter_name: string;
  sitter_email?: string; // Add sitter email for matching
  sitter_profile_id?: string;
  listing_id?: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  plants_info: string;
  care_instructions: string;
  location_address: string;
  access_instructions?: string;
  status: 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
  payment_status: 'paid' | 'refunded' | 'failed';
  care_updates: CareUpdate[];
  care_checklist: string[];
  care_task_templates?: CareTaskTemplate[];
  care_task_schedule?: CareTaskAssignment[];
  special_notes?: string;
  owner_notes?: string;
  sitter_notes?: string;
  created_at: string;
  confirmed_at?: string;
  started_at?: string;
  completed_at?: string;
  updated_at: string;
  owner_rating?: number;
  sitter_rating?: number;
  owner_review?: string;
  sitter_review?: string;
}

// Request types for creating/updating
export interface CreateListingRequest {
  title: string;
  description: string;
  plants: PlantInfo[];
  care_requirements: CareRequirements;
  location: LocationInfo;
  total_payment: number;
  payment_per_visit?: number;
  payment_per_day?: number;
  is_urgent?: boolean;
}

export interface CreateReservationRequest {
  sitter_id: string;
  sitter_profile_id?: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  plants_info: string;
  care_instructions: string;
  location_address: string;
  access_instructions?: string;
  special_notes?: string;
  care_checklist?: string[];
}

export interface PaymentIntentResponse {
  payment_intent: {
    id: string;
    client_secret: string;
    amount: number;
    currency: string;
    status: string;
    reservation_id: string;
  };
  publishable_key: string;
}

export interface PaymentCaptureResponse {
  success: boolean;
  payment_intent_id: string;
  amount_captured: number;
  message: string;
}

export interface RefundResponse {
  success: boolean;
  refund_id: string;
  amount_refunded: number;
  reason?: string;
  message: string;
}

// Search parameters
export interface SitterSearchParams {
  zip_code?: string;
  campus_area?: string;
  start_date?: string;
  end_date?: string;
  plant_type?: string;
  min_price?: number;
  max_price?: number;
  min_rating?: number;
  specialties?: string[];
  experience_levels?: string[];
  max_service_radius?: number;
  verified_only?: boolean;
  background_checked_only?: boolean;
  available_only?: boolean;
}

export interface PaymentRequest{
    amount?: number
    payment_method_id?: string
}

export interface PaymentResponse {
  status: "success" | "failed";
  payment_id?: string;
  error?: string;
}
export interface ListingSearchParams {
  zip_code?: string;
  campus_area?: string;
  plant_type?: string;
  care_type?: string;
  start_date?: string;
  end_date?: string;
  min_payment?: number;
  max_payment?: number;
  is_urgent_only?: boolean;
  status?: string;
}

// Auth response types
export interface VerifyCodeResponse {
  token: string;
  email: string;
}

export interface RequestCodeResponse {
  message: string;
}

// Payload for creating a sitter (SitterCreate in backend)
export interface SitterCreate {
  user_id: string;
  name: string;
  tagline?: string;
  bio?: string;
  address?: Address;
  price_per_visit: number;
  service_radius_miles?: number;
  service_areas: string[];
  specialties: string[];
  experience_level?: string;
}

export interface Availability {
  date: string;
  available: boolean;
  time_slots: string[]; 
}

// Review and Rating types
export interface Review {
  id: string;
  rating: number;
  review?: string;
  reviewer_name: string;
  reviewer_id: string;
  created_at: string;
  is_owner_review?: boolean;
  is_sitter_review?: boolean;
}

export interface ReservationRating {
  rating: number;
  review?: string;
}

export interface SitterReviewsResponse {
  reviews: Review[];
  average_rating: number;
  total_reviews: number;  
  rating_breakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export interface ChatConversation {
  id: string;
  user_id: string;
  user_name: string;
  sitter_id: string;
  sitter_name: string;
  last_message?: string;
  last_message_at?: string;
  unread_count_user?: number;
  unread_count_sitter?: number;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'user' | 'sitter';
  content: string;
  created_at: string;
  status?: 'sent' | 'delivered' | 'read';
  read_at?: string | null;
}
