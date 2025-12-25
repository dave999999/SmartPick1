-- ============================================================================
-- PARTNER IMAGE UPLOAD SECURITY SYSTEM
-- Date: 2024-12-24
-- Purpose: Implement secure image upload with quotas, rate limiting, and logging
-- Features: 2MB limit, 15 images per partner, rate limiting, security logging
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ADD IMAGE QUOTA FIELDS TO PARTNERS TABLE
-- ============================================================================

-- Add quota tracking columns
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS image_quota_used int DEFAULT 0 CHECK (image_quota_used >= 0),
ADD COLUMN IF NOT EXISTS image_quota_max int DEFAULT 15 CHECK (image_quota_max > 0);

-- Set default for existing partners
UPDATE partners 
SET image_quota_used = 0, 
    image_quota_max = 15 
WHERE image_quota_used IS NULL 
   OR image_quota_max IS NULL;

-- Add constraint to ensure quota_used never exceeds quota_max
ALTER TABLE partners 
ADD CONSTRAINT check_quota_limit 
CHECK (image_quota_used <= image_quota_max);

-- Add index for quota queries
CREATE INDEX IF NOT EXISTS idx_partners_quota 
ON partners(id, image_quota_used, image_quota_max);

COMMENT ON COLUMN partners.image_quota_used IS 
'Number of images currently uploaded by partner in their gallery';

COMMENT ON COLUMN partners.image_quota_max IS 
'Maximum number of images partner can upload (default 15, can be increased by admin)';

-- ============================================================================
-- 2. CREATE UPLOAD LOGGING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS partner_upload_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  file_name text,
  file_size bigint,
  file_type text,
  bucket_name text,
  success boolean DEFAULT true,
  error_message text,
  ip_address inet,
  user_agent text,
  uploaded_at timestamptz DEFAULT now()
);

-- Indexes for performance and rate limiting queries
CREATE INDEX IF NOT EXISTS idx_upload_log_partner_time 
ON partner_upload_log(partner_id, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_upload_log_time 
ON partner_upload_log(uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_upload_log_partner_success 
ON partner_upload_log(partner_id, success, uploaded_at DESC);

COMMENT ON TABLE partner_upload_log IS 
'Logs all partner image upload attempts for security monitoring and rate limiting';

-- Enable RLS on upload log
ALTER TABLE partner_upload_log ENABLE ROW LEVEL SECURITY;

-- Policy: Partners can view their own upload history
CREATE POLICY "Partners can view own upload log" 
ON partner_upload_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM partners
    WHERE partners.id = partner_upload_log.partner_id
      AND partners.user_id = auth.uid()
  )
);

-- Policy: System can insert upload logs (SECURITY DEFINER functions)
CREATE POLICY "System can insert upload logs" 
ON partner_upload_log FOR INSERT
WITH CHECK (true); -- Will be restricted by SECURITY DEFINER functions

-- ============================================================================
-- 3. CREATE SECURITY ALERTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES partners(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN (
    'RATE_LIMIT_EXCEEDED',
    'QUOTA_EXCEEDED',
    'INVALID_FILE_TYPE',
    'FILE_TOO_LARGE',
    'SUSPICIOUS_ACTIVITY',
    'MULTIPLE_FAILED_UPLOADS'
  )),
  description text,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  metadata jsonb,
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_security_alerts_partner 
ON security_alerts(partner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_alerts_severity 
ON security_alerts(severity, resolved, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_alerts_type 
ON security_alerts(alert_type, created_at DESC);

COMMENT ON TABLE security_alerts IS 
'Security incidents and suspicious upload activity monitoring';

-- Enable RLS on security alerts
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view security alerts
CREATE POLICY "Admins can view security alerts" 
ON security_alerts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
  )
);

-- ============================================================================
-- 4. RATE LIMITING FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION check_upload_rate_limit(p_partner_id uuid)
RETURNS boolean AS $$
DECLARE
  upload_count int;
  max_uploads int := 10; -- 10 uploads per hour
BEGIN
  -- Count successful uploads in the last hour
  SELECT COUNT(*) INTO upload_count
  FROM partner_upload_log
  WHERE partner_id = p_partner_id
    AND uploaded_at > now() - interval '1 hour'
    AND success = true;
  
  -- Return true if under limit, false if over
  RETURN upload_count < max_uploads;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_upload_rate_limit IS 
'Checks if partner has exceeded upload rate limit (10 uploads per hour)';

-- ============================================================================
-- 5. QUOTA CHECK FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION check_upload_quota(p_partner_id uuid)
RETURNS boolean AS $$
DECLARE
  quota_used int;
  quota_max int;
