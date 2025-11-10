-- ================================================
-- PARTNER PURCHASE POINTS FUNCTION
-- ================================================
-- This function allows partners to purchase points through the dashboard
-- Handles atomic balance updates and transaction logging

BEGIN;

-- Create function to purchase partner points
CREATE OR REPLACE FUNCTION public.purchase_partner_points(
  p_partner_id UUID,
  p_amount INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INTEGER;
  v_transaction_id UUID;
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid amount'
    );
  END IF;

  -- Insert or update partner_points (upsert)
  INSERT INTO public.partner_points (partner_id, balance, updated_at)
  VALUES (p_partner_id, p_amount, NOW())
  ON CONFLICT (partner_id) 
  DO UPDATE SET 
    balance = partner_points.balance + p_amount,
    updated_at = NOW()
  RETURNING balance INTO v_new_balance;

  -- Log transaction
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
    'purchase',
    v_new_balance - p_amount,
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.purchase_partner_points(UUID, INTEGER) TO authenticated;

COMMIT;

SELECT '✅ Partner purchase points function created!' AS status;
SELECT '🎉 Partners can now buy points through the dashboard' AS info;
