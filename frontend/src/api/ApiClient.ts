/**
 * API Client for communicating with the backend
 * Provides centralized error handling and request management
 */

export interface ApiError {
  code: string;
  message: string;
  suggestion?: string;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Make a GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'GET'
    });
  }

  /**
   * Make a POST request
   */
  async post<T>(endpoint: string, data?: any, sessionId?: string): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (sessionId) {
      headers['X-Session-Id'] = sessionId;
    }

    return this.request<T>(endpoint, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * Make a PUT request
   */
  async put<T>(endpoint: string, data?: any, sessionId?: string): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (sessionId) {
      headers['X-Session-Id'] = sessionId;
    }

    return this.request<T>(endpoint, {
      method: 'PUT',
      headers,
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(endpoint: string, sessionId?: string): Promise<T> {
    const headers: Record<string, string> = {};

    if (sessionId) {
      headers['X-Session-Id'] = sessionId;
    }

    return this.request<T>(endpoint, {
      method: 'DELETE',
      headers
    });
  }

  /**
   * Generic request handler with error handling
   */
  private async request<T>(endpoint: string, options: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, options);

      // Handle 404 specially
      if (response.status === 404) {
        throw {
          code: 'NOT_FOUND',
          message: 'Resource not found',
          suggestion: 'The requested resource does not exist'
        } as ApiError;
      }

      // Handle other error responses
      if (!response.ok) {
        let errorData: any;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: response.statusText };
        }

        throw {
          code: errorData.code || 'API_ERROR',
          message: errorData.message || `Request failed: ${response.statusText}`,
          suggestion: errorData.suggestion
        } as ApiError;
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      // Re-throw ApiError as-is
      if (this.isApiError(error)) {
        throw error;
      }

      // Handle network errors
      if (error instanceof TypeError) {
        throw {
          code: 'NETWORK_ERROR',
          message: 'Network error occurred',
          suggestion: 'Please check your connection and try again'
        } as ApiError;
      }

      // Handle other errors
      throw {
        code: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        suggestion: 'Please try again or contact support'
      } as ApiError;
    }
  }

  /**
   * Type guard for ApiError
   */
  private isApiError(error: any): error is ApiError {
    return error && typeof error.code === 'string' && typeof error.message === 'string';
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
