-- URGENT: Check if partner.user_id contains email or UUID
-- Run this in Supabase SQL Editor

-- 1. Check the specific partner's user_id
SELECT 
  id,
  email,
  user_id,
  LEFT(user_id::text, 50) as user_id_preview,
  CASE 
    WHEN user_id::text LIKE '%@%' THEN '🚨 EMAIL IN USER_ID!'
    ELSE '✅ Looks like UUID'
  END as diagnosis
FROM partners
WHERE email = 'batumashvili.davit@gmail.com';

-- 2. Check partners table schema for user_id column type
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'partners' 
AND column_name = 'user_id';

-- 3. If user_id IS text/varchar containing emails, we need to fix it!
-- First, let's see how many partners have this issue:
SELECT 
  COUNT(*) as total_partners,
  COUNT(CASE WHEN user_id::text LIKE '%@%' THEN 1 END) as with_email,
  COUNT(CASE WHEN user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 END) as with_uuid
FROM partners;
