import { apiClient, ApiResponse } from './client';
import { API_BASE_URL, API_ENDPOINTS } from './config';
import {
  SitterProfile,
  Listing,
  Reservation,
  CreateListingRequest,
  CreateReservationRequest,
  SitterSearchParams,
  ListingSearchParams,
  VerifyCodeResponse,
  RequestCodeResponse,
  SitterCreate,
  PaymentIntentResponse,
  PaymentCaptureResponse,
  PaymentRequest,
  PaymentResponse,
  RefundResponse,
  User,
  Explore,ExploreResponse,
  Review,
  ReservationRating,
  SitterReviewsResponse,
  CareTaskTemplate,
  CareTaskAssignment,

} from './types';
import {
  getLocalReservationRecord,
  listLocalReservationRecords,
} from '../utils/localReservations';

const normalizeSitter = (sitter: any): SitterProfile => ({
  ...sitter,
  id: sitter?.id ?? sitter?._id ?? '',
});

const normalizeUser = (user: any): User => ({
  ...user,
  id: user?.id ?? user?._id ?? '',
});

// Sitter Services
export const sitterService = {
  search: async (params: SitterSearchParams) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      if (Array.isArray(value)) {
        if (value.length === 0) {
          return;
        }
        value.forEach((item) => {
          queryParams.append(key, item.toString());
        });
        return;
      }

      if (typeof value === "boolean") {
        queryParams.append(key, value ? "true" : "false");
        return;
      }

      queryParams.append(key, value.toString());
    });
    
    const endpoint = `${API_ENDPOINTS.SITTERS}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await apiClient.get<SitterProfile[]>(endpoint);
    if (response.data) {
      return {
        ...response,
        data: response.data.map(normalizeSitter),
      };
    }
    return response;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<SitterProfile>(API_ENDPOINTS.SITTER_DETAIL(id));
    if (response.data) {
      return {
        ...response,
        data: normalizeSitter(response.data),
      };
    }
    return response;
  },

  getAvailability: async (id: string, startDate?: string, endDate?: string) => {
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('start_date', startDate);
    if (endDate) queryParams.append('end_date', endDate);
    
    const endpoint = `${API_ENDPOINTS.SITTER_AVAILABILITY(id)}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get(endpoint);
  },

  getMyProfile: async (sitterEmail?: string) => {
    // If sitterEmail is provided, use it to get the specific sitter's profile
    // This allows sitter portal to show a specific sitter's profile regardless of logged-in user
    const endpoint = sitterEmail 
      ? `${API_ENDPOINTS.SITTER_PROFILE_ME}?sitter_email=${encodeURIComponent(sitterEmail)}`
      : API_ENDPOINTS.SITTER_PROFILE_ME;
    
    const response = await apiClient.get<SitterProfile>(endpoint);
    if (response.data) {
      return {
        ...response,
        data: normalizeSitter(response.data),
      };
    }
    return response;
  },

  createSampleData: async () => {
    return apiClient.post(API_ENDPOINTS.SAMPLE_SITTERS);
  },

  create: async (payload: SitterCreate) => {
    return apiClient.post(API_ENDPOINTS.SITTERS, payload); // POST /api/v1/sitters/
  },
};

