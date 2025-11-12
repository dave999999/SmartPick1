-- =====================================================
-- INCREASE PICKUP WINDOW TO 90 MINUTES
-- Update all references from 30 minutes to 90 minutes
-- =====================================================

-- This migration updates pickup window duration
-- Previous: 30 minutes
-- New: 90 minutes (1.5 hours)

-- Note: The actual pickup window duration is calculated in application code
-- This SQL file documents the change and updates any database-level defaults

COMMENT ON DATABASE postgres IS 'Pickup window increased from 30 to 90 minutes as of 2025-11-13';

-- If you have any database-level constants or configurations, update them here
-- Most pickup window logic is handled in src/lib/api.ts
