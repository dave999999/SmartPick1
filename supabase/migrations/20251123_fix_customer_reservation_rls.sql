-- Fix RLS policy for customers to view their own reservations
-- This allows customers to immediately see reservations they just created

-- Drop existing customer read policy if it exists
DROP POLICY IF EXISTS "Customers can view own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can read own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Customers can read their reservations" ON public.reservations;

-- Create comprehensive policy for customers to read their own reservations
CREATE POLICY "Customers can read their own reservations"
  ON public.reservations
  FOR SELECT
  USING (
    customer_id = auth.uid()
  );

-- Ensure partners can read reservations for their offers
DROP POLICY IF EXISTS "Partners can view reservations for their offers" ON public.reservations;

CREATE POLICY "Partners can view reservations for their offers"
  ON public.reservations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.partners
      WHERE partners.user_id = auth.uid()
      AND partners.id = reservations.partner_id
    )
  );

-- Verify RLS is enabled
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

COMMENT ON POLICY "Customers can read their own reservations" ON public.reservations IS 
'Allows customers to view reservations where they are the customer';

COMMENT ON POLICY "Partners can view reservations for their offers" ON public.reservations IS 
'Allows partners to view reservations for their business';