// Listing Services
export const listingService = {
  search: async (params: ListingSearchParams) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
    
    const endpoint = `${API_ENDPOINTS.LISTINGS}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get<Listing[]>(endpoint);
  },

  getActive: async (limit: number = 50) => {
    return apiClient.get<Listing[]>(`${API_ENDPOINTS.LISTINGS}/active?limit=${limit}`);
  },

  getById: async (id: string) => {
    return apiClient.get<Listing>(API_ENDPOINTS.LISTING_DETAIL(id));
  },

  create: async (listing: CreateListingRequest) => {
    return apiClient.post<Listing>(API_ENDPOINTS.CREATE_LISTING, listing);
  },

  update: async (id: string, updates: Partial<Listing>) => {
    return apiClient.put<Listing>(API_ENDPOINTS.LISTING_DETAIL(id), updates);
  },

  delete: async (id: string) => {
    return apiClient.delete(API_ENDPOINTS.LISTING_DETAIL(id));
  },

  createSampleData: async () => {
    return apiClient.post(API_ENDPOINTS.SAMPLE_LISTINGS);
  },
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// Reservation Services
export const reservationService = {
  create: async (reservation: CreateReservationRequest) => {
    return apiClient.post<Reservation>(API_ENDPOINTS.RESERVATIONS, reservation);
  },

  getById: async (id: string) => {
    if (id === 'dummy_completed_owner_reservation') {
      const now = Date.now();
      const toIsoDate = (ms: number) => new Date(ms).toISOString().split('T')[0];
      const toIso = (ms: number) => new Date(ms).toISOString();
      const demo = {
        id,
        owner_id: 'local-owner-greenthumb',
        sitter_id: 'dummy_sitter_id',
        sitter_name: 'Test Sitter (Dummy)',
        sitter_email: 'dummy@example.com',
        start_date: toIsoDate(now - 7 * 24 * 60 * 60 * 1000),
        end_date: toIsoDate(now - 2 * 24 * 60 * 60 * 1000),
        total_amount: 150.0,
        plants_info: '3 Monstera plants, 2 Fiddle Leaf Figs',
        care_instructions: 'Water every 2-3 days, check for pests',
        location_address: '3400 N Charles St, Baltimore, MD',
        status: 'completed',
        payment_status: 'paid',
        care_updates: [],
        care_checklist: [],
        created_at: toIso(now - 14 * 24 * 60 * 60 * 1000),
        updated_at: toIso(now - 2 * 24 * 60 * 60 * 1000),
        completed_at: toIso(now - 2 * 24 * 60 * 60 * 1000),
        // Leave unrated so the list shows the Rate sitter button
      } as Reservation;
      return { data: demo, status: 200 } as ApiResponse<Reservation>;
    }
    const response = await apiClient.get<Reservation>(
      API_ENDPOINTS.RESERVATION_DETAIL(id)
    );

    if (response.data) {
      return response;
    }

    const localRecord = getLocalReservationRecord(id);
    if (localRecord) {
      return {
        data: localRecord.reservation,
        status: 200,
      } as ApiResponse<Reservation>;
    }

    if (
      response.error &&
      response.error.toLowerCase().includes('failed to fetch')
    ) {
      return {
        error: response.error,
        status: response.status,
      };
    }

    return response;
  },

  getMyReservations: async () => {
    const response = await apiClient.get<Reservation[]>(
      API_ENDPOINTS.MY_RESERVATIONS
    );
    const localReservations = listLocalReservationRecords().map(
      (record) => record.reservation
    );

    if (response.data) {
      const merged = [...response.data, ...localReservations];
      return { data: merged, status: response.status } as ApiResponse<Reservation[]>;
    }

    if (
      response.error &&
      response.error.toLowerCase().includes('failed to fetch') &&
      localReservations.length
    ) {
      return { data: localReservations, status: 200 } as ApiResponse<Reservation[]>;
    }

    return response;
  },

  getMyActiveReservations: async () => {
    const response = await apiClient.get<Reservation[]>(
      API_ENDPOINTS.MY_ACTIVE_RESERVATIONS
    );
    const localReservations = listLocalReservationRecords()
      .map((record) => record.reservation)
      .filter((reservation) =>
        ["confirmed", "in_progress"].includes(reservation.status)
      );

    if (response.data) {
      const merged = [...response.data, ...localReservations];
      return { data: merged, status: response.status } as ApiResponse<Reservation[]>;
    }

    if (
      response.error &&
      response.error.toLowerCase().includes('failed to fetch') &&
      localReservations.length
    ) {
      return { data: localReservations, status: 200 } as ApiResponse<Reservation[]>;
    }

    return response;
  },

  confirm: async (id: string) => {
    return apiClient.post<Reservation>(`${API_ENDPOINTS.RESERVATION_DETAIL(id)}/confirm`);
  },

  start: async (id: string) => {
    return apiClient.post<Reservation>(`${API_ENDPOINTS.RESERVATION_DETAIL(id)}/start`);
  },

  complete: async (id: string) => {
    return apiClient.post<Reservation>(`${API_ENDPOINTS.RESERVATION_DETAIL(id)}/complete`);
  },

  cancel: async (id: string, reason?: string) => {
    return apiClient.post<Reservation>(`${API_ENDPOINTS.RESERVATION_DETAIL(id)}/cancel`, { reason });
  },

  addCareUpdate: async (
    id: string,
    update: { photos?: (string | File)[]; notes: string; care_actions: string[]; tasks_completed: string[] }
  ) => {
    const photoBase64: string[]=[];
    if(update.photos && update.photos.length>0)
    {
      for(const photo of update.photos)
      {
        if(typeof photo == "string"){
          photoBase64.push(photo);
        }
        else{
          const base64 = await fileToBase64(photo);
          photoBase64.push(base64);
        }
      }
    }
    const payload = {
      ...update,
      photos: photoBase64,
    }
   // return apiClient.post<Reservation>(`${API_ENDPOINTS.RESERVATION_DETAIL(id)}/care-updates`, update);
    return apiClient.post<Reservation>(`${API_ENDPOINTS.RESERVATION_DETAIL(id)}/care-updates`, payload);
  },

  deleteCareUpdate: async (reservationId: string, careUpdateId: string) => {
    return apiClient.delete<Reservation>(
      `${API_ENDPOINTS.RESERVATION_DETAIL(reservationId)}/care-updates/${encodeURIComponent(
        careUpdateId
      )}`
    );
  },

  addCareUpdateComment: async (reservationId: string, careUpdateId: string, message: string) => {
    return apiClient.post<Reservation>(
      `${API_ENDPOINTS.RESERVATION_DETAIL(reservationId)}/care-updates/${encodeURIComponent(careUpdateId)}/comments`,
      { message }
    );
  },

  updateCareChecklist: async (
    reservationId: string,
    payload: {
      tasks: string[];
      templates?: CareTaskTemplate[];
      schedule?: CareTaskAssignment[];
    }
  ) => {
    return apiClient.put<Reservation>(
      `${API_ENDPOINTS.RESERVATION_DETAIL(reservationId)}/care-checklist`,
      payload
    );
  },

  rate: async (id: string, rating: number, review?: string) => {
    return apiClient.post<Reservation>(`${API_ENDPOINTS.RESERVATION_DETAIL(id)}/rate`, { rating, review });
  },

  getReviews: async (sitterId: string) => {
    return apiClient.get<SitterReviewsResponse>(`${API_ENDPOINTS.SITTER_DETAIL(sitterId)}/reviews`);
  },

  seedDevSample: async (options?: { forCurrentUser?: boolean; sitterId?: string }) => {
    const params = new URLSearchParams();

    if (options?.sitterId) {
      params.append("sitter_id", options.sitterId);
    }
    if (options?.forCurrentUser) {
      params.append("for_current_user", "true");
    }

    const query = params.toString();
    const endpoint = query
      ? `${API_ENDPOINTS.RESERVATIONS_SAMPLE}?${query}`
      : API_ENDPOINTS.RESERVATIONS_SAMPLE;

    return apiClient.post<Reservation[]>(endpoint);
  },

  createReview: async (reviewData: {
    reservation_id: string;
    reviewer_id: string;
    reviewee_id: string;
    rating: number;
    review_txt: string;
    creator_identity: string;
  }) => {
    return apiClient.post(`/reviews`, reviewData);
  },
};

export const paymentService = {
  pay: async (amount: number, paymentMethodId: string): Promise<ApiResponse<PaymentResponse>> => {
    const endpoint = `${API_ENDPOINTS.PAYMENTS}/pay`;
    return apiClient.post<PaymentResponse>(endpoint, {
      amount,
      payment_method_id: paymentMethodId,
    });
  },
  createIntent: async (reservationId: string) => {
    const endpoint = `${API_ENDPOINTS.PAYMENTS}?reservation_id=${encodeURIComponent(reservationId)}`;
    return apiClient.post<PaymentIntentResponse>(endpoint);
  },

  capture: async (reservationId: string, paymentIntentId: string) => {
    const endpoint = `${API_ENDPOINTS.PAYMENT_CAPTURE(reservationId)}?payment_intent_id=${encodeURIComponent(paymentIntentId)}`;
    return apiClient.post<PaymentCaptureResponse>(endpoint);
  },

  refund: async (reservationId: string, amount?: number, reason?: string) => {
    const searchParams = new URLSearchParams({ reservation_id: reservationId });
    if (typeof amount === "number") {
      searchParams.append("amount", amount.toString());
    }
    if (reason) {
      searchParams.append("reason", reason);
    }
    const endpoint = `${API_ENDPOINTS.PAYMENT_REFUND}?${searchParams.toString()}`;
    return apiClient.post<RefundResponse>(endpoint);
  },
};

export const uploadService = {
  uploadCarePhotos: async (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    formData.append('purpose', 'care_update');

    const token = localStorage.getItem('auth_token');

    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.UPLOAD_BATCH}`, {
      method: 'POST',
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : undefined,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.detail || 'Failed to upload images');
    }

    return response.json() as Promise<{
      success: boolean;
      uploaded_count: number;
      files: { file_url: string }[];
    }>;
  },
};

