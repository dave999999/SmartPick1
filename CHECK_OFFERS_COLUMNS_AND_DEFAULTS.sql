-- Check exact column structure and defaults for offers table
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'offers'
ORDER BY ordinal_position;

-- Check if there are any computed/generated columns
SELECT 
    attname AS column_name,
    atttypid::regtype AS data_type,
    attgenerated AS is_generated
FROM pg_attribute
WHERE attrelid = 'public.offers'::regclass
AND attnum > 0
AND NOT attisdropped
ORDER BY attnum;

-- Check for any column that might reference auth.uid()
SELECT 
    column_name,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'offers'
AND column_default LIKE '%auth.uid%';
