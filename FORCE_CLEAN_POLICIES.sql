-- =====================================================
-- FORCE CLEAN ALL POLICIES - NO ERRORS
-- =====================================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop ALL policies from offers table
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'offers') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.offers';
    END LOOP;
    
    -- Drop ALL policies from partners table
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'partners') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.partners';
    END LOOP;
    
    -- Drop ALL policies from reservations table
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reservations') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.reservations';
    END LOOP;
    
    -- Drop ALL policies from users table
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.users';
    END LOOP;
END $$;

-- =====================================================
-- NOW CREATE CLEAN POLICIES
-- =====================================================

-- USERS TABLE
CREATE POLICY "users_read_own"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "admins_read_all_users"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )
  );

-- OFFERS TABLE (CRITICAL FOR HOMEPAGE)
CREATE POLICY "public_view_active_offers"
  ON public.offers FOR SELECT
  USING (status = 'ACTIVE');

CREATE POLICY "partners_manage_own_offers"
  ON public.offers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.partners p
      WHERE p.id = offers.partner_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "admins_manage_offers"
  ON public.offers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )
  );

-- PARTNERS TABLE
CREATE POLICY "public_view_approved_partners"
  ON public.partners FOR SELECT
  USING (status = 'APPROVED');

CREATE POLICY "partners_view_own"
  ON public.partners FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "partners_update_own"
  ON public.partners FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "users_create_partner"
  ON public.partners FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admins_manage_partners"
  ON public.partners FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )
  );

-- RESERVATIONS TABLE
CREATE POLICY "users_view_own_reservations"
  ON public.reservations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "users_create_reservations"
  ON public.reservations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_update_own_reservations"
  ON public.reservations FOR UPDATE
  USING (customer_id = auth.uid());

CREATE POLICY "partners_view_their_reservations"
  ON public.reservations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.offers o
      JOIN public.partners p ON p.id = o.partner_id
      WHERE o.id = reservations.offer_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "partners_update_their_reservations"
  ON public.reservations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.offers o
      JOIN public.partners p ON p.id = o.partner_id
      WHERE o.id = reservations.offer_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "admins_manage_reservations"
  ON public.reservations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )
  );
