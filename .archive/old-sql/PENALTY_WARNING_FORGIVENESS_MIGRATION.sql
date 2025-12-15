-- Add penalty warning tracking and forgiveness fields
-- Migration: Add penalty_warning_shown to users and forgiveness tracking to reservations

-- Add penalty_warning_shown to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS penalty_warning_shown BOOLEAN DEFAULT FALSE;

-- Add forgiveness tracking to reservations table
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS forgiveness_requested BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS forgiveness_request_reason TEXT,
ADD COLUMN IF NOT EXISTS forgiveness_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS forgiveness_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS forgiveness_denied BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS forgiveness_handled_at TIMESTAMPTZ;

-- Create index for faster forgiveness queries
CREATE INDEX IF NOT EXISTS idx_reservations_forgiveness 
ON reservations(customer_id, forgiveness_requested) 
WHERE forgiveness_requested = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN users.penalty_warning_shown IS 'Tracks if user has seen the first-time penalty warning dialog';
COMMENT ON COLUMN reservations.forgiveness_requested IS 'Customer has requested forgiveness from partner';
COMMENT ON COLUMN reservations.forgiveness_request_reason IS 'Reason provided by customer for missing pickup';

-- Drop policy if it exists, then recreate (PostgreSQL doesn't support IF NOT EXISTS for policies)
DROP POLICY IF EXISTS "Users can request forgiveness for their reservations" ON reservations;

CREATE POLICY "Users can request forgiveness for their reservations"
ON reservations
FOR UPDATE
TO authenticated
USING (customer_id = auth.uid())
WITH CHECK (customer_id = auth.uid());
