-- Add auto-relist feature to offers table
-- This allows partners to automatically relist offers daily during business hours

-- Add auto_relist_enabled column to offers table
ALTER TABLE offers 
ADD COLUMN IF NOT EXISTS auto_relist_enabled BOOLEAN DEFAULT FALSE;

-- Add last_relisted_at column to track when offers were last relisted
ALTER TABLE offers 
ADD COLUMN IF NOT EXISTS last_relisted_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient querying of auto-relistable offers
CREATE INDEX IF NOT EXISTS idx_offers_auto_relist 
ON offers(auto_relist_enabled, partner_id) 
WHERE auto_relist_enabled = TRUE AND status = 'ACTIVE';

-- Add comment to explain the feature
COMMENT ON COLUMN offers.auto_relist_enabled IS 'When enabled, this offer will be automatically relisted daily during business hours';
COMMENT ON COLUMN offers.last_relisted_at IS 'Timestamp of the last automatic relist operation';
