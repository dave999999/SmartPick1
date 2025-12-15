-- ============================================================================
-- DIAGNOSE: What's the schema for partner_points and partner_point_transactions?
-- ============================================================================

-- 1. Check partner_points table structure
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'partner_points' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check partner_point_transactions table structure
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'partner_point_transactions' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check what partner_id values are actually in the transactions table
SELECT 
  partner_id,
  COUNT(*) as transaction_count
FROM partner_point_transactions
GROUP BY partner_id
LIMIT 10;

-- 4. Check if partner_id matches partners.id or partners.user_id
SELECT 
  'Partners table' as source,
  p.id as partner_record_id,
  p.user_id as partner_auth_user_id,
  p.business_name,
  (SELECT COUNT(*) FROM partner_point_transactions WHERE partner_id = p.id) as txns_by_partner_id,
  (SELECT COUNT(*) FROM partner_point_transactions WHERE partner_id = p.user_id) as txns_by_user_id
FROM partners p
LIMIT 5;

-- This will show us which column the transactions table actually uses
