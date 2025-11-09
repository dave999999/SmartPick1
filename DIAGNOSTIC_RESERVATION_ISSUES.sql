-- DIAGNOSTIC: Check reservation issues

-- ==========================================
-- ISSUE 1: Check if user_cancel_reservation_split function exists
-- ==========================================
SELECT 
    '=== ISSUE 1: Cancel Reservation Function ===' AS check_name,
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%cancel%reservation%';

-- ==========================================
-- ISSUE 2: Check if create_reservation_atomic function exists
-- ==========================================
SELECT 
    '=== ISSUE 2: Create Reservation Function ===' AS check_name,
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'create_reservation_atomic';

-- ==========================================
-- ISSUE 3: Check RLS policies on reservations table
-- ==========================================
SELECT 
    '=== ISSUE 3: Reservation RLS Policies ===' AS check_name,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'reservations'
AND schemaname = 'public'
ORDER BY cmd;

-- ==========================================
-- ISSUE 4: Check if you have any active reservations
-- ==========================================
SELECT 
    '=== ISSUE 4: Your Active Reservations ===' AS check_name,
    r.id,
    r.status,
    r.quantity,
    o.title as offer_title,
    r.created_at
FROM public.reservations r
JOIN public.offers o ON o.id = r.offer_id
WHERE r.customer_id = '0f069ba3-2c87-44fe-99a0-97ba74532a86'
AND r.status = 'ACTIVE'
ORDER BY r.created_at DESC;

-- ==========================================
-- ISSUE 5: Check your newly created offers
-- ==========================================
SELECT 
    '=== ISSUE 5: Your Recent Offers ===' AS check_name,
    id,
    title,
    status,
    quantity_available,
    quantity_total,
    created_at
FROM public.offers
WHERE partner_id = '0384c929-0af0-4124-a64a-85e63cba5f1a'
ORDER BY created_at DESC
LIMIT 5;

-- ==========================================
-- ISSUE 6: Check user penalty status
-- ==========================================
SELECT 
    '=== ISSUE 6: Your User Status ===' AS check_name,
    id,
    status,
    penalty_until,
    penalty_count
FROM public.users
WHERE id = '0f069ba3-2c87-44fe-99a0-97ba74532a86';
