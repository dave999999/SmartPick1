-- Fix RLS policies for partner marking reservations as PICKED_UP
-- The 400 Bad Request error suggests RLS is blocking the update

BEGIN;

-- Check current policies on reservations
-- Run this first to see what policies exist:
-- SELECT policyname, permissive, roles, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'reservations';

-- Drop and recreate the partner update policy to allow status updates
DROP POLICY IF EXISTS "Partners can update their reservations" ON public.reservations;

CREATE POLICY "Partners can update their reservations"
ON public.reservations
FOR UPDATE
USING (
  partner_id IN (
    SELECT id FROM public.partners WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  partner_id IN (
    SELECT id FROM public.partners WHERE user_id = auth.uid()
  )
);

-- Also ensure partners can read their reservations
DROP POLICY IF EXISTS "Partners can view their reservations" ON public.reservations;

CREATE POLICY "Partners can view their reservations"
ON public.reservations
FOR SELECT
USING (
  partner_id IN (
    SELECT id FROM public.partners WHERE user_id = auth.uid()
  )
);

COMMIT;
