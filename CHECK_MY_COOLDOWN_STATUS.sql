-- =========================================================
-- SIMPLE DEBUG: What's Your Current Cooldown Status?
-- =========================================================

-- STEP 1: Find your user ID (look at the email column)
SELECT id, email, '👤 Your User ID' as info 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 10;

-- Copy your UUID from above, then run the rest replacing YOUR-UUID-HERE

-- STEP 2: Check how many cancellations you have
SELECT 
  COUNT(*) as total_cancellations,
  MAX(cancelled_at) as last_cancellation,
  '📊 Cancellation Count' as info
FROM user_cancellation_tracking
WHERE user_id = 'YOUR-UUID-HERE';  -- ⚠️ REPLACE THIS

-- STEP 3: Check if you're in cooldown
SELECT * FROM is_user_in_cooldown('YOUR-UUID-HERE');  -- ⚠️ REPLACE THIS

-- STEP 4: Check for active penalties
SELECT 
  id,
  reason,
  cooldown_until,
  lifted_at,
  created_at,
  '⚠️ Penalties' as info
FROM penalties
WHERE user_id = 'YOUR-UUID-HERE'  -- ⚠️ REPLACE THIS
AND cooldown_until > NOW()
ORDER BY created_at DESC;

-- ✅ WHAT THE RESULTS MEAN:
-- 
-- total_cancellations = 3: Dialog shows, but NO cooldown yet (you can still reserve)
-- total_cancellations = 4: Dialog shows, but NO cooldown yet (you can still reserve)
-- total_cancellations = 5+: COOLDOWN ACTIVE (can't reserve for 1 hour)
--
-- in_cooldown = true: You're blocked from reserving
-- in_cooldown = false: You can reserve normally
--
-- If you see a penalty with cooldown_until in the future: You're in cooldown
-- If no penalties or cooldown_until is in the past: You're NOT in cooldown
