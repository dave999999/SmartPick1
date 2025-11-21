-- EMERGENCY ROLLBACK: Remove admin policies that caused recursion

-- Drop the problematic admin policies
DROP POLICY IF EXISTS "admins_can_read_all_users" ON public.users;
DROP POLICY IF EXISTS "admins_can_read_all_partners" ON public.partners;
DROP POLICY IF EXISTS "admins_can_read_all_offers" ON public.offers;
DROP POLICY IF EXISTS "admins_can_read_all_reservations" ON public.reservations;

-- Restore simple working policies

-- Users: only own data
-- (keep the policy from URGENT_FIX_INFINITE_RECURSION_NOW.sql)

-- Partners: own data or public view
DROP POLICY IF EXISTS "Partners can view own data" ON public.partners;
CREATE POLICY "Partners can view own data"
  ON public.partners FOR SELECT
  USING (auth.uid() = user_id);

-- Offers: public can see active offers
DROP POLICY IF EXISTS "Public can view active offers" ON public.offers;
CREATE POLICY "Public can view active offers"
  ON public.offers FOR SELECT
  USING (status = 'ACTIVE' OR status = 'SOLD_OUT');

-- Reservations: users can see own reservations
DROP POLICY IF EXISTS "Users can view own reservations" ON public.reservations;
CREATE POLICY "Users can view own reservations"
  ON public.reservations FOR SELECT
  USING (user_id = auth.uid());

SELECT 'Rollback complete - site should work again' AS result;
