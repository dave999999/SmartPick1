-- Fix Maintenance Mode Issues
-- Run this in Supabase SQL Editor to fix and disable maintenance mode

-- 1. Check if system_settings table exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'system_settings') THEN
    -- Create the table if it doesn't exist
    CREATE TABLE public.system_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key VARCHAR(100) UNIQUE NOT NULL,
      value JSONB NOT NULL,
      description TEXT,
      updated_by UUID REFERENCES auth.users(id),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Enable RLS
    ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

    -- Create policies
    CREATE POLICY "Anyone can read system settings"
      ON public.system_settings FOR SELECT
      USING (true);

    CREATE POLICY "Only admins can update system settings"
      ON public.system_settings FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role = 'ADMIN'
        )
      );

    RAISE NOTICE 'Created system_settings table';
  END IF;
END $$;

-- 2. Ensure maintenance_mode setting exists and is DISABLED
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'maintenance_mode',
  '{"enabled": false}'::jsonb,
  'Controls whether the site is in maintenance mode'
)
ON CONFLICT (key) 
DO UPDATE SET 
  value = '{"enabled": false}'::jsonb,
  updated_at = NOW();

-- 3. Verify the setting
SELECT 
  key, 
  value, 
  value->>'enabled' as enabled_status,
  CASE 
    WHEN (value->>'enabled')::boolean THEN '🔴 MAINTENANCE ON'
    ELSE '✅ MAINTENANCE OFF'
  END as status,
  updated_at
FROM public.system_settings
WHERE key = 'maintenance_mode';

-- 4. If you still can't access admin panel, force disable maintenance mode
UPDATE public.system_settings
SET value = '{"enabled": false}'::jsonb
WHERE key = 'maintenance_mode';

RAISE NOTICE '✅ Maintenance mode has been DISABLED. You can now access the site.';
