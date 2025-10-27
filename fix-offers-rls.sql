-- Fix RLS policies for offers table
-- This script will enable RLS and create proper policies for the offers table

-- First, drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "partners_can_create_their_own_offers" ON offers;
DROP POLICY IF EXISTS "partners_can_view_their_own_offers" ON offers;
DROP POLICY IF EXISTS "anyone_can_view_public_offers" ON offers;
DROP POLICY IF EXISTS "partners_can_update_their_own_offers" ON offers;
DROP POLICY IF EXISTS "partners_can_delete_their_own_offers" ON offers;

-- Enable Row Level Security on offers table
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow authenticated partners to INSERT their own offers
-- This checks that the authenticated user's ID matches the partner_id in the offer
CREATE POLICY "partners_can_create_their_own_offers"
ON offers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = partner_id);

-- Policy 2: Allow authenticated partners to SELECT/VIEW their own offers
CREATE POLICY "partners_can_view_their_own_offers"
ON offers
FOR SELECT
TO authenticated
USING (auth.uid() = partner_id);

-- Policy 3: Allow anyone (including anonymous users) to view all public offers
-- This is needed for the public-facing map and homepage
CREATE POLICY "anyone_can_view_public_offers"
ON offers
FOR SELECT
TO anon, authenticated
USING (true);

-- Policy 4: Allow authenticated partners to UPDATE their own offers
CREATE POLICY "partners_can_update_their_own_offers"
ON offers
FOR UPDATE
TO authenticated
USING (auth.uid() = partner_id)
WITH CHECK (auth.uid() = partner_id);

-- Policy 5: Allow authenticated partners to DELETE their own offers
CREATE POLICY "partners_can_delete_their_own_offers"
ON offers
FOR DELETE
TO authenticated
USING (auth.uid() = partner_id);

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'offers';

-- List all policies on offers table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'offers';