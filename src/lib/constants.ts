/**
 * Application-wide constants
 * Keep all magic numbers and configuration values here for easy maintenance
 */

// ============================================================================
// RESERVATION LIMITS
// ============================================================================

/** Maximum number of items a user can reserve per offer */
export const MAX_RESERVATION_QUANTITY = 3;

/** Maximum active reservations a user can have at once */
export const MAX_ACTIVE_RESERVATIONS = 10;

// ============================================================================
// PENALTY SYSTEM
// ============================================================================

/** First penalty duration in hours */
export const PENALTY_FIRST_OFFENSE_HOURS = 24;

/** Second penalty duration in hours */
export const PENALTY_SECOND_OFFENSE_HOURS = 48;

/** Third penalty duration in hours */
export const PENALTY_THIRD_OFFENSE_HOURS = 72;

/** Fourth and subsequent penalty duration in hours */
export const PENALTY_REPEAT_OFFENSE_HOURS = 168; // 1 week

// ============================================================================
// FILE UPLOAD CONSTRAINTS
// ============================================================================

/** Allowed image MIME types for uploads */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;

/** Maximum file size in bytes (5MB) */
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/** Maximum file size in MB for display */
export const MAX_FILE_SIZE_MB = 5;

/** Maximum number of images per offer */
export const MAX_IMAGES_PER_OFFER = 5;

// ============================================================================
// OFFER CONFIGURATION
// ============================================================================

/** Default offer duration for 24-hour businesses (in hours) */
export const DEFAULT_24H_OFFER_DURATION_HOURS = 6;

/** Minimum offer duration (in minutes) */
export const MIN_OFFER_DURATION_MINUTES = 30;

/** Maximum offer duration (in hours) */
export const MAX_OFFER_DURATION_HOURS = 24;

/** Time before expiration to show "Expiring Soon" badge (in hours) */
export const EXPIRING_SOON_THRESHOLD_HOURS = 1;

// ============================================================================
// PAGINATION & LIMITS
// ============================================================================

/** Default number of items per page */
export const DEFAULT_PAGE_SIZE = 20;

/** Maximum number of offers to show on map */
export const MAX_MAP_OFFERS = 100;

/** Number of recent offers to show in slider */
export const RECENT_OFFERS_LIMIT = 10;

// ============================================================================
// MAP CONFIGURATION
// ============================================================================

/** Default map center - Tbilisi, Georgia */
export const DEFAULT_MAP_CENTER = {
  latitude: 41.7151,
  longitude: 44.8271,
} as const;

/** Default map zoom level */
export const DEFAULT_MAP_ZOOM = 13;

/** Search radius in kilometers */
export const DEFAULT_SEARCH_RADIUS_KM = 10;

// ============================================================================
// CACHE & PERFORMANCE
// ============================================================================

/** Cache control max age for images (1 year in seconds) */
export const IMAGE_CACHE_MAX_AGE = 31536000;

/** Debounce delay for search inputs (in milliseconds) */
export const SEARCH_DEBOUNCE_MS = 300;

/** Auto-refresh interval for offers (in milliseconds) */
export const OFFERS_REFRESH_INTERVAL_MS = 60000; // 1 minute

// ============================================================================
// QR CODE CONFIGURATION
// ============================================================================

/** QR code size in pixels */
export const QR_CODE_SIZE = 300;

/** QR code margin */
export const QR_CODE_MARGIN = 2;

// ============================================================================
// PASSWORD VALIDATION
// ============================================================================

/** Minimum password length */
export const MIN_PASSWORD_LENGTH = 8;

/** Maximum password length */
export const MAX_PASSWORD_LENGTH = 128;

// ============================================================================
// BUSINESS TYPES
// ============================================================================

export const BUSINESS_TYPES = [
  'BAKERY',
  'RESTAURANT',
  'CAFE',
  'GROCERY',
  'FAST_FOOD',
  'ALCOHOL',
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];

// ============================================================================
// STATUS TYPES
// ============================================================================

export const USER_ROLES = ['CUSTOMER', 'PARTNER', 'ADMIN'] as const;
export const PARTNER_STATUSES = ['PENDING', 'APPROVED', 'BLOCKED', 'PAUSED'] as const;
export const OFFER_STATUSES = ['ACTIVE', 'EXPIRED', 'PAUSED', 'SOLD_OUT'] as const;
export const RESERVATION_STATUSES = ['ACTIVE', 'PICKED_UP', 'CANCELLED', 'EXPIRED'] as const;

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'You are not authorized to perform this action',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  INVALID_FILE_TYPE: `Please upload only ${ALLOWED_IMAGE_TYPES.join(', ')} files`,
  FILE_TOO_LARGE: `File size must be less than ${MAX_FILE_SIZE_MB}MB`,
  MAX_RESERVATIONS_REACHED: `You can only reserve up to ${MAX_RESERVATION_QUANTITY} items per offer`,
  UNDER_PENALTY: 'You are currently under penalty and cannot make reservations',
  OFFER_EXPIRED: 'This offer has expired',
  OFFER_SOLD_OUT: 'This offer is sold out',
  INSUFFICIENT_QUANTITY: 'Not enough quantity available',
} as const;

// ============================================================================
// SUCCESS MESSAGES
// ============================================================================

export const SUCCESS_MESSAGES = {
  RESERVATION_CREATED: 'Reservation created successfully!',
  OFFER_CREATED: 'Offer created successfully!',
  OFFER_UPDATED: 'Offer updated successfully!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  PARTNER_APPROVED: 'Partner approved successfully!',
} as const;
