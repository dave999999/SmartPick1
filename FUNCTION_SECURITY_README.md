# 🔒 Supabase Function Security - Complete Toolkit

This toolkit helps you prevent and fix the "Function Search Path Mutable" security warning in Supabase.

## 📚 Quick Start

1. **Read the cheatsheet first**: [FUNCTION_SECURITY_CHEATSHEET.md](FUNCTION_SECURITY_CHEATSHEET.md)
2. **Check your functions**: Run [VERIFY_FUNCTION_SECURITY.sql](VERIFY_FUNCTION_SECURITY.sql)
3. **Fix vulnerable functions**: Use [FIX_VULNERABLE_FUNCTIONS.sql](FIX_VULNERABLE_FUNCTIONS.sql)
4. **Use template for new functions**: Copy [supabase/migrations/_FUNCTION_TEMPLATE.sql](supabase/migrations/_FUNCTION_TEMPLATE.sql)

## 📁 Files in This Toolkit

| File | Purpose | When to Use |
|------|---------|-------------|
| **FUNCTION_SECURITY_CHEATSHEET.md** | Quick reference card | Keep open while coding |
| **SUPABASE_FUNCTION_SECURITY_GUIDE.md** | Complete guide with examples | Deep dive, troubleshooting |
| **VERIFY_FUNCTION_SECURITY.sql** | Check all functions for issues | Run before deployments |
| **FIX_VULNERABLE_FUNCTIONS.sql** | Step-by-step fixer | Fixing existing functions |
| **supabase/migrations/_FUNCTION_TEMPLATE.sql** | Template for new functions | Creating new functions |

## ⚡ TL;DR - The Fix

Every function needs this:

```sql
CREATE OR REPLACE FUNCTION public.your_function(param TYPE)
RETURNS return_type
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  ← THIS IS CRITICAL!
AS $$
BEGIN
  -- Use public.table_name (not table_name)
  -- Use auth.uid() (not uid())
END;
$$;
```

## 🚨 Why This Matters

**The Problem:**
- Supabase flags functions without `SET search_path` as vulnerable
- These functions are susceptible to "search path injection" attacks
- But adding `search_path` incorrectly breaks functions

**The Solution:**
- Always set: `SET search_path = public, pg_temp`
- Use fully qualified names: `public.users`, `auth.uid()`
- Test after every change

## 🔄 Workflow for New Functions

```bash
# 1. Copy template
cp supabase/migrations/_FUNCTION_TEMPLATE.sql supabase/migrations/20260104_my_feature.sql

# 2. Edit function (template already has security settings)

# 3. Test locally
psql -d your_db -f supabase/migrations/20260104_my_feature.sql

# 4. Verify security
psql -d your_db -f VERIFY_FUNCTION_SECURITY.sql

# 5. Deploy
supabase db push
```

## 🛠️ Fixing Existing Functions

### Option 1: Automated Check
```bash
# Run verification script in Supabase SQL Editor
# Copy and run: VERIFY_FUNCTION_SECURITY.sql
```

### Option 2: Step-by-Step Fix
```bash
# Use the guided fixer
# Copy and run: FIX_VULNERABLE_FUNCTIONS.sql
# Follow steps 1-6 for each function
```

### Option 3: Manual Fix
For any vulnerable function, make these changes:

```sql
-- BEFORE
CREATE FUNCTION my_function()
AS $$
BEGIN
  SELECT * FROM users WHERE id = uid();
END;
$$;

-- AFTER
CREATE FUNCTION my_function()
SECURITY DEFINER
SET search_path = public, pg_temp  ← ADD THIS
AS $$
BEGIN
  SELECT * FROM public.users WHERE id = auth.uid();  ← FIX THESE
END;
$$;
```

## 📋 Checklist for Every Function

- [ ] Has `SECURITY DEFINER` (if it needs elevated privileges)
- [ ] Has `SET search_path = public, pg_temp`
- [ ] All tables use `public.` prefix
- [ ] Uses `auth.uid()` not `uid()`
- [ ] Has proper error handling
- [ ] Has `GRANT EXECUTE` statements
- [ ] Tested and working
- [ ] Verified with VERIFY_FUNCTION_SECURITY.sql

