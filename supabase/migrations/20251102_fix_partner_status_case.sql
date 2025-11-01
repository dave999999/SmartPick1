-- Fix existing lowercase partner status values to uppercase
-- This migration addresses the case sensitivity issue where partners were approved
-- with lowercase 'approved' but the application expects uppercase 'APPROVED'

-- Update all lowercase status values to uppercase
UPDATE partners
SET status = UPPER(status)
WHERE status IN ('approved', 'pending', 'blocked', 'paused', 'rejected');

-- Add a comment explaining the change
COMMENT ON COLUMN partners.status IS 'Partner status - must be uppercase: PENDING, APPROVED, BLOCKED, PAUSED, or REJECTED';
