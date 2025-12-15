# ⚠️ CRITICAL: Apply These Migrations to Fix Pickup Error

## The Problem
Your Edge Function is returning 400 because the database trigger is failing. The trigger tries to update `escrow_points.released_at` and `escrow_points.released_reason` columns **that don't exist yet**.

## The Solution
Apply these 3 SQL migrations in your Supabase SQL Editor **in this exact order**:

### 1. Add escrow release columns
**File:** `supabase/migrations/20251112_alter_escrow_points_release_columns.sql`

```sql
-- Copy and paste this entire file into Supabase SQL Editor and run it
```

### 2. Fix the pickup trigger
**File:** `supabase/migrations/20251112_fix_pickup_trigger_for_update_bug.sql`

```sql
-- Copy and paste this entire file into Supabase SQL Editor and run it
```

### 3. Add debug helper (optional but recommended)
**File:** `supabase/migrations/20251112_debug_pickup_helper.sql`

```sql
-- Copy and paste this entire file into Supabase SQL Editor and run it
```

## How to Apply Migrations

### Option A: Via Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***/sql
2. Open `supabase/migrations/20251112_alter_escrow_points_release_columns.sql` in VS Code
3. Copy the entire file content
4. Paste into Supabase SQL Editor
5. Click "Run" button
6. Repeat for the other 2 files

### Option B: Via Supabase CLI
```powershell
# Make sure you're in the project directory
cd d:\v3\workspace\shadcn-ui

# Apply migrations
supabase db push
```

## After Applying Migrations

1. **Test the pickup flow:**
   - Create a new reservation (as a customer)
   - Go to partner dashboard
   - Click "Mark as Picked Up"
   - Should now work without errors ✅

2. **Verify partner was credited:**
   - Check partner_points table - balance should increase
   - Check partner_point_transactions - should see PICKUP_REWARD entry
   - Check escrow_points - status should be RELEASED

3. **If you want to debug a specific reservation:**
   ```sql
   SELECT * FROM debug_pickup_state('your-reservation-uuid-here');
   ```

## What These Migrations Do

### Migration 1: alter_escrow_points_release_columns.sql
- Creates `escrow_points` table if it doesn't exist
- Adds `released_at TIMESTAMPTZ` column
- Adds `released_reason TEXT` column
- Adds index for faster lookups

### Migration 2: fix_pickup_trigger_for_update_bug.sql
- Fixes the `transfer_points_to_partner_on_pickup()` trigger function
- Removes illegal `FOR UPDATE` on aggregate SUM
- Adds idempotency (won't double-credit)
- Sets fixed `search_path` for security
- Releases escrow and credits partner on PICKED_UP

### Migration 3: debug_pickup_helper.sql
- Adds helper function to inspect reservation state
- Shows: reservation details, partner info, escrow status, wallet balance, transaction count
- Useful for troubleshooting

## Still Getting Errors?

If you still see "Failed to mark as picked up" after applying migrations:

1. **Check the Edge Function logs:**
   - Go to: https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***/functions
   - Click on "mark-pickup"
   - View recent logs - they now show detailed error messages

2. **Share the error message with me** - the new Edge Function version includes full error details

3. **Run the debug query:**
   ```sql
   SELECT * FROM debug_pickup_state('failing-reservation-uuid');
   ```
   Share the output and I'll pinpoint the issue immediately.

---

**Bottom line:** The code is correct, but the database schema is missing columns. Apply the migrations and it will work. 🚀
