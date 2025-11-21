-- ============================================================================
-- FIX: partner point functions using wrong column names
-- ============================================================================
-- Problem: Functions use partner_id but partner_points table uses user_id
-- Solution: Fix all functions to use correct column name
-- ============================================================================

-- Fix 1: purchase_partner_points function
DROP FUNCTION IF EXISTS public.purchase_partner_points(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.purchase_partner_points(p_partner_id uuid, p_amount integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INTEGER;
  v_transaction_id UUID;
  v_old_balance INTEGER;
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid amount'
    );
  END IF;

  -- Get current balance
  SELECT balance INTO v_old_balance
  FROM public.partner_points
  WHERE user_id = p_partner_id;

  -- If no balance record, set old balance to 0
  IF v_old_balance IS NULL THEN
    v_old_balance := 0;
  END IF;

  -- Insert or update partner_points (upsert)
  -- FIXED: uses user_id column (stores partners.id)
  INSERT INTO public.partner_points (user_id, balance, updated_at)
  VALUES (p_partner_id, p_amount, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    balance = partner_points.balance + p_amount,
    updated_at = NOW()
  RETURNING balance INTO v_new_balance;

  -- Log transaction
  -- partner_point_transactions uses partner_id column (also stores partners.id)
  INSERT INTO public.partner_point_transactions (
    partner_id,
    change,
    reason,
    balance_before,
    balance_after,
    metadata
  )
  VALUES (
    p_partner_id,
    p_amount,
    'PURCHASE',
    v_old_balance,
    v_new_balance,
    jsonb_build_object(
      'type', 'purchase',
      'package', p_amount || ' points',
      'purchased_at', NOW()
    )
  )
  RETURNING id INTO v_transaction_id;

  RETURN json_build_object(
    'success', true,
    'balance', v_new_balance,
    'transaction_id', v_transaction_id,
    'message', 'Points purchased successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION public.purchase_partner_points IS 
'Purchase partner points. Uses partner_points.user_id (stores partners.id) and partner_point_transactions.partner_id';

-- Fix 2: add_partner_points function
DROP FUNCTION IF EXISTS public.add_partner_points(UUID, INTEGER, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.add_partner_points(
  p_partner_user_id uuid, 
  p_amount integer, 
  p_reason text, 
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  -- FIXED: uses user_id column (stores partners.id)
  SELECT balance INTO v_current_balance
  FROM partner_points WHERE user_id = v_partner_id FOR UPDATE;

  -- If no record exists, create it
  IF v_current_balance IS NULL THEN
    INSERT INTO partner_points (user_id, balance)
    VALUES (v_partner_id, p_amount)
    ON CONFLICT (user_id) DO UPDATE
    SET balance = partner_points.balance + p_amount
    RETURNING balance INTO v_new_balance;
    v_current_balance := 0;
  ELSE
    v_new_balance := v_current_balance + p_amount;
    UPDATE partner_points 
    SET balance = v_new_balance, updated_at = NOW()
    WHERE user_id = v_partner_id;
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

COMMENT ON FUNCTION public.add_partner_points IS 
'Add points to partner balance (service_role only). Uses partner_points.user_id and partner_point_transactions.partner_id';

-- Verify the fix
DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Fixed partner point functions';
  RAISE NOTICE '';
  RAISE NOTICE 'Updated functions:';
  RAISE NOTICE '  ✅ purchase_partner_points() - now uses user_id';
  RAISE NOTICE '  ✅ add_partner_points() - now uses user_id';
  RAISE NOTICE '';
  RAISE NOTICE 'Column mapping:';
  RAISE NOTICE '  partner_points.user_id = partners.id';
  RAISE NOTICE '  partner_point_transactions.partner_id = partners.id';
  RAISE NOTICE '';
  RAISE NOTICE 'Try purchasing a slot now!';
  RAISE NOTICE '============================================================';
END $$;
