-- ========================================
-- Fix Admin Dashboard Access + Admin Point Actions
-- Date: 2026-02-06
-- Scope: Admin dashboard only
-- ========================================

BEGIN;

-- 1) Ensure admin roles can read user_points and point_transactions (uppercase roles)
DO $$
BEGIN
  -- user_points SELECT
  EXECUTE 'DROP POLICY IF EXISTS user_points_select ON public.user_points';
  EXECUTE $sql$
    CREATE POLICY user_points_select
    ON public.user_points FOR SELECT
    TO public
    USING (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
          AND u.role IN (''ADMIN'',''SUPER_ADMIN'',''PARTNER'')
      )
      OR auth.role() = ''service_role''
    )
  $sql$;

  -- user_points UPDATE
  EXECUTE 'DROP POLICY IF EXISTS user_points_update ON public.user_points';
  EXECUTE $sql$
    CREATE POLICY user_points_update
    ON public.user_points FOR UPDATE
    TO public
    USING (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
          AND u.role IN (''ADMIN'',''SUPER_ADMIN'')
      )
      OR auth.role() = ''service_role''
    )
  $sql$;

  -- user_points DELETE
  EXECUTE 'DROP POLICY IF EXISTS user_points_delete ON public.user_points';
  EXECUTE $sql$
    CREATE POLICY user_points_delete
    ON public.user_points FOR DELETE
    TO public
    USING (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
          AND u.role IN (''ADMIN'',''SUPER_ADMIN'')
      )
      OR auth.role() = ''service_role''
    )
  $sql$;

  -- point_transactions SELECT
  EXECUTE 'DROP POLICY IF EXISTS point_transactions_admin_select ON public.point_transactions';
  EXECUTE $sql$
    CREATE POLICY point_transactions_admin_select
    ON public.point_transactions FOR SELECT
    TO public
    USING (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
          AND u.role IN (''ADMIN'',''SUPER_ADMIN'')
      )
      OR auth.role() = ''service_role''
    )
  $sql$;
END $$;

-- 2) Admin RPC to adjust user points safely
CREATE OR REPLACE FUNCTION admin_adjust_user_points(
  p_user_id UUID,
  p_amount INT,
  p_reason TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_admin_role TEXT;
  v_current_balance INT;
  v_new_balance INT;
  v_transaction_id UUID;
BEGIN
  -- Verify admin role
  SELECT role INTO v_admin_role FROM public.users WHERE id = auth.uid();
  IF v_admin_role IS NULL OR v_admin_role NOT IN ('ADMIN','SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Lock points row
  SELECT balance INTO v_current_balance
  FROM public.user_points
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    -- Ensure row exists
    INSERT INTO public.user_points (user_id, balance)
    VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;
    v_current_balance := 0;
  END IF;

  v_new_balance := v_current_balance + p_amount;
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;

  UPDATE public.user_points
  SET balance = v_new_balance, updated_at = NOW()
  WHERE user_id = p_user_id;

  INSERT INTO public.point_transactions (
    user_id, change, reason, balance_before, balance_after, metadata
  )
  VALUES (
    p_user_id, p_amount, p_reason, v_current_balance, v_new_balance, p_metadata
  )
  RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION admin_adjust_user_points(UUID, INT, TEXT, JSONB) SET search_path = public;
GRANT EXECUTE ON FUNCTION admin_adjust_user_points(UUID, INT, TEXT, JSONB) TO authenticated;

-- 3) Admin audit tables for reservation actions
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
        AND u.role IN ('ADMIN','SUPER_ADMIN')
    )
  );

DROP POLICY IF EXISTS reservation_extensions_admin_insert ON public.reservation_extensions;
CREATE POLICY reservation_extensions_admin_insert
  ON public.reservation_extensions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('ADMIN','SUPER_ADMIN')
    )
  );

DROP POLICY IF EXISTS reservation_admin_actions_admin_select ON public.reservation_admin_actions;
CREATE POLICY reservation_admin_actions_admin_select
  ON public.reservation_admin_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('ADMIN','SUPER_ADMIN')
    )
  );

DROP POLICY IF EXISTS reservation_admin_actions_admin_insert ON public.reservation_admin_actions;
CREATE POLICY reservation_admin_actions_admin_insert
  ON public.reservation_admin_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('ADMIN','SUPER_ADMIN')
    )
  );

COMMIT;
