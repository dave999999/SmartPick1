-- ============================================
-- COMPLETE GAMIFICATION SETUP - ALL IN ONE
-- Copy this ENTIRE file and run in Supabase SQL Editor
-- ============================================

BEGIN;

-- ============================================
-- PART 1: Create partner_points tables
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

-- RLS Policies
DROP POLICY IF EXISTS "partners_view_own_points" ON public.partner_points;
CREATE POLICY "partners_view_own_points"
  ON public.partner_points FOR SELECT
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "partners_view_own_transactions" ON public.partner_point_transactions;
CREATE POLICY "partners_view_own_transactions"
  ON public.partner_point_transactions FOR SELECT
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

-- Initialize points for existing partners
INSERT INTO public.partner_points (partner_id, balance, offer_slots)
SELECT id, 0, 3
FROM public.partners
ON CONFLICT (partner_id) DO NOTHING;

-- ============================================
-- PART 2: Create add_partner_points function
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
  SELECT id INTO v_partner_id FROM partners WHERE user_id = p_partner_user_id;

  IF v_partner_id IS NULL THEN
    RAISE EXCEPTION 'No partner found for user_id: %', p_partner_user_id;
  END IF;

  -- Get current balance (with lock)
  SELECT balance INTO v_current_balance
  FROM partner_points WHERE partner_id = v_partner_id FOR UPDATE;

  -- If no record exists, create it
  IF v_current_balance IS NULL THEN
    INSERT INTO partner_points (partner_id, balance)
    VALUES (v_partner_id, p_amount)
    ON CONFLICT (partner_id) DO UPDATE
    SET balance = partner_points.balance + p_amount
    RETURNING balance INTO v_new_balance;
    v_current_balance := 0;
  ELSE
    v_new_balance := v_current_balance + p_amount;
    UPDATE partner_points SET balance = v_new_balance, updated_at = NOW()
    WHERE partner_id = v_partner_id;
  END IF;

  -- Log transaction
  INSERT INTO partner_point_transactions (
    partner_id, change, reason, balance_before, balance_after, metadata
  ) VALUES (
    v_partner_id, p_amount, p_reason, v_current_balance, v_new_balance, p_metadata
  ) RETURNING id INTO v_transaction_id;

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
-- PART 3: Create purchase functions
-- ============================================

CREATE OR REPLACE FUNCTION public.purchase_user_points(
  p_user_id UUID,
  p_amount INT,
  p_payment_method TEXT DEFAULT 'card',
  p_transaction_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_cost DECIMAL;
BEGIN
  v_cost := p_amount * 0.10;
  v_result := add_user_points(
    p_user_id, p_amount, 'POINTS_PURCHASED',
    jsonb_build_object('payment_method', p_payment_method, 'transaction_id', p_transaction_id, 'cost_usd', v_cost)
  );
  RETURN jsonb_build_object(
    'success', true,
    'points_added', p_amount,
    'cost_usd', v_cost,
    'new_balance', (v_result->>'balance_after')::INT
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_user_points(UUID, INT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.purchase_partner_offer_slot(p_partner_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id UUID;
  v_current_balance INT;
  v_current_slots INT;
  v_cost INT := 100;
  v_new_balance INT;
  v_new_slots INT;
BEGIN
  SELECT id INTO v_partner_id FROM partners WHERE user_id = p_partner_user_id;
  IF v_partner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Partner not found');
  END IF;

  SELECT balance, offer_slots INTO v_current_balance, v_current_slots
  FROM partner_points WHERE partner_id = v_partner_id FOR UPDATE;

  IF v_current_balance IS NULL THEN
    INSERT INTO partner_points (partner_id, balance, offer_slots)
    VALUES (v_partner_id, 0, 3)
    RETURNING balance, offer_slots INTO v_current_balance, v_current_slots;
  END IF;

  IF v_current_balance < v_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient points', 'required', v_cost, 'current_balance', v_current_balance);
  END IF;

  v_new_balance := v_current_balance - v_cost;
  v_new_slots := v_current_slots + 1;

  UPDATE partner_points SET balance = v_new_balance, offer_slots = v_new_slots, updated_at = NOW()
  WHERE partner_id = v_partner_id;

  INSERT INTO partner_point_transactions (partner_id, change, reason, balance_before, balance_after, metadata)
  VALUES (v_partner_id, -v_cost, 'OFFER_SLOT_PURCHASED', v_current_balance, v_new_balance,
    jsonb_build_object('slots_before', v_current_slots, 'slots_after', v_new_slots));

  RETURN jsonb_build_object('success', true, 'message', 'Offer slot purchased successfully',
    'cost', v_cost, 'new_balance', v_new_balance, 'new_slots', v_new_slots);
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_partner_offer_slot(UUID) TO authenticated;

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT '✅ ✅ ✅ COMPLETE SETUP DONE! ✅ ✅ ✅' AS status;
SELECT '' AS blank;
SELECT 'Tables created:' AS section1;
SELECT '  1. partner_points ✅' AS t1;
SELECT '  2. partner_point_transactions ✅' AS t2;
SELECT '' AS blank2;
SELECT 'Functions created:' AS section2;
SELECT '  1. add_partner_points ✅' AS f1;
SELECT '  2. purchase_user_points ✅' AS f2;
SELECT '  3. purchase_partner_offer_slot ✅' AS f3;
SELECT '' AS blank3;
SELECT '🎉 NOW REFRESH YOUR BROWSER! (Ctrl+Shift+R)' AS action;
