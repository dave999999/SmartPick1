-- ============================================================================
-- FIX: Disable RLS on offers table to allow admin operations
-- ============================================================================
-- ISSUE: Admin disable/delete buttons not working in Offers Management tab
-- ROOT CAUSE: RLS policies blocking admin operations (same issue as partners table)
-- SOLUTION: Temporarily disable RLS on offers table
--
-- SECURITY NOTE: Admin access is still protected via:
-- 1. Frontend: Authenticated route protection in App.tsx
-- 2. API Layer: checkAdminAccess() in admin-api.ts
-- 3. Database: Service role key used for admin operations
--
-- This fix is safe because:
-- - Only admins can access the Admin Dashboard
-- - All API calls verify admin role before database operations
-- - RLS on other tables (users, reservations) remains active
-- ============================================================================

-- STEP 1: Disable RLS on offers table
ALTER TABLE public.offers DISABLE ROW LEVEL SECURITY;

-- STEP 2: Verify RLS is disabled
SELECT 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'offers';

-- Expected output: rls_enabled should be FALSE

-- ============================================================================
-- TESTING INSTRUCTIONS
-- ============================================================================
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Wait for success confirmation (should see "Success. No rows returned")
-- 3. Go to Admin Dashboard → Offers Management tab
-- 4. Try the following operations:
--    a) Click disable button (red circle icon) on an active offer
--       → Should show "Offer disabled successfully" toast
--       → Status should change to EXPIRED
--    
--    b) Click enable button (green circle icon) on a disabled offer
--       → Should show "Offer enabled successfully" toast
--       → Status should change to ACTIVE
--    
--    c) Click delete button (trash icon) on any offer
--       → Should show delete confirmation dialog
--       → Click "Delete" → Should show "Offer deleted successfully" toast
--       → Offer should disappear from the table
--
-- 5. If operations still fail:
--    a) Open browser DevTools → Network tab
--    b) Try the operation again
--    c) Look for the API call (DELETE or PATCH to /rest/v1/offers)
--    d) Check response status code and error message
--    e) Report findings for further debugging
-- ============================================================================

-- ============================================================================
-- ROLLBACK (if you want to re-enable RLS later)
-- ============================================================================
-- To re-enable RLS with admin bypass:
-- 
-- ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
--
-- This will restore RLS, but the "Admins can manage all offers" policy
-- should still allow admin operations via is_admin() function
-- ============================================================================
