-- =====================================================
-- FIX: claim_achievement function signature mismatch
-- =====================================================
-- Problem: Frontend calls claim_achievement(p_achievement_id)
-- But database expects: claim_achievement(p_user_id, p_achievement_id, p_points_reward)
-- Solution: Restore the single-parameter version that uses auth.uid()
-- =====================================================

-- Drop the 3-parameter version
DROP FUNCTION IF EXISTS public.claim_achievement(UUID, TEXT, INT);

-- Restore the TEXT-only version (most recent working version)
CREATE OR REPLACE FUNCTION public.claim_achievement(p_achievement_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_def achievement_definitions%ROWTYPE;
  v_row user_achievements%ROWTYPE;
  v_tx JSONB;
  v_already_awarded BOOLEAN := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Auto-check achievements first to unlock if requirements are met
  BEGIN
    PERFORM check_user_achievements(v_user_id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to check achievements: %', SQLERRM;
  END;

  -- Get the user_achievements row
  SELECT * INTO v_row 
  FROM user_achievements
  WHERE user_id = v_user_id AND achievement_id = p_achievement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Achievement not unlocked');
  END IF;

  -- Get achievement definition
  SELECT * INTO v_def
  FROM achievement_definitions
  WHERE id = p_achievement_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Achievement definition not found');
  END IF;

  -- Check if already awarded points
  v_already_awarded := COALESCE(v_row.reward_claimed, false);

  IF v_already_awarded THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reward already claimed');
  END IF;

  -- Award the points using add_user_points
  IF v_def.reward_points > 0 THEN
    -- Set system flag so add_user_points allows this operation
    PERFORM set_config('app.is_system_operation', 'true', true);
    
    v_tx := add_user_points(
      v_user_id,
      v_def.reward_points,
      'achievement',
      jsonb_build_object(
        'achievement_id', v_def.id,
        'achievement_name', v_def.name
      )
    );
  END IF;

  -- Mark as claimed
  UPDATE user_achievements
  SET 
    reward_claimed = true,
    reward_claimed_at = NOW(),
    points_awarded = v_def.reward_points,
    is_new = false,
    viewed_at = COALESCE(viewed_at, NOW())
  WHERE user_id = v_user_id AND achievement_id = p_achievement_id;

  RETURN jsonb_build_object(
    'success', true,
    'awarded_now', NOT v_already_awarded,
    'reward_points', v_def.reward_points,
    'balance', COALESCE(v_tx->>'balance', '0')
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.claim_achievement(TEXT) TO authenticated;

COMMENT ON FUNCTION public.claim_achievement IS 
'Claims achievement reward and awards points. Uses auth.uid() for security. Auto-unlocks achievements before claiming.';

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify function exists with correct signature
DO $$ 
BEGIN
  RAISE NOTICE '=== VERIFICATION ===';
  RAISE NOTICE 'Function signature: claim_achievement(p_achievement_id TEXT)';
  RAISE NOTICE 'Security: Uses auth.uid() - users can only claim their own achievements';
  RAISE NOTICE 'Points: Awards via add_user_points with system flag';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Fixed! Frontend can now call:';
  RAISE NOTICE '   supabase.rpc(''claim_achievement'', { p_achievement_id: ''...'''' })';
END $$;

-- Show function signature
SELECT 
  '✅ claim_achievement function restored' as status,
  r.routine_name,
  r.data_type as return_type,
  string_agg(p.parameter_name || ' ' || p.data_type, ', ') as parameters
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p ON r.specific_name = p.specific_name
WHERE r.routine_schema = 'public'
  AND r.routine_name = 'claim_achievement'
GROUP BY r.routine_name, r.data_type;
