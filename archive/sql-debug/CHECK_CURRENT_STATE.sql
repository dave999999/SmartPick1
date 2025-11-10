-- ============================================
-- CHECK CURRENT STATE - What's actually in the database?
-- ============================================

-- Check if RLS is enabled or disabled
SELECT 
  '🔒 RLS Status' as check_type,
  tablename,
  CASE 
    WHEN rowsecurity THEN '🔴 ENABLED (might be blocking queries)'
    ELSE '🟢 DISABLED (queries should work)'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'partners', 'offers', 'reservations')
ORDER BY tablename;

-- Check if there are any RLS policies
SELECT 
  '📋 Active Policies' as check_type,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('users', 'partners', 'offers', 'reservations')
GROUP BY tablename
ORDER BY tablename;

-- Check if partner record exists for current user
SELECT 
  '👤 Your Partner Record' as check_type,
  p.id,
  p.business_name,
  p.status,
  p.user_id,
  CASE 
    WHEN p.id IS NULL THEN '❌ NO PARTNER RECORD FOUND'
    WHEN p.status = 'PENDING' THEN '⏳ Pending approval'
    WHEN p.status = 'APPROVED' THEN '✅ Approved'
    ELSE '❓ Status: ' || p.status
  END as result
FROM public.partners p
WHERE p.user_id = auth.uid();

-- Check if there are offers for this partner
SELECT 
  '📦 Your Offers' as check_type,
  COUNT(*) as total_offers,
  SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active_offers
FROM public.offers o
WHERE o.partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid());

-- Check if broken functions still exist
SELECT 
  '⚠️  Broken Functions' as check_type,
  proname as function_name,
  CASE 
    WHEN proname = 'partner_mark_as_picked_up' THEN '❌ STILL EXISTS (needs removal)'
    WHEN proname = 'add_partner_points' THEN '❌ STILL EXISTS (needs removal)'
    ELSE '⚠️  EXISTS'
  END as status
FROM pg_proc
WHERE proname IN ('partner_mark_as_picked_up', 'add_partner_points', 'transfer_points_to_partner_on_pickup')
AND pronamespace = 'public'::regnamespace;

-- Try to directly query offers (will show if query works)
SELECT 
  '🧪 Direct Query Test' as check_type,
  o.id,
  o.title,
  o.status
FROM public.offers o
WHERE o.partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
LIMIT 5;

-- Check for any errors in recent migrations
SELECT 
  '📜 Recent Changes' as info,
  'If RLS is ENABLED above, run DISABLE_RLS_NOW.sql' as next_step,
  'If RLS is DISABLED but dashboard still broken, check browser console' as alternative;
