-- ============================================================================
-- AUTOMATIC FIX FOR OFFERS TABLE RLS - CORRECTED VERSION
-- ============================================================================
-- This script checks the schema and applies the correct RLS policies

-- Enable RLS on offers table
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "partners_can_create_their_own_offers" ON public.offers;
DROP POLICY IF EXISTS "partners_can_view_their_own_offers" ON public.offers;
DROP POLICY IF EXISTS "anyone_can_view_public_offers" ON public.offers;
DROP POLICY IF EXISTS "partners_can_update_their_own_offers" ON public.offers;
DROP POLICY IF EXISTS "partners_can_delete_their_own_offers" ON public.offers;
DROP POLICY IF EXISTS "Public can view active offers" ON public.offers;
DROP POLICY IF EXISTS "Partners can view own offers" ON public.offers;
DROP POLICY IF EXISTS "Partners can create offers" ON public.offers;
DROP POLICY IF EXISTS "Partners can update own offers" ON public.offers;
DROP POLICY IF EXISTS "Partners can delete own offers" ON public.offers;

-- CORRECTED POLICIES - partner_id is a UUID that references partners.id
-- We need to check through the partners table since auth.uid() = partners.user_id

-- Policy 1: Allow authenticated users to INSERT offers if they own the partner account
CREATE POLICY "partners_can_create_their_own_offers"
ON public.offers
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.partners 
    WHERE partners.id = partner_id 
    AND partners.user_id = auth.uid()
    AND partners.status = 'APPROVED'
  )
);

-- Policy 2: Allow partners to view their own offers
CREATE POLICY "partners_can_view_their_own_offers"
ON public.offers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.partners 
    WHERE partners.id = offers.partner_id 
    AND partners.user_id = auth.uid()
  )
);

-- Policy 3: Allow anyone (including anonymous) to view active public offers
CREATE POLICY "anyone_can_view_public_offers"
ON public.offers
FOR SELECT
TO anon, authenticated
USING (status = 'ACTIVE' AND expires_at > NOW());

-- Policy 4: Allow partners to update their own offers
CREATE POLICY "partners_can_update_their_own_offers"
ON public.offers
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.partners 
    WHERE partners.id = offers.partner_id 
    AND partners.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.partners 
    WHERE partners.id = partner_id 
    AND partners.user_id = auth.uid()
  )
);

-- Policy 5: Allow partners to delete their own offers
CREATE POLICY "partners_can_delete_their_own_offers"
ON public.offers
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.partners 
    WHERE partners.id = offers.partner_id 
    AND partners.user_id = auth.uid()
  )
);

-- Verification queries
SELECT 'RLS ENABLED:' as check_type, tablename, rowsecurity as enabled FROM pg_tables WHERE tablename = 'offers';
SELECT 'POLICIES:' as check_type, policyname, cmd as operation FROM pg_policies WHERE tablename = 'offers' ORDER BY policyname;

-- ============================================================================
-- EXPLANATION:
-- The offers table has partner_id which is a UUID referencing partners.id
-- But auth.uid() returns the user_id from auth.users
-- So we must join through partners table: partners.user_id = auth.uid()
-- ============================================================================
