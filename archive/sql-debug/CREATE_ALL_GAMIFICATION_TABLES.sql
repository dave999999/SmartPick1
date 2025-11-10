-- ============================================
-- CREATE ALL MISSING GAMIFICATION TABLES
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================
-- This creates user_points, user_stats, and all gamification tables

BEGIN;

-- ============================================
-- PART 1: User Points Tables (for customers)
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_points (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  change INTEGER NOT NULL,
  reason TEXT NOT NULL,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON public.user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON public.point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON public.point_transactions(created_at DESC);

-- Enable RLS
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_points
DROP POLICY IF EXISTS "user_points_select_own" ON public.user_points;
CREATE POLICY "user_points_select_own"
  ON public.user_points FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policies for point_transactions
DROP POLICY IF EXISTS "point_transactions_select_own" ON public.point_transactions;
CREATE POLICY "point_transactions_select_own"
  ON public.point_transactions FOR SELECT
  USING (user_id = auth.uid());

-- Initialize points for existing users
INSERT INTO public.user_points (user_id, balance)
SELECT id, 20
FROM public.users
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- PART 2: User Stats Table (for gamification dashboard)
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_stats (
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

CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON public.user_stats(user_id);

-- Enable RLS
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_stats_select_own" ON public.user_stats;
CREATE POLICY "user_stats_select_own"
  ON public.user_stats FOR SELECT
  USING (user_id = auth.uid());

-- Initialize stats for existing users
-- Only insert if they don't already have stats
INSERT INTO public.user_stats (user_id)
SELECT id
FROM public.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_stats WHERE user_id = users.id
)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- PART 3: Partner Points Tables
-- ============================================

DROP TABLE IF EXISTS public.partner_point_transactions CASCADE;
DROP TABLE IF EXISTS public.partner_points CASCADE;

CREATE TABLE public.partner_points (
  partner_id UUID PRIMARY KEY REFERENCES public.partners(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  offer_slots INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.partner_point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  change INTEGER NOT NULL,
  reason TEXT NOT NULL,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_partner_points_partner_id ON public.partner_points(partner_id);
CREATE INDEX idx_partner_point_transactions_partner_id ON public.partner_point_transactions(partner_id);
CREATE INDEX idx_partner_point_transactions_created_at ON public.partner_point_transactions(created_at DESC);

-- Enable RLS
ALTER TABLE public.partner_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_point_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for partner_points
DROP POLICY IF EXISTS "partners_view_own_points" ON public.partner_points;
CREATE POLICY "partners_view_own_points"
  ON public.partner_points FOR SELECT
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

-- RLS Policies for partner_point_transactions
DROP POLICY IF EXISTS "partners_view_own_transactions" ON public.partner_point_transactions;
CREATE POLICY "partners_view_own_transactions"
  ON public.partner_point_transactions FOR SELECT
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

-- Initialize points for existing partners
INSERT INTO public.partner_points (partner_id, balance, offer_slots)
SELECT id, 0, 3
FROM public.partners
ON CONFLICT (partner_id) DO NOTHING;

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT '✅ ✅ ✅ ALL GAMIFICATION TABLES CREATED! ✅ ✅ ✅' AS status;
SELECT '' AS blank;
SELECT 'Customer Tables:' AS section1;
SELECT '  1. user_points ✅' AS t1;
SELECT '  2. point_transactions ✅' AS t2;
SELECT '  3. user_stats ✅' AS t3;
SELECT '' AS blank2;
SELECT 'Partner Tables:' AS section2;
SELECT '  1. partner_points ✅' AS t4;
SELECT '  2. partner_point_transactions ✅' AS t5;
SELECT '' AS blank3;
SELECT '🎉 NOW REFRESH YOUR BROWSER! (Ctrl+Shift+R)' AS action;
SELECT '✅ Profile should show gamification!' AS result1;
SELECT '✅ Pickup should award points!' AS result2;
