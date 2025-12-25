-- Add cooldown_lifted_at column to track when cooldown was lifted
ALTER TABLE user_cancellation_tracking
ADD COLUMN IF NOT EXISTS cooldown_lifted_at TIMESTAMPTZ;

-- Create table to track cooldown lifts (better than a column)
CREATE TABLE IF NOT EXISTS user_cooldown_lifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lifted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancellation_count_at_lift INTEGER NOT NULL,
  lift_type TEXT NOT NULL, -- 'free' or 'paid'
  points_spent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cooldown_lifts_user_lifted 
ON user_cooldown_lifts(user_id, lifted_at DESC);

-- Grant permissions
ALTER TABLE user_cooldown_lifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_cooldown_lifts_select ON user_cooldown_lifts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY user_cooldown_lifts_insert ON user_cooldown_lifts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