// Auth Services
export const authService = {
  requestCode: async (email: string) => {
    return apiClient.post<RequestCodeResponse>(API_ENDPOINTS.REQUEST_CODE, { email });
  },

  verifyCode: async (payload: { email: string; username: string; code: string }) => {
    const response = await apiClient.post<VerifyCodeResponse>(API_ENDPOINTS.VERIFY_CODE, payload);
    if (response.data?.token) {
      localStorage.setItem('auth_token', response.data.token);
      localStorage.setItem('auth_email', response.data.email || payload.email);
      localStorage.setItem('auth_username', payload.username);
    }
    return response;
  },

  devLogin: async (email: string, password?: string) => {
    const response = await apiClient.post<VerifyCodeResponse>(API_ENDPOINTS.DEV_LOGIN, { email, password });
    if (response.data?.token) {
      const username = localStorage.getItem('auth_username') || email.split('@')[0];
      localStorage.setItem('auth_token', response.data.token);
      localStorage.setItem('auth_email', response.data.email || email);
      localStorage.setItem('auth_username', username);
    }
    return response;
  },

  logout: async () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_email');
    localStorage.removeItem('auth_username');
    return apiClient.post('/auth/logout');
  },

  getCurrentUser: async () => {
    const response = await apiClient.get<User>(API_ENDPOINTS.ME);
    if (response.data) {
      return {
        ...response,
        data: normalizeUser(response.data),
      };
    }
    return response;
  },

  getUsersWithSimilarInterests: async (userId: string): Promise<ApiResponse<ExploreResponse>> => {
    return await apiClient.get(API_ENDPOINTS.EXPLORE(userId));
  },


  getUserById: async (id: string) => {
    // Frontend-only dummy users for demo reservation
    if (id === 'local-owner-greenthumb') {
      return {
        data: normalizeUser({ id, full_name: 'Morgan Reed', email: 'morgan@example.com' }),
        status: 200,
      } as ApiResponse<User>;
    }
    if (id === 'dummy_sitter_id') {
      return {
        data: normalizeUser({ id, full_name: 'Test Sitter (Dummy)', email: 'dummy@example.com' }),
        status: 200,
      } as ApiResponse<User>;
    }
    const response = await apiClient.get<User>(API_ENDPOINTS.USER_DETAIL(id));
    if (response.data) {
      return {
        ...response,
        data: normalizeUser(response.data),
      };
    }
    return response;
  },
};


