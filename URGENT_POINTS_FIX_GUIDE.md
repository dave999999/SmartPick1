# 🚨 URGENT: Points System Bug Fixes

## Issues Found & Fixed

You reported 3 critical issues with the points system. Here's what I found and how to fix them:

### ❌ Issue 1: Points Multiplied by Quantity
**Reported:** 1 unit = 10 points, 2 units = 15 points (should always be 5)

**Root Cause:** Likely duplicate database triggers firing multiple times

### ❌ Issue 2: No Refund on Cancellation
**Reported:** Points not returned when user cancels reservation

**Root Cause:** Missing refund logic in `cancelReservation()` function

### ❌ Issue 3: Purchase Points Broken
**Reported:** Something wrong with buying points

**Root Cause:** Need to verify (likely RLS permissions or function access)

---

## 🔍 STEP 1: Run Diagnostic (2 minutes)

**This will tell us exactly what's wrong in your database.**

1. Open **Supabase Dashboard** → SQL Editor
2. Open this file and copy ALL contents:
   ```
   D:\v3\workspace\shadcn-ui\DIAGNOSTIC_POINTS_ISSUE.sql
   ```
3. **IMPORTANT:** Replace `'YOUR_USER_EMAIL'` with a real customer email (appears 3 times in the file)
4. Run the query
5. **Take screenshots** of ALL results and send them to me

### What the Diagnostic Checks:

| Check | What It Tells Us |
|-------|------------------|
| Duplicate Triggers | If both old and new triggers exist (causing double deductions) |
| Point Transactions | Exact amounts deducted (should be -5, not -10 or -15) |
| Balance Mismatch | If calculated balance != actual balance |
| Cancelled Reservations | If refunds are missing |
| Function Access | If add_user_points/deduct_user_points work |

---

## ✅ STEP 2: Apply Fixes (5 minutes)

### Fix 1: Remove Duplicate Triggers

1. **Supabase Dashboard** → SQL Editor → New Query
2. Copy contents of:
   ```
   D:\v3\workspace\shadcn-ui\supabase\migrations\20251106_fix_duplicate_triggers.sql
   ```
3. Run it
4. **Expected:** "Success. No rows returned"

