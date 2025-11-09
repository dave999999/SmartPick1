-- ============================================
-- EMERGENCY DATABASE REPAIR
-- Run this to fix the broken database and restore dashboard
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: Remove ALL broken functions
-- ============================================

DROP FUNCTION IF EXISTS partner_mark_as_picked_up(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.add_partner_points(UUID, INT, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.transfer_points_to_partner_on_pickup() CASCADE;

-- Remove any triggers
DROP TRIGGER IF EXISTS trg_transfer_points_to_partner ON public.reservations CASCADE;

-- ============================================
-- STEP 2: Restore SIMPLE, WORKING add_user_points
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

  -- Create or update balance
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
-- STEP 3: Verify and fix RLS policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies first (clean slate)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN ('users', 'partners', 'offers', 'reservations')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Recreate SIMPLE, WORKING policies

-- USERS
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (id = auth.uid());
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (id = auth.uid());

-- PARTNERS (anyone can see approved, partners can see own)
CREATE POLICY "partners_select_approved" ON public.partners FOR SELECT USING (status = 'APPROVED');
CREATE POLICY "partners_select_own" ON public.partners FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "partners_update_own" ON public.partners FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "partners_insert_own" ON public.partners FOR INSERT WITH CHECK (user_id = auth.uid());

-- OFFERS (anyone can see active, partners can manage own)
CREATE POLICY "offers_select_active" ON public.offers FOR SELECT USING (status = 'ACTIVE' OR partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid()));
CREATE POLICY "offers_insert_partner" ON public.offers FOR INSERT WITH CHECK (partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid()));
CREATE POLICY "offers_update_partner" ON public.offers FOR UPDATE USING (partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid()));
CREATE POLICY "offers_delete_partner" ON public.offers FOR DELETE USING (partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid()));

-- RESERVATIONS (customers see own, partners see own)
CREATE POLICY "reservations_select_customer" ON public.reservations FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "reservations_select_partner" ON public.reservations FOR SELECT USING (partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid()));
CREATE POLICY "reservations_insert_customer" ON public.reservations FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "reservations_update_customer" ON public.reservations FOR UPDATE USING (customer_id = auth.uid());
CREATE POLICY "reservations_update_partner" ON public.reservations FOR UPDATE USING (partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid()));

COMMIT;

-- ============================================
-- VERIFY REPAIR
-- ============================================

SELECT '✅ DATABASE REPAIRED!' AS status;
SELECT '' AS blank;
SELECT 'Verification:' AS section;
SELECT 'add_user_points function: ' || 
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'add_user_points') 
  THEN '✅ EXISTS' ELSE '❌ MISSING' END AS func_check;
SELECT 'partner_mark_as_picked_up: ' || 
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'partner_mark_as_picked_up') 
  THEN '❌ STILL EXISTS (should be removed)' ELSE '✅ REMOVED' END AS broken_func;
SELECT 'RLS policies: ' || COUNT(*)::TEXT || ' policies' AS policy_count 
FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('users', 'partners', 'offers', 'reservations');
SELECT '' AS blank2;
SELECT '🔄 HARD REFRESH YOUR BROWSER NOW (Ctrl+Shift+R)!' AS action;
