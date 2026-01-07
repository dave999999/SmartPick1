-- ============================================================================
-- FIX YOUR 11 SPECIFIC VULNERABLE FUNCTIONS
-- These are the exact functions Supabase flagged
-- ============================================================================

-- Get the source code for all 11 vulnerable functions
SELECT 
  '-- ========================================' || E'\n' ||
  '-- ' || p.proname || E'\n' ||
  '-- ========================================' || E'\n' ||
  pg_get_functiondef(p.oid) || E'\n\n'
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'reset_user_cooldown',
    'lift_cooldown_with_points',
    'get_user_daily_cancellation_count',
    'purchase_partner_offer_slot',
    'expire_user_reservations',
    'track_reservation_cancellation',
    'calculate_lift_points',
    'is_user_in_cooldown',
    'lift_penalty_with_points',
    'get_suspension_duration',
    'can_user_reserve'
  )
ORDER BY p.proname;

-- ============================================================================
-- INSTRUCTIONS:
-- 1. Copy the output above
-- 2. For EACH function, make BOTH changes:
--    a) Add: SET search_path = public, pg_temp (after SECURITY DEFINER)
--    b) Fix ALL table references inside the function body
--
-- CRITICAL: You must fix BOTH or the function will break!
-- ============================================================================
