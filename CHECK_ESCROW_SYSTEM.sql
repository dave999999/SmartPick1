-- Check if escrow_points table exists and if your reservation has held points
SELECT 
    'Escrow table exists' as check_name,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'escrow_points'
    ) as exists;

-- Check if your reservation has escrow points
SELECT 
    'Your reservation escrow' as check_name,
    ep.*
FROM public.escrow_points ep
WHERE ep.reservation_id = '7c7e45a0-9dae-405b-8197-a5528c3b08a9'
LIMIT 1;

-- Check the user_cancel_reservation_split function source code
SELECT 
    'Cancel function definition' as check_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'user_cancel_reservation_split';
