-- Migration: Add FAST_FOOD and ALCOHOL business types to partners table
-- Created: 2025-01-31

-- Drop the existing CHECK constraint on business_type
ALTER TABLE partners
DROP CONSTRAINT IF EXISTS partners_business_type_check;

-- Add the new CHECK constraint with FAST_FOOD and ALCOHOL included
ALTER TABLE partners
ADD CONSTRAINT partners_business_type_check
CHECK (business_type::text = ANY (
  ARRAY['BAKERY', 'RESTAURANT', 'CAFE', 'GROCERY', 'FAST_FOOD', 'ALCOHOL']::text[]
));

-- Add a comment to document the change
COMMENT ON CONSTRAINT partners_business_type_check ON partners
IS 'Ensures business_type is one of: BAKERY, RESTAURANT, CAFE, GROCERY, FAST_FOOD, ALCOHOL';
