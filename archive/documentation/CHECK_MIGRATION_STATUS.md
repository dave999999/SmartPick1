# Quick Test: Check If Migration Applied

Run this query in Supabase SQL Editor to verify the migration is applied:

```sql
-- Check if create_reservation_atomic has points deduction logic
SELECT 
  proname as function_name,
  prosrc as source_code
FROM pg_proc
WHERE proname = 'create_reservation_atomic';
```

**What to look for:**
- If the `source_code` contains `user_points` and `point_transactions`, the migration is applied ✅
- If it doesn't contain those, the migration is NOT applied yet ❌

## Apply The Migration NOW

**You MUST run this SQL in Supabase:**

1. Go to: https://supabase.com/dashboard/project/ggzhtpaxnhwcilomswtm/sql/new

2. Copy the ENTIRE contents of:
   `supabase/migrations/20251108_add_points_to_reservation.sql`

3. Paste and click "Run"

4. Wait for success message

5. Try reserving again - it should work!

---

## Why You're Still Getting the Error

The error "Failed to deduct points" is coming from the **OLD version** of `create_reservation_atomic` that's currently running in your database. The new version (with direct points deduction) hasn't been applied yet.

**Current situation:**
- ✅ Code committed to Git
- ✅ Migration file exists
- ❌ Migration NOT applied to Supabase database
- ❌ Old function still running

**Solution:**
Apply the migration SQL to Supabase NOW! 🚀
