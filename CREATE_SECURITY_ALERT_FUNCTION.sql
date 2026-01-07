-- Create or replace the create_security_alert function
-- This function is used by the image upload security system

-- First, check if security_alerts table exists, if not create it
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_security_alerts_partner_id ON security_alerts(partner_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at);

-- Drop existing function if it exists (any signature)
DROP FUNCTION IF EXISTS public.create_security_alert(UUID, TEXT, TEXT, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.create_security_alert(UUID, TEXT, JSONB) CASCADE;

-- Create the function with the signature that matches the code
CREATE OR REPLACE FUNCTION public.create_security_alert(
  p_partner_id UUID,
  p_alert_type TEXT,
  p_description TEXT,
  p_severity TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
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
$$;

COMMENT ON FUNCTION public.create_security_alert IS 
'Creates security alert for suspicious or problematic upload activity';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_security_alert TO authenticated;

-- Verify function was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'create_security_alert'
  ) THEN
    RAISE NOTICE '✅ create_security_alert function created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create create_security_alert function';
  END IF;
END $$;
