-- ========================================
-- Create reservation admin audit tables (if missing)
-- Date: 2026-02-06
-- ========================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.reservation_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  additional_minutes INT NOT NULL,
  reason TEXT,
  extended_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reservation_admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  notes TEXT,
  admin_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reservation_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_admin_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reservation_extensions_admin_select ON public.reservation_extensions;
CREATE POLICY reservation_extensions_admin_select
  ON public.reservation_extensions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND upper(u.role) IN ('ADMIN','SUPER_ADMIN')
    )
    OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS reservation_extensions_admin_insert ON public.reservation_extensions;
CREATE POLICY reservation_extensions_admin_insert
  ON public.reservation_extensions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND upper(u.role) IN ('ADMIN','SUPER_ADMIN')
    )
    OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS reservation_admin_actions_admin_select ON public.reservation_admin_actions;
CREATE POLICY reservation_admin_actions_admin_select
  ON public.reservation_admin_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND upper(u.role) IN ('ADMIN','SUPER_ADMIN')
    )
    OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS reservation_admin_actions_admin_insert ON public.reservation_admin_actions;
CREATE POLICY reservation_admin_actions_admin_insert
  ON public.reservation_admin_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND upper(u.role) IN ('ADMIN','SUPER_ADMIN')
    )
    OR auth.role() = 'service_role'
  );

COMMIT;
