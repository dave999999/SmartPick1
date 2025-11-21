-- Migration: Comprehensive Referral Abuse Prevention System
-- Date: 2025-11-20
-- Purpose: Add IP tracking, device fingerprinting, rate limiting, and fraud detection

BEGIN;

-- 1. Create referral_tracking table for abuse detection
CREATE TABLE IF NOT EXISTS referral_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  device_fingerprint TEXT,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  suspicious_score INT NOT NULL DEFAULT 0,
  flagged BOOLEAN NOT NULL DEFAULT false,
  flag_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fraud detection queries
CREATE INDEX IF NOT EXISTS idx_referral_tracking_referrer ON referral_tracking(referrer_id, claimed_at);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_ip ON referral_tracking(ip_address, claimed_at);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_fingerprint ON referral_tracking(device_fingerprint, claimed_at);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_flagged ON referral_tracking(flagged) WHERE flagged = true;

-- 2. Create referral_limits table for dynamic caps
CREATE TABLE IF NOT EXISTS referral_limits (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  max_referrals_per_day INT NOT NULL DEFAULT 5,
  max_referrals_per_week INT NOT NULL DEFAULT 20,
  max_referrals_total INT NOT NULL DEFAULT 100,
  is_restricted BOOLEAN NOT NULL DEFAULT false,
  restriction_reason TEXT,
  restriction_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_limits_restricted ON referral_limits(is_restricted) WHERE is_restricted = true;

-- 2.5. Drop old version of function (if exists) to avoid conflicts
DROP FUNCTION IF EXISTS apply_referral_code_with_rewards(UUID, TEXT);

-- 3. Function to calculate suspicious score
CREATE OR REPLACE FUNCTION calculate_referral_suspicion_score(
  p_referrer_id UUID,
  p_ip_address INET,
  p_device_fingerprint TEXT
)
RETURNS INT AS $$
DECLARE
  v_score INT := 0;
  v_count INT;
BEGIN
  -- Check 1: Same IP used by referrer recently (within 24 hours)
  SELECT COUNT(*) INTO v_count
  FROM referral_tracking
  WHERE referrer_id = p_referrer_id 
    AND ip_address = p_ip_address 
    AND claimed_at > now() - INTERVAL '24 hours';
  IF v_count > 0 THEN
    v_score := v_score + 30;
  END IF;

  -- Check 2: Same device fingerprint used multiple times (within 7 days)
  IF p_device_fingerprint IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count
    FROM referral_tracking
    WHERE device_fingerprint = p_device_fingerprint 
      AND claimed_at > now() - INTERVAL '7 days';
    IF v_count >= 2 THEN
      v_score := v_score + 40;
    END IF;
  END IF;

  -- Check 3: Referrer has too many referrals in short time (5+ in 1 hour)
  SELECT COUNT(*) INTO v_count
  FROM referral_tracking
  WHERE referrer_id = p_referrer_id 
    AND claimed_at > now() - INTERVAL '1 hour';
  IF v_count >= 5 THEN
    v_score := v_score + 50;
  END IF;

  -- Check 4: Referrer has excessive daily referrals (10+ in 24 hours)
  SELECT COUNT(*) INTO v_count
  FROM referral_tracking
  WHERE referrer_id = p_referrer_id 
    AND claimed_at > now() - INTERVAL '24 hours';
  IF v_count >= 10 THEN
    v_score := v_score + 60;
  END IF;

  -- Check 5: Same IP creating multiple accounts (3+ in 24 hours)
  SELECT COUNT(DISTINCT referred_user_id) INTO v_count
  FROM referral_tracking
  WHERE ip_address = p_ip_address 
    AND claimed_at > now() - INTERVAL '24 hours';
  IF v_count >= 3 THEN
    v_score := v_score + 70;
  END IF;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to check referral limits
CREATE OR REPLACE FUNCTION check_referral_limits(
  p_referrer_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_limits RECORD;
  v_count_today INT;
  v_count_week INT;
  v_count_total INT;
BEGIN
  -- Get or create user limits
  INSERT INTO referral_limits (user_id)
  VALUES (p_referrer_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_limits
  FROM referral_limits
  WHERE user_id = p_referrer_id;

  -- Check if user is restricted
  IF v_limits.is_restricted THEN
    IF v_limits.restriction_until IS NOT NULL AND v_limits.restriction_until > now() THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'Account temporarily restricted: ' || COALESCE(v_limits.restriction_reason, 'Suspicious activity detected')
      );
    ELSIF v_limits.restriction_until IS NOT NULL AND v_limits.restriction_until <= now() THEN
      -- Restriction expired, lift it
      UPDATE referral_limits
      SET is_restricted = false, restriction_reason = NULL, restriction_until = NULL
      WHERE user_id = p_referrer_id;
    ELSE
      -- Permanent restriction
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'Account permanently restricted: ' || COALESCE(v_limits.restriction_reason, 'Terms violation')
      );
    END IF;
  END IF;

  -- Count referrals in different time windows
  SELECT COUNT(*) INTO v_count_today
  FROM referral_tracking
  WHERE referrer_id = p_referrer_id 
    AND claimed_at > now() - INTERVAL '24 hours';

  SELECT COUNT(*) INTO v_count_week
  FROM referral_tracking
  WHERE referrer_id = p_referrer_id 
    AND claimed_at > now() - INTERVAL '7 days';

  SELECT COUNT(*) INTO v_count_total
  FROM referral_tracking
  WHERE referrer_id = p_referrer_id;

  -- Check daily limit
  IF v_count_today >= v_limits.max_referrals_per_day THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Daily referral limit reached (' || v_limits.max_referrals_per_day || '). Try again tomorrow.'
    );
  END IF;

  -- Check weekly limit
  IF v_count_week >= v_limits.max_referrals_per_week THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Weekly referral limit reached (' || v_limits.max_referrals_per_week || '). Try again next week.'
    );
  END IF;

  -- Check total lifetime limit
  IF v_count_total >= v_limits.max_referrals_total THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Maximum referral limit reached (' || v_limits.max_referrals_total || ').'
    );
  END IF;

  -- All checks passed
  RETURN jsonb_build_object(
    'allowed', true,
    'remaining_today', v_limits.max_referrals_per_day - v_count_today,
    'remaining_week', v_limits.max_referrals_per_week - v_count_week,
    'remaining_total', v_limits.max_referrals_total - v_count_total
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Enhanced referral code application with fraud detection
CREATE OR REPLACE FUNCTION apply_referral_code_with_rewards(
  p_new_user_id UUID,
  p_referral_code TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_device_fingerprint TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_referrer_id UUID;
  v_row_exists BOOLEAN;
  v_retry_count INT := 0;
  v_suspicious_score INT := 0;
  v_limits_check JSONB;
  v_flag_reason TEXT := NULL;
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

  -- NEW: Check referral limits for referrer
  v_limits_check := check_referral_limits(v_referrer_id);
  IF NOT (v_limits_check->>'allowed')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', v_limits_check->>'reason'
    );
  END IF;

  -- NEW: Calculate suspicious score
  v_suspicious_score := calculate_referral_suspicion_score(
    v_referrer_id,
    p_ip_address,
    p_device_fingerprint
  );

  -- NEW: Auto-flag high-risk referrals
  IF v_suspicious_score >= 80 THEN
    v_flag_reason := 'High fraud score (' || v_suspicious_score || '): Multiple accounts from same IP/device';
    
    -- Don't award points for flagged referrals
    INSERT INTO referral_tracking (
      referrer_id,
      referred_user_id,
      referral_code,
      ip_address,
      user_agent,
      device_fingerprint,
      suspicious_score,
      flagged,
      flag_reason
    ) VALUES (
      v_referrer_id,
      p_new_user_id,
      p_referral_code,
      p_ip_address,
      p_user_agent,
      p_device_fingerprint,
      v_suspicious_score,
      true,
      v_flag_reason
    );

    -- Auto-restrict user if score is very high
    IF v_suspicious_score >= 100 THEN
      INSERT INTO referral_limits (user_id, is_restricted, restriction_reason, restriction_until)
      VALUES (v_referrer_id, true, 'Automated fraud detection', now() + INTERVAL '7 days')
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        is_restricted = true,
        restriction_reason = 'Automated fraud detection',
        restriction_until = now() + INTERVAL '7 days';
    END IF;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'Referral flagged for review. Please contact support if you believe this is an error.'
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

  -- NEW: Record successful referral tracking
  INSERT INTO referral_tracking (
    referrer_id,
    referred_user_id,
    referral_code,
    ip_address,
    user_agent,
    device_fingerprint,
    suspicious_score,
    flagged,
    flag_reason
  ) VALUES (
    v_referrer_id,
    p_new_user_id,
    p_referral_code,
    p_ip_address,
    p_user_agent,
    p_device_fingerprint,
    v_suspicious_score,
    v_suspicious_score >= 50,
    CASE WHEN v_suspicious_score >= 50 THEN 'Medium risk: Manual review recommended' ELSE NULL END
  );

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'referrer_id', v_referrer_id,
    'points_awarded', 50,
    'suspicious_score', v_suspicious_score,
    'flagged', v_suspicious_score >= 50
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'apply_referral_code_with_rewards error: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Referral processing failed: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Admin function to flag/unflag referrals manually
CREATE OR REPLACE FUNCTION admin_review_referral(
  p_tracking_id UUID,
  p_action TEXT, -- 'flag', 'unflag', 'restrict_user', 'unrestrict_user'
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_referrer_id UUID; -- Declare v_referrer_id
  v_score INT; -- Declare v_score
  v_tracking RECORD;
BEGIN
  -- Get tracking record
  SELECT * INTO v_tracking
  FROM referral_tracking
  WHERE id = p_tracking_id;

  IF v_tracking IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tracking record not found');
  END IF;

  CASE p_action
    WHEN 'flag' THEN
      UPDATE referral_tracking
      SET flagged = true, flag_reason = p_reason
      WHERE id = p_tracking_id;
      
      RETURN jsonb_build_object('success', true, 'message', 'Referral flagged');

    WHEN 'unflag' THEN
      UPDATE referral_tracking
      SET flagged = false, flag_reason = NULL
      WHERE id = p_tracking_id;
      
      RETURN jsonb_build_object('success', true, 'message', 'Flag removed');

    WHEN 'restrict_user' THEN
      INSERT INTO referral_limits (user_id, is_restricted, restriction_reason)
      VALUES (v_tracking.referrer_id, true, p_reason)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        is_restricted = true,
        restriction_reason = p_reason;
      
      RETURN jsonb_build_object('success', true, 'message', 'User restricted');

    WHEN 'unrestrict_user' THEN
      UPDATE referral_limits
      SET is_restricted = false, restriction_reason = NULL, restriction_until = NULL
      WHERE user_id = v_tracking.referrer_id;
      
      RETURN jsonb_build_object('success', true, 'message', 'User unrestricted');

    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Invalid action');
  END CASE;
  -- 6. Log administrative review action
  UPDATE referral_tracking
  SET flagged = CASE WHEN p_action = 'unflag' THEN false ELSE flagged END,
      flag_reason = CASE WHEN p_action = 'restrict_user' THEN COALESCE(p_reason, 'Restricted by admin') ELSE flag_reason END
  WHERE id = p_tracking_id;

  -- AUDIT: Record review (best-effort)
  BEGIN
    INSERT INTO audit_log(event_type, actor_id, target_id, metadata)
    VALUES (
      'REFERRAL_REVIEW',
      auth.uid(),
      p_tracking_id,
      jsonb_build_object(
        'action', p_action,
        'reason', p_reason,
        'referrer_id', v_referrer_id,
        'suspicious_score', v_score
      )
    );
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'audit_log insert failed for REFERRAL_REVIEW: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant permissions
GRANT SELECT, INSERT ON referral_tracking TO authenticated, service_role;
GRANT SELECT ON referral_limits TO authenticated, service_role;
GRANT UPDATE ON referral_limits TO service_role;

GRANT EXECUTE ON FUNCTION apply_referral_code_with_rewards TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_referral_limits TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION calculate_referral_suspicion_score TO service_role;
GRANT EXECUTE ON FUNCTION admin_review_referral TO service_role;

-- 8. Add comments
COMMENT ON TABLE referral_tracking IS 'Tracks all referral attempts for fraud detection and analytics';
COMMENT ON TABLE referral_limits IS 'Per-user referral limits and restrictions';
COMMENT ON FUNCTION calculate_referral_suspicion_score IS 'Calculates fraud risk score based on IP, device, and timing patterns';
COMMENT ON FUNCTION check_referral_limits IS 'Checks if user has exceeded referral quotas';
COMMENT ON FUNCTION apply_referral_code_with_rewards IS 'Enhanced referral processing with fraud detection';
COMMENT ON FUNCTION admin_review_referral IS 'Admin tool for manual review of flagged referrals';

COMMIT;
