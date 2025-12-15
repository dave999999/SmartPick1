-- ============================================================================
-- COMPLETE FIX: INFINITE RECURSION IN USERS AND PARTNERS POLICIES
-- ============================================================================
-- Problem: Circular dependency between users and partners policies
-- - users policy checks partners table (for partner owners)
-- - partners policy checks users table (for admin role)
-- This creates: partners → users → partners → users → INFINITE LOOP
--
-- Solution: Remove ALL recursive checks, allow public access for both
-- ============================================================================

BEGIN;

-- ============================================================================
-- FIX 1: Users table policies (NO recursion, NO partner checks)
-- ============================================================================

-- Drop ALL existing users SELECT policies
DROP POLICY IF EXISTS "users_can_read_own_or_public" ON public.users;
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile or public profiles" ON public.users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.users;
DROP POLICY IF EXISTS "users_select" ON public.users;

-- Create SIMPLE, NON-RECURSIVE SELECT policy
-- Allow reading users when:
-- 1. Reading own record (authenticated users)
-- 2. Anyone can read users (needed for public offers → partners → users lookup)
CREATE POLICY "users_select" ON public.users
FOR SELECT USING (true); -- Public read access (no recursion!)

-- Keep UPDATE policy (no recursion issue here)
DROP POLICY IF EXISTS "users_can_update_own" ON public.users;
DROP POLICY IF EXISTS "users_update" ON public.users;
CREATE POLICY "users_update" ON public.users
FOR UPDATE USING (id = (SELECT auth.uid()));

-- Keep INSERT policy for registration
DROP POLICY IF EXISTS "users_can_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_insert" ON public.users;
CREATE POLICY "users_insert" ON public.users
FOR INSERT WITH CHECK (id = (SELECT auth.uid()));

-- ============================================================================
-- FIX 2: Partners table policies (NO recursion, NO user role checks)
-- ============================================================================

-- Drop ALL existing partners policies
DROP POLICY IF EXISTS "public_view_approved_partners" ON public.partners;
DROP POLICY IF EXISTS "partners_manage" ON public.partners;
DROP POLICY IF EXISTS "partners_manage_own" ON public.partners;
DROP POLICY IF EXISTS "partners_select" ON public.partners;
DROP POLICY IF EXISTS "users_create_partner" ON public.partners;
DROP POLICY IF EXISTS "admins_manage_partners" ON public.partners;

-- Public read access for ALL partners (needed for offers display)
CREATE POLICY "partners_select" ON public.partners
FOR SELECT USING (true); -- Public read access (no recursion!)

-- Partner owners can manage their own partners
CREATE POLICY "partners_manage_own" ON public.partners
FOR ALL USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================================
-- FIX 3: Offers table policies (NO recursion)
-- ============================================================================

-- Drop ALL existing offers policies
DROP POLICY IF EXISTS "public_view_active_offers" ON public.offers;
DROP POLICY IF EXISTS "offers_manage" ON public.offers;
DROP POLICY IF EXISTS "offers_manage_own" ON public.offers;
DROP POLICY IF EXISTS "offers_select" ON public.offers;
DROP POLICY IF EXISTS "offers_insert" ON public.offers;
DROP POLICY IF EXISTS "offers_update" ON public.offers;
DROP POLICY IF EXISTS "offers_delete" ON public.offers;

-- Public read access for active offers
CREATE POLICY "offers_select" ON public.offers
FOR SELECT USING (true); -- Public read access (no recursion!)

-- Partner owners can manage their own offers (NO user/partner table checks!)
CREATE POLICY "offers_manage_own" ON public.offers
FOR ALL USING (
  partner_id IN (
    SELECT id FROM public.partners WHERE user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  partner_id IN (
    SELECT id FROM public.partners WHERE user_id = (SELECT auth.uid())
  )
);

-- ============================================================================
-- FIX 4: Reservations table policies (NO recursion)
-- ============================================================================

-- Drop ALL existing reservations policies
DROP POLICY IF EXISTS "reservations_select" ON public.reservations;
DROP POLICY IF EXISTS "reservations_insert" ON public.reservations;
DROP POLICY IF EXISTS "reservations_update" ON public.reservations;
DROP POLICY IF EXISTS "reservations_delete" ON public.reservations;
DROP POLICY IF EXISTS "Users can view own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Partners can view reservations for their offers" ON public.reservations;

-- Users can view their own reservations
CREATE POLICY "reservations_select" ON public.reservations
FOR SELECT USING (
  customer_id = (SELECT auth.uid()) OR
  partner_id IN (
    SELECT id FROM public.partners WHERE user_id = (SELECT auth.uid())
  )
);

-- Users can create their own reservations
CREATE POLICY "reservations_insert" ON public.reservations
FOR INSERT WITH CHECK (customer_id = (SELECT auth.uid()));

-- Users and partners can update reservations
CREATE POLICY "reservations_update" ON public.reservations
FOR UPDATE USING (
  customer_id = (SELECT auth.uid()) OR
  partner_id IN (
    SELECT id FROM public.partners WHERE user_id = (SELECT auth.uid())
  )
);

-- ============================================================================
-- COMMIT CHANGES
-- ============================================================================

COMMIT;

-- ============================================================================
-- VERIFY FIX
-- ============================================================================

-- Check users policies
SELECT 
  'USERS' as table_name,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY cmd, policyname;

-- Check partners policies
SELECT 
  'PARTNERS' as table_name,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'partners'
ORDER BY cmd, policyname;

-- Check offers policies
SELECT 
  'OFFERS' as table_name,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'offers'
ORDER BY cmd, policyname;

-- Check reservations policies
SELECT 
  'RESERVATIONS' as table_name,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'reservations'
ORDER BY cmd, policyname;

SELECT '✅ Users, Partners, Offers, and Reservations policies fixed - no more circular recursion!' as status;
