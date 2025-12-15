-- ============================================================================
-- FIX: Enable RLS on spatial_ref_sys (PostGIS system table)
-- ============================================================================
-- This is a PostGIS system table for coordinate reference systems
-- It contains no user data, so we just enable RLS to satisfy the linter
-- No policies needed - service_role can still access it
-- ============================================================================

BEGIN;

-- Enable RLS on spatial_ref_sys
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- Create a permissive policy to allow reading (it's reference data)
CREATE POLICY "spatial_ref_sys_public_read" ON public.spatial_ref_sys
FOR SELECT USING (true);

COMMIT;

SELECT '✅ RLS enabled on spatial_ref_sys - security warning fixed!' as status;
