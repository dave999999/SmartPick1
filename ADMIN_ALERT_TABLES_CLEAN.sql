-- =====================================================
-- Admin Alert System - Database Schema (CLEAN VERSION)
-- =====================================================
-- This DROPS existing tables and recreates them fresh
-- Run this in Supabase SQL Editor
-- WARNING: This will DELETE all existing alert data!
-- =====================================================

-- Drop existing tables (CASCADE to drop dependent objects)
DROP TABLE IF EXISTS alert_events CASCADE;
DROP TABLE IF EXISTS alert_rules CASCADE;
DROP TABLE IF EXISTS system_alerts CASCADE;

-- 1. Alert rules configuration
CREATE TABLE alert_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  condition_type TEXT NOT NULL,
  metric TEXT NOT NULL, -- e.g., 'revenue_per_hour', 'error_rate', 'active_users'
  threshold_value NUMERIC,
  comparison TEXT NOT NULL,
  time_window_minutes INTEGER NOT NULL,
  notification_channels TEXT[] NOT NULL, -- ['EMAIL', 'IN_APP', 'SLACK', 'SMS']
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_triggered TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_ar_category CHECK (category IN ('REVENUE', 'ERRORS', 'PERFORMANCE', 'SECURITY', 'PARTNERS', 'USERS')),
  CONSTRAINT chk_ar_severity CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
  CONSTRAINT chk_ar_condition_type CHECK (condition_type IN ('THRESHOLD', 'PERCENTAGE_DROP', 'PATTERN', 'ANOMALY')),
  CONSTRAINT chk_ar_comparison CHECK (comparison IN ('GREATER_THAN', 'LESS_THAN', 'EQUALS', 'CHANGE_BY'))
);

-- 2. Alert events (triggered alerts)
CREATE TABLE alert_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id UUID REFERENCES alert_rules(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  current_value NUMERIC,
  threshold_value NUMERIC,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  metadata JSONB,
  CONSTRAINT chk_ae_severity CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL'))
);

-- 3. System alerts (for general platform issues)
CREATE TABLE system_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  severity TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  auto_generated BOOLEAN DEFAULT false,
  metadata JSONB,
  CONSTRAINT chk_sa_severity CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
  CONSTRAINT chk_sa_category CHECK (category IN ('REVENUE', 'ERRORS', 'PERFORMANCE', 'SECURITY', 'PARTNERS', 'USERS'))
);

-- Indexes for performance
CREATE INDEX idx_alert_rules_enabled ON alert_rules(enabled);
CREATE INDEX idx_alert_rules_category ON alert_rules(category);
CREATE INDEX idx_alert_events_rule_id ON alert_events(rule_id);
CREATE INDEX idx_alert_events_timestamp ON alert_events(timestamp DESC);
CREATE INDEX idx_alert_events_acknowledged ON alert_events(acknowledged);
CREATE INDEX idx_alert_events_resolved ON alert_events(resolved);
CREATE INDEX idx_system_alerts_timestamp ON system_alerts(timestamp DESC);
CREATE INDEX idx_system_alerts_resolved ON system_alerts(resolved);

-- RLS Policies (Security)
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

-- Only admins can manage alert rules
CREATE POLICY admin_alert_rules_all ON alert_rules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Only admins can view and manage alert events
CREATE POLICY admin_alert_events_all ON alert_events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Only admins can view system alerts
CREATE POLICY admin_system_alerts_all ON system_alerts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Grant permissions
GRANT ALL ON alert_rules TO authenticated;
GRANT ALL ON alert_events TO authenticated;
GRANT ALL ON system_alerts TO authenticated;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_alert_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER alert_rules_updated_at
  BEFORE UPDATE ON alert_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_alert_rules_updated_at();

COMMENT ON TABLE alert_rules IS 'Configuration for automated alert monitoring rules';
COMMENT ON TABLE alert_events IS 'Log of triggered alerts from rules';
COMMENT ON TABLE system_alerts IS 'General platform alerts not tied to specific rules';
