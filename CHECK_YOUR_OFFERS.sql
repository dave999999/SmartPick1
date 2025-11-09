-- PART 2: Check your recent offers

SELECT 
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