**This removes:**
- Old `update_stats_on_reservation` trigger (shouldn't exist)
- Any duplicate triggers
- Keeps only `update_stats_on_pickup` trigger

### Fix 2: Deploy Cancellation Refund

**Already fixed in code!** Just deploy:

```bash
npm run build
# Then deploy dist/ folder
```

**What it does:**
- When user cancels reservation → Gets 5 points back
- Prevents double-cancellation
- Logs refund transaction with reason='refund'

### Fix 3: Check Purchase Points Access

Run this in Supabase SQL Editor:

```sql
-- Check if add_user_points has proper permissions
SELECT
  proname,
  proacl
FROM pg_proc
WHERE proname IN ('add_user_points', 'deduct_user_points');

-- Should show: {authenticated=X/postgres, ...}
```

If permissions are missing, run:

```sql
GRANT EXECUTE ON FUNCTION add_user_points TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_user_points TO authenticated;
```

---

## 🧪 STEP 3: Test Everything

### Test 1: Point Deduction (Should be Exactly 5)

1. **Customer:** Reserve 1 unit offer
2. **Check Wallet:** Should show -5 points
3. **Customer:** Reserve 2 units offer
4. **Check Wallet:** Should show -5 points (NOT -15!)

**Run this SQL to verify:**
```sql
SELECT
  r.quantity,
  pt.change AS points_deducted
FROM reservations r
JOIN point_transactions pt ON
  pt.user_id = r.customer_id
  AND pt.created_at BETWEEN r.created_at - INTERVAL '10 seconds'
                         AND r.created_at + INTERVAL '10 seconds'
WHERE r.customer_id = (SELECT id FROM users WHERE email = 'test@example.com')  -- REPLACE
ORDER BY r.created_at DESC
LIMIT 5;

-- Expected: All rows show change = -5 regardless of quantity
```

### Test 2: Cancellation Refund

1. **Customer:** Make a reservation (balance decreases by 5)
2. **Customer:** Cancel the reservation
3. **Check Wallet:** Should show +5 refund transaction
4. **Balance:** Should be back to original amount

**Run this SQL to verify:**
```sql
SELECT
  reason,
  change,
  balance_after,
  created_at
FROM point_transactions
WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com')  -- REPLACE
ORDER BY created_at DESC
LIMIT 10;

-- Should see both:
-- reservation | -5 | X | time1
-- refund      | +5 | X | time2 (after cancellation)
```

### Test 3: Purchase Points

1. **Customer:** Go to Profile → Wallet → Buy Points
2. **Click:** "Pay ₾1 Now"
3. **Expected:**
   - Success message
   - Balance increases by 100
   - Transaction shows reason='purchase'

**If it fails,** check browser console for errors and send screenshot.

---

## 🔧 If Issues Persist

### Issue: Still Deducting Wrong Amount

**Check for leftover triggers:**

```sql
SELECT tgname, tgrelid::regclass
FROM pg_trigger
WHERE tgrelid::regclass::text = 'reservations'
  AND tgname NOT LIKE 'RI_%';

-- Should ONLY show:
-- update_stats_on_pickup | reservations
```

**If you see `update_stats_on_reservation`:**

```sql
DROP TRIGGER IF EXISTS update_stats_on_reservation ON reservations;
```

### Issue: Refund Not Working

**Check if function exists:**

```sql
SELECT proname FROM pg_proc WHERE proname = 'add_user_points';

-- Should return 1 row
```

**If missing, run this migration:**
```
D:\v3\workspace\shadcn-ui\supabase\migrations\20250105_create_smartpoints_tables.sql
```

### Issue: Purchase Points Fails

**Check RLS policies:**

```sql
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('user_points', 'point_transactions');

-- Should allow authenticated users to read their own data
```

**Check function permissions:**

```sql
\df+ add_user_points
\df+ deduct_user_points

-- Should show security DEFINER (runs as owner, not user)
```

---

## 📊 Expected Behavior After Fixes

| Action | Points Change | Transaction Reason |
|--------|---------------|-------------------|
| Sign up | +100 | registration |
| Reserve (1 unit) | -5 | reservation |
| Reserve (2 units) | -5 | reservation |
| Cancel reservation | +5 | refund |
| Buy 100 points | +100 | purchase |
| 3-day pickup streak | +20 | streak_bonus |
| 7-day pickup streak | +50 | streak_bonus |
| Friend signs up (referrer) | +50 | referral |

---

## 🐛 Common Mistakes That Cause Issues

### 1. Applied EMERGENCY_FIX After New Migration
- `EMERGENCY_FIX_20250106.sql` recreates the old trigger
- Run `20251106_fix_duplicate_triggers.sql` to fix

### 2. Didn't Apply Migrations in Order
- Always apply in chronological order
- Check migration names (earlier dates first)

### 3. Points Table Doesn't Have RLS
- `user_points` must have RLS enabled
- Users can only see their own points

### 4. Frontend Calling Old Code
- Make sure new build is deployed
- Clear browser cache (Ctrl + Shift + Delete)

---

## 📁 Important Files

| File | Purpose | When to Use |
|------|---------|-------------|
| `DIAGNOSTIC_POINTS_ISSUE.sql` | **Run this FIRST** | To identify exact problem |
| `20251106_fix_duplicate_triggers.sql` | Fix point deduction issue | Apply in Supabase |
| `URGENT_POINTS_FIX_GUIDE.md` | **This file** | Step-by-step instructions |
| `src/lib/api.ts` (updated) | Cancellation refund | Already in code, just deploy |

---

## 💡 Quick Debug Commands

### Check Current Triggers
```sql
SELECT tgname, tgrelid::regclass FROM pg_trigger WHERE tgrelid::regclass::text = 'reservations';
```

### Check Recent Transactions for User
```sql
SELECT * FROM point_transactions WHERE user_id = 'USER_ID_HERE' ORDER BY created_at DESC LIMIT 20;
```

### Check User Balance
```sql
SELECT u.email, up.balance FROM users u JOIN user_points up ON up.user_id = u.id WHERE u.email = 'test@example.com';
```

### Manually Refund Points (Emergency)
```sql
SELECT add_user_points(
  (SELECT id FROM users WHERE email = 'customer@example.com'),
  5,
  'manual_refund',
  '{"reason": "bug fix", "admin": true}'::jsonb
);
```

---

## ✅ Checklist

- [ ] Run `DIAGNOSTIC_POINTS_ISSUE.sql` with real customer email
- [ ] Take screenshots of all diagnostic results
- [ ] Apply `20251106_fix_duplicate_triggers.sql` in Supabase
- [ ] Deploy new build with cancellation refund fix
- [ ] Test: Reserve 1 unit → Should be -5 points (not -10)
- [ ] Test: Reserve 2 units → Should be -5 points (not -15)
- [ ] Test: Cancel reservation → Should get +5 refund
- [ ] Test: Buy 100 points → Should work
- [ ] Verify: No duplicate triggers exist
- [ ] Verify: All users have correct balances

---

## 🆘 Need Help?

If after following this guide the issues persist:

1. **Send me the diagnostic SQL results** (all of them)
2. **Send screenshots** of:
   - Point transactions table
   - Triggers list
   - Console errors (if any)
3. **Tell me**:
   - Which fix you applied
   - What the exact error message is
   - Example user email to check

---

**Last Updated:** 2025-11-06
**Priority:** CRITICAL - User losing points
**Estimated Fix Time:** 10 minutes
