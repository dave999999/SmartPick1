# ⚠️ URGENT: Apply Migrations to Fix "Failed to deduct points" Error

## The Problem

You're getting "Failed to deduct points" because the database functions don't exist yet in your Supabase database. The migrations are only in your git repository - they need to be executed in Supabase SQL Editor.

## Solution: Apply 3 Migrations (5 minutes)

### Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your SmartPick project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Apply Migration 1 - Partner Points System

Copy the **ENTIRE** contents of this file:
```
supabase/migrations/20251108_partner_points_system_SAFE.sql
```

Paste into SQL Editor and click **Run** (or press Ctrl+Enter)

✅ Expected result: "Success. No rows returned"

### Step 3: Apply Migration 2 - Points Deduction

Copy the **ENTIRE** contents of this file:
```
supabase/migrations/20251108_add_points_to_reservation.sql
```

Paste into SQL Editor and click **Run**

✅ Expected result: "Success. No rows returned"

### Step 4: Apply Migration 3 - Escrow System

Copy the **ENTIRE** contents of this file:
```
supabase/migrations/20251108_points_escrow_system.sql
```

Paste into SQL Editor and click **Run**

✅ Expected result: "Success. No rows returned"

## Verify Migrations Applied

Run this query to verify:

```sql
-- Check if functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'add_partner_points',
    'purchase_partner_offer_slot',
    'create_reservation_atomic',
    'user_confirm_pickup',
    'partner_mark_no_show',
    'user_cancel_reservation_split'
  );
```

You should see all 6 function names returned.

## Test Again

After applying all 3 migrations:
1. Refresh your app (F5)
2. Try to reserve an offer again
3. You should now see points deducted successfully!

## Troubleshooting

### Error: "already exists"
Some tables/functions might exist. Run the SAFE version:
- Use `20251108_partner_points_system_SAFE.sql` instead of the regular version
- This has `DROP IF EXISTS` statements to avoid conflicts

### Error: "permission denied"
Make sure you're using the **SQL Editor** in Supabase dashboard, not running migrations locally.

### Still getting "Failed to deduct points"
Check the browser console (F12) for detailed error messages. The issue is likely:
1. Migrations not applied correctly
2. RLS policies blocking the function call
3. User doesn't have enough points (need 15 points minimum)

## Grant User Initial Points (If Needed)

If a user has 0 points and can't reserve:

```sql
-- Grant 100 points to a specific user
INSERT INTO user_points (user_id, balance)
VALUES ('USER_UUID_HERE', 100)
ON CONFLICT (user_id) 
DO UPDATE SET balance = user_points.balance + 100;

-- Log the transaction
INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after)
VALUES ('USER_UUID_HERE', 100, 'ADMIN_GRANT', 0, 100);
```

Replace `USER_UUID_HERE` with the actual user ID from `auth.users` table.

---

**Next Steps After Migration:**
Once migrations are applied, the escrow system will be fully functional with:
- Points held in escrow (not immediately given to partner)
- User confirmation button in MyPicks
- 50/50 cancellation split
- No-show penalties
