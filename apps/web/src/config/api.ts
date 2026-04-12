/**
 * API Configuration for Production-Grade Web App
 * Centralized API client configuration with error handling
 */

import { apiConfig } from '@config';

/**
 * API Response wrapper type
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Request configuration options
 */
export interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
}

/**
 * Global request options
 */
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_RETRIES = 2;

/**
 * Create headers with auth token if available
 */
function getHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
  };
}

/**
 * Fetch with timeout and retry logic
 */
async function fetchWithRetry(
  url: string,
  options: RequestOptions = {}
): Promise<Response> {
  const { timeout = DEFAULT_TIMEOUT, retries = DEFAULT_RETRIES, ...fetchOptions } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on AbortError (timeout)
      if (lastError.name === 'AbortError' && attempt === retries) {
        throw new Error(`Request timeout after ${timeout}ms`);
      }

      // Don't retry on last attempt
      if (attempt === retries) {
        throw lastError;
      }

      // Exponential backoff
      const delay = Math.pow(2, attempt) * 100;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Unknown error');
}

/**
 * Make an API request
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const url = `${apiConfig.baseUrl}${endpoint}`;

  try {
    const response = await fetchWithRetry(url, {
      ...options,
      headers: {
        ...getHeaders(),
        ...options.headers,
      },
    });

    const data: ApiResponse<T> = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
        message: data.message,
      };
    }

    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * GET request helper
 */
export function apiGet<T>(endpoint: string, options?: RequestOptions) {
  return apiRequest<T>(endpoint, { ...options, method: 'GET' });
}

/**
 * POST request helper
 */
export function apiPost<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PATCH request helper
 */
export function apiPatch<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE request helper
 */
export function apiDelete<T>(endpoint: string, options?: RequestOptions) {
  return apiRequest<T>(endpoint, { ...options, method: 'DELETE' });
}

/**
 * File upload helper
 */
export async function apiUploadFile<T>(
  endpoint: string,
  file: File,
  options?: RequestOptions
): Promise<ApiResponse<T>> {
  const url = `${apiConfig.baseUrl}${endpoint}`;
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetchWithRetry(url, {
      ...options,
      method: 'POST',
      body: formData,
      headers: options?.headers,
    });

    const data: ApiResponse<T> = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: message,
    };
  }
}