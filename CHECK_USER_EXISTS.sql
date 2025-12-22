-- CHECK: Does this user actually exist in auth.users?

-- 1. Check in auth.users
SELECT 
  '1. Check auth.users' as step,
  id,
  email,
  created_at,
  '✅ User EXISTS in auth.users' as status
FROM auth.users 
WHERE id = '1b5f8b01-157b-4997-8f9b-411eec09b1c9'

UNION ALL

SELECT 
  '1. Check auth.users' as step,
  NULL as id,
  NULL as email,
  NULL as created_at,
  '❌ USER DOES NOT EXIST IN auth.users!' as status
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE id = '1b5f8b01-157b-4997-8f9b-411eec09b1c9'
);

-- 2. Check partner record
SELECT 
  '2. Check partner record' as step,
  p.id as partner_id,
  p.user_id,
  p.business_name,
  p.email,
  CASE 
    WHEN p.user_id IS NULL THEN '❌ partner.user_id is NULL!'
    WHEN p.user_id = '1b5f8b01-157b-4997-8f9b-411eec09b1c9' THEN '✅ partner.user_id matches'
    ELSE '⚠️ partner.user_id is DIFFERENT: ' || p.user_id::text
  END as status
FROM partners p
WHERE p.email = (SELECT email FROM auth.users WHERE id = '1b5f8b01-157b-4997-8f9b-411eec09b1c9')
   OR p.user_id = '1b5f8b01-157b-4997-8f9b-411eec09b1c9'
LIMIT 1;

-- 3. Find the ACTUAL auth user for this partner
SELECT 
  '3. Find auth user for partner' as step,
  au.id as auth_user_id,
  au.email,
  p.id as partner_id,
  p.business_name,
  '✅ Found matching auth user' as status
FROM partners p
JOIN auth.users au ON au.email = p.email
WHERE p.user_id = '1b5f8b01-157b-4997-8f9b-411eec09b1c9'
   OR au.id = '1b5f8b01-157b-4997-8f9b-411eec09b1c9'
LIMIT 1;

-- 4. Show ALL partners with their auth user status
SELECT 
  '4. All partners with auth user check' as step,
  p.id as partner_id,
  p.user_id,
  p.business_name,
  p.email,
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = p.user_id) THEN '✅ Valid auth.users ID'
    WHEN p.user_id IS NULL THEN '❌ NULL user_id'
    ELSE '❌ user_id NOT in auth.users: ' || p.user_id::text
  END as auth_check
FROM partners p
ORDER BY p.created_at DESC
LIMIT 10;

-- 5. CRITICAL: Check if the ID might be a PARTNER ID not USER ID
SELECT 
  '5. Is this a partner.id instead?' as step,
  p.id as partner_id,
  p.user_id as actual_user_id,
  p.business_name,
  CASE 
    WHEN p.id::text = '1b5f8b01-157b-4997-8f9b-411eec09b1c9' THEN '⚠️ THIS IS A PARTNER ID, NOT USER ID!'
    ELSE 'Not a partner ID'
  END as diagnosis
FROM partners p
WHERE p.id::text = '1b5f8b01-157b-4997-8f9b-411eec09b1c9'
   OR p.user_id::text = '1b5f8b01-157b-4997-8f9b-411eec09b1c9';

-- FINAL DIAGNOSIS
SELECT 
  '🔍 FINAL DIAGNOSIS' as result,
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = '1b5f8b01-157b-4997-8f9b-411eec09b1c9')
    THEN '✅ User exists in auth.users - FK constraint is broken'
    
    WHEN EXISTS (SELECT 1 FROM partners WHERE id = '1b5f8b01-157b-4997-8f9b-411eec09b1c9')
    THEN '❌ This is a PARTNER ID, not USER ID! Need to use partner.user_id instead'
    
    ELSE '❌ This ID does not exist anywhere - wrong ID being sent'
  END as diagnosis;