## 🐛 Common Errors & Solutions

| Error | Cause | Fix |
|-------|-------|-----|
| `function uid() does not exist` | Missing `auth.` prefix | `uid()` → `auth.uid()` |
| `relation "users" does not exist` | Missing `public.` prefix | `users` → `public.users` |
| `function uuid_generate_v4() does not exist` | Extension not in path | `extensions.uuid_generate_v4()` |

## 🎯 Best Practices

### ✅ DO:
- Use the template for all new functions
- Run verification script before deployments
- Use fully qualified names (`public.users`, `auth.uid()`)
- Test functions after modifying security settings
- Include `pg_temp` in search_path

### ❌ DON'T:
- Leave `search_path` unset on SECURITY DEFINER functions
- Use unqualified table names (`users` instead of `public.users`)
- Forget to test after adding security settings
- Assume all functions need SECURITY DEFINER (only use when needed)

## 🔍 Verification Query

Run this anytime to check for vulnerable functions:

```sql
SELECT COUNT(*) as vulnerable_count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosecdef = true
  AND p.proconfig IS NULL;
```

**Target:** `vulnerable_count = 0`

## 📖 Learning Resources

1. **Start here**: [FUNCTION_SECURITY_CHEATSHEET.md](FUNCTION_SECURITY_CHEATSHEET.md) - 5 min read
2. **Deep dive**: [SUPABASE_FUNCTION_SECURITY_GUIDE.md](SUPABASE_FUNCTION_SECURITY_GUIDE.md) - 15 min read
3. **Official docs**: 
   - [PostgreSQL Security](https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-PATH)
   - [Supabase Best Practices](https://supabase.com/docs/guides/database/postgres/custom-sql)

## 🚀 Integration into Your Workflow

### Pre-commit Hook (Optional)
Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Check for functions without search_path
if git diff --cached --name-only | grep -q "supabase/migrations/.*\.sql"; then
  echo "🔍 Checking SQL migrations for security issues..."
  if grep -q "SECURITY DEFINER" $(git diff --cached --name-only | grep "supabase/migrations/.*\.sql"); then
    if ! grep -q "SET search_path" $(git diff --cached --name-only | grep "supabase/migrations/.*\.sql"); then
      echo "❌ ERROR: Found SECURITY DEFINER without SET search_path"
      echo "See: FUNCTION_SECURITY_CHEATSHEET.md"
      exit 1
    fi
  fi
  echo "✅ SQL migrations look good"
fi
```

### CI/CD Check
Add to your CI pipeline:

```yaml
- name: Check function security
  run: |
    # Extract functions from new migrations
    # Verify they have search_path set
    # Fail build if vulnerable functions found
```

## 💡 Pro Tips

1. **Keep template open**: Have `_FUNCTION_TEMPLATE.sql` open in a split window
2. **Run verification regularly**: Add to weekly routine
3. **Document in comments**: Add security notes in function comments
4. **Review together**: Include function security in code reviews
5. **Test immediately**: Test functions right after adding security settings

## 🆘 Need Help?

1. Check [FUNCTION_SECURITY_CHEATSHEET.md](FUNCTION_SECURITY_CHEATSHEET.md) first
2. Review examples in [SUPABASE_FUNCTION_SECURITY_GUIDE.md](SUPABASE_FUNCTION_SECURITY_GUIDE.md)
3. Use [FIX_VULNERABLE_FUNCTIONS.sql](FIX_VULNERABLE_FUNCTIONS.sql) for step-by-step guidance
4. Still stuck? Check the "Troubleshooting" section in the main guide

## 📊 Success Metrics

Track these over time:
- Number of vulnerable functions: **Target = 0**
- Functions with proper security: **Target = 100%**
- Time to fix vulnerabilities: **Target < 5 min per function**

## 🔄 Maintenance

Monthly checklist:
- [ ] Run VERIFY_FUNCTION_SECURITY.sql
- [ ] Fix any new vulnerabilities
- [ ] Update template if patterns change
- [ ] Review and update this documentation

---

**Remember:** Security is not a one-time fix, it's a practice. Use these tools to build secure-by-default habits.

🔒 **Secure functions = Secure application**
