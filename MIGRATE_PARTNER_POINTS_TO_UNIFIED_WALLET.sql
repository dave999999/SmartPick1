-- =====================================================
-- MIGRATE: Move existing partner_points to unified user_points wallet
-- =====================================================
-- Problem: Existing partners have points in partner_points (separate wallet)
-- Solution: Copy their balance to user_points and mark as migrated
-- =====================================================

-- Step 1: Migrate existing partner points to user_points
DO $$
DECLARE
  v_partner RECORD;
  v_current_user_points INT;
BEGIN
  -- Set system flag for add_user_points
  PERFORM set_config('app.is_system_operation', 'true', true);
  
  -- Loop through all partners with points in partner_points
  FOR v_partner IN 
    SELECT pp.user_id, pp.balance, p.id as partner_id, p.business_name
    FROM partner_points pp
    JOIN partners p ON p.user_id = pp.user_id
    WHERE pp.balance > 0
      AND p.status = 'APPROVED'
  LOOP
    -- Get current user_points balance (may already exist)
    SELECT COALESCE(balance, 0) INTO v_current_user_points
    FROM user_points
    WHERE user_id = v_partner.user_id;
    
    -- Only migrate if user doesn't already have these points
    IF v_current_user_points = 0 OR v_current_user_points IS NULL THEN
      RAISE NOTICE 'Migrating % points for user % (partner: %)', 
        v_partner.balance, v_partner.user_id, v_partner.business_name;
      
      -- Add partner points to user wallet
      PERFORM add_user_points(
        v_partner.user_id,
        v_partner.balance,
        'partner_points_migration',
        jsonb_build_object(
          'partner_id', v_partner.partner_id,
          'business_name', v_partner.business_name,
          'migrated_from', 'partner_points',
          'original_balance', v_partner.balance
        )
      );
      
      -- Mark as migrated (zero out partner_points, keep record for history)
      UPDATE partner_points
      SET balance = 0, 
          updated_at = NOW()
      WHERE user_id = v_partner.user_id;
      
    ELSE
      RAISE NOTICE 'Skipping user % - already has % points', 
        v_partner.user_id, v_current_user_points;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Migration complete';
END $$;

SELECT '✅ Migrated existing partner points to unified wallet' as status;
