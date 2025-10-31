-- Migration: Fix partner status constraint to include all valid statuses
-- Created: 2025-01-31

-- Drop the old CHECK constraint
ALTER TABLE partners
DROP CONSTRAINT IF EXISTS valid_partner_status;

-- Add the new CHECK constraint with all valid status values
ALTER TABLE partners
ADD CONSTRAINT valid_partner_status
CHECK (status::text = ANY (
  ARRAY['PENDING', 'APPROVED', 'BLOCKED', 'PAUSED']::text[]
));

-- Add a comment to document the constraint
COMMENT ON CONSTRAINT valid_partner_status ON partners
IS 'Ensures partner status is one of: PENDING, APPROVED, BLOCKED, PAUSED';
