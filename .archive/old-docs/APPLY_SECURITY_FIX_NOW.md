# APPLY THIS MIGRATION TO PRODUCTION NOW

## 🚨 CRITICAL SECURITY FIX

This migration removes a privilege escalation vulnerability where any authenticated user could temporarily become `service_role` and bypass all RLS policies.

## 📋 WHAT TO DO

### Option 1: Via Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/sql
2. Copy the contents of `supabase/migrations/20251121_remove_dangerous_set_config.sql`
3. Paste into the SQL Editor
4. Click "Run"
5. Verify you see the success message with the green checkmarks

### Option 2: Via Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db push

# Or apply specific migration
supabase db push --include-all
```

### Option 3: Manual SQL (If CLI doesn't work)
```sql
-- Just run this in Supabase SQL Editor:
DROP FUNCTION IF EXISTS partner_mark_as_picked_up(UUID);

-- Then run the CREATE FUNCTION statement from the migration file
```

## ✅ VERIFICATION

After running the migration, you should see this output:
```
╔══════════════════════════════════════════════════════════════╗
║  CRITICAL SECURITY FIX APPLIED                               ║
╚══════════════════════════════════════════════════════════════╝

Issue: Privilege escalation via set_config bypass
Vulnerable pattern removed: set_config('request.jwt.claims', ...)

Function partner_mark_as_picked_up now uses SECURITY DEFINER
safely with proper ownership verification.

✓ Old vulnerable versions dropped
✓ Secure version recreated
✓ Permissions restricted to authenticated users only
```

## 🔍 WHAT THIS FIXES

**Before (Vulnerable):**
```sql
-- ANY user could call this and become service_role!
PERFORM set_config('request.jwt.claims', 
  json_build_object('role', 'service_role')::text, true);
```

**After (Secure):**
```sql
-- Function uses SECURITY DEFINER safely
-- Only allows partner to update THEIR OWN reservations
IF v_reservation.partner_id != v_partner_id THEN
  RAISE EXCEPTION 'Access denied';
END IF;
```

## 📊 IMPACT

- ✅ **No breaking changes** - Function signature unchanged
- ✅ **Same functionality** - Partners can still mark pickups
- ✅ **More secure** - No privilege escalation possible
- ✅ **Better validation** - Stricter ownership checks

## ⏰ URGENCY

**Priority:** HIGH  
**When:** ASAP (but vulnerability was already mostly fixed on Nov 9)

**Note:** The dangerous code was already removed in the Nov 9 migration. This migration ensures the fix is enforced and adds extra validation. Your production database is likely already secure if you applied migrations after Nov 9, 2025.

## 🔗 MORE INFO

See `SECURITY_AUDIT_PRIVILEGE_ESCALATION.md` for full details.
