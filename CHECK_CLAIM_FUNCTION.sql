-- Check if claim_achievement function exists and its signature
SELECT 
  routine_name,
  routine_type,
  data_type as return_type,
  ARRAY_AGG(parameter_name || ' ' || data_type ORDER BY ordinal_position) as parameters
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p 
  ON r.specific_name = p.specific_name
WHERE routine_name = 'claim_achievement'
  AND routine_schema = 'public'
GROUP BY routine_name, routine_type, data_type;

-- Check grants
SELECT 
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'claim_achievement'
  AND routine_schema = 'public';
