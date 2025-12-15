-- FIXED CLAIM FUNCTION - Works for both partners and customers

CREATE OR REPLACE FUNCTION public.claim_achievement(p_achievement_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_row user_achievements%ROWTYPE;
  v_points INTEGER;
  v_balance_before INT;
  v_balance_after INT;
  v_partner_id UUID;
  v_is_partner BOOLEAN := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user is a partner
  SELECT p.id INTO v_partner_id
  FROM partners p
  WHERE p.user_id = v_user_id AND p.status = 'APPROVED';
  
  IF v_partner_id IS NOT NULL THEN
    v_is_partner := true;
  END IF;

  -- CRITICAL: Auto-unlock achievements FIRST before checking
  BEGIN
    PERFORM check_user_achievements(v_user_id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Auto-unlock failed: %', SQLERRM;
  END;

  -- Small delay to ensure insert completes
  PERFORM pg_sleep(0.1);

  -- Get achievement (should exist now after auto-unlock)
  SELECT * INTO v_row 
  FROM user_achievements
  WHERE user_id = v_user_id 
    AND achievement_id = p_achievement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Achievement not unlocked for this user' USING ERRCODE = 'P0001';
  END IF;

  IF v_row.reward_claimed THEN
    RAISE EXCEPTION 'Already claimed' USING ERRCODE = 'P0002';
  END IF;

  -- Get points
  SELECT reward_points INTO v_points
  FROM achievement_definitions
  WHERE id = p_achievement_id;

  -- Get current balance and update correct table
  IF v_is_partner THEN
    -- Partner points
    SELECT balance INTO v_balance_before
    FROM partner_points
    WHERE user_id = v_partner_id;

    v_balance_after := v_balance_before + v_points;

    -- Update partner balance
    UPDATE partner_points
    SET balance = v_balance_after, 
        updated_at = NOW()
    WHERE user_id = v_partner_id;
  ELSE
    -- Customer points
    SELECT balance INTO v_balance_before
    FROM user_points
    WHERE user_id = v_user_id;

    v_balance_after := v_balance_before + v_points;

    -- Update customer balance
    UPDATE user_points
    SET balance = v_balance_after, 
        updated_at = NOW()
    WHERE user_id = v_user_id;
  END IF;

  -- Mark as claimed
  UPDATE user_achievements
  SET reward_claimed = true, 
      reward_claimed_at = NOW()
  WHERE user_id = v_user_id 
    AND achievement_id = p_achievement_id;

  -- Add points transaction to correct table
  IF v_is_partner THEN
    INSERT INTO partner_point_transactions (partner_id, change, reason, balance_before, balance_after)
    VALUES (v_partner_id, v_points, 'achievement_reward', v_balance_before, v_balance_after);
  ELSE
    INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after)
    VALUES (v_user_id, v_points, 'achievement_reward', v_balance_before, v_balance_after);
  END IF;

  RETURN jsonb_build_object('success', true, 'points_awarded', v_points);
END;
$$;

-- Now manually fix your 2 claimed achievements that didn't add points
-- Check your partner_id first
SELECT p.id as partner_id 
FROM partners p 
WHERE p.user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab';

-- After you get partner_id, update the balance
-- Replace 'YOUR_PARTNER_ID' with the actual ID from above query
UPDATE partner_points
SET balance = balance + 20,
    updated_at = NOW()
WHERE user_id = (SELECT id FROM partners WHERE user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab');

-- Verify new balance
SELECT balance FROM partner_points WHERE user_id = (SELECT id FROM partners WHERE user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab');
