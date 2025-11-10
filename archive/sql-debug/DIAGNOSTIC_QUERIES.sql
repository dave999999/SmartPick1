-- DIAGNOSTIC QUERIES FOR "FAILED TO DEDUCT POINTS" ERROR
-- Run these in Supabase SQL Editor to diagnose the issue

-- ==========================================
-- 1. CHECK IF MIGRATIONS WERE APPLIED
-- ==========================================

-- Check if database functions exist
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'create_reservation_atomic',
    'add_partner_points',
    'purchase_partner_offer_slot',
    'user_confirm_pickup',
    'partner_mark_no_show',
    'user_cancel_reservation_split'
  )
ORDER BY routine_name;

-- ✅ Expected: 6 rows (all functions should exist)
-- ❌ If less than 6: Migrations not fully applied

-- ==========================================
-- 2. CHECK IF TABLES EXIST
-- ==========================================

SELECT 
  table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'user_points',
    'point_transactions',
    'partner_points',
    'partner_point_transactions',
    'reservations'
  )
ORDER BY table_name;

-- ✅ Expected: 5 rows (all tables should exist)

-- ==========================================
-- 3. CHECK USER POINTS BALANCE
-- ==========================================

-- Replace 'YOUR_USER_EMAIL@example.com' with your test user's email
SELECT 
  u.email,
  u.id as user_id,
  COALESCE(up.balance, 0) as points_balance
FROM auth.users u
LEFT JOIN user_points up ON up.user_id = u.id
WHERE u.email = 'YOUR_USER_EMAIL@example.com';

-- ✅ Expected: Shows user with points balance
-- ❌ If balance is NULL or 0: User has no points (need 15 minimum)

-- ==========================================
-- 4. CHECK IF USER_POINTS TABLE HAS DATA
-- ==========================================

SELECT 
  u.email,
  up.balance,
  up.created_at
FROM user_points up
JOIN auth.users u ON u.id = up.user_id
ORDER BY up.created_at DESC
LIMIT 10;

-- Shows recent user points records

-- ==========================================
-- 5. CHECK RLS POLICIES ON RESERVATIONS
-- ==========================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('reservations', 'user_points', 'point_transactions')
ORDER BY tablename, policyname;

-- Shows Row Level Security policies

-- ==========================================
-- 6. TEST FUNCTION DIRECTLY
-- ==========================================

-- Get your user_id first
SELECT id, email FROM auth.users WHERE email = 'YOUR_USER_EMAIL@example.com';

-- Get an active offer_id
SELECT id, title FROM offers WHERE status = 'ACTIVE' LIMIT 1;

-- Then test the function (replace UUIDs):
SELECT create_reservation_atomic(
  'OFFER_UUID_HERE'::uuid,
  1, -- quantity
  'TEST-QR-' || now()::text, -- qr_code
  10.00, -- total_price
  (now() + interval '30 minutes')::timestamptz -- expires_at
);

-- ✅ Expected: Returns JSON with reservation details
-- ❌ If error: Shows exact error message

-- ==========================================
-- 7. GRANT POINTS TO TEST USER (IF NEEDED)
-- ==========================================

-- Get your user_id first, then run:
DO $$
DECLARE
  v_user_id UUID := 'YOUR_USER_UUID_HERE'::uuid;
  v_amount INT := 100;
BEGIN
  -- Insert or update user_points
  INSERT INTO user_points (user_id, balance)
  VALUES (v_user_id, v_amount)
  ON CONFLICT (user_id) 
  DO UPDATE SET balance = user_points.balance + v_amount;
  
  -- Log transaction
  INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after)
  VALUES (
    v_user_id, 
    v_amount, 
    'ADMIN_GRANT', 
    COALESCE((SELECT balance - v_amount FROM user_points WHERE user_id = v_user_id), 0),
    (SELECT balance FROM user_points WHERE user_id = v_user_id)
  );
  
  RAISE NOTICE 'Granted % points to user %', v_amount, v_user_id;
END $$;

-- ==========================================
-- 8. CHECK RECENT ERRORS IN LOGS
-- ==========================================

-- If you have logging enabled, check for recent errors
SELECT 
  created_at,
  event_message,
  metadata
FROM auth.audit_log_entries
WHERE event_message LIKE '%error%'
  OR event_message LIKE '%fail%'
ORDER BY created_at DESC
LIMIT 20;

-- ==========================================
-- COMMON ISSUES & SOLUTIONS
-- ==========================================

/*
Issue 1: "function create_reservation_atomic does not exist"
Solution: Apply migration 2 (20251108_add_points_to_reservation.sql)

Issue 2: "table user_points does not exist"
Solution: Apply the user points migration first (should be in an earlier migration)

Issue 3: "insufficient points"
Solution: Run query #7 to grant points to test user

Issue 4: "permission denied"
Solution: Check RLS policies (query #5) and ensure service_role is used where needed

Issue 5: "column user_confirmed_pickup does not exist"
Solution: Apply migration 3 (20251108_points_escrow_system.sql)
*/
