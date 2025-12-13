-- Update all partner_points to have 4 default slots
-- This fixes the "1/0" slots display issue

-- Temporarily disable foreign key constraint to clean up orphaned records
ALTER TABLE partner_points DROP CONSTRAINT IF EXISTS partner_points_partner_id_fkey;

-- Clean up any orphaned partner_points records (where user_id doesn't exist in partners)
DELETE FROM partner_points pp
WHERE NOT EXISTS (
  SELECT 1 FROM partners p WHERE p.user_id = pp.user_id
);

-- Re-add the foreign key constraint (referencing auth.users, not partners table)
ALTER TABLE partner_points 
ADD CONSTRAINT partner_points_partner_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing partner_points to have 4 slots
UPDATE partner_points pp
SET 
  offer_slots = 4,
  updated_at = NOW()
FROM partners p
WHERE pp.user_id = p.user_id 
  AND p.status = 'APPROVED';

-- Insert missing partner_points records with 4 default slots (for any partners without a record)
INSERT INTO partner_points (user_id, balance, offer_slots, created_at, updated_at)
SELECT 
  p.user_id,
  0 as balance,           -- Start with 0 points
  4 as offer_slots,       -- Default 4 slots
  NOW() as created_at,
  NOW() as updated_at
FROM partners p
WHERE NOT EXISTS (
  SELECT 1 FROM partner_points pp WHERE pp.user_id = p.user_id
)
AND p.status = 'APPROVED'
ON CONFLICT (user_id) DO NOTHING;

-- Verify the results
SELECT 
  p.business_name,
  p.user_id,
  pp.balance as points,
  pp.offer_slots as max_slots,
  COUNT(o.id) FILTER (WHERE o.status = 'ACTIVE') as active_offers
FROM partners p
LEFT JOIN partner_points pp ON pp.user_id = p.user_id
LEFT JOIN offers o ON o.partner_id = p.id
WHERE p.status = 'APPROVED'
GROUP BY p.id, p.business_name, p.user_id, pp.balance, pp.offer_slots
ORDER BY p.business_name;
