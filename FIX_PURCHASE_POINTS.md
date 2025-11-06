# 🚨 URGENT: Fix Purchase Points Function

## Error Details

**Error Message:**
```
Error adding points: {
  code: 'PGRST202',
  details: 'Searched for the function public.add_user_points with parameter names p_amount, p_metadata, p_reason, p_user_id, but no matches were found in the schema cache.',
  hint: 'Perhaps you meant to call the function public.add_user_points(p_metadata, p_points, p_reason, p_user_id)'
}
```

**Root Cause:** The `add_user_points` function in your database has the wrong parameter signature!

---

## 🔧 Quick Fix (2 minutes)

### Step 1: Apply Migration

1. Open **Supabase Dashboard** → SQL Editor → New Query
2. Copy ALL contents of:
   ```
   D:\v3\workspace\shadcn-ui\supabase\migrations\20251106_fix_add_user_points_signature.sql
   ```
3. Click **Run**
4. Should see: "Success. No rows returned"

### Step 2: Test Purchase

1. Go to Profile → Wallet → Buy Points
2. Click "Pay ₾1 Now"
3. **Expected:** Success! Balance increases by 100 points

---

## 🔍 What This Fixes

### The Problem

Your database has `add_user_points` function with **wrong parameter order**.

**Database has (wrong):**
```sql
add_user_points(p_metadata, p_points, p_reason, p_user_id)
```

**Code expects (correct):**
```sql
add_user_points(p_user_id, p_amount, p_reason, p_metadata)
```

### The Solution

The migration:
1. Drops ALL versions of `add_user_points` function
2. Recreates it with the **correct signature**
3. Grants proper permissions
4. Adds documentation comment

---

## 🧪 Test After Fix

### Test 1: Purchase Points

1. **Action:** Click "Buy Points" → "Pay ₾1 Now"
2. **Expected:**
   - Success message appears
   - Balance increases by 100
   - Transaction appears in wallet with reason='purchase'

### Test 2: Verify in Database

```sql
-- Check function exists with correct signature
SELECT
  proname,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'add_user_points';

-- Should show:
-- add_user_points | p_user_id uuid, p_amount integer, p_reason text, p_metadata jsonb DEFAULT '{}'::jsonb
```

### Test 3: Manual Test

```sql
-- Try calling the function manually
SELECT add_user_points(
  (SELECT id FROM users WHERE email = 'test@example.com'),
  10,
  'test_purchase',
  '{"manual_test": true}'::jsonb
);

-- Should return:
-- {"success": true, "balance": 110, "transaction_id": "..."}
```

---

## 🔄 How This Happened

**Likely Scenario:**

1. Original migration created function correctly
2. At some point, function was modified manually OR
3. Another migration recreated it with wrong signature OR
4. EMERGENCY_FIX migration had wrong signature

**Evidence:**
- Migration file shows correct order: `(p_user_id, p_amount, p_reason, p_metadata)`
- Database has wrong order: `(p_metadata, p_points, p_reason, p_user_id)`
- Notice: `p_amount` became `p_points` (different parameter name!)

---

## 📊 Expected vs Actual

| Aspect | Expected (Code) | Actual (Database) |
|--------|----------------|-------------------|
| Param 1 | p_user_id UUID | p_metadata JSONB |
| Param 2 | p_amount INT | p_points INT |
| Param 3 | p_reason TEXT | p_reason TEXT |
| Param 4 | p_metadata JSONB | p_user_id UUID |

**Completely backwards!** This is why purchase fails.

---

## ⚠️ Why It's Critical

**Every operation using `add_user_points` fails:**
- ✅ Purchase points (main issue)
- ✅ Referral bonuses (50 points to referrer)
- ✅ Streak bonuses (20, 50, 200 points)
- ✅ Achievement rewards (10-250 points)
- ✅ Refunds on cancellation

**Only `deduct_user_points` works** because it has correct signature.

---

## 🔍 Related Functions to Check

After fixing `add_user_points`, verify these also work:

### Check deduct_user_points

```sql
SELECT
  proname,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'deduct_user_points';

-- Should show:
-- deduct_user_points | p_user_id uuid, p_amount integer, p_reason text, p_metadata jsonb DEFAULT '{}'::jsonb
```

### Check purchase_points (if exists)

```sql
SELECT * FROM pg_proc WHERE proname = 'purchase_points';
-- If exists, might also need fixing
```

---

## 🚀 Deploy Steps

1. **Apply migration** (SQL Editor in Supabase)
2. **No code deploy needed** (function signature is database-side)
3. **Test purchase** (should work immediately)
4. **Verify transactions** appear in wallet

---

## ✅ Success Criteria

- [ ] Migration runs without errors
- [ ] Function signature matches: `(p_user_id, p_amount, p_reason, p_metadata)`
- [ ] Purchase points works (click "Pay ₾1 Now")
- [ ] Balance increases by 100
- [ ] Transaction appears in wallet
- [ ] No console errors
- [ ] Browser console shows success

---

## 🆘 If Still Not Working

### Check Permissions

```sql
-- Verify function has correct permissions
SELECT
  proname,
  proacl
FROM pg_proc
WHERE proname = 'add_user_points';

-- Should include: {authenticated=X/postgres}
```

### Check RLS on Tables

```sql
-- Verify user_points allows updates
SELECT * FROM pg_policies WHERE tablename = 'user_points';

-- Should allow service_role to modify
```

### Manual Workaround

If function still broken, call it directly:

```sql
-- Add 100 points manually
UPDATE user_points
SET balance = balance + 100
WHERE user_id = 'USER_ID_HERE';

-- Log transaction
INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after, metadata)
SELECT
  'USER_ID_HERE',
  100,
  'purchase',
  balance - 100,
  balance,
  '{"manual_purchase": true}'::jsonb
FROM user_points
WHERE user_id = 'USER_ID_HERE';
```

---

## 📁 Files Created

| File | Purpose |
|------|---------|
| `20251106_fix_add_user_points_signature.sql` | **Run this in Supabase** |
| `FIX_PURCHASE_POINTS.md` | This guide |

---

## 💡 Prevention for Future

**To prevent this from happening again:**

1. **Always use migrations** (never modify functions manually in dashboard)
2. **Test after every migration** (run a quick function call test)
3. **Document function signatures** in code comments
4. **Version control everything** (migrations are in git)

---

**Priority:** CRITICAL
**Impact:** Purchase points completely broken
**Fix Time:** 2 minutes
**Status:** Migration ready, just apply it

---

## 📝 Quick Checklist

- [ ] Copy migration SQL to Supabase SQL Editor
- [ ] Run migration (click Run button)
- [ ] See "Success" message
- [ ] Test: Click "Buy Points"
- [ ] See success toast and balance increase
- [ ] Verify transaction in wallet
- [ ] Done! ✅

