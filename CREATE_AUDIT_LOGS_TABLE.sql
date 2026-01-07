-- =========================================================
-- AUDIT LOGS TABLE & INFRASTRUCTURE
-- =========================================================
-- Purpose: Track all admin actions for accountability and security
-- Features: Who, what, when, where with complete before/after state

-- Drop existing objects
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TYPE IF EXISTS audit_action_type CASCADE;
DROP TYPE IF EXISTS audit_entity_type CASCADE;
DROP TYPE IF EXISTS audit_severity CASCADE;

-- Create enum types for better data integrity
CREATE TYPE audit_action_type AS ENUM (
  'USER_CREATED',
  'USER_UPDATED',
  'USER_BANNED',
  'USER_UNBANNED',
  'USER_DELETED',
  'PARTNER_CREATED',
  'PARTNER_APPROVED',
  'PARTNER_REJECTED',
  'PARTNER_SUSPENDED',
  'PARTNER_DELETED',
  'OFFER_CREATED',
  'OFFER_APPROVED',
  'OFFER_REJECTED',
  'OFFER_DELETED',
  'POINTS_GRANTED',
  'POINTS_DEDUCTED',
  'SYSTEM_SETTING_CHANGED',
  'MAINTENANCE_TOGGLED',
  'ANNOUNCEMENT_SENT',
  'PENALTY_CREATED',
  'PENALTY_ACKNOWLEDGED',
  'RESERVATION_CANCELLED',
  'DATA_EXPORTED',
  'OTHER'
);

CREATE TYPE audit_entity_type AS ENUM (
  'USER',
  'PARTNER',
  'OFFER',
  'RESERVATION',
  'TRANSACTION',
  'PENALTY',
  'SYSTEM',
  'OTHER'
);

CREATE TYPE audit_severity AS ENUM (
  'INFO',
  'WARNING',
  'ERROR',
  'CRITICAL'
);

-- Create audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Who performed the action
  admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  admin_email TEXT NOT NULL,
  admin_name TEXT,
  
  -- What happened
  action_type audit_action_type NOT NULL,
  entity_type audit_entity_type NOT NULL,
  entity_id UUID, -- ID of affected entity
  entity_name TEXT, -- Name/identifier of affected entity
  
  -- Details
  action_description TEXT NOT NULL,
  before_state JSONB, -- State before action
  after_state JSONB, -- State after action
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional context
  
  -- When
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Request context
  ip_address INET,
  user_agent TEXT,
  request_id TEXT, -- For tracing related actions
  
  -- Severity level
  severity audit_severity DEFAULT 'INFO',
  
  -- Success/failure
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  
  -- Search optimization
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', 
      COALESCE(admin_email, '') || ' ' || 
      COALESCE(admin_name, '') || ' ' || 
      COALESCE(action_description, '') || ' ' ||
      COALESCE(entity_name, '')
    )
  ) STORED
);

-- Create indexes for fast queries
CREATE INDEX idx_audit_logs_admin_user ON audit_logs(admin_user_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX idx_audit_logs_request_id ON audit_logs(request_id) WHERE request_id IS NOT NULL;
CREATE INDEX idx_audit_logs_search ON audit_logs USING GIN(search_vector);

-- Composite indexes for common queries
CREATE INDEX idx_audit_logs_admin_date ON audit_logs(admin_user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action_date ON audit_logs(action_type, created_at DESC);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admins only can view and insert)
CREATE POLICY "Admins can view all audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
        AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can insert audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
        AND users.role = 'ADMIN'
    )
  );

-- No UPDATE or DELETE policies - audit logs are immutable

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 
  'Complete audit trail of all admin actions. Immutable once created. 
   Use for compliance, security monitoring, and troubleshooting.';

COMMENT ON COLUMN audit_logs.admin_user_id IS 'Admin who performed the action';
COMMENT ON COLUMN audit_logs.action_type IS 'Type of action performed (enum)';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity affected (enum)';
COMMENT ON COLUMN audit_logs.entity_id IS 'UUID of affected entity';
COMMENT ON COLUMN audit_logs.before_state IS 'State before action (JSONB)';
COMMENT ON COLUMN audit_logs.after_state IS 'State after action (JSONB)';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context (JSONB)';
COMMENT ON COLUMN audit_logs.severity IS 'Severity level: INFO, WARNING, ERROR, CRITICAL';
COMMENT ON COLUMN audit_logs.search_vector IS 'Full-text search vector (auto-generated)';

-- Create retention policy function (optional - keep 1 year by default)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete audit logs older than 1 year
  DELETE FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '1 year'
    AND severity = 'INFO'; -- Keep warnings and errors longer
  
  -- Log the cleanup
  RAISE NOTICE 'Cleaned up audit logs older than 1 year';
END;
$$;

COMMENT ON FUNCTION cleanup_old_audit_logs() IS 
  'Cleanup audit logs older than 1 year (INFO only). 
   Run periodically via cron or scheduled job.';

-- Verify table was created
SELECT 
  '=== AUDIT LOGS TABLE CREATED ===' as status,
  'All admin actions will now be logged' as message;

-- Show table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'audit_logs'
ORDER BY ordinal_position;

-- Show enum types
SELECT 
  'Action Types:' as category,
  enumlabel as value
FROM pg_enum
WHERE enumtypid = 'audit_action_type'::regtype
UNION ALL
SELECT 
  'Entity Types:' as category,
  enumlabel as value
FROM pg_enum
WHERE enumtypid = 'audit_entity_type'::regtype
UNION ALL
SELECT 
  'Severity Levels:' as category,
  enumlabel as value
FROM pg_enum
WHERE enumtypid = 'audit_severity'::regtype;
