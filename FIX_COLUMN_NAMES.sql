-- ============================================
-- FIX user_stats COLUMN NAMES TO MATCH CODE
-- ============================================

BEGIN;

-- Drop and recreate with correct column names
DROP TABLE IF EXISTS public.user_stats CASCADE;

CREATE TABLE public.user_stats (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  total_reservations INTEGER NOT NULL DEFAULT 0,
  total_money_saved DECIMAL(10,2) NOT NULL DEFAULT 0,
  points_earned INTEGER NOT NULL DEFAULT 0,
  points_spent INTEGER NOT NULL DEFAULT 0,
  current_streak_days INTEGER NOT NULL DEFAULT 0,
  longest_streak_days INTEGER NOT NULL DEFAULT 0,
  last_reservation_date DATE,
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
  total_reservations, 
  total_money_saved, 
  points_earned, 
  points_spent,
  current_streak_days,
  longest_streak_days,
  level,
  total_referrals
)
SELECT 
  id, 
  0,  -- total_reservations
  0,  -- total_money_saved
  20, -- points_earned (starting bonus)
  0,  -- points_spent
  0,  -- current_streak_days
  0,  -- longest_streak_days
  1,  -- level
  0   -- total_referrals
FROM public.users;

COMMIT;

SELECT '✅ user_stats table fixed with correct column names!' AS status;
SELECT '🎉 Now refresh browser: Ctrl+Shift+F5' AS action;
