-- Test if the no-show functions exist
SELECT 
    proname as function_name,
    prosrc as function_body
FROM pg_proc 
WHERE proname IN ('partner_mark_no_show', 'partner_mark_no_show_no_penalty')
ORDER BY proname;
