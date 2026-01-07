╔════════════════════════════════════════════════════════════════════════════╗
║                SUPABASE FUNCTION SECURITY - QUICK REFERENCE                ║
╚════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────┐
│ THE PROBLEM                                                                 │
└─────────────────────────────────────────────────────────────────────────────┘

❌ This is VULNERABLE:
   CREATE FUNCTION my_function() ... AS $$ ... $$;
   
✅ This is SECURE:
   CREATE FUNCTION my_function() 
   SECURITY DEFINER 
   SET search_path = public, pg_temp 
   AS $$ ... $$;

┌─────────────────────────────────────────────────────────────────────────────┐
│ MINIMUM SECURE TEMPLATE                                                     │
└─────────────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION public.function_name(p_param TYPE)
RETURNS return_type
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  ← CRITICAL!
AS $$
BEGIN
  -- Use public.table_name not just table_name
  -- Use auth.uid() not uid()
  RETURN result;
END;
$$;

┌─────────────────────────────────────────────────────────────────────────────┐
│ REQUIRED CHANGES WHEN ADDING SECURITY                                       │
└─────────────────────────────────────────────────────────────────────────────┘

1. ADD:     SET search_path = public, pg_temp
2. CHANGE:  users → public.users
3. CHANGE:  uid() → auth.uid()
4. CHANGE:  reservations → public.reservations
5. TEST:    Call the function after changes!

┌─────────────────────────────────────────────────────────────────────────────┐
│ COMMON MISTAKES & FIXES                                                     │
└─────────────────────────────────────────────────────────────────────────────┘

ERROR: function uid() does not exist
FIX:   Change uid() to auth.uid()

ERROR: relation "users" does not exist  
FIX:   Change users to public.users

ERROR: function uuid_generate_v4() does not exist
FIX:   Use extensions.uuid_generate_v4()
   OR: SET search_path = public, extensions, pg_temp

ERROR: function now() does not exist
FIX:   Use NOW() or CURRENT_TIMESTAMP (built-in)

┌─────────────────────────────────────────────────────────────────────────────┐
│ SEARCH_PATH VARIANTS                                                        │
└─────────────────────────────────────────────────────────────────────────────┘

Basic (most common):
  SET search_path = public, pg_temp

With extensions:
  SET search_path = public, extensions, pg_temp

With auth:
  SET search_path = public, pg_temp
  -- Then use auth.uid() in function body (RECOMMENDED)

┌─────────────────────────────────────────────────────────────────────────────┐
│ VERIFICATION CHECKLIST                                                      │
└─────────────────────────────────────────────────────────────────────────────┘

Before deploying:
  [ ] Has SECURITY DEFINER (if needed)
  [ ] Has SET search_path = public, pg_temp
  [ ] All tables use public. prefix
  [ ] auth.uid() instead of uid()
  [ ] GRANT EXECUTE statements added
  [ ] Function tested and works
  [ ] Run VERIFY_FUNCTION_SECURITY.sql

┌─────────────────────────────────────────────────────────────────────────────┐
│ EXAMPLES                                                                    │
└─────────────────────────────────────────────────────────────────────────────┘

✅ GOOD - Simple Function:
──────────────────────────────
CREATE FUNCTION public.get_user_points(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN (SELECT points FROM public.users WHERE id = p_user_id);
END;
$$;

✅ GOOD - With Auth Check:
──────────────────────────────
CREATE FUNCTION public.update_profile(p_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.users 
  SET name = p_name 
  WHERE id = auth.uid();  ← Note: auth.uid() not uid()
  
  RETURN jsonb_build_object('success', true);
END;
$$;

✅ GOOD - Trigger Function:
──────────────────────────────
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

┌─────────────────────────────────────────────────────────────────────────────┐
│ QUICK VERIFICATION QUERY                                                    │
└─────────────────────────────────────────────────────────────────────────────┘

Run this to find vulnerable functions:

SELECT proname, prosecdef, proconfig
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND prosecdef = true
  AND proconfig IS NULL;

If this returns rows → those functions are vulnerable!

┌─────────────────────────────────────────────────────────────────────────────┐
│ FILES IN THIS REPO                                                          │
└─────────────────────────────────────────────────────────────────────────────┘

📖 SUPABASE_FUNCTION_SECURITY_GUIDE.md
   ➜ Complete guide with examples

📝 supabase/migrations/_FUNCTION_TEMPLATE.sql  
   ➜ Copy this for new functions

🔍 VERIFY_FUNCTION_SECURITY.sql
   ➜ Run this to check all functions

📄 FUNCTION_SECURITY_CHEATSHEET.md (this file)
   ➜ Quick reference

┌─────────────────────────────────────────────────────────────────────────────┐
│ WORKFLOW                                                                    │
└─────────────────────────────────────────────────────────────────────────────┘

1. Copy _FUNCTION_TEMPLATE.sql → rename to YYYYMMDD_feature.sql
2. Write your function following the template
3. Test locally
4. Run VERIFY_FUNCTION_SECURITY.sql
5. Commit and deploy
6. Test in production

┌─────────────────────────────────────────────────────────────────────────────┐
│ REMEMBER                                                                    │
└─────────────────────────────────────────────────────────────────────────────┘

🔑 ALWAYS include: SET search_path = public, pg_temp
📛 ALWAYS qualify: public.table_name, auth.uid()
🧪 ALWAYS test after adding security
🔒 SECURITY DEFINER = function runs with owner privileges
⚠️  Unset search_path + SECURITY DEFINER = SECURITY VULNERABILITY

╔════════════════════════════════════════════════════════════════════════════╗
║ Need more details? See SUPABASE_FUNCTION_SECURITY_GUIDE.md                ║
╚════════════════════════════════════════════════════════════════════════════╝
