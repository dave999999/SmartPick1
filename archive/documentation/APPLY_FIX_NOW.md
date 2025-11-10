# 🚨 APPLY THIS FIX NOW - Admin Dashboard Database Error

## The Problem
Your admin dashboard can't approve partners because of a database constraint error.

## The Fix (2 minutes)

### ⚡ FASTEST METHOD - Click and Run

1. **Click this link:** https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***/sql/new

2. **Copy this SQL** (Ctrl+C):
```sql
-- Drop the old constraint
ALTER TABLE partners DROP CONSTRAINT IF EXISTS valid_partner_status;

-- Add the fixed constraint with APPROVED status
ALTER TABLE partners
ADD CONSTRAINT valid_partner_status
CHECK (status::text = ANY (ARRAY['PENDING', 'APPROVED', 'BLOCKED', 'PAUSED']::text[]));

-- Add documentation
COMMENT ON CONSTRAINT valid_partner_status ON partners
IS 'Ensures partner status is one of: PENDING, APPROVED, BLOCKED, PAUSED';
```

3. **Paste** the SQL into the SQL Editor (Ctrl+V)

4. **Click RUN** (or press Ctrl+Enter)

5. **Done!** ✅ Your admin dashboard will now work

---

## Alternative Method - Use the Script

If you have your Supabase service role key:

```bash
node apply-migration.js YOUR_SERVICE_ROLE_KEY
```

To get your service role key:
- Go to: https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***/settings/api
- Copy the **service_role** key (NOT the anon key)

---

## What This Fix Does

- **Before:** Database constraint only allowed: PENDING, BLOCKED, PAUSED ❌
- **After:** Database constraint allows: PENDING, **APPROVED**, BLOCKED, PAUSED ✅

This is why your admin dashboard couldn't approve partners - the database was rejecting the APPROVED status!

---

## Verify It Worked

After applying the fix:
1. Go to your admin dashboard
2. Try to approve a partner
3. It should work without errors! ✅

---

**Need help?** The full migration file is at: `supabase/migrations/20250131_fix_partner_status_constraint.sql`
