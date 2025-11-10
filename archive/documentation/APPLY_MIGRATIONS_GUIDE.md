# How to Apply Database Migrations

## Issue Summary

You need to apply 3 database migrations to fix:
1. ✅ **Points sync with real-time** (already working)
2. 🔧 **Gamification triggers on PICKUP** (needs migration)
3. 🔧 **Referral system with points** (needs migration)

---

## Method 1: Using Supabase Dashboard (Recommended)

### Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project: **SmartPick**
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Run Combined Migration Script

Copy and paste the **entire content** of the file:
```
D:\v3\workspace\shadcn-ui\COMBINED_MIGRATIONS.sql
```

Or run each migration file separately in this order:
1. `supabase/migrations/20251106_enable_realtime_user_points.sql`
2. `supabase/migrations/20251106_gamification_on_pickup.sql`
3. `supabase/migrations/20251106_fix_referral_points.sql`

### Step 3: Execute the Query

1. Click **Run** button (or press Ctrl+Enter)
2. Wait for "Success. No rows returned" message
3. **Done!** All migrations applied ✅

---

## Method 2: Using Supabase CLI (If Linked)

If you have Supabase CLI linked to your project:

```bash
# Navigate to project directory
cd D:\v3\workspace\shadcn-ui

# Apply all pending migrations
npx supabase db push

# Or link first if not linked
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

---

## Verify Migrations Applied

Run this query in Supabase SQL Editor to verify:

```sql
-- Check if new triggers exist
SELECT
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  CASE tgenabled
    WHEN 'O' THEN 'Enabled'
    ELSE 'Disabled'
  END as status
FROM pg_trigger
WHERE tgname IN (
  'update_stats_on_pickup',
  'auto_generate_referral_code_trigger'
)
ORDER BY tgname;
```

**Expected Output:**
```
trigger_name                          | table_name    | status
--------------------------------------|---------------|--------
auto_generate_referral_code_trigger   | users         | Enabled
update_stats_on_pickup                | reservations  | Enabled
```

---

## Test After Migration

### Test 1: Gamification on Pickup

1. **As Customer:** Make a reservation
2. **As Partner:** Go to Partner Dashboard → Mark reservation as "Picked Up"
3. **As Customer:** Go to Profile → Overview tab
4. **Expected:**
   - `total_reservations` increased
   - `current_streak_days` updated
   - Check Wallet for streak bonus if applicable

### Test 2: Referral System

1. **User A:** Go to Profile → Referral tab → Copy link
2. **Incognito Browser:** Open copied link (e.g., `yoursite.com/?ref=ABC123`)
3. **Expected:**
   - Signup page opens automatically
   - Toast shows "🎁 Welcome! Referral code ABC123 is ready to use!"
   - Referral code field shows "ABC123"
4. **Complete Signup**
5. **Expected:**
   - New user gets 100 welcome points
   - User A gets 50 referral points
   - Toast: "🎉 Account created! Welcome bonus: 100 points. Your friend received 50 points!"

---

## Troubleshooting

### Migration Fails

**Error: "relation already exists"**
- Some tables/functions already exist
- **Solution:** Comment out the existing parts or run individual statements

**Error: "permission denied"**
- Not using service_role
- **Solution:** Run query in Supabase Dashboard (auto-uses service_role)

### Pickup Not Syncing

**Check if trigger exists:**
```sql
SELECT * FROM pg_trigger
WHERE tgname = 'update_stats_on_pickup';
```

**If empty:** Re-run migration `20251106_gamification_on_pickup.sql`

**Check if pickup was marked:**
```sql
SELECT id, status, picked_up_at
FROM reservations
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC LIMIT 5;
```

### Referral Not Working

**Check if user has referral code:**
```sql
SELECT id, email, referral_code
FROM users
WHERE email = 'test@example.com';
```

**If null:** Run this to backfill:
```sql
DO $$
DECLARE
  v_user RECORD;
  v_code TEXT;
BEGIN
  FOR v_user IN SELECT id FROM users WHERE referral_code IS NULL
  LOOP
    v_code := (SELECT generate_referral_code());
    UPDATE users SET referral_code = v_code WHERE id = v_user.id;
  END LOOP;
END $$;
```

**Check if new user was linked:**
```sql
SELECT id, email, referred_by
FROM users
WHERE email = 'newuser@example.com';
```

**Check if points were awarded:**
```sql
SELECT * FROM point_transactions
WHERE reason = 'referral'
ORDER BY created_at DESC LIMIT 5;
```

---

## What Each Migration Does

### Migration 1: Enable Realtime (20251106_enable_realtime_user_points.sql)

- Enables Supabase Realtime for `user_points` table
- Allows instant UI updates when points change
- Sets replica identity to FULL

### Migration 2: Gamification on Pickup (20251106_gamification_on_pickup.sql)

**Removes:**
- Old `update_stats_on_reservation` trigger

**Adds:**
- New `update_user_stats_on_pickup()` function
- New `update_user_streak_on_date()` function with date parameter
- Trigger that fires when `status` → `'PICKED_UP'`
- Streak bonuses: 3-day (20pts), 7-day (50pts), 30-day (200pts)

### Migration 3: Referral Points (20251106_fix_referral_points.sql)

**Adds:**
- `apply_referral_code_with_rewards()` function (awards 50 points)
- `auto_generate_referral_code()` trigger (creates codes on signup)
- Backfills referral codes for existing users
- Checks for referral achievements

---

## Need Help?

If migrations fail or you're unsure, you can:

1. **Export your database** first (Supabase Dashboard → Database → Backups)
2. **Contact support** with the error message
3. **Run migrations one statement at a time** to identify which part fails

---

**Last Updated:** 2025-11-06
**Status:** Ready to Apply
