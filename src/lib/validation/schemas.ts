/**
 * Input Validation Schemas
 * Using Zod for runtime type validation and DOMPurify for HTML sanitization
 */

import { z } from 'zod';
import DOMPurify from 'dompurify';

// ===================================
// SANITIZATION UTILITIES
// ===================================

/**
 * Sanitize HTML content - strips all HTML tags and attributes
 * Use for user-generated content to prevent XSS attacks
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';
  
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // Strip all HTML tags
    ALLOWED_ATTR: [], // Strip all attributes
    KEEP_CONTENT: true, // Keep text content
  }).trim();
}

/**
 * Sanitize and trim string
 */
export function sanitizeString(value: string): string {
  return sanitizeHtml(value).trim();
}

// ===================================
// BASIC SCHEMAS
// ===================================

export const emailSchema = z.string()
  .email('Invalid email format')
  .max(255, 'Email too long')
  .trim()
  .toLowerCase();

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long');

export const nameSchema = z.string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name too long')
  .transform(sanitizeString);

export const phoneSchema = z.string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
  .optional();

// ===================================
// OFFER SCHEMAS
// ===================================

export const offerTitleSchema = z.string()
  .min(5, 'Title must be at least 5 characters')
  .max(100, 'Title must be less than 100 characters')
  .transform(sanitizeString);

export const offerDescriptionSchema = z.string()
  .max(500, 'Description must be less than 500 characters')
  .transform(sanitizeString);

export const priceSchema = z.number()
  .positive('Price must be positive')
  .max(10000, 'Price too high')
  .finite('Price must be a valid number');

export const quantitySchema = z.number()
  .int('Quantity must be a whole number')
  .positive('Quantity must be positive')
  .max(1000, 'Quantity too high');

export const categorySchema = z.enum([
  'FOOD',
  'BAKERY', 
  'GROCERY',
  'RESTAURANT',
  'CAFE',
  'OTHER'
], {
  errorMap: () => ({ message: 'Invalid category' })
});

/**
 * Full offer creation schema
 */
export const createOfferSchema = z.object({
  title: offerTitleSchema,
  description: offerDescriptionSchema,
  smart_price: priceSchema,
  original_price: priceSchema,
  quantity_available: quantitySchema,
  category: categorySchema,
}).refine(
  (data) => data.original_price >= data.smart_price,
  {
    message: 'Original price must be greater than or equal to smart price',
    path: ['original_price']
  }
);

/**
 * Offer update schema (all fields optional except those being updated)
 */
export const updateOfferSchema = z.object({
  title: offerTitleSchema.optional(),
  description: offerDescriptionSchema.optional(),
  smart_price: priceSchema.optional(),
  original_price: priceSchema.optional(),
  quantity_available: quantitySchema.optional(),
  category: categorySchema.optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'SOLD_OUT', 'EXPIRED']).optional(),
}).refine(
  (data) => {
    if (data.original_price !== undefined && data.smart_price !== undefined) {
      return data.original_price >= data.smart_price;
    }
    return true;
  },
  {
    message: 'Original price must be greater than or equal to smart price'
  }
);

// ===================================
// PARTNER SCHEMAS
// ===================================

export const businessNameSchema = z.string()
  .min(2, 'Business name must be at least 2 characters')
  .max(200, 'Business name too long')
  .transform(sanitizeString);

export const addressSchema = z.string()
  .max(500, 'Address too long')
  .transform(sanitizeString)
  .optional();

export const descriptionSchema = z.string()
  .max(1000, 'Description too long')
  .transform(sanitizeString)
  .optional();

/**
 * Partner profile update schema
 */
export const updatePartnerSchema = z.object({
  business_name: businessNameSchema.optional(),
  phone: phoneSchema,
  description: descriptionSchema,
  address: addressSchema,
});

// ===================================
// RESERVATION SCHEMAS
// ===================================

export const reservationQuantitySchema = z.number()
  .int('Quantity must be a whole number')
  .positive('Quantity must be positive')
  .max(10, 'Cannot reserve more than 10 items at once');

export const createReservationSchema = z.object({
  offer_id: z.string().uuid('Invalid offer ID'),
  customer_id: z.string().uuid('Invalid customer ID'),
  quantity: reservationQuantitySchema,
});

// ===================================
// USER SCHEMAS
// ===================================

export const updateProfileSchema = z.object({
  name: nameSchema.optional(),
  phone: phoneSchema,
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
});

// ===================================
// VALIDATION HELPERS
// ===================================

/**
 * Validate and sanitize data with a schema
 * Throws ZodError if validation fails
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Validate data and return safe parsed result
 * Returns { success: true, data } or { success: false, error }
 */
export function safeValidateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  return result as any;
}

/**
 * Get user-friendly error messages from Zod validation errors
 */
export function getValidationErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    errors[path] = err.message;
  });
  
  return errors;
}
