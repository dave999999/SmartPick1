# 🔧 Fix Supabase Signup Error

## 🔍 The Error

```
POST /auth/v1/signup 500 (Internal Server Error)
AuthApiError: Database error saving new user
```

This error occurs when **database triggers fail** during user creation. Supabase tries to create a new user in the `auth.users` table, but a trigger or constraint fails.

---

## 🎯 Most Likely Cause

Your gamification system has a trigger that runs when new users sign up:

```sql
CREATE TRIGGER create_user_stats_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION init_user_stats();
```

**This trigger tries to insert into `user_stats` table, but fails if:**
1. ❌ The `user_stats` table doesn't exist
2. ❌ The `init_user_stats()` function has errors
3. ❌ Required columns are missing from `users` table
4. ❌ Foreign key constraints fail

---

## 🚀 Quick Fix (Choose One)

### **Option A: Quick Disable (Immediate Fix - 1 minute)**

This lets users sign up immediately, but they won't get gamification features until you run the full migration.

**1. Open Supabase SQL Editor:**
   - Go to: https://supabase.com/dashboard → Your Project → SQL Editor

**2. Run this SQL:**
```sql
-- Temporarily disable the problematic trigger
ALTER TABLE users DISABLE TRIGGER IF EXISTS create_user_stats_trigger;

-- Test signup now - it should work!
```

**3. Test signup in your app**
   - Try creating a new account
   - Should work now ✅

**Downside:** New users won't get auto-created stats until you enable the trigger again.

---

### **Option B: Full Fix (Recommended - 5 minutes)**

This fixes the root cause by ensuring all required tables and functions exist.

**1. Run Diagnostic Script:**

Open Supabase SQL Editor and run:
```bash
scripts/diagnose-signup-error.sql
```

This will show you:
- ✅ Which tables exist
- ✅ Which triggers are enabled
- ✅ Which functions exist
- ❌ What's missing

**2. Run Gamification Migration (if needed):**

If the diagnostic shows `user_stats_exists = false`, you need to create the table:

Copy and run the entire contents of:
```
supabase/migrations/20250106_create_gamification_tables.sql
```

This creates:
- ✅ `user_stats` table
- ✅ `achievement_definitions` table
- ✅ `user_achievements` table
- ✅ `init_user_stats()` function
- ✅ Triggers that work correctly

**3. Run Fix Script:**

Open `scripts/fix-signup-error.sql` and run **Option 2** section:
- Adds missing columns to `users` table
- Makes `init_user_stats()` function more resilient
- Adds error handling so signup doesn't fail

**4. Test Signup:**
- Create a new test account
- Should work ✅
- New users should automatically get `user_stats` entry

---

## 🧪 Test After Fix

**1. Try to sign up with a new account**
```
Email: test@example.com
Password: test123456
```

**2. Check Supabase logs:**
- Dashboard → Logs → Error Logs
- Should see NO errors related to user creation

**3. Verify user_stats was created:**
```sql
SELECT u.email, us.*
FROM users u
LEFT JOIN user_stats us ON u.id = us.user_id
WHERE u.email = 'test@example.com';
```

Should return a row with `user_stats` data ✅

---

## 🔍 Advanced Diagnosis

If signup still fails after trying both options:

**Check Supabase Logs:**
1. Dashboard → Logs → Error Logs
2. Look for errors around the time you tried to sign up
3. The error message will tell you exactly what's failing

**Common Error Messages:**

| Error | Cause | Fix |
|-------|-------|-----|
| `relation "user_stats" does not exist` | Table missing | Run gamification migration |
| `function init_user_stats() does not exist` | Function missing | Run gamification migration |
| `column "referral_code" does not exist` | Column missing | Run fix script Option 2B |
| `duplicate key value violates unique constraint` | User already exists | Use different email |
| `permission denied for table users` | RLS policy issue | Check RLS policies script |

---

## 📋 Complete Fix Checklist

- [ ] Run `diagnose-signup-error.sql` to identify the issue
- [ ] Choose Option A (quick disable) OR Option B (full fix)
- [ ] Test signup with new account
- [ ] Verify no errors in Supabase logs
- [ ] Check that new users appear in `users` table
- [ ] Check that `user_stats` are created (if Option B)
- [ ] Re-enable triggers (if you disabled them)

---

## 🛟 Emergency Bypass

If you need signups to work **RIGHT NOW** and can't wait:

```sql
-- Nuclear option: Remove ALL custom triggers
DROP TRIGGER IF EXISTS create_user_stats_trigger ON users;
DROP TRIGGER IF EXISTS update_stats_on_reservation ON reservations;

-- Signups will now work, but:
-- ❌ No auto-created user stats
-- ❌ No auto-updated stats on reservations
-- ❌ No auto-unlocked achievements

-- You can restore gamification later by running the migration
```

---

## 📞 Still Not Working?

**Check these files for clues:**
- `supabase/migrations/20250106_create_gamification_tables.sql` - Gamification setup
- `supabase/migrations/20250105_create_smartpoints_tables.sql` - SmartPoints setup
- `scripts/verify-profile-update-rls.sql` - RLS policies

**Get detailed error info:**
1. Open browser DevTools → Network tab
2. Try to sign up
3. Click the failed `/signup` request
4. Look at Response tab for detailed error message
5. Share that error message for more specific help

---

## ✅ Expected Result After Fix

**When a new user signs up:**
1. ✅ Account created in `auth.users`
2. ✅ Profile created in `users` table
3. ✅ User stats created in `user_stats` table (with trigger)
4. ✅ SmartPoints balance initialized (100 points)
5. ✅ Referral code generated
6. ✅ No errors in console
7. ✅ User can log in and use the app

---

**The most common fix is running the gamification migration. Try Option A first if you need immediate results!**
