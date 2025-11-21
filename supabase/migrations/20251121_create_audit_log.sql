-- Migration: Create audit_log table for security and administrative event tracking
-- Date: 2025-11-21
-- Purpose: Provide immutable history of key actions (points awards, payment webhooks, admin reviews)

BEGIN;

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  target_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.audit_log IS 'Immutable audit trail of security-relevant events';
COMMENT ON COLUMN public.audit_log.event_type IS 'Categorized event code e.g. POINTS_AWARDED, PAYMENT_CONFIRMED';
COMMENT ON COLUMN public.audit_log.metadata IS 'Structured JSON details (amount, reference, context)';

-- Helpful indexes
CREATE INDEX IF NOT EXISTS audit_log_event_type_idx ON public.audit_log (event_type);
CREATE INDEX IF NOT EXISTS audit_log_actor_idx ON public.audit_log (actor_id);
CREATE INDEX IF NOT EXISTS audit_log_target_idx ON public.audit_log (target_id);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON public.audit_log (created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Admins (role claim contains 'admin') can see all rows
CREATE POLICY audit_log_select_admin ON public.audit_log FOR SELECT
  USING (
    (auth.role() = 'service_role') OR
    (auth.jwt() ->> 'role') IN ('admin','super_admin')
  );

-- Policy: No inserts via client except SECURITY DEFINER functions / service_role
CREATE POLICY audit_log_insert_service ON public.audit_log FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Policy: Prevent updates/deletes (append-only)
CREATE POLICY audit_log_block_update ON public.audit_log FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY audit_log_block_delete ON public.audit_log FOR DELETE USING (false);

-- Grant minimal privileges
REVOKE ALL ON public.audit_log FROM PUBLIC;
GRANT SELECT ON public.audit_log TO authenticated; -- Will be filtered by RLS (non-admins see 0 rows)
GRANT SELECT, INSERT ON public.audit_log TO service_role;

COMMIT;
