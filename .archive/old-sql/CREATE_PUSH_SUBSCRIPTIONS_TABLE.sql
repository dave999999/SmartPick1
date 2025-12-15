-- Push Subscriptions Table
-- Stores user push notification subscriptions and preferences

-- Drop table if it exists to start fresh
DROP TABLE IF EXISTS push_subscriptions CASCADE;

CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription TEXT NOT NULL,
  notification_types JSONB NOT NULL DEFAULT '{"nearby": true, "favorite_partner": true, "expiring": true}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for efficient user lookup
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read/write their own subscriptions
CREATE POLICY "Users can manage own push subscriptions"
  ON push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscriptions_updated_at();

COMMENT ON TABLE push_subscriptions IS 'Stores push notification subscriptions and user preferences';
COMMENT ON COLUMN push_subscriptions.subscription IS 'Stringified Push subscription JSON containing endpoint and keys';
COMMENT ON COLUMN push_subscriptions.notification_types IS 'User preferences for notification types: nearby, favorite_partner, expiring';

-- Test the table structure
SELECT 'Push subscriptions table created successfully' AS status;
