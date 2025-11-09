-- ============================================
-- DROP AND RECREATE user_stats TABLE
-- This will fix the column mismatch
-- ============================================

BEGIN;

-- Drop the old table
DROP TABLE IF EXISTS public.user_stats CASCADE;

-- Recreate with correct structure
CREATE TABLE public.user_stats (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  total_pickups INTEGER NOT NULL DEFAULT 0,
  total_savings DECIMAL(10,2) NOT NULL DEFAULT 0,
  points_earned INTEGER NOT NULL DEFAULT 0,
  points_spent INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_pickup_date DATE,
  level INTEGER NOT NULL DEFAULT 1,
  total_referrals INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_stats_user_id ON public.user_stats(user_id);

-- Enable RLS
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_stats_select_own" ON public.user_stats;
CREATE POLICY "user_stats_select_own"
  ON public.user_stats FOR SELECT
  USING (user_id = auth.uid());

-- Initialize stats for all existing users
INSERT INTO public.user_stats (
  user_id, 
  total_pickups, 
  total_savings, 
  points_earned, 
  points_spent,
  current_streak,
  longest_streak,
  level,
  total_referrals
)
SELECT 
  id, 
  0,  -- total_pickups
  0,  -- total_savings
  20, -- points_earned (starting bonus)
  0,  -- points_spent
  0,  -- current_streak
  0,  -- longest_streak
  1,  -- level
  0   -- total_referrals
FROM public.users;

COMMIT;

SELECT '✅ user_stats table recreated with correct structure!' AS status;
SELECT '🎉 Now refresh browser: Ctrl+Shift+R' AS action;
