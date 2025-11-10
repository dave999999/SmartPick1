-- Check what gamification tables exist
SELECT 
    table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND (
    table_name LIKE '%point%'
    OR table_name LIKE '%escrow%'
    OR table_name LIKE '%gamification%'
)
ORDER BY table_name;
