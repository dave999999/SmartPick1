-- ============================================
-- FIX: Check what columns user_stats has
-- ============================================

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_stats'
ORDER BY ordinal_position;
