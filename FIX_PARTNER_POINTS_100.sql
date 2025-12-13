-- COMPREHENSIVE FIX: Ensure all partners have partner_points with 1000 balance and 10 slots
-- This combines initialization, default values, and trigger fixes

-- Step 1: Clean up any orphaned partner_points (points for non-existent partners)
DELETE FROM partner_points 
WHERE user_id NOT IN (SELECT user_id FROM partners);

-- Step 2: Initialize partner_points for ALL existing partners who don't have records
INSERT INTO partner_points (user_id, balance, offer_slots)
SELECT 
  p.user_id,
  1000,  -- Give all partners 1000 points
  10     -- Give all partners 10 slots
FROM partners p
LEFT JOIN partner_points pp ON p.user_id = pp.user_id
WHERE pp.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Step 3: Update ALL existing partner_points to have at least 100 balance and 10 slots
UPDATE partner_points 
SET 
  balance = GREATEST(balance, 1000),  -- Ensure at least 1000 points
  offer_slots = 10                     -- Set to 10 slots
WHERE user_id IN (SELECT user_id FROM partners);

-- Step 4: Set default values for future inserts
ALTER TABLE partner_points 
  ALTER COLUMN balance SET DEFAULT 1000,
  ALTER COLUMN offer_slots SET DEFAULT 10;

-- Step 5: Update the welcome points trigger to give 1000 points and 10 slots
CREATE OR REPLACE FUNCTION grant_partner_welcome_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Only insert if the partner is approved AND wasn't already approved
  IF NEW.status = 'APPROVED' AND (OLD IS NULL OR OLD.status != 'APPROVED') THEN
    INSERT INTO partner_points (user_id, balance, offer_slots)
    VALUES (NEW.user_id, 1000, 10)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      balance = partner_points.balance + 1000,  -- Add 1000 if already exists
      offer_slots = 10;                          -- Ensure 10 slots
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS grant_partner_welcome_points_trigger ON partners;
CREATE TRIGGER grant_partner_welcome_points_trigger
  AFTER INSERT OR UPDATE OF status ON partners
  FOR EACH ROW
  EXECUTE FUNCTION grant_partner_welcome_points();

-- Step 6: Verification query
SELECT 
  p.business_name,
  pp.balance,
  pp.offer_slots
FROM partners p
LEFT JOIN partner_points pp ON p.user_id = pp.user_id
ORDER BY p.business_name;

-- Expected result: ALL partners should have 1000 balance and 10 offer_slots
