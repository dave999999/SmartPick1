-- Enhanced RLS fix for partner reservation updates
-- Explicitly allow updating status and picked_up_at columns

BEGIN;

-- First, let's see what's blocking. Run this diagnostic:
-- SELECT * FROM pg_policies WHERE tablename = 'reservations';

-- Drop all partner-related policies and recreate them properly
DROP POLICY IF EXISTS "Partners can update their reservations" ON public.reservations;
DROP POLICY IF EXISTS "Partners can view their reservations" ON public.reservations;
DROP POLICY IF EXISTS "Partners view reservations" ON public.reservations;
DROP POLICY IF EXISTS "Partners update reservations" ON public.reservations;

-- CREATE: Partners can view their own reservations
CREATE POLICY "Partners can view their reservations"
ON public.reservations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.partners 
    WHERE partners.id = reservations.partner_id 
    AND partners.user_id = auth.uid()
  )
);

-- UPDATE: Partners can update status and picked_up_at on their reservations
CREATE POLICY "Partners can update their reservations"
ON public.reservations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.partners 
    WHERE partners.id = reservations.partner_id 
    AND partners.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.partners 
    WHERE partners.id = reservations.partner_id 
    AND partners.user_id = auth.uid()
  )
);

-- Also ensure service_role can do everything (for background jobs)
DROP POLICY IF EXISTS "Service role full access" ON public.reservations;

CREATE POLICY "Service role full access"
ON public.reservations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMIT;

-- After running this, test with:
-- SELECT id, status, partner_id FROM reservations WHERE id = 'YOUR_RESERVATION_ID';
