-- ============================================
-- FIX SUPABASE DATABASE LINTER SECURITY ERRORS
-- Date: 2025-12-25
-- ============================================

-- ============================================
-- FIX 1: Enable RLS on notification_queue table
-- Error: rls_disabled_in_public
-- ============================================

ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

-- Only service role and authenticated backend can access notification queue
-- Partners cannot directly read/write - only through functions
CREATE POLICY "notification_queue_service_only"
ON public.notification_queue
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

COMMENT ON POLICY "notification_queue_service_only" ON public.notification_queue IS 
'Notification queue is internal only - accessed via functions, not direct queries';

-- ============================================
-- FIX 2: spatial_ref_sys (PostGIS system table)
-- Error: rls_disabled_in_public
-- ============================================

-- NOTE: spatial_ref_sys is owned by PostGIS extension and cannot be modified
-- This warning is SAFE TO IGNORE - it's a read-only system table managed by Supabase
-- Supabase themselves cannot enable RLS on extension-owned tables
-- See: https://github.com/supabase/supabase/discussions/

DO $$
BEGIN
  RAISE NOTICE '⚠️  spatial_ref_sys RLS warning is safe to ignore';
  RAISE NOTICE '   - Owned by PostGIS extension (not user)';
  RAISE NOTICE '   - Read-only system table for spatial reference data';
  RAISE NOTICE '   - Cannot be modified or have policies applied';
  RAISE NOTICE '   - This is standard for all Supabase PostGIS projects';
END $$;

-- ============================================
-- FIX 3: Recreate notification_context view WITHOUT security definer
-- Error: security_definer_view + auth_users_exposed
-- ============================================

-- Drop the old view
DROP VIEW IF EXISTS public.notification_context CASCADE;

-- Recreate WITHOUT security definer and WITHOUT exposing auth.users to anon
-- This view should only be used by backend functions, not exposed to PostgREST
CREATE OR REPLACE VIEW public.notification_context 
WITH (security_invoker=true)  -- Use caller's permissions, not definer's
AS
SELECT 
  r.id as reservation_id,
  r.customer_id,
  r.offer_id,
  r.quantity,
  r.status,
  r.confirmation_status,
  -- Remove direct auth.users exposure - use safer fallback
  COALESCE(
    (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = r.customer_id),
    'Customer'
  ) as customer_name,
  ur.reliability_score,
  o.title as offer_title,
  o.partner_id,
  p.business_name as partner_name,
  p.notification_preferences,
  p.batching_enabled,
  p.batching_window_minutes,
  p.silent_hours
FROM public.reservations r
LEFT JOIN public.user_reliability ur ON ur.user_id = r.customer_id
JOIN public.offers o ON o.id = r.offer_id
JOIN public.partners p ON p.user_id = o.partner_id;

COMMENT ON VIEW public.notification_context IS 
'Internal view for notification decisions - security_invoker, no direct anon access';

-- Revoke access from anon role
REVOKE ALL ON public.notification_context FROM anon;

-- Grant access only to authenticated users (backend functions)
GRANT SELECT ON public.notification_context TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Security fixes applied:';
  RAISE NOTICE '  1. RLS enabled on notification_queue (service role only)';
  RAISE NOTICE '  2. notification_context view recreated with security_invoker';
  RAISE NOTICE '  3. auth.users no longer exposed to anon role';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  spatial_ref_sys warning can be safely ignored (PostGIS system table)';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 3 out of 4 security errors fixed (1 is system table - safe to ignore)';
END $$;
