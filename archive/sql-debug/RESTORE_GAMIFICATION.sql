-- ============================================
-- RESTORE FULL GAMIFICATION SYSTEM
-- Run this in Supabase SQL Editor
-- ============================================
-- This creates partner_points tables and functions
-- The Edge Function will call these with service_role permissions

BEGIN;

-- ============================================
-- STEP 1: Create partner_points tables
-- ============================================

-- Create partner_points table (wallet)
CREATE TABLE IF NOT EXISTS public.partner_points (
  partner_id UUID PRIMARY KEY REFERENCES public.partners(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  offer_slots INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create partner_point_transactions table (history)
CREATE TABLE IF NOT EXISTS public.partner_point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  change INTEGER NOT NULL,
  reason TEXT NOT NULL,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_partner_points_partner_id ON public.partner_points(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_point_transactions_partner_id ON public.partner_point_transactions(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_point_transactions_created_at ON public.partner_point_transactions(created_at DESC);

-- ============================================
-- STEP 2: Enable RLS on partner_points tables
-- ============================================

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

-- ============================================
-- STEP 3: Initialize points for existing partners
-- ============================================

INSERT INTO public.partner_points (partner_id, balance, offer_slots)
SELECT id, 0, 3
FROM public.partners
WHERE NOT EXISTS (
  SELECT 1 FROM public.partner_points WHERE partner_id = partners.id
)
ON CONFLICT (partner_id) DO NOTHING;

-- ============================================
-- STEP 4: Create add_partner_points function
-- ============================================

CREATE OR REPLACE FUNCTION public.add_partner_points(
  p_partner_user_id UUID,
  p_amount INT,
  p_reason TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance INT;
  v_new_balance INT;
  v_transaction_id UUID;
  v_partner_id UUID;
  v_caller_role TEXT;
BEGIN
  -- SECURITY: Only service_role can call this
  SELECT current_setting('request.jwt.claims', true)::json->>'role' INTO v_caller_role;
  
  IF v_caller_role != 'service_role' THEN
    RAISE EXCEPTION 'Permission denied: only backend can modify partner points';
  END IF;

  -- Get partner_id from user_id
  SELECT id INTO v_partner_id
  FROM partners
  WHERE user_id = p_partner_user_id;

  IF v_partner_id IS NULL THEN
    RAISE EXCEPTION 'No partner found for user_id: %', p_partner_user_id;
  END IF;

  -- Get current balance (with lock)
  SELECT balance INTO v_current_balance
  FROM partner_points
  WHERE partner_id = v_partner_id
  FOR UPDATE;

  -- If no record exists, create it
  IF v_current_balance IS NULL THEN
    INSERT INTO partner_points (partner_id, balance)
    VALUES (v_partner_id, p_amount)
    ON CONFLICT (partner_id) DO UPDATE
    SET balance = partner_points.balance + p_amount
    RETURNING balance INTO v_new_balance;
    
    v_current_balance := 0;
  ELSE
    -- Update existing balance
    v_new_balance := v_current_balance + p_amount;
    
    UPDATE partner_points
    SET balance = v_new_balance,
        updated_at = NOW()
    WHERE partner_id = v_partner_id;
  END IF;

  -- Log the transaction
  INSERT INTO partner_point_transactions (
    partner_id,
    change,
    reason,
    balance_before,
    balance_after,
    metadata
  )
  VALUES (
    v_partner_id,
    p_amount,
    p_reason,
    v_current_balance,
    v_new_balance,
    p_metadata
  )
  RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'transaction_id', v_transaction_id,
    'partner_id', v_partner_id,
    'balance_before', v_current_balance,
    'balance_after', v_new_balance,
    'change', p_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_partner_points(UUID, INT, TEXT, JSONB) TO service_role;

-- ============================================
-- STEP 5: Keep add_user_points with service_role check
-- ============================================
-- No changes needed - already exists and works correctly

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT '✅ GAMIFICATION SYSTEM RESTORED!' AS status;
SELECT '' AS blank1;

SELECT 'Tables:' AS check;
SELECT '  partner_points: ' || 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'partner_points') 
  THEN '✅ EXISTS' ELSE '❌ MISSING' END AS table1;
SELECT '  partner_point_transactions: ' || 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'partner_point_transactions') 
  THEN '✅ EXISTS' ELSE '❌ MISSING' END AS table2;

SELECT '' AS blank2;
SELECT 'Functions:' AS check2;
SELECT '  add_user_points: ' || 
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'add_user_points') 
  THEN '✅ EXISTS' ELSE '❌ MISSING' END AS func1;
SELECT '  add_partner_points: ' || 
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'add_partner_points') 
  THEN '✅ EXISTS' ELSE '❌ MISSING' END AS func2;

SELECT '' AS blank3;
SELECT 'Partner Records:' AS check3;
SELECT '  Partners with points: ' || COUNT(*) AS partner_count
FROM partner_points;

SELECT '' AS blank4;
SELECT '🎯 Next Steps:' AS next;
SELECT '  1. Deploy Edge Function: supabase functions deploy mark-pickup' AS step1;
SELECT '  2. Update frontend to call Edge Function' AS step2;
SELECT '  3. Test pickup flow' AS step3;
