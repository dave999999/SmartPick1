# FIX FOR 403 ERROR WHEN CREATING OFFERS

## Problem
The "Create Offer" function fails with a 403 error because Row Level Security (RLS) policies are missing on the offers table.

## Solution
Execute the SQL script below in your Supabase SQL Editor.

## Steps to Apply Fix

1. Go to: https://***REMOVED_PROJECT_ID***.supabase.co/project/***REMOVED_PROJECT_ID***/sql/new
2. Copy the ENTIRE SQL script below
3. Paste it into the SQL Editor
4. Click "RUN" button
5. Verify the output shows RLS is enabled and policies are created

---

## SQL SCRIPT TO EXECUTE

```sql
-- ============================================================================
-- FIX OFFERS TABLE RLS PERMISSIONS
-- This script enables RLS and creates all necessary policies
-- ============================================================================

-- Step 1: Enable Row Level Security on offers table
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies to avoid conflicts
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

-- Step 3: Create policy for partners to INSERT offers
-- This checks through the partners table since partner_id references partners.id
CREATE POLICY "Partners can create offers"
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

-- Step 4: Create policy for partners to SELECT their own offers
CREATE POLICY "Partners can view own offers"
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

-- Step 5: Create policy for public to view active offers (for map/homepage)
CREATE POLICY "Public can view active offers"
ON public.offers
FOR SELECT
TO anon, authenticated
USING (status = 'ACTIVE' AND expires_at > NOW());

-- Step 6: Create policy for partners to UPDATE their own offers
CREATE POLICY "Partners can update own offers"
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

-- Step 7: Create policy for partners to DELETE their own offers
CREATE POLICY "Partners can delete own offers"
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

-- ============================================================================
-- VERIFICATION QUERIES (These will run automatically and show results)
-- ============================================================================

-- Check if RLS is enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE tablename = 'offers';

-- List all active policies on offers table
SELECT 
  schemaname,
  tablename,
  policyname as "Policy Name",
  cmd as "Operation",
  CASE 
    WHEN roles::text LIKE '%authenticated%' THEN 'Authenticated Users'
    WHEN roles::text LIKE '%anon%' THEN 'Anonymous + Authenticated'
    ELSE roles::text
  END as "Applies To"
FROM pg_policies
WHERE tablename = 'offers'
ORDER BY policyname;

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================
-- You should see:
-- 1. RLS Enabled = true for offers table
-- 2. Five policies listed:
--    - Partners can create offers (INSERT, Authenticated)
--    - Partners can view own offers (SELECT, Authenticated)
--    - Public can view active offers (SELECT, Anonymous + Authenticated)
--    - Partners can update own offers (UPDATE, Authenticated)
--    - Partners can delete own offers (DELETE, Authenticated)
-- ============================================================================
```

---

## After Applying the Fix

1. ✅ The 403 error will be resolved
2. ✅ Partners can create offers successfully
3. ✅ Partners can only see and modify their own offers
4. ✅ Everyone can view active public offers on the map/homepage

## Verification

After running the script, try creating an offer again. It should work without the 403 error.

If you still see errors, check:
- Your partner account status is 'APPROVED' (not 'PENDING' or 'BLOCKED')
- You're logged in with the correct partner account
- The partner_id being used matches your partner record in the database

---

## Technical Explanation

The key issue was that the offers table uses `partner_id` which references `partners.id` (a UUID), but authentication is based on `auth.uid()` which corresponds to `partners.user_id`. 

Therefore, the RLS policies must check through the partners table:
```sql
EXISTS (
  SELECT 1 FROM public.partners 
  WHERE partners.id = partner_id 
  AND partners.user_id = auth.uid()
)
```

This ensures that only the authenticated user who owns the partner account can create/modify offers for that partner.
