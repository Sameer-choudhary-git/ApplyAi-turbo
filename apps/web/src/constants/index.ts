/**
 * Application Constants
 */

export const APP_NAME = 'ApplyAI';
export const APP_VERSION = '1.0.0';

/**
 * UI Constants
 */
export const TOAST_DURATION = 3000; // milliseconds
export const DEBOUNCE_DELAY = 300; // milliseconds
export const API_TIMEOUT = 30000; // milliseconds

/**
 * Pagination
 */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * File Upload
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

/**
 * Feature Flags
 */
export const FEATURES = {
  ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  SENTRY: import.meta.env.VITE_ENABLE_SENTRY === 'true',
};

/**
 * Routes
 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  APPLICATIONS: '/applications',
  SAVED_JOBS: '/saved-jobs',
  PREFERENCES: '/preferences',
  ANALYTICS: '/analytics',
  TASKS: '/tasks',
  SCHEDULE: '/schedule',
  NETWORKING: '/networking',
  ONBOARDING: '/onboarding',
} as const;