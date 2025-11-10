/**
 * Input Validation Utilities
 * 
 * Safe validation helpers to prevent:
 * - Database errors from oversized inputs
 * - DoS attacks via huge payloads
 * - XSS via unsafe content
 * 
 * Usage:
 * import { validateLength, MAX_LENGTHS, sanitizeInput } from '@/lib/validation';
 * 
 * if (!validateLength(title, MAX_LENGTHS.OFFER_TITLE)) {
 *   throw new Error('Title too long');
 * }
 */

/**
 * Maximum allowed lengths for various inputs
 * Based on database schema and UX considerations
 */
export const MAX_LENGTHS = {
  // User inputs
  NAME: 100,
  EMAIL: 255,
  PASSWORD: 128,
  PHONE: 20,
  
  // Offer fields
  OFFER_TITLE: 100,
  OFFER_DESCRIPTION: 1000,
  
  // Partner fields
  BUSINESS_NAME: 100,
  BUSINESS_DESCRIPTION: 500,
  ADDRESS: 200,
  
  // QR codes and identifiers
  QR_CODE: 50,
  REFERRAL_CODE: 6,
  
  // Comments and feedback
  COMMENT: 500,
  REVIEW: 1000,
  
  // URLs and paths
  URL: 2048,
  IMAGE_PATH: 500,
} as const;

/**
 * Minimum lengths for validation
 */
export const MIN_LENGTHS = {
  NAME: 2,
  PASSWORD: 12,
  OFFER_TITLE: 3,
  OFFER_DESCRIPTION: 10,
  BUSINESS_NAME: 2,
  ADDRESS: 5,
  PHONE: 7,
  COMMENT: 1,
} as const;

/**
 * Numeric validation ranges
 */
export const NUMERIC_RANGES = {
  PRICE: { min: 0.01, max: 999999.99 },
  QUANTITY: { min: 1, max: 100 },
  DISCOUNT_PERCENT: { min: 1, max: 99 },
  POINTS: { min: 0, max: 1000000 },
  RATING: { min: 1, max: 5 },
  LATITUDE: { min: -90, max: 90 },
  LONGITUDE: { min: -180, max: 180 },
} as const;

/**
 * Validate string length
 * @param value - The string to validate
 * @param maxLength - Maximum allowed length
 * @param minLength - Minimum required length (optional)
 * @returns true if valid, false otherwise
 */
export function validateLength(
  value: string | null | undefined,
  maxLength: number,
  minLength: number = 0
): boolean {
  if (value === null || value === undefined) {
    return minLength === 0;
  }
  
  const length = value.trim().length;
  return length >= minLength && length <= maxLength;
}

/**
 * Validate numeric range
 * @param value - The number to validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns true if valid, false otherwise
 */
export function validateNumericRange(
  value: number | null | undefined,
  min: number,
  max: number
): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  
  return value >= min && value <= max;
}

/**
 * Sanitize string input
 * Removes dangerous characters but preserves normal text
 * Note: React automatically escapes text content, so this is an extra layer
 * 
 * @param input - The string to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string | null | undefined): string {
  if (!input) return '';
  
  // Remove null bytes and control characters (except newlines/tabs)
  return input
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

/**
 * Validate email format
 * @param email - Email address to validate
 * @returns true if valid email format
 */
export function validateEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && validateLength(email, MAX_LENGTHS.EMAIL, 5);
}

/**
 * Validate phone number (international format)
 * @param phone - Phone number to validate
 * @returns true if valid phone format
 */
export function validatePhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  
  // Allow: +, digits, spaces, dashes, parentheses
  const phoneRegex = /^[\d\s\-+()]{7,20}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate URL format
 * @param url - URL to validate
 * @returns true if valid URL
 */
export function validateUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate image file type
 * @param filename - Name of the file
 * @returns true if valid image type
 */
export function validateImageType(filename: string): boolean {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return allowedExtensions.includes(extension);
}

/**
 * Validate file size
 * @param sizeInBytes - Size of file in bytes
 * @param maxSizeInMB - Maximum size in megabytes (default 5MB)
 * @returns true if size is acceptable
 */
export function validateFileSize(sizeInBytes: number, maxSizeInMB: number = 5): boolean {
  const maxBytes = maxSizeInMB * 1024 * 1024;
  return sizeInBytes > 0 && sizeInBytes <= maxBytes;
}

/**
 * Comprehensive offer validation
 * @param data - Offer data to validate
 * @returns Array of error messages (empty if valid)
 */
export function validateOfferData(data: {
  title?: string;
  description?: string;
  smart_price?: number;
  original_price?: number;
  quantity?: number;
}): string[] {
  const errors: string[] = [];
  
  // Title validation
  if (!validateLength(data.title, MAX_LENGTHS.OFFER_TITLE, MIN_LENGTHS.OFFER_TITLE)) {
    errors.push(`Title must be between ${MIN_LENGTHS.OFFER_TITLE} and ${MAX_LENGTHS.OFFER_TITLE} characters`);
  }
  
  // Description validation
  if (!validateLength(data.description, MAX_LENGTHS.OFFER_DESCRIPTION, MIN_LENGTHS.OFFER_DESCRIPTION)) {
    errors.push(`Description must be between ${MIN_LENGTHS.OFFER_DESCRIPTION} and ${MAX_LENGTHS.OFFER_DESCRIPTION} characters`);
  }
  
  // Price validation
  if (!validateNumericRange(data.smart_price, NUMERIC_RANGES.PRICE.min, NUMERIC_RANGES.PRICE.max)) {
    errors.push('Smart price must be between ₾0.01 and ₾999,999.99');
  }
  
  if (!validateNumericRange(data.original_price, NUMERIC_RANGES.PRICE.min, NUMERIC_RANGES.PRICE.max)) {
    errors.push('Original price must be between ₾0.01 and ₾999,999.99');
  }
  
  // Price comparison
  if (data.smart_price && data.original_price && data.smart_price >= data.original_price) {
    errors.push('Smart price must be less than original price');
  }
  
  // Quantity validation
  if (!validateNumericRange(data.quantity, NUMERIC_RANGES.QUANTITY.min, NUMERIC_RANGES.QUANTITY.max)) {
    errors.push(`Quantity must be between ${NUMERIC_RANGES.QUANTITY.min} and ${NUMERIC_RANGES.QUANTITY.max}`);
  }
  
  return errors;
}

/**
 * Comprehensive user profile validation
 * @param data - User profile data to validate
 * @returns Array of error messages (empty if valid)
 */
export function validateUserProfile(data: {
  name?: string;
  email?: string;
  phone?: string;
}): string[] {
  const errors: string[] = [];
  
  // Name validation
  if (!validateLength(data.name, MAX_LENGTHS.NAME, MIN_LENGTHS.NAME)) {
    errors.push(`Name must be between ${MIN_LENGTHS.NAME} and ${MAX_LENGTHS.NAME} characters`);
  }
  
  // Email validation
  if (data.email && !validateEmail(data.email)) {
    errors.push('Invalid email format');
  }
  
  // Phone validation
  if (data.phone && !validatePhone(data.phone)) {
    errors.push('Invalid phone number format');
  }
  
  return errors;
}

/**
 * Validate partner application data
 * @param data - Partner application data
 * @returns Array of error messages (empty if valid)
 */
export function validatePartnerData(data: {
  business_name?: string;
  description?: string;
  address?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
}): string[] {
  const errors: string[] = [];
  
  // Business name
  if (!validateLength(data.business_name, MAX_LENGTHS.BUSINESS_NAME, MIN_LENGTHS.BUSINESS_NAME)) {
    errors.push(`Business name must be between ${MIN_LENGTHS.BUSINESS_NAME} and ${MAX_LENGTHS.BUSINESS_NAME} characters`);
  }
  
  // Description
  if (!validateLength(data.description, MAX_LENGTHS.BUSINESS_DESCRIPTION)) {
    errors.push(`Description must not exceed ${MAX_LENGTHS.BUSINESS_DESCRIPTION} characters`);
  }
  
  // Address
  if (!validateLength(data.address, MAX_LENGTHS.ADDRESS, MIN_LENGTHS.ADDRESS)) {
    errors.push(`Address must be between ${MIN_LENGTHS.ADDRESS} and ${MAX_LENGTHS.ADDRESS} characters`);
  }
  
  // Phone
  if (data.phone && !validatePhone(data.phone)) {
    errors.push('Invalid phone number format');
  }
  
  // Coordinates
  if (data.latitude && !validateNumericRange(data.latitude, NUMERIC_RANGES.LATITUDE.min, NUMERIC_RANGES.LATITUDE.max)) {
    errors.push('Invalid latitude value');
  }
  
  if (data.longitude && !validateNumericRange(data.longitude, NUMERIC_RANGES.LONGITUDE.min, NUMERIC_RANGES.LONGITUDE.max)) {
    errors.push('Invalid longitude value');
  }
  
  return errors;
}

/**
 * Truncate string to max length with ellipsis
 * @param str - String to truncate
 * @param maxLength - Maximum length
 * @returns Truncated string
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Get validation error message for a field
 * @param fieldName - Name of the field
 * @param value - Value to validate
 * @param maxLength - Maximum length
 * @param minLength - Minimum length (optional)
 * @returns Error message or null if valid
 */
export function getFieldError(
  fieldName: string,
  value: string | null | undefined,
  maxLength: number,
  minLength: number = 0
): string | null {
  if (!value || value.trim().length === 0) {
    return minLength > 0 ? `${fieldName} is required` : null;
  }
  
  const length = value.trim().length;
  
  if (length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`;
  }
  
  if (length > maxLength) {
    return `${fieldName} must not exceed ${maxLength} characters`;
  }
  
  return null;
}
