# Supabase Function Security: Search Path Best Practices

## The Problem

Supabase warns about "Function Search Path Mutable" because functions without an explicit `search_path` are vulnerable to **search path injection attacks**. However, adding `SET search_path` can break functions if not done correctly.

## Why Functions Break After "Fixing"

When you add `SET search_path = public`, functions can break because:

1. **Missing Extensions**: Functions may use extensions (like `uuid-ossp`, `pg_crypto`) that aren't in the `public` schema
2. **Missing Types**: Custom types or enums might not be found
3. **Missing pg_temp**: Temporary tables/functions need `pg_temp` in the path
4. **Auth Schema**: Functions calling `auth.uid()` need the `auth` schema

## The Correct Solution

### Template for All Future Functions

```sql
CREATE OR REPLACE FUNCTION public.your_function_name(param_name TYPE)
RETURNS return_type
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- Always include pg_temp!
AS $$
BEGIN
  -- Your function body
  -- Use fully qualified names for anything outside public schema
  
  -- Examples:
  -- auth.uid() instead of uid()
  -- public.users instead of just users
  -- extensions.uuid_generate_v4() if using uuid-ossp
  
END;
$$;
```

### Key Rules

#### 1. **Always Set search_path**
```sql
SET search_path = public, pg_temp
```
- `public` - your main schema
- `pg_temp` - for temporary objects (always include this!)

#### 2. **Use Fully Qualified Names**

**BAD:**
```sql
SELECT * FROM users WHERE id = uid();
```

**GOOD:**
```sql
SELECT * FROM public.users WHERE id = auth.uid();
```

#### 3. **For Functions Using Extensions**

If your function uses `uuid-ossp`, `pgcrypto`, or other extensions:

```sql
SET search_path = public, extensions, pg_temp
```

Or better yet, use fully qualified names:
```sql
extensions.uuid_generate_v4()
extensions.gen_random_uuid()
```

#### 4. **For Functions Accessing Auth**

If you need `auth.uid()` or other auth functions:

```sql
-- Option 1: Add auth to search_path
SET search_path = public, auth, pg_temp

-- Option 2: Use fully qualified (RECOMMENDED)
SET search_path = public, pg_temp
-- Then use auth.uid() in your function
```

## Migration Checklist

When fixing existing functions:

1. ✅ Add `SECURITY DEFINER` if the function needs elevated privileges
2. ✅ Add `SET search_path = public, pg_temp`
3. ✅ Replace `uid()` with `auth.uid()`
4. ✅ Replace `now()` with `NOW()` or `CURRENT_TIMESTAMP` (case doesn't matter but be consistent)
5. ✅ Qualify all table names with `public.` prefix
6. ✅ Test the function after changes!

## Example: Before and After

### BEFORE (Vulnerable):
```sql
CREATE OR REPLACE FUNCTION reset_user_cooldown(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE cancellation_tracking
  SET consecutive_cancellations = 0,
      cooldown_end_time = NULL
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
```

### AFTER (Secure):
```sql
CREATE OR REPLACE FUNCTION public.reset_user_cooldown(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.cancellation_tracking
  SET consecutive_cancellations = 0,
      cooldown_end_time = NULL,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'message', 'Cooldown reset');
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;
END;
$$;
```

## Common Scenarios

### Scenario 1: Simple CRUD Function
```sql
CREATE OR REPLACE FUNCTION public.update_user_profile(
  p_user_id UUID,
  p_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.users
  SET name = p_name,
      updated_at = NOW()
  WHERE id = p_user_id
    AND id = auth.uid(); -- Security: users can only update their own profile

  IF FOUND THEN
    RETURN jsonb_build_object('success', true);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
END;
$$;
```

### Scenario 2: Function with Auth Check
```sql
CREATE OR REPLACE FUNCTION public.admin_only_function()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Get current user's role
  SELECT role INTO v_role
  FROM public.users
  WHERE id = auth.uid();

  -- Check if admin
  IF v_role != 'ADMIN' THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Admin logic here
  RETURN jsonb_build_object('success', true);
END;
$$;
```

### Scenario 3: Trigger Function
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    name,
    role,
    created_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'CUSTOMER',
    NOW()
  );

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Scenario 4: Function Using Extensions
```sql
CREATE OR REPLACE FUNCTION public.generate_unique_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_code TEXT;
BEGIN
  -- Use fully qualified extension function
  v_code := encode(extensions.gen_random_bytes(4), 'hex');
  
  RETURN upper(v_code);
END;
$$;
```

