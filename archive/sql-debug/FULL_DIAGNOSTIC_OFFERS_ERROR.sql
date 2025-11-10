-- COMPREHENSIVE DIAGNOSTIC FOR OFFER CREATION ERROR
-- Run this in Supabase SQL Editor to find the source of "column user_id does not exist" error

-- ==========================================
-- STEP 1: Check actual offers table structure
-- ==========================================
SELECT 
    '=== STEP 1: Offers Table Columns ===' AS step,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'offers'
ORDER BY ordinal_position;

-- ==========================================
-- STEP 2: Check for ANY triggers on offers table
-- ==========================================
SELECT 
    '=== STEP 2: Triggers on Offers Table ===' AS step,
    trigger_name,
    event_manipulation, -- INSERT, UPDATE, DELETE
    action_statement,
    action_timing -- BEFORE or AFTER
FROM information_schema.triggers
WHERE event_object_table = 'offers'
AND event_object_schema = 'public';

-- ==========================================
-- STEP 3: Check trigger functions that might add user_id
-- ==========================================
SELECT 
    '=== STEP 3: Functions Related to Offers ===' AS step,
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (
    routine_name LIKE '%offer%' 
    OR routine_definition LIKE '%offers%'
    OR routine_definition LIKE '%user_id%'
)
ORDER BY routine_name;

-- ==========================================
-- STEP 4: Check RLS policies on offers table
-- ==========================================
SELECT 
    '=== STEP 4: RLS Policies on Offers ===' AS step,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd, -- SELECT, INSERT, UPDATE, DELETE
    qual, -- USING clause
    with_check -- WITH CHECK clause
FROM pg_policies
WHERE tablename = 'offers'
AND schemaname = 'public';

-- ==========================================
-- STEP 5: Test direct INSERT (will reveal exact error)
-- ==========================================
-- This is commented out because it will fail if there's an issue
-- Uncomment to test:
/*
INSERT INTO public.offers (
    partner_id,
    category,
    title,
    description,
    images,
    original_price,
    smart_price,
    quantity_available,
    quantity_total,
    pickup_start,
    pickup_end,
    status,
    expires_at
) VALUES (
    '0384c929-0af0-4124-a64a-85e63cba5f1a'::uuid, -- Your partner ID
    'BAKERY',
    'TEST OFFER - DELETE ME',
    'Testing direct insert to find user_id error source',
    ARRAY['https://example.com/test.jpg'],
    10.00,
    5.00,
    10,
    10,
    NOW() + INTERVAL '1 hour',
    NOW() + INTERVAL '6 hours',
    'ACTIVE',
    NOW() + INTERVAL '6 hours'
) RETURNING *;
*/

-- ==========================================
-- STEP 6: Check if there are any views named offers
-- ==========================================
SELECT 
    '=== STEP 6: Views Named Offers ===' AS step,
    table_name,
    table_type,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name LIKE '%offer%';

-- ==========================================
-- STEP 7: Check PostgREST role and permissions
-- ==========================================
SELECT 
    '=== STEP 7: Anon Role Permissions ===' AS step,
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'offers'
AND grantee = 'anon';
