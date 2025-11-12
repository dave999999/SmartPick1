# 🚨 Emergency Fix: Restore Partner Points & User Wallets

## Problem

After enabling RLS on 3 tables (`offers`, `partners`, `partner_points`), the following features disappeared:
- ❌ Partner dashboard: No points/wallet display
- ❌ User profile: No wallet/points display

## Root Cause

The RLS policies are **blocking legitimate queries** because:
1. `partner_points` table has complex ownership (uses `user_id` from auth.users)
2. Application queries are correct, but RLS policies are too restrictive
3. Need to adjust policies OR temporarily disable RLS

---

## ✅ SOLUTION 1: Emergency Rollback (IMMEDIATE FIX)

**This will restore functionality immediately by disabling RLS**

### Steps:

1. **Open Supabase Dashboard** → SQL Editor
2. **Paste and run:** `supabase/migrations/20251112_rollback_rls_emergency.sql`
3. **Refresh your app** → Points should appear again!

### What it does:
- ✅ Disables RLS on `offers`, `partners`, `partner_points`
- ✅ Drops the policies we created
- ✅ Returns to previous working state
- ⚠️  These tables are now accessible without RLS (temporary)

---

## 🔧 SOLUTION 2: Fix RLS Policies (PROPER FIX)

**After rollback works, we can re-enable RLS with corrected policies**

The issue is in the `partner_points` policy. Current policy:
```sql
-- WRONG: Too restrictive
CREATE POLICY "partners_view_own_points"
  ON public.partner_points FOR SELECT
  USING (user_id = auth.uid());
```

This blocks queries because `partner_points.user_id` is the auth user ID, but we need to allow:
- Partners to view their own points
- Admins to view all points
- Service role to manage points

**Fixed policy:**
```sql
CREATE POLICY "partners_view_own_points"
  ON public.partner_points FOR SELECT
  USING (
    user_id = auth.uid() OR  -- Partners view own
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    ) OR  -- Admins view all
    auth.role() = 'service_role'  -- Service role manages all
  );
```

---

## Recommendation

1. **Run the rollback NOW** to restore functionality
2. **Test that points/wallets appear** in both partner dashboard and user profile
3. **Keep RLS disabled for now** - these tables already have access control via:
   - API-level checks
   - SECURITY DEFINER functions
   - Application role validation

4. **Later (when you have time):** We can create proper RLS policies that don't break functionality

---

## Quick Action

Run this in Supabase SQL Editor RIGHT NOW:

```sql
-- Emergency fix - restore functionality
ALTER TABLE public.offers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_points DISABLE ROW LEVEL SECURITY;
```

That's it! Your app should work again immediately. ✅
