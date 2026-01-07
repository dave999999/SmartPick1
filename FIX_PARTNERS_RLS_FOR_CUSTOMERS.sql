-- ============================================================================
-- FIX: Allow customers to view partner data
-- The optimized policy was TOO restrictive - only admins and partner owners
-- could view partners. Customers need to see partners for reservations!
-- ============================================================================

-- Drop the overly restrictive policy
DROP POLICY IF EXISTS partners_select_combined ON public.partners;

-- Create new policy that allows ALL authenticated users to view partners
-- (Customers need this to see partner location/details for their reservations)
CREATE POLICY partners_select_combined ON public.partners
  FOR SELECT
  USING (
    -- Everyone can view partners (public data)
    -- This is needed for:
    -- - Customers viewing offers and making reservations
    -- - Showing partner location on map
    -- - Displaying partner contact info
    true
  );

-- Keep the other optimized policies (they're fine)
-- partners_insert_combined - only admins/own
-- partners_delete_combined - only admins
-- partners_update_combined - only admins/own

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test as authenticated user (should work now)
SELECT id, user_id, business_name, latitude, longitude, address, phone
FROM public.partners
WHERE id = '1b5f8b01-157b-4997-8f9b-411eec09b1c9'
LIMIT 1;

-- Should return partner data (not empty)

-- ============================================================================
-- EXPLANATION
-- ============================================================================
-- 
-- WHY THIS FIX IS NEEDED:
-- 
-- The previous optimized policy only allowed:
--   1. Admins (role = 'ADMIN')
--   2. Partner owners (user_id = auth.uid())
-- 
-- But CUSTOMERS need to:
--   - View partners when browsing offers
--   - See partner location when they make a reservation
--   - Get partner contact info for pickup
--   - Display partner marker on map
-- 
-- SECURITY CONSIDERATIONS:
-- 
-- Partner data is PUBLIC information by nature:
--   - Business name, address, phone, hours
--   - Location coordinates for map display
--   - This is NOT sensitive data
-- 
-- Private partner data (if any) should be in separate columns with
-- stricter RLS policies (e.g., bank account, internal notes)
-- 
-- ============================================================================
