-- Run this in Supabase SQL Editor to create audit_log table
-- This applies the 20251121_create_audit_log.sql migration manually

BEGIN;

-- Create audit_log table (IF NOT EXISTS makes it safe to re-run)
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

-- Create indexes (IF NOT EXISTS makes it safe to re-run)
CREATE INDEX IF NOT EXISTS audit_log_event_type_idx ON public.audit_log (event_type);
CREATE INDEX IF NOT EXISTS audit_log_actor_idx ON public.audit_log (actor_id);
CREATE INDEX IF NOT EXISTS audit_log_target_idx ON public.audit_log (target_id);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON public.audit_log (created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS audit_log_select_admin ON public.audit_log;
DROP POLICY IF EXISTS audit_log_insert_service ON public.audit_log;
DROP POLICY IF EXISTS audit_log_block_update ON public.audit_log;
DROP POLICY IF EXISTS audit_log_block_delete ON public.audit_log;

-- Create policies
CREATE POLICY audit_log_select_admin ON public.audit_log FOR SELECT
  USING (
    (auth.role() = 'service_role') OR
    (auth.jwt() ->> 'role') IN ('admin','super_admin')
  );

CREATE POLICY audit_log_insert_service ON public.audit_log FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY audit_log_block_update ON public.audit_log FOR UPDATE 
  USING (false) WITH CHECK (false);

CREATE POLICY audit_log_block_delete ON public.audit_log FOR DELETE 
  USING (false);

-- Grant privileges
REVOKE ALL ON public.audit_log FROM PUBLIC;
GRANT SELECT ON public.audit_log TO authenticated;
GRANT SELECT, INSERT ON public.audit_log TO service_role;

COMMIT;

-- Verification queries
SELECT 'Table created:' as status, COUNT(*) as row_count FROM public.audit_log;
SELECT 'Policies:' as status, COUNT(*) as policy_count FROM pg_policies WHERE tablename = 'audit_log';
SELECT 'RLS enabled:' as status, relrowsecurity FROM pg_class WHERE relname = 'audit_log';

-- Insert test audit entry
INSERT INTO public.audit_log (event_type, actor_id, target_id, metadata, ip_address)
VALUES ('DEPLOYMENT_TEST', NULL, NULL, '{"deployed_at":"2025-11-21","source":"manual_sql"}'::jsonb, '127.0.0.1')
RETURNING *;
