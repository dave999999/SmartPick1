-- ============================================================================
-- SAFE FIX: Check existing functions first, then drop ALL versions
-- ============================================================================

-- STEP 1: See what we're dealing with
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as returns
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
ORDER BY p.proname, arguments;

-- Review the output above to see all versions of each function
-- Then proceed with the drops below

-- ============================================================================
-- STEP 2: Drop ALL versions of each function
-- ============================================================================

-- Drop all versions of can_user_reserve
DROP FUNCTION IF EXISTS public.can_user_reserve(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.can_user_reserve(p_user_id UUID) CASCADE;

-- Drop all versions of calculate_lift_points
DROP FUNCTION IF EXISTS public.calculate_lift_points(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_lift_points(p_cancellation_count INTEGER) CASCADE;

-- Drop all versions of expire_user_reservations
DROP FUNCTION IF EXISTS public.expire_user_reservations(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.expire_user_reservations(p_user_id UUID) CASCADE;

-- Drop all versions of get_suspension_duration
DROP FUNCTION IF EXISTS public.get_suspension_duration(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_suspension_duration(p_cancellation_count INTEGER) CASCADE;

-- Drop all versions of get_user_daily_cancellation_count
DROP FUNCTION IF EXISTS public.get_user_daily_cancellation_count(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_daily_cancellation_count(p_user_id UUID) CASCADE;

-- Drop all versions of is_user_in_cooldown
DROP FUNCTION IF EXISTS public.is_user_in_cooldown(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_user_in_cooldown(p_user_id UUID) CASCADE;

-- Drop all versions of lift_cooldown_with_points
DROP FUNCTION IF EXISTS public.lift_cooldown_with_points(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.lift_cooldown_with_points(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.lift_cooldown_with_points(p_user_id UUID) CASCADE;

-- Drop all versions of lift_penalty_with_points
DROP FUNCTION IF EXISTS public.lift_penalty_with_points(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.lift_penalty_with_points(p_user_id UUID, p_points_to_spend INTEGER) CASCADE;

-- Drop all versions of purchase_partner_offer_slot
DROP FUNCTION IF EXISTS public.purchase_partner_offer_slot() CASCADE;

-- Drop all versions of reset_user_cooldown
DROP FUNCTION IF EXISTS public.reset_user_cooldown(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.reset_user_cooldown(p_user_id UUID) CASCADE;

-- Drop all versions of track_reservation_cancellation
DROP FUNCTION IF EXISTS public.track_reservation_cancellation(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.track_reservation_cancellation(p_user_id UUID, p_reservation_id UUID) CASCADE;

-- ============================================================================
-- STEP 3: Now run the FIX_ALL_11_FUNCTIONS_COMPLETE.sql file
-- (but skip the DROP statements at the top of each function since we did them here)
-- ============================================================================

-- After running this file, run FIX_ALL_11_FUNCTIONS_COMPLETE.sql
-- OR continue below with the function definitions...
