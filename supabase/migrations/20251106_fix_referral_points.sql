-- ============================================
-- Fix Referral System with Point Rewards
-- Created: 2025-11-06
-- ============================================

-- ============================================
-- 1. CREATE IMPROVED REFERRAL APPLICATION FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION apply_referral_code_with_rewards(
  p_new_user_id UUID,
  p_referral_code TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_referrer_id UUID;
  v_result JSONB;
BEGIN
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

  -- Update referrer's total_referrals count
  UPDATE user_stats
  SET
    total_referrals = total_referrals + 1,
    updated_at = now()
  WHERE user_id = v_referrer_id;

  -- Award 50 points to REFERRER
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. CREATE TRIGGER TO AUTO-GENERATE REFERRAL CODE
-- ============================================

CREATE OR REPLACE FUNCTION auto_generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if user doesn't have a referral code yet
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := (SELECT generate_referral_code());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_generate_referral_code_trigger ON users;
CREATE TRIGGER auto_generate_referral_code_trigger
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_referral_code();

-- ============================================
-- 3. BACKFILL REFERRAL CODES FOR EXISTING USERS
-- ============================================

-- Generate referral codes for existing users who don't have one
DO $$
DECLARE
  v_user RECORD;
  v_code TEXT;
BEGIN
  FOR v_user IN SELECT id FROM users WHERE referral_code IS NULL
  LOOP
    v_code := (SELECT generate_referral_code());
    UPDATE users SET referral_code = v_code WHERE id = v_user.id;
  END LOOP;
END $$;

-- ============================================
-- 4. GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION apply_referral_code_with_rewards TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION auto_generate_referral_code TO service_role;

-- ============================================
-- 5. ADD COMMENTS
-- ============================================

COMMENT ON FUNCTION apply_referral_code_with_rewards IS 'Applies referral code and awards 50 points to referrer, checks achievements';
COMMENT ON FUNCTION auto_generate_referral_code IS 'Automatically generates unique referral code for new users';
COMMENT ON TRIGGER auto_generate_referral_code_trigger ON users IS 'Auto-generates referral code on user creation';
