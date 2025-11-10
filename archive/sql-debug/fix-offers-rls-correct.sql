-- Fix Offers Table RLS Permissions
-- This script fixes the RLS policies to work with the partners table relationship

-- Step 1: Enable Row Level Security on offers table
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "partners_can_create_their_own_offers" ON offers;
DROP POLICY IF EXISTS "partners_can_view_their_own_offers" ON offers;
DROP POLICY IF EXISTS "anyone_can_view_public_offers" ON offers;
DROP POLICY IF EXISTS "partners_can_update_their_own_offers" ON offers;
DROP POLICY IF EXISTS "partners_can_delete_their_own_offers" ON offers;
DROP POLICY IF EXISTS "Public can view active offers" ON offers;
DROP POLICY IF EXISTS "Partners can view own offers" ON offers;
DROP POLICY IF EXISTS "Partners can create offers" ON offers;
DROP POLICY IF EXISTS "Partners can update own offers" ON offers;
DROP POLICY IF EXISTS "Partners can delete own offers" ON offers;

-- Step 3: Create policy for partners to INSERT offers (checking through partners table)
CREATE POLICY "Partners can create offers"
ON offers
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

-- Step 4: Create policy for partners to SELECT their own offers
CREATE POLICY "Partners can view own offers"
ON offers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.partners 
    WHERE partners.id = offers.partner_id 
    AND partners.user_id = auth.uid()
  )
);

-- Step 5: Create policy for anyone to view active public offers (for map/homepage)
CREATE POLICY "Public can view active offers"
ON offers
FOR SELECT
TO anon, authenticated
USING (status = 'ACTIVE' AND expires_at > NOW());

-- Step 6: Create policy for partners to UPDATE their own offers
CREATE POLICY "Partners can update own offers"
ON offers
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

-- Step 7: Create policy for partners to DELETE their own offers
CREATE POLICY "Partners can delete own offers"
ON offers
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
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'offers';

-- List all policies on offers table
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'offers';
