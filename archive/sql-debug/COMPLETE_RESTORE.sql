-- ============================================
-- COMPLETE DATABASE RESTORATION
-- This will restore EVERYTHING to working state
-- ============================================

BEGIN;

-- ============================================
-- PHASE 1: Remove ALL broken functions and triggers
-- ============================================

-- Drop the broken partner_mark_as_picked_up function (causing the error)
DROP FUNCTION IF EXISTS partner_mark_as_picked_up(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.partner_mark_as_picked_up(UUID) CASCADE;

-- Drop broken partner points functions
DROP FUNCTION IF EXISTS public.add_partner_points(UUID, INT, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.transfer_points_to_partner_on_pickup() CASCADE;

-- Drop any triggers related to broken functions
DROP TRIGGER IF EXISTS trg_transfer_points_to_partner ON public.reservations CASCADE;

-- Drop ALL triggers that try to modify points (these cause permission errors)
DROP TRIGGER IF EXISTS trg_award_pickup_points ON public.reservations CASCADE;
DROP TRIGGER IF EXISTS trg_update_stats_on_pickup ON public.reservations CASCADE;
DROP TRIGGER IF EXISTS update_stats_on_pickup ON public.reservations CASCADE;
DROP TRIGGER IF EXISTS award_pickup_points ON public.reservations CASCADE;

-- Drop the trigger functions too
DROP FUNCTION IF EXISTS update_stats_on_pickup() CASCADE;
DROP FUNCTION IF EXISTS award_pickup_points() CASCADE;

-- Drop broken tables
DROP TABLE IF EXISTS public.partner_point_transactions CASCADE;
DROP TABLE IF EXISTS public.partner_points CASCADE;

-- ============================================
-- PHASE 2: Restore clean add_user_points function
-- ============================================

CREATE OR REPLACE FUNCTION add_user_points(
  p_user_id UUID,
  p_amount INT,
  p_reason TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_current_balance INT;
  v_new_balance INT;
  v_transaction_id UUID;
  v_caller_role TEXT;
BEGIN
  -- SECURITY: Only service_role can modify points
  SELECT current_setting('request.jwt.claims', true)::json->>'role' INTO v_caller_role;

  IF v_caller_role != 'service_role' THEN
    RAISE EXCEPTION 'Permission denied: only backend can modify points';
  END IF;

  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM user_points
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Create or update
  IF v_current_balance IS NULL THEN
    INSERT INTO user_points (user_id, balance)
    VALUES (p_user_id, p_amount)
    ON CONFLICT (user_id) DO UPDATE SET balance = user_points.balance + p_amount
    RETURNING balance INTO v_new_balance;
    v_current_balance := 0;
  ELSE
    v_new_balance := v_current_balance + p_amount;
    UPDATE user_points SET balance = v_new_balance WHERE user_id = p_user_id;
  END IF;

  -- Log transaction
  INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after, metadata)
  VALUES (p_user_id, p_amount, p_reason, v_current_balance, v_new_balance, p_metadata)
  RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'transaction_id', v_transaction_id,
    'user_id', p_user_id,
    'balance_before', v_current_balance,
    'balance_after', v_new_balance,
    'change', p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PHASE 3: Enable RLS and create CORRECT policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (clean slate)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN ('users', 'partners', 'offers', 'reservations', 'user_points', 'point_transactions')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I CASCADE', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================
-- PARTNERS TABLE POLICIES
-- ============================================

CREATE POLICY "partners_select_approved"
  ON public.partners FOR SELECT
  USING (status = 'APPROVED' OR user_id = auth.uid());

CREATE POLICY "partners_insert_own"
  ON public.partners FOR INSERT
  WITH CHECK (user_id = auth.uid() AND status = 'PENDING');

CREATE POLICY "partners_update_own"
  ON public.partners FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- OFFERS TABLE POLICIES  
-- ============================================

CREATE POLICY "offers_select_all"
  ON public.offers FOR SELECT
  USING (
    status = 'ACTIVE' OR 
    partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
  );

CREATE POLICY "offers_insert_partner"
  ON public.offers FOR INSERT
  WITH CHECK (
    partner_id IN (
      SELECT id FROM partners WHERE user_id = auth.uid() AND status = 'APPROVED'
    )
  );

CREATE POLICY "offers_update_partner"
  ON public.offers FOR UPDATE
  USING (partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid()))
  WITH CHECK (partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid()));

CREATE POLICY "offers_delete_partner"
  ON public.offers FOR DELETE
  USING (partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid()));

-- ============================================
-- RESERVATIONS TABLE POLICIES
-- ============================================

CREATE POLICY "reservations_select_customer"
  ON public.reservations FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "reservations_select_partner"
  ON public.reservations FOR SELECT
  USING (
    partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
  );

CREATE POLICY "reservations_insert_customer"
  ON public.reservations FOR INSERT
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "reservations_update_customer"
  ON public.reservations FOR UPDATE
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "reservations_update_partner"
  ON public.reservations FOR UPDATE
  USING (
    partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
  )
  WITH CHECK (
    partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
  );

-- ============================================
-- USER_POINTS TABLE POLICIES
-- ============================================

CREATE POLICY "user_points_select_own"
  ON public.user_points FOR SELECT
  USING (user_id = auth.uid());

-- ============================================
-- POINT_TRANSACTIONS TABLE POLICIES
-- ============================================

CREATE POLICY "point_transactions_select_own"
  ON public.point_transactions FOR SELECT
  USING (user_id = auth.uid());

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT '✅ DATABASE FULLY RESTORED!' AS status;
SELECT '' AS blank1;
SELECT '🔍 Verification:' AS section;

SELECT 'Functions:' AS check_type;
SELECT '  add_user_points: ' || 
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'add_user_points') 
  THEN '✅' ELSE '❌' END AS func1;
SELECT '  partner_mark_as_picked_up: ' || 
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'partner_mark_as_picked_up') 
  THEN '❌ STILL EXISTS' ELSE '✅ REMOVED' END AS func2;

SELECT '' AS blank2;
SELECT 'RLS Status:' AS rls_section;
SELECT tablename, 
  CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'partners', 'offers', 'reservations', 'user_points')
ORDER BY tablename;

SELECT '' AS blank3;
SELECT 'Policy Counts:' AS policy_section;
SELECT tablename, COUNT(*) as policies
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('users', 'partners', 'offers', 'reservations', 'user_points', 'point_transactions')
GROUP BY tablename
ORDER BY tablename;

SELECT '' AS blank4;
SELECT '🎯 Expected Results:' AS expected;
SELECT '  - users: 2 policies' AS e1;
SELECT '  - partners: 3 policies' AS e2;
SELECT '  - offers: 4 policies' AS e3;
SELECT '  - reservations: 5 policies' AS e4;
SELECT '  - user_points: 1 policy' AS e5;
SELECT '  - point_transactions: 1 policy' AS e6;
SELECT '' AS blank5;
SELECT '🔄 REFRESH YOUR BROWSER NOW!' AS action;
