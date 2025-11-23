-- Create app_metadata table for deployment version tracking
-- This allows backend changes to trigger frontend update notifications

CREATE TABLE IF NOT EXISTS public.app_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.app_metadata ENABLE ROW LEVEL SECURITY;

-- Anyone can read metadata (for update checking)
DROP POLICY IF EXISTS "Anyone can read app metadata" ON public.app_metadata;
CREATE POLICY "Anyone can read app metadata"
  ON public.app_metadata FOR SELECT
  USING (true);

-- Only admins can update metadata
DROP POLICY IF EXISTS "Admins can manage app metadata" ON public.app_metadata;
CREATE POLICY "Admins can manage app metadata"
  ON public.app_metadata FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Insert initial version
INSERT INTO public.app_metadata (key, value, description, updated_at)
VALUES 
  ('schema_version', '20251123-001', 'Current database schema version', NOW()),
  ('last_migration', 'app_metadata_table', 'Last applied migration name', NOW())
ON CONFLICT (key) DO NOTHING;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public._app_metadata_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_app_metadata_touch_updated_at ON public.app_metadata;
CREATE TRIGGER trg_app_metadata_touch_updated_at
  BEFORE UPDATE ON public.app_metadata
  FOR EACH ROW EXECUTE FUNCTION public._app_metadata_touch_updated_at();

COMMENT ON TABLE public.app_metadata IS 'Stores application metadata for version tracking and update notifications';
COMMENT ON COLUMN public.app_metadata.key IS 'Unique metadata key (e.g., schema_version, migration_version)';
COMMENT ON COLUMN public.app_metadata.value IS 'Metadata value';
COMMENT ON COLUMN public.app_metadata.updated_at IS 'Last update timestamp - triggers client refresh notifications';

-- Example usage after migrations:
-- UPDATE public.app_metadata SET value = '20251123-002' WHERE key = 'schema_version';
