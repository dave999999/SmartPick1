-- ========================================
-- Fix admin_adjust_user_points role check (case-insensitive)
-- Date: 2026-02-06
-- ========================================

BEGIN;

CREATE OR REPLACE FUNCTION admin_adjust_user_points(
  p_user_id UUID,
  p_amount INT,
  p_reason TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_admin_role TEXT;
  v_current_balance INT;
  v_new_balance INT;
  v_transaction_id UUID;
BEGIN
  -- Verify admin role (case-insensitive)
  SELECT role INTO v_admin_role FROM public.users WHERE id = auth.uid();
  IF v_admin_role IS NULL OR upper(v_admin_role) NOT IN ('ADMIN','SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Lock points row
  SELECT balance INTO v_current_balance
  FROM public.user_points
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    -- Ensure row exists
    INSERT INTO public.user_points (user_id, balance)
    VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;
    v_current_balance := 0;
  END IF;

  v_new_balance := v_current_balance + p_amount;
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;

  UPDATE public.user_points
  SET balance = v_new_balance, updated_at = NOW()
  WHERE user_id = p_user_id;

  INSERT INTO public.point_transactions (
    user_id, change, reason, balance_before, balance_after, metadata
  )
  VALUES (
    p_user_id, p_amount, p_reason, v_current_balance, v_new_balance, p_metadata
  )
  RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION admin_adjust_user_points(UUID, INT, TEXT, JSONB) SET search_path = public;
GRANT EXECUTE ON FUNCTION admin_adjust_user_points(UUID, INT, TEXT, JSONB) TO authenticated;

COMMIT;
