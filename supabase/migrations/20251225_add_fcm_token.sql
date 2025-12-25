-- Add FCM token column to push_subscriptions table
-- This enables Firebase Cloud Messaging for native mobile apps (iOS/Android)

-- Add fcm_token column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'push_subscriptions' 
        AND column_name = 'fcm_token'
    ) THEN
        ALTER TABLE push_subscriptions 
        ADD COLUMN fcm_token TEXT;
        
        RAISE NOTICE 'Added fcm_token column to push_subscriptions';
    ELSE
        RAISE NOTICE 'fcm_token column already exists';
    END IF;
END $$;

-- Create index on fcm_token for faster lookups when sending notifications
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_fcm_token 
ON push_subscriptions(fcm_token) 
WHERE fcm_token IS NOT NULL;

-- Update the constraint to allow either subscription OR fcm_token (not both required)
-- This handles both web push subscriptions and native FCM tokens
DO $$ 
BEGIN
    -- Remove old constraint if exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_subscription_or_fcm'
        AND table_name = 'push_subscriptions'
    ) THEN
        ALTER TABLE push_subscriptions DROP CONSTRAINT check_subscription_or_fcm;
    END IF;
    
    -- Add new constraint
    ALTER TABLE push_subscriptions 
    ADD CONSTRAINT check_subscription_or_fcm 
    CHECK (subscription IS NOT NULL OR fcm_token IS NOT NULL);
    
    RAISE NOTICE 'Added constraint: subscription OR fcm_token must be present';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Constraint already exists';
END $$;

COMMENT ON COLUMN push_subscriptions.fcm_token IS 'Firebase Cloud Messaging token for native mobile apps (iOS/Android via Capacitor)';
