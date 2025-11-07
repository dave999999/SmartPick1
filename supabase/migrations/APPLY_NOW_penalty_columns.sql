-- APPLY THIS MIGRATION IMMEDIATELY to add penalty system columns
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- Add penalty system columns to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS penalty_count INTEGER DEFAULT 0;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS penalty_until TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS last_penalty_at TIMESTAMP WITH TIME ZONE;

-- Add comments for documentation
COMMENT ON COLUMN public.users.penalty_count IS 'Number of times user failed to pick up reserved items';
COMMENT ON COLUMN public.users.penalty_until IS 'Timestamp when current penalty expires (null if no active penalty)';
COMMENT ON COLUMN public.users.is_banned IS 'Permanent ban flag (only admin can remove)';
COMMENT ON COLUMN public.users.last_penalty_at IS 'Timestamp of last penalty application';

-- Create indexes for efficient penalty checking
CREATE INDEX IF NOT EXISTS idx_users_penalty_until ON public.users(penalty_until) WHERE penalty_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON public.users(is_banned) WHERE is_banned = true;

-- Add no-show tracking to reservations
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS no_show BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.reservations.no_show IS 'True if customer did not show up to pick up the item';

-- Update any existing users to have default values
UPDATE public.users
SET penalty_count = 0
WHERE penalty_count IS NULL;

UPDATE public.users
SET is_banned = false
WHERE is_banned IS NULL;
