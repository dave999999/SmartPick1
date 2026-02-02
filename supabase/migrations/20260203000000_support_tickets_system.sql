-- Support Tickets System Enhancement
-- Extends contact_submissions table with admin features

-- Add missing columns to contact_submissions
ALTER TABLE contact_submissions
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS internal_notes TEXT,
ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ;

-- Create ticket_messages table for conversation thread
CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES contact_submissions(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'admin')),
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false, -- Internal notes visible only to admins
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_priority ON contact_submissions(priority);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_assigned_to ON contact_submissions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_email ON contact_submissions(email);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_sla ON contact_submissions(sla_due_at) WHERE status != 'resolved' AND status != 'closed';
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created_at ON ticket_messages(created_at DESC);

-- Function to calculate SLA due time based on priority
CREATE OR REPLACE FUNCTION calculate_sla_due_time(priority_level VARCHAR)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  CASE priority_level
    WHEN 'urgent' THEN RETURN NOW() + INTERVAL '30 minutes';
    WHEN 'high' THEN RETURN NOW() + INTERVAL '2 hours';
    WHEN 'medium' THEN RETURN NOW() + INTERVAL '8 hours';
    WHEN 'low' THEN RETURN NOW() + INTERVAL '24 hours';
    ELSE RETURN NOW() + INTERVAL '8 hours';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-calculate SLA on insert
CREATE OR REPLACE FUNCTION set_sla_due_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sla_due_at IS NULL THEN
    NEW.sla_due_at := calculate_sla_due_time(NEW.priority);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_sla_due_time ON contact_submissions;
CREATE TRIGGER trigger_set_sla_due_time
  BEFORE INSERT ON contact_submissions
  FOR EACH ROW
  EXECUTE FUNCTION set_sla_due_time();

-- Function to get ticket stats
CREATE OR REPLACE FUNCTION get_ticket_stats()
RETURNS TABLE (
  total_tickets BIGINT,
  unassigned_tickets BIGINT,
  pending_tickets BIGINT,
  sla_at_risk BIGINT,
  resolved_today BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_tickets,
    COUNT(*) FILTER (WHERE assigned_to IS NULL AND status NOT IN ('resolved', 'closed')) as unassigned_tickets,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_tickets,
    COUNT(*) FILTER (WHERE sla_due_at < NOW() + INTERVAL '1 hour' AND status NOT IN ('resolved', 'closed')) as sla_at_risk,
    COUNT(*) FILTER (WHERE resolved_at >= CURRENT_DATE AND status = 'resolved') as resolved_today
  FROM contact_submissions;
END;
$$ LANGUAGE plpgsql;

-- RPC function to assign ticket
CREATE OR REPLACE FUNCTION assign_ticket(
  p_ticket_id UUID,
  p_admin_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  UPDATE contact_submissions
  SET 
    assigned_to = p_admin_id,
    status = CASE 
      WHEN status = 'pending' THEN 'in_progress'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = p_ticket_id;

  IF FOUND THEN
    v_result := jsonb_build_object('success', true);
  ELSE
    v_result := jsonb_build_object('success', false, 'error', 'Ticket not found');
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to resolve ticket
CREATE OR REPLACE FUNCTION resolve_ticket(
  p_ticket_id UUID,
  p_admin_id UUID,
  p_resolution_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  UPDATE contact_submissions
  SET 
    status = 'resolved',
    resolved_at = NOW(),
    resolved_by = p_admin_id,
    internal_notes = COALESCE(internal_notes || E'\n\nResolution: ' || p_resolution_notes, p_resolution_notes),
    updated_at = NOW()
  WHERE id = p_ticket_id;

  IF FOUND THEN
    v_result := jsonb_build_object('success', true);
  ELSE
    v_result := jsonb_build_object('success', false, 'error', 'Ticket not found');
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON contact_submissions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ticket_messages TO authenticated;
GRANT EXECUTE ON FUNCTION get_ticket_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION assign_ticket(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_ticket(UUID, UUID, TEXT) TO authenticated;

-- Add comment
COMMENT ON TABLE contact_submissions IS 'Support tickets from contact form - now with admin management features';
COMMENT ON TABLE ticket_messages IS 'Conversation thread for support tickets';
COMMENT ON FUNCTION get_ticket_stats() IS 'Returns aggregated stats for support tickets dashboard';
