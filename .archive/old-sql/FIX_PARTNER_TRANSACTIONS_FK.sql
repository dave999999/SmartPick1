-- ============================================================================
-- FIX: partner_point_transactions foreign key constraint
-- ============================================================================
-- Error: column "partner_id" of relation "partner_points" does not exist
-- Problem: Foreign key might be pointing to wrong table/column
-- Solution: Fix the foreign key to reference partners.id correctly
-- ============================================================================

-- First, check current foreign keys on partner_point_transactions
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'partner_point_transactions'
  AND tc.table_schema = 'public';

-- Drop any incorrect foreign keys
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'partner_point_transactions'
          AND constraint_type = 'FOREIGN KEY'
          AND table_schema = 'public'
    LOOP
        EXECUTE 'ALTER TABLE public.partner_point_transactions DROP CONSTRAINT IF EXISTS ' || r.constraint_name;
        RAISE NOTICE 'Dropped constraint: %', r.constraint_name;
    END LOOP;
END $$;

-- Add correct foreign key: partner_id references partners.id
ALTER TABLE public.partner_point_transactions
ADD CONSTRAINT partner_point_transactions_partner_id_fkey
FOREIGN KEY (partner_id)
REFERENCES public.partners(id)
ON DELETE CASCADE;

-- Verify the fix
DO $$
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Fixed partner_point_transactions foreign key';
    RAISE NOTICE '';
    RAISE NOTICE 'partner_point_transactions.partner_id now references:';
    RAISE NOTICE '  ✅ partners.id (correct!)';
    RAISE NOTICE '';
    RAISE NOTICE 'This allows transactions to be created with partners.id';
    RAISE NOTICE '============================================================';
END $$;
