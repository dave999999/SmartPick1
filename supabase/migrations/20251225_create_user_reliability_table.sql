-- Create user_reliability table if it doesn't exist
-- This table tracks user cancellation behavior for the cooldown system

CREATE TABLE IF NOT EXISTS public.user_reliability (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add consecutive_cancels column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_reliability' 
    AND column_name = 'consecutive_cancels'
  ) THEN
    ALTER TABLE public.user_reliability ADD COLUMN consecutive_cancels INT NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add last_cooldown_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_reliability' 
    AND column_name = 'last_cooldown_at'
  ) THEN
    ALTER TABLE public.user_reliability ADD COLUMN last_cooldown_at TIMESTAMPTZ;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_reliability_user_id ON public.user_reliability(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reliability_cooldown ON public.user_reliability(last_cooldown_at) WHERE last_cooldown_at IS NOT NULL;

-- Enable RLS
ALTER TABLE public.user_reliability ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own reliability data
DROP POLICY IF EXISTS "Users can view own reliability" ON public.user_reliability;
CREATE POLICY "Users can view own reliability" ON public.user_reliability
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: System can manage reliability (for functions)
DROP POLICY IF EXISTS "System can manage reliability" ON public.user_reliability;
CREATE POLICY "System can manage reliability" ON public.user_reliability
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.user_reliability TO authenticated;
GRANT ALL ON public.user_reliability TO service_role;

COMMENT ON TABLE public.user_reliability IS 'Tracks user cancellation history and cooldown status';
COMMENT ON COLUMN public.user_reliability.consecutive_cancels IS 'Number of consecutive cancellations';
COMMENT ON COLUMN public.user_reliability.last_cooldown_at IS 'When the user entered cooldown (NULL if not in cooldown)';

SELECT '✅ user_reliability table created successfully' as result;