export const chatService = {
  async createConversation(userId: string, sitterId: string, initialMessage?: string) {
    return apiClient.post(`${API_ENDPOINTS.CHAT}/conversations`, {
      user_id: userId,
      sitter_id: sitterId,
      initial_message: initialMessage,
    });
  },

  async listConversations(userId: string, userType: 'user' | 'sitter') {
    const params = new URLSearchParams({
      user_id: userId,
      user_type: userType,
    });
    return apiClient.get(`${API_ENDPOINTS.CHAT}/conversations?${params.toString()}`);
  },

  async getMessages(conversationId: string, limit: number = 50) {
    const params = new URLSearchParams({ limit: String(limit) });
    return apiClient.get(`${API_ENDPOINTS.CHAT}/conversations/${conversationId}/messages?${params.toString()}`);
  },

  async sendMessage(conversationId: string, content: string, senderId: string, senderType: 'user' | 'sitter') {
    const params = new URLSearchParams({
      sender_id: senderId,
      sender_type: senderType,
    });
    return apiClient.post(`${API_ENDPOINTS.CHAT}/messages?${params.toString()}`, {
      conversation_id: conversationId,
      content,
    });
  },

  async markAsRead(conversationId: string, messageIds: string[], userType: 'user' | 'sitter') {
    if (!messageIds.length) {
      return { data: { success: true, updated: 0 }, status: 200 };
    }
    const params = new URLSearchParams({ user_type: userType });
    return apiClient.post(`${API_ENDPOINTS.CHAT}/messages/mark-read?${params.toString()}`, {
      conversation_id: conversationId,
      message_ids: messageIds,
    });
  },
};
