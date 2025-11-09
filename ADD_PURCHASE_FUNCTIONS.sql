-- ============================================
-- ADD PURCHASE POINTS FUNCTIONS
-- Run this AFTER RESTORE_GAMIFICATION.sql
-- ============================================
-- This adds ability for users to purchase points

BEGIN;

-- ============================================
-- STEP 1: Create purchase_user_points function
-- ============================================
-- Allows users to purchase points (simulated - real app would integrate with payment)

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
  -- Calculate cost (example: 1 point = $0.10)
  v_cost := p_amount * 0.10;

  -- In production, you would:
  -- 1. Validate payment with payment processor
  -- 2. Charge the user
  -- 3. Only add points if payment succeeds

  -- For now, add points directly (demo mode)
  -- Call add_user_points as service_role
  v_result := add_user_points(
    p_user_id,
    p_amount,
    'POINTS_PURCHASED',
    jsonb_build_object(
      'payment_method', p_payment_method,
      'transaction_id', p_transaction_id,
      'cost_usd', v_cost
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'points_added', p_amount,
    'cost_usd', v_cost,
    'new_balance', (v_result->>'balance_after')::INT
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_user_points(UUID, INT, TEXT, TEXT) TO authenticated;

-- ============================================
-- STEP 2: Create purchase_partner_offer_slot function
-- ============================================
-- Partners can spend points to buy additional offer slots

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
  v_cost INT := 100; -- Cost: 100 points per slot
  v_new_balance INT;
  v_new_slots INT;
BEGIN
  -- Get partner_id from user_id
  SELECT id INTO v_partner_id
  FROM partners
  WHERE user_id = p_partner_user_id;

  IF v_partner_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Partner not found'
    );
  END IF;

  -- Get current balance and slots
  SELECT balance, offer_slots INTO v_current_balance, v_current_slots
  FROM partner_points
  WHERE partner_id = v_partner_id
  FOR UPDATE;

  -- Initialize if doesn't exist
  IF v_current_balance IS NULL THEN
    INSERT INTO partner_points (partner_id, balance, offer_slots)
    VALUES (v_partner_id, 0, 3)
    RETURNING balance, offer_slots INTO v_current_balance, v_current_slots;
  END IF;

  -- Check if enough points
  IF v_current_balance < v_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient points',
      'required', v_cost,
      'current_balance', v_current_balance
    );
  END IF;

  -- Deduct points and add slot
  v_new_balance := v_current_balance - v_cost;
  v_new_slots := v_current_slots + 1;

  UPDATE partner_points
  SET balance = v_new_balance,
      offer_slots = v_new_slots,
      updated_at = NOW()
  WHERE partner_id = v_partner_id;

  -- Log transaction
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
    -v_cost,
    'OFFER_SLOT_PURCHASED',
    v_current_balance,
    v_new_balance,
    jsonb_build_object('slots_before', v_current_slots, 'slots_after', v_new_slots)
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Offer slot purchased successfully',
    'cost', v_cost,
    'new_balance', v_new_balance,
    'new_slots', v_new_slots
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_partner_offer_slot(UUID) TO authenticated;

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT '✅ PURCHASE FUNCTIONS ADDED!' AS status;
SELECT '' AS blank1;

SELECT 'Functions:' AS check;
SELECT '  purchase_user_points: ' || 
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'purchase_user_points') 
  THEN '✅ EXISTS' ELSE '❌ MISSING' END AS func1;
SELECT '  purchase_partner_offer_slot: ' || 
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'purchase_partner_offer_slot') 
  THEN '✅ EXISTS' ELSE '❌ MISSING' END AS func2;

SELECT '' AS blank2;
SELECT '💡 Usage:' AS usage;
SELECT '  User purchases 50 points:' AS example1;
SELECT '    SELECT purchase_user_points(auth.uid(), 50, ''card'', ''txn_123'')' AS sql1;
SELECT '' AS blank3;
SELECT '  Partner buys offer slot (costs 100 points):' AS example2;
SELECT '    SELECT purchase_partner_offer_slot(auth.uid())' AS sql2;