## Prevention Strategy

### 1. Create a Template Migration File

Save this as `supabase/migrations/_TEMPLATE.sql`:

```sql
-- Template for new migrations
-- Copy this file and rename with timestamp: YYYYMMDD_description.sql

-- Function template
CREATE OR REPLACE FUNCTION public.function_name(
  p_param_name TYPE
)
RETURNS return_type
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- TODO: Implement function
  -- Remember to:
  -- - Use public.table_name
  -- - Use auth.uid() for current user
  -- - Add proper error handling
  
  RETURN NULL; -- TODO: Replace with actual return
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.function_name TO authenticated;
GRANT EXECUTE ON FUNCTION public.function_name TO anon;

-- Add comment
COMMENT ON FUNCTION public.function_name IS 'TODO: Add description';
```

### 2. Code Review Checklist

Before deploying any new function, check:

- [ ] Has `SECURITY DEFINER` (if needed)
- [ ] Has `SET search_path = public, pg_temp`
- [ ] All table references use `public.` prefix
- [ ] Uses `auth.uid()` not `uid()`
- [ ] Has proper error handling
- [ ] Has GRANT statements for permissions
- [ ] Has been tested in staging/local
- [ ] Has a descriptive COMMENT

### 3. Testing Script

Create `TEST_FUNCTION.sql`:

```sql
-- Test your function before deploying
-- Replace function_name and parameters

-- Test 1: Basic call
SELECT public.function_name(param_value);

-- Test 2: Check security (should fail if not authorized)
-- Run as different user

-- Test 3: Check error handling
SELECT public.function_name(NULL);
SELECT public.function_name('invalid_value');

-- Test 4: Verify search_path is set
SELECT prosecdef, proconfig
FROM pg_proc
WHERE proname = 'function_name'
  AND pronamespace = 'public'::regnamespace;
-- proconfig should show: {search_path=public,pg_temp}
```

### 4. Automated Check

Add this query to your deployment process:

```sql
-- Find all functions without search_path set
SELECT 
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  CASE 
    WHEN p.prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security,
  p.proconfig as search_path_config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'  -- Only functions, not procedures
  AND (
    p.proconfig IS NULL 
    OR NOT EXISTS (
      SELECT 1 FROM unnest(p.proconfig) AS config
      WHERE config LIKE 'search_path=%'
    )
  )
ORDER BY p.proname;
```

## Quick Fix for Existing Functions

If you need to quickly fix many functions, use this pattern:

```sql
-- 1. List all vulnerable functions
SELECT proname FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proconfig IS NULL;

-- 2. For each function, apply this pattern:
CREATE OR REPLACE FUNCTION public.existing_function(...)
RETURNS ...
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- ADD THIS LINE
AS $$
-- Keep existing body but:
-- - Replace table_name with public.table_name
-- - Replace uid() with auth.uid()
$$;

-- 3. Test immediately after updating
SELECT public.existing_function(test_params);
```

## Troubleshooting

### Error: "function uuid_generate_v4() does not exist"
**Fix:** Add `extensions` to search_path OR use `extensions.uuid_generate_v4()`

### Error: "function uid() does not exist"
**Fix:** Change `uid()` to `auth.uid()`

### Error: "relation 'users' does not exist"
**Fix:** Change `users` to `public.users`

### Error: "schema 'public' does not exist"
**Fix:** Your search_path might be too restrictive. Ensure `public` schema exists.

## Summary

✅ **DO:**
- Always set `search_path = public, pg_temp`
- Use fully qualified names (`public.table`, `auth.uid()`)
- Test functions after modifying
- Use the template for new functions
- Add to your code review checklist

❌ **DON'T:**
- Leave `search_path` unset on `SECURITY DEFINER` functions
- Use unqualified function names from other schemas
- Assume functions work after adding security settings - test them!
- Forget `pg_temp` in your search_path

## Resources

- [PostgreSQL Search Path Documentation](https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-PATH)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/database/postgres/custom-sql)
- [PostgreSQL SECURITY DEFINER](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)
