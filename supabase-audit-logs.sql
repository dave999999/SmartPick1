-- Audit logging for SmartPick
-- Create logs table for sensitive actions
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(50),
  record_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Log profile changes
CREATE OR REPLACE FUNCTION log_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, details)
  VALUES (
    NEW.id,
    'profile_update',
    'users',
    NEW.id,
    jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_profile_update ON public.users;
CREATE TRIGGER audit_profile_update
  AFTER UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION log_profile_update();

-- Log points changes
CREATE OR REPLACE FUNCTION log_points_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, details)
  VALUES (
    NEW.user_id,
    'points_change',
    'user_points',
    NEW.user_id,
    jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_points_change ON public.user_points;
CREATE TRIGGER audit_points_change
  AFTER UPDATE ON public.user_points
  FOR EACH ROW EXECUTE FUNCTION log_points_change();

-- Log reservation status updates
CREATE OR REPLACE FUNCTION log_reservation_status_update()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, details)
  VALUES (
    NEW.customer_id,
    'reservation_status_update',
    'reservations',
    NEW.id,
    jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_reservation_status_update ON public.reservations;
CREATE TRIGGER audit_reservation_status_update
  AFTER UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION log_reservation_status_update();
