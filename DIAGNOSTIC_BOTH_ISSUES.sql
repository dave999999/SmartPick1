-- ================================================
-- DIAGNOSTIC: Check achievements and offers issues
-- ================================================

-- 1. Check if achievements exist
SELECT COUNT(*) as achievement_count FROM public.achievement_definitions;

-- 2. Show sample achievements
SELECT id, name, category, tier FROM public.achievement_definitions LIMIT 5;

-- 3. Check partner status (for offer creation)
SELECT 
  p.id,
  p.business_name,
  p.status,
  pp.balance as points,
  pp.offer_slots
FROM public.partners p
LEFT JOIN public.partner_points pp ON pp.partner_id = p.id
ORDER BY p.created_at DESC;

-- 4. Check offers table structure (to confirm columns exist)
SELECT column_name 
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'offers'
ORDER BY ordinal_position;

-- 5. Check RLS policies on offers table
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'offers';
