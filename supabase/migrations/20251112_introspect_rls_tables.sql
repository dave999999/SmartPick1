-- Introspect RLS-enabled tables missing policies
-- Safe to run multiple times; produces NOTICE output only.
-- Purpose: After enabling RLS globally, quickly see which tables still lack policies (INFO warnings)
-- Usage: Apply this migration; review the output in migration logs.

DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE 'RLS Introspection Start';
  FOR rec IN
    SELECT c.relname AS table_name,
           n.nspname AS schema_name,
           c.relrowsecurity AS rls_enabled,
           c.relforcerowsecurity AS rls_forced,
           COALESCE(p.cnt,0) AS policy_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN (
      SELECT polrelid, COUNT(*) cnt
      FROM pg_policy
      GROUP BY polrelid
    ) p ON p.polrelid = c.oid
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = true
    ORDER BY policy_count ASC, table_name ASC
  LOOP
    IF rec.policy_count = 0 THEN
      RAISE NOTICE '⚠ Table % has RLS enabled but 0 policies', rec.table_name;
    ELSE
      RAISE NOTICE '✓ Table % has % policies', rec.table_name, rec.policy_count;
    END IF;
  END LOOP;
  RAISE NOTICE 'RLS Introspection Complete';
END$$;

-- Suggested next actions for each ⚠ table:
-- 1. If table should be readable to authenticated users: add a SELECT policy.
-- 2. If only service_role should access: either add a policy restricting to service_role or DISABLE RLS if safe.
-- 3. If per-user ownership applies: create SELECT/INSERT/UPDATE/DELETE policies with USING/ WITH CHECK on owner id.
-- 4. Re-run this script after adding policies to verify all ⚠ entries are gone.
