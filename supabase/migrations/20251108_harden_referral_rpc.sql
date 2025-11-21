-- Migration: Make referral code application more resilient during signup
-- Date: 2025-11-08
-- Purpose: Add retry logic to handle race between trigger profile creation and referral RPC

BEGIN;

CREATE OR REPLACE FUNCTION apply_referral_code_with_rewards(
  p_new_user_id UUID,
  p_referral_code TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_referrer_id UUID;
  v_row_exists BOOLEAN;
  v_retry_count INT := 0;
BEGIN
  -- Wait for user row to exist (trigger may still be running)
  LOOP
    SELECT EXISTS(SELECT 1 FROM users WHERE id = p_new_user_id) INTO v_row_exists;
    EXIT WHEN v_row_exists OR v_retry_count >= 5;
    v_retry_count := v_retry_count + 1;
    PERFORM pg_sleep(0.2); -- 200ms
  END LOOP;

  -- If row still doesn't exist after retries, fail gracefully
  IF NOT v_row_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User profile not ready yet (trigger delay)'
    );
  END IF;

  -- Find the referrer by referral code
  SELECT id INTO v_referrer_id
  FROM users
  WHERE referral_code = p_referral_code;

  -- If referral code not found, return error
  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid referral code'
    );
  END IF;

  -- Prevent self-referral
  IF v_referrer_id = p_new_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot refer yourself'
    );
  END IF;

  -- Check if new user already has a referrer
  IF EXISTS (SELECT 1 FROM users WHERE id = p_new_user_id AND referred_by IS NOT NULL) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User already has a referrer'
    );
  END IF;

  -- Update new user's referred_by field
  UPDATE users
  SET referred_by = v_referrer_id
  WHERE id = p_new_user_id;

  -- Update referrer's total_referrals count (only if user_stats row exists)
  UPDATE user_stats
  SET
    total_referrals = total_referrals + 1,
    updated_at = now()
  WHERE user_id = v_referrer_id;

  -- Award 50 points to REFERRER (add_user_points handles missing rows gracefully)
  PERFORM add_user_points(
    v_referrer_id,
    50,
    'referral',
    jsonb_build_object(
      'referred_user_id', p_new_user_id,
      'referral_code', p_referral_code,
      'role', 'referrer'
    )
  );

  -- Check if referrer unlocked any referral achievements
  PERFORM check_user_achievements(v_referrer_id);

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'referrer_id', v_referrer_id,
    'points_awarded', 50
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return failure (don't crash signup)
    RAISE NOTICE 'apply_referral_code_with_rewards error: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Referral processing failed: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
