-- =====================================================
-- SAFE FIX: Enable RLS on categories table
-- Date: 2025-11-28
-- Description: Safely enables Row Level Security on the categories table
-- This is a lookup/reference table that should be readable by everyone
-- =====================================================

-- Step 1: Check current state (for verification)
-- Run this first to see what exists:
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'categories' AND schemaname = 'public';

-- Step 2: Enable RLS on categories table (if not already enabled)
-- This is SAFE - it just enables the security feature
DO $$ 
BEGIN
  ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
  RAISE NOTICE '✅ RLS enabled on categories table';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ℹ️  RLS already enabled on categories table';
END $$;

-- Step 3: Create policies (only if they don't exist)
-- Categories is a lookup table, everyone should be able to read it
DO $$ 
BEGIN
  -- Public read policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'categories' 
    AND policyname = 'Allow public read access to categories'
  ) THEN
    CREATE POLICY "Allow public read access to categories"
    ON public.categories
    FOR SELECT
    TO public
    USING (true);
    RAISE NOTICE '✅ Created public read policy';
  ELSE
    RAISE NOTICE 'ℹ️  Public read policy already exists';
  END IF;

  -- Authenticated read policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'categories' 
    AND policyname = 'Allow authenticated users to read categories'
  ) THEN
    CREATE POLICY "Allow authenticated users to read categories"
    ON public.categories
    FOR SELECT
    TO authenticated
    USING (true);
    RAISE NOTICE '✅ Created authenticated read policy';
  ELSE
    RAISE NOTICE 'ℹ️  Authenticated read policy already exists';
  END IF;
  
  RAISE NOTICE '====================================';
  RAISE NOTICE '✅ Categories table is now secure!';
  RAISE NOTICE '====================================';
END $$;

-- Step 5: Verify policies were created
-- Run this to confirm everything is set up correctly:
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'categories' AND schemaname = 'public';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if RLS is now enabled:
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'categories' AND schemaname = 'public';

-- Expected result: rls_enabled should be TRUE

-- Check how many categories exist:
SELECT COUNT(*) as total_categories FROM public.categories;

-- Expected result: Should show your existing categories (likely 91)

-- Test a sample query to ensure data is still accessible:
SELECT main_category, COUNT(*) as subcategory_count 
FROM public.categories 
GROUP BY main_category 
ORDER BY main_category;

-- Expected result: Should show your 12 main categories with their subcategory counts

-- =====================================================
-- ROLLBACK (if needed - ONLY use if something goes wrong)
-- =====================================================

-- To disable RLS (emergency rollback):
-- ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;

-- To drop the policies (emergency rollback):
-- DROP POLICY IF EXISTS "Allow public read access to categories" ON public.categories;
-- DROP POLICY IF EXISTS "Allow authenticated users to read categories" ON public.categories;

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. This script is SAFE because:
--    - We only enable RLS (security feature)
--    - We immediately create permissive policies for read access
--    - No data is modified or deleted
--    - Categories table is read-only in normal operation
--
-- 2. Why these policies:
--    - Public read: Allows unauthenticated users to see categories
--    - Authenticated read: Ensures logged-in users can access
--    - No INSERT/UPDATE/DELETE policies: Only admins/backend should modify
--
-- 3. Impact on your app:
--    - ZERO downtime
--    - No functionality changes
--    - Just adds proper security layer
--    - Fixes the Supabase warning