BEGIN
  -- Get partner's quota
  SELECT image_quota_used, image_quota_max 
  INTO quota_used, quota_max
  FROM partners
  WHERE id = p_partner_id;
  
  -- Return true if under quota, false if at or over quota
  RETURN quota_used < quota_max;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_upload_quota IS 
'Checks if partner has available image quota (default 15 images max)';

-- ============================================================================
-- 6. INCREMENT QUOTA FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_image_quota(p_partner_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE partners
  SET image_quota_used = image_quota_used + 1
  WHERE id = p_partner_id
    AND image_quota_used < image_quota_max;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_image_quota IS 
'Safely increments partner image quota after successful upload';

-- ============================================================================
-- 7. DECREMENT QUOTA FUNCTION (for deletions)
-- ============================================================================

CREATE OR REPLACE FUNCTION decrement_image_quota(p_partner_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE partners
  SET image_quota_used = GREATEST(0, image_quota_used - 1)
  WHERE id = p_partner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION decrement_image_quota IS 
'Safely decrements partner image quota after image deletion';

-- ============================================================================
-- 8. LOG UPLOAD ATTEMPT FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION log_upload_attempt(
  p_partner_id uuid,
  p_file_name text,
  p_file_size bigint,
  p_file_type text,
  p_bucket_name text,
  p_success boolean,
  p_error_message text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO partner_upload_log (
    partner_id,
    file_name,
    file_size,
    file_type,
    bucket_name,
    success,
    error_message
  ) VALUES (
    p_partner_id,
    p_file_name,
    p_file_size,
    p_file_type,
    p_bucket_name,
    p_success,
    p_error_message
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_upload_attempt IS 
'Logs upload attempts for security monitoring and analytics';

-- ============================================================================
-- 9. CREATE SECURITY ALERT FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION create_security_alert(
  p_partner_id uuid,
  p_alert_type text,
  p_description text,
  p_severity text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void AS $$
BEGIN
  INSERT INTO security_alerts (
    partner_id,
    alert_type,
    description,
    severity,
    metadata
  ) VALUES (
    p_partner_id,
    p_alert_type,
    p_description,
    p_severity,
    p_metadata
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_security_alert IS 
'Creates security alert for suspicious or problematic upload activity';

-- ============================================================================
-- 10. UPDATE STORAGE BUCKET FILE SIZE LIMIT
-- ============================================================================

-- Update offer-images bucket to 2MB limit
UPDATE storage.buckets
SET file_size_limit = 2097152,  -- 2MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'offer-images';

-- Update partner-images bucket to 2MB limit  
UPDATE storage.buckets
SET file_size_limit = 2097152,  -- 2MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'partner-images';

-- ============================================================================
-- 11. AUTOMATED SECURITY MONITORING TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION monitor_failed_uploads()
RETURNS TRIGGER AS $$
DECLARE
  failed_count int;
BEGIN
  IF NEW.success = false THEN
    -- Count failed uploads in last 10 minutes
    SELECT COUNT(*) INTO failed_count
    FROM partner_upload_log
    WHERE partner_id = NEW.partner_id
      AND success = false
      AND uploaded_at > now() - interval '10 minutes';
    
    -- Alert if 3+ failures in 10 minutes
    IF failed_count >= 3 THEN
      PERFORM create_security_alert(
        NEW.partner_id,
        'MULTIPLE_FAILED_UPLOADS',
        format('Partner has %s failed upload attempts in 10 minutes', failed_count),
        'medium',
        jsonb_build_object(
          'failed_count', failed_count,
          'recent_error', NEW.error_message
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_monitor_failed_uploads ON partner_upload_log;
CREATE TRIGGER trigger_monitor_failed_uploads
  AFTER INSERT ON partner_upload_log
  FOR EACH ROW
  EXECUTE FUNCTION monitor_failed_uploads();

COMMENT ON FUNCTION monitor_failed_uploads IS 
'Automatically creates security alerts for patterns of failed uploads';

-- ============================================================================
-- 12. GRANT NECESSARY PERMISSIONS
-- ============================================================================

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION check_upload_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION check_upload_quota TO authenticated;
GRANT EXECUTE ON FUNCTION increment_image_quota TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_image_quota TO authenticated;
GRANT EXECUTE ON FUNCTION log_upload_attempt TO authenticated;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify setup)
-- ============================================================================

-- Check partner quota settings
-- SELECT id, business_name, image_quota_used, image_quota_max FROM partners LIMIT 5;

-- Check if functions exist
-- SELECT proname FROM pg_proc WHERE proname LIKE '%quota%' OR proname LIKE '%upload%';

-- Check storage bucket limits
-- SELECT id, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id IN ('offer-images', 'partner-images');
