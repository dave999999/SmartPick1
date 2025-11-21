/**
 * Zod validation schemas for Supabase Edge Functions (Deno runtime)
 * Used to validate incoming webhook data and prevent injection attacks
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

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
  return `${errors.length} validation errors: ${errors.join(', ')}`;
}
