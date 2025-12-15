-- ============================================================================
-- CLEANUP: Remove all duplicate/old function versions
-- ============================================================================
-- Problem: Multiple overloaded versions of functions exist with different signatures
-- Solution: Drop ALL versions before the main script recreates them correctly
-- ============================================================================

BEGIN;

-- Drop all versions of track_reservation_cancellation
DROP FUNCTION IF EXISTS public.track_reservation_cancellation() CASCADE;
DROP FUNCTION IF EXISTS public.track_reservation_cancellation(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.track_reservation_cancellation(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.track_reservation_cancellation(UUID, UUID, TEXT) CASCADE;

-- Drop all versions of update_partner_location
DROP FUNCTION IF EXISTS public.update_partner_location() CASCADE;
DROP FUNCTION IF EXISTS public.update_partner_location(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.update_partner_location(UUID, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.update_partner_location(UUID, NUMERIC, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.update_partner_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION) CASCADE;

COMMIT;

SELECT '✅ Cleaned up all duplicate function versions!' as status;
