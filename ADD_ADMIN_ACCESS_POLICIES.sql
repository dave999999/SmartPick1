-- Add admin access policies for Live dashboard
-- This allows admins to query all tables

-- Users table - add admin read policy
CREATE POLICY "admins_can_read_all_users"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users AS u
      WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )
  );

-- Partners table - add admin read policy
DROP POLICY IF EXISTS "admins_can_read_all_partners" ON public.partners;
CREATE POLICY "admins_can_read_all_partners"
  ON public.partners FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
    OR
    auth.uid() = user_id
  );

-- Offers table - add admin read policy
DROP POLICY IF EXISTS "admins_can_read_all_offers" ON public.offers;
CREATE POLICY "admins_can_read_all_offers"
  ON public.offers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
    OR
    status = 'ACTIVE'
  );

-- Reservations table - add admin read policy
DROP POLICY IF EXISTS "admins_can_read_all_reservations" ON public.reservations;
CREATE POLICY "admins_can_read_all_reservations"
  ON public.reservations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
    OR
    user_id = auth.uid()
  );

-- Verify policies were created
SELECT 'Admin access policies created successfully' AS result;
