-- ============================================
-- CHECK 6-PARAMETER FUNCTION SOURCE CODE
-- ============================================

SELECT 
  'FUNCTION SOURCE:' as info,
  substring(prosrc from 'INSERT INTO point_transactions[^;]+;') as insert_statement
FROM pg_proc
WHERE proname = 'create_reservation_atomic'
  AND oid = 122308;  -- The 6-parameter version

-- Show the full function if needed
SELECT prosrc
FROM pg_proc
WHERE proname = 'create_reservation_atomic'
  AND oid = 122308;
