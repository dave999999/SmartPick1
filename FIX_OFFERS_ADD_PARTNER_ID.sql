-- ============================================================================
-- FIX: Add missing partner_id column to offers table
-- ============================================================================
-- ERROR: column "partner_id" does not exist
-- This script checks and adds the partner_id column if it's missing
-- ============================================================================

-- STEP 1: Check current offers table structure
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'offers' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- STEP 2: Check if partner_id column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'offers' 
      AND column_name = 'partner_id'
      AND table_schema = 'public'
  ) THEN
    RAISE NOTICE '❌ partner_id column does NOT exist in offers table';
    RAISE NOTICE 'Adding partner_id column...';
    
    -- Add the partner_id column
    ALTER TABLE offers ADD COLUMN partner_id UUID REFERENCES partners(id) ON DELETE CASCADE;
    
    RAISE NOTICE '✅ partner_id column added successfully!';
  ELSE
    RAISE NOTICE '✅ partner_id column already exists';
  END IF;
END $$;

-- STEP 3: Verify the column was added
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'offers' 
  AND table_schema = 'public'
  AND column_name = 'partner_id';

-- STEP 4: Check all foreign keys on offers table
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'offers'
  AND tc.table_schema = 'public';

-- STEP 5: Show a sample of offers data to see what columns are used
SELECT 
  id,
  title,
  status,
  created_at
FROM offers 
LIMIT 5;

-- ============================================================================
-- NEXT STEPS
-- ============================================================================
-- After running this script:
-- 1. If partner_id was added, rebuild frontend: pnpm build
-- 2. Hard refresh browser (Ctrl + Shift + R)
-- 3. Try creating offer again
-- 4. Should work now!
-- ============================================================================
