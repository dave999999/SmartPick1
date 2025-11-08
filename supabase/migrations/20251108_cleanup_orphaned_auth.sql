-- =====================================================
-- CLEANUP: Remove orphaned auth records
-- Run this AFTER applying the RLS fix migration
-- =====================================================

-- This script cleans up auth.users records that don't have
-- corresponding public.users records (orphaned from failed signups)

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Delete auth records where public.users record doesn't exist
  -- AND the auth record is older than 1 hour (to avoid race conditions)
  DELETE FROM auth.users
  WHERE id NOT IN (SELECT id FROM public.users)
    AND created_at < NOW() - INTERVAL '1 hour';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RAISE NOTICE 'Cleaned up % orphaned auth records', v_count;
END $$;

-- Verify cleanup
SELECT
  'Orphaned auth records remaining' as status,
  COUNT(*) as count
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;
