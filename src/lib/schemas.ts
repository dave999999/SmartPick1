/**
 * Zod validation schemas for runtime type safety and input sanitization
 * Used across frontend forms and edge functions to prevent:
 * - SQL injection
 * - XSS attacks
 * - Invalid business logic (negative prices, invalid quantities)
 * - Malformed data structures
 */

import { z } from 'zod';

// ============================================================================
// OFFER SCHEMAS
// ============================================================================

export const offerDataSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must not exceed 200 characters')
    .trim()
    .refine(val => val.length > 0, 'Title cannot be empty'),
  
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must not exceed 2000 characters')
    .trim()
    .refine(val => val.length > 0, 'Description cannot be empty'),
  
  original_price: z.number()
    .positive('Original price must be positive')
    .finite('Original price must be a valid number')
    .max(999999, 'Original price is too high'),
  
  smart_price: z.number()
    .positive('Smart price must be positive')
    .finite('Smart price must be a valid number')
    .max(999999, 'Smart price is too high'),
  
  quantity: z.number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(10000, 'Quantity must not exceed 10,000'),
  
  auto_expire_6h: z.boolean().optional(),
  
  image_url: z.string().url('Invalid image URL').optional().nullable(),
}).refine(
  data => data.smart_price < data.original_price,
  {
    message: 'Smart price must be less than original price',
    path: ['smart_price']
  }
);

export type OfferData = z.infer<typeof offerDataSchema>;

// ============================================================================
// PARTNER SCHEMAS
// ============================================================================

export const partnerDataSchema = z.object({
  business_name: z.string()
    .min(2, 'Business name must be at least 2 characters')
    .max(200, 'Business name must not exceed 200 characters')
    .trim(),
  
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must not exceed 2000 characters')
    .trim(),
  
  address: z.string()
    .min(5, 'Address must be at least 5 characters')
    .max(500, 'Address must not exceed 500 characters')
    .trim(),
  
  lat: z.number()
    .min(-90, 'Invalid latitude')
    .max(90, 'Invalid latitude'),
  
  lng: z.number()
    .min(-180, 'Invalid longitude')
    .max(180, 'Invalid longitude'),
  
  phone: z.string()
    .regex(/^\+?[0-9\s\-()]{8,20}$/, 'Invalid phone number format')
    .trim(),
  
  website: z.string()
    .url('Invalid website URL')
    .optional()
    .nullable(),
  
  category: z.string()
    .min(2, 'Category must be at least 2 characters')
    .max(100, 'Category must not exceed 100 characters'),
});

export type PartnerData = z.infer<typeof partnerDataSchema>;

// ============================================================================
// USER PROFILE SCHEMAS
// ============================================================================

export const userProfileSchema = z.object({
  full_name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .trim()
    .regex(/^[a-zA-Z\s\u10A0-\u10FF]+$/, 'Name can only contain letters and spaces'),
  
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email must not exceed 255 characters')
    .trim()
    .toLowerCase(),
  
  phone: z.string()
    .regex(/^\+?[0-9\s\-()]{8,20}$/, 'Invalid phone number format')
    .trim()
    .optional()
    .nullable(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

// ============================================================================
// BOG WEBHOOK SCHEMAS
// ============================================================================

export const bogWebhookSchema = z.object({
  order_id: z.string()
    .uuid('Invalid order ID format'),
  
  external_order_id: z.string()
    .min(1, 'External order ID is required'),
  
  status: z.enum([
    'CREATED',
    'PENDING', 
    'APPROVED',
    'COMPLETED',
    'DECLINED',
    'REVERSED',
    'TIMEOUT',
    'FAILED'
  ], {
    errorMap: () => ({ message: 'Invalid payment status' })
  }),
  
  payment_hash: z.string().optional().nullable(),
  
  transaction_id: z.string().optional().nullable(),
  
  card_mask: z.string().optional().nullable(),
  
  amount: z.number()
    .positive('Amount must be positive')
    .finite('Amount must be a valid number')
    .optional(),
});

export type BOGWebhookData = z.infer<typeof bogWebhookSchema>;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Safely parse and validate data with Zod schema
 * Returns { success: true, data } or { success: false, errors }
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.errors.map(err => 
    `${err.path.join('.')}: ${err.message}`
  );
  
  return { success: false, errors };
}

/**
 * Get user-friendly error message from validation result
 */
export function getValidationErrorMessage(errors: string[]): string {
  if (errors.length === 0) return 'Validation failed';
  if (errors.length === 1) return errors[0];
  return `${errors.length} validation errors:\n${errors.join('\n')}`;
}
