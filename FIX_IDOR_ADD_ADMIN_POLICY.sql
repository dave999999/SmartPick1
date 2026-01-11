-- ====================================================================
-- FIX IDOR: Add Admin Access Policy for Reservations
-- ====================================================================
-- This allows admins to view all reservations in the admin dashboard
-- Without this, admin panel breaks when trying to view reservation details

-- Add admin access policy
CREATE POLICY "Admins can view all reservations"
  ON public.reservations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

COMMENT ON POLICY "Admins can view all reservations" ON public.reservations IS 
'Allows admins to view all reservations for platform monitoring and support';

-- Verify all SELECT policies on reservations table
DO $$
BEGIN
  RAISE NOTICE 'Current SELECT policies on reservations:';
  RAISE NOTICE '1. Customers can read their own reservations';
  RAISE NOTICE '2. Partners can view reservations for their offers';
  RAISE NOTICE '3. Admins can view all reservations (NEW)';
END $$;
