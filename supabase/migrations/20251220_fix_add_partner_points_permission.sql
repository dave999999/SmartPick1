-- Fix: Remove permission check from add_partner_points and disable RLS properly
-- This script forcefully replaces the old version that has service_role check

-- Step 1: DROP all RLS policies on partner_points and partner_point_transactions
DROP POLICY IF EXISTS partner_points_manage ON public.partner_points;
DROP POLICY IF EXISTS service_role_full_access_points ON public.partner_points;
DROP POLICY IF EXISTS service_role_partner_points ON public.partner_points;
DROP POLICY IF EXISTS partners_view_own_transactions ON public.partner_point_transactions;
DROP POLICY IF EXISTS service_role_full_access_transactions ON public.partner_point_transactions;

-- Step 2: Disable RLS completely
ALTER TABLE public.partner_points DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_point_transactions DISABLE ROW LEVEL SECURITY;

-- Step 3: DROP the old add_partner_points function completely
DROP FUNCTION IF EXISTS public.add_partner_points(UUID, INT, TEXT, JSONB);

-- Step 4: Recreate add_partner_points WITHOUT permission check
CREATE OR REPLACE FUNCTION public.add_partner_points(
  p_partner_user_id UUID,  -- This is the user_id (same as partners.user_id)
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
BEGIN
  -- NO PERMISSION CHECK - Caller must verify ownership
  -- SECURITY DEFINER bypasses RLS (which is disabled anyway)
  
  -- Validation checks only
  IF p_amount = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Amount cannot be zero');
  END IF;
  
  IF p_amount > 10000 OR p_amount < -10000 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Amount too large');
  END IF;

  -- Get partner_id from user_id (for FK constraint)
  SELECT id INTO v_partner_id FROM partners WHERE user_id = p_partner_user_id;
  
  IF v_partner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Partner not found');
  END IF;

  -- Get current balance with row lock
  -- partner_points.user_id stores partners.user_id
  SELECT balance INTO v_current_balance
  FROM partner_points
  WHERE user_id = p_partner_user_id
  FOR UPDATE;

  -- Handle first time or update existing
  IF v_current_balance IS NULL THEN
    -- First transaction for this partner
    v_current_balance := 0;
    v_new_balance := GREATEST(0, p_amount);
    
    INSERT INTO partner_points (user_id, balance, updated_at)
    VALUES (p_partner_user_id, v_new_balance, NOW());
  ELSE
    -- Update existing balance
    v_new_balance := v_current_balance + p_amount;
    
    IF v_new_balance < 0 THEN
      RETURN jsonb_build_object(
        'success', false, 
        'message', 'Insufficient points', 
        'balance', v_current_balance, 
        'required', ABS(p_amount)
      );
    END IF;
    
    UPDATE partner_points
    SET balance = v_new_balance, updated_at = NOW()
    WHERE user_id = p_partner_user_id;
  END IF;

  -- Log the transaction
  -- partner_point_transactions.partner_id references partners(id)
  INSERT INTO partner_point_transactions (
    partner_id, change, reason, balance_before, balance_after, metadata
  )
  VALUES (
    v_partner_id, p_amount, p_reason, v_current_balance, v_new_balance, p_metadata
  )
  RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'balance', v_new_balance,
    'transaction_id', v_transaction_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_partner_points(UUID, INT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_partner_points(UUID, INT, TEXT, JSONB) TO service_role;

COMMENT ON FUNCTION public.add_partner_points IS 
'Add/deduct partner points. NO PERMISSION CHECK - caller (trigger/RPC) must verify ownership. SECURITY DEFINER with RLS disabled.';
