-- Add penalty system columns to users table
-- Tracks user penalties for not picking up reserved items

-- Add penalty_count column (tracks how many times user failed to pick up)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS penalty_count INTEGER DEFAULT 0;

-- Add penalty_until column (timestamp when penalty expires)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS penalty_until TIMESTAMP WITH TIME ZONE;

-- Add is_banned column (permanent ban flag)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

-- Add last_penalty_at column (track when last penalty was applied)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS last_penalty_at TIMESTAMP WITH TIME ZONE;

-- Add comments for documentation
COMMENT ON COLUMN public.users.penalty_count IS 'Number of times user failed to pick up reserved items';
COMMENT ON COLUMN public.users.penalty_until IS 'Timestamp when current penalty expires (null if no active penalty)';
COMMENT ON COLUMN public.users.is_banned IS 'Permanent ban flag (only admin can remove)';
COMMENT ON COLUMN public.users.last_penalty_at IS 'Timestamp of last penalty application';

-- Create index for efficient penalty checking
CREATE INDEX IF NOT EXISTS idx_users_penalty_until ON public.users(penalty_until);
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON public.users(is_banned);

-- Add a column to reservations to track no-show status
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS no_show BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.reservations.no_show IS 'True if customer did not show up to pick up the item';
