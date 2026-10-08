import { API_BASE_URL } from './config';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
    };

    // Try new auth system first (owner or sitter), then fall back to old auth_token
    const ownerToken = localStorage.getItem('owner_auth_token');
    const sitterToken = localStorage.getItem('sitter_auth_token');
    const oldToken = localStorage.getItem('auth_token');
    
    // Determine which token to use based on context
    let token: string | null = null;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const viewAs = urlParams.get('as');
      const currentPath = window.location.pathname;
      
      // If URL has ?as=sitter parameter or we're on a sitter portal page, prioritize sitter token
      if ((viewAs === 'sitter' || currentPath.startsWith('/sitter')) && sitterToken) {
        // If viewing as sitter or on sitter portal, prioritize sitter token
        console.log('[ApiClient] Using sitter token (sitter portal context)');
        token = sitterToken;
      } else if (currentPath.startsWith('/sitter') && sitterToken) {
        // Also check if we're on a sitter portal page
        console.log('[ApiClient] Using sitter token (sitter portal page)');
        token = sitterToken;
      } else {
        // Default: owner token first, then sitter, then old token
        token = ownerToken || sitterToken || oldToken;
        if (ownerToken) {
          console.log('[ApiClient] Using owner token (default)');
        } else if (sitterToken) {
          console.log('[ApiClient] Using sitter token (no owner token)');
        }
      }
    } catch (e) {
      // Fallback if URL parsing fails
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/sitter') && sitterToken) {
        token = sitterToken;
        console.log('[ApiClient] Using sitter token (fallback, sitter portal page)');
      } else {
        token = ownerToken || sitterToken || oldToken;
      }
    }
    
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    try {
      const response = await fetch(url, config);
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;

      if (!response.ok) {
        return {
          error: data?.detail || `HTTP error! status: ${response.status}`,
          status: response.status,
        };
      }

      return {
        data,
        status: response.status,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error',
        status: 0,
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
