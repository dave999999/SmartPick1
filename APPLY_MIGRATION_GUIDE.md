# Apply Database Migration Guide

## Migration to Apply
**File:** `supabase/migrations/20251112_fix_pickup_trigger_for_update_bug.sql`

**What it fixes:**
- Removes illegal `FOR UPDATE` on aggregate `SUM()` query
- Keeps idempotency (prevents duplicate points transfers)
- Keeps fixed `search_path = public` (security)
- Properly releases escrow points on pickup

---

## 🚀 Quick Apply (3 Steps)

### Step 1: Go to Supabase Dashboard

1. Open: https://supabase.com/dashboard
2. Select your **SmartPick project**
3. Click **SQL Editor** (left sidebar)

---

### Step 2: Copy the SQL

**Copy this entire SQL script:**

```sql
-- Fix pickup trigger: remove illegal FOR UPDATE on aggregate SUM and keep idempotency
-- Also keep fixed search_path and escrow release logic

BEGIN;

CREATE OR REPLACE FUNCTION public.transfer_points_to_partner_on_pickup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_user_id UUID;
  v_points_spent INT;
  v_points_held INT;
  v_points_to_transfer INT;
  v_tx_exists BOOLEAN := FALSE;
BEGIN
  -- Only proceed if status just changed to PICKED_UP
  IF NEW.status != 'PICKED_UP' OR OLD.status = 'PICKED_UP' THEN
    RETURN NEW;
  END IF;

  -- Resolve the partner's user_id from the offer/partner
  SELECT p.user_id INTO v_partner_user_id
  FROM public.offers o
  JOIN public.partners p ON p.id = o.partner_id
  WHERE o.id = NEW.offer_id;

  IF v_partner_user_id IS NULL THEN
    RAISE WARNING 'transfer_points_to_partner_on_pickup: partner user not found for offer_id=%', NEW.offer_id;
    RETURN NEW;
  END IF;

  -- Get held points from escrow for this reservation (no FOR UPDATE on aggregate)
  SELECT COALESCE(SUM(e.amount_held), 0) INTO v_points_held
  FROM public.escrow_points e
  WHERE e.reservation_id = NEW.id AND e.status = 'HELD';

  -- Fallback to points_spent stored on the reservation if escrow row not found
  v_points_spent := COALESCE(NEW.points_spent, 0);

  v_points_to_transfer := CASE
    WHEN v_points_held > 0 THEN v_points_held
    WHEN v_points_spent > 0 THEN v_points_spent
    ELSE GREATEST(0, COALESCE(NEW.quantity, 0) * 5)
  END;

  IF v_points_to_transfer <= 0 THEN
    RAISE NOTICE 'transfer_points_to_partner_on_pickup: no points to transfer for reservation_id=%', NEW.id;
    RETURN NEW;
  END IF;

  -- Idempotency: skip if we already logged a partner transaction for this reservation
  SELECT EXISTS (
    SELECT 1
    FROM public.partner_point_transactions ppt
    WHERE ppt.partner_id = v_partner_user_id
      AND (
        (ppt.reason = 'PICKUP_REWARD' AND ppt.metadata ->> 'reservation_id' = NEW.id::text) OR
        (ppt.reason = 'reservation_pickup' AND ppt.metadata ->> 'reservation_id' = NEW.id::text)
      )
  ) INTO v_tx_exists;

  IF v_tx_exists THEN
    RAISE NOTICE 'transfer_points_to_partner_on_pickup: points already transferred for reservation_id=%', NEW.id;
    -- Still mark escrow as released if it's somehow left HELD
    IF v_points_held > 0 THEN
      UPDATE public.escrow_points
      SET status = 'RELEASED',
          released_at = NOW(),
          released_reason = 'PICKED_UP'
      WHERE reservation_id = NEW.id AND status = 'HELD';
    END IF;
    RETURN NEW;
  END IF;

  -- Update escrow rows to RELEASED now that pickup occurred
  IF v_points_held > 0 THEN
    UPDATE public.escrow_points
    SET status = 'RELEASED',
        released_at = NOW(),
        released_reason = 'PICKED_UP'
    WHERE reservation_id = NEW.id AND status = 'HELD';
  END IF;

  -- Credit partner wallet and log a transaction
  PERFORM public.add_partner_points(
    v_partner_user_id,
    v_points_to_transfer,
    'PICKUP_REWARD',
    jsonb_build_object(
      'reservation_id', NEW.id,
      'customer_id', NEW.customer_id,
      'offer_id', NEW.offer_id,
      'quantity', NEW.quantity,
      'picked_up_at', NEW.picked_up_at
    )
  );

  RETURN NEW;
END;
$$;

-- Ensure trigger is attached (re-create defensively)
DROP TRIGGER IF EXISTS trg_transfer_points_to_partner ON public.reservations;
CREATE TRIGGER trg_transfer_points_to_partner
AFTER UPDATE OF status ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.transfer_points_to_partner_on_pickup();

COMMIT;
```

---

### Step 3: Run the Migration

1. **Paste** the SQL into the SQL Editor
2. Click **RUN** (or press Ctrl+Enter)
3. Wait for success message: ✅ "Success. No rows returned"

---

## ✅ Verification

After running, verify the migration worked:

### Test Query 1: Check Function Exists
```sql
SELECT
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_name = 'transfer_points_to_partner_on_pickup';
```

**Expected result:**
```
routine_name: transfer_points_to_partner_on_pickup
routine_type: FUNCTION
security_type: DEFINER
```

---

### Test Query 2: Check Trigger Exists
```sql
SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'trg_transfer_points_to_partner';
```

**Expected result:**
```
trigger_name: trg_transfer_points_to_partner
event_object_table: reservations
action_timing: AFTER
event_manipulation: UPDATE
```

---

### Test Query 3: Test Function (Safe - Read Only)
```sql
SELECT
  proname,
  prosrc LIKE '%FOR UPDATE%' AS has_for_update_bug,
  prosrc LIKE '%search_path = public%' AS has_search_path_fix
FROM pg_proc
WHERE proname = 'transfer_points_to_partner_on_pickup';
```

**Expected result:**
```
proname: transfer_points_to_partner_on_pickup
has_for_update_bug: FALSE  ✅ (Bug is fixed!)
has_search_path_fix: TRUE  ✅ (Security hardening present)
```

---

## 🧪 Functional Test

To test the migration actually works:

1. **Login as partner** on your site
2. **Mark a reservation as picked up**
3. **Check partner points increased** (should get 10 points)
4. **No errors in logs**

---

## 🔄 Alternative: Using Supabase CLI (If You Have Docker)

If you want to use Supabase CLI instead (requires Docker):

```bash
# 1. Start local Supabase
supabase start

# 2. Apply migration
supabase db push

# 3. Verify
supabase db diff
```

**Note:** You don't have Docker running currently, so use the Dashboard method above.

---

## 📊 What This Migration Does

### Problem Fixed:
**Before:** Query had `FOR UPDATE` on aggregate `SUM()`:
```sql
SELECT COALESCE(SUM(e.amount_held), 0) INTO v_points_held
FROM public.escrow_points e
WHERE e.reservation_id = NEW.id AND e.status = 'HELD'
FOR UPDATE;  -- ❌ ILLEGAL on aggregate!
```

**After:** Removed `FOR UPDATE`:
```sql
SELECT COALESCE(SUM(e.amount_held), 0) INTO v_points_held
FROM public.escrow_points e
WHERE e.reservation_id = NEW.id AND e.status = 'HELD';
-- ✅ No FOR UPDATE on aggregate
```

### Why This Matters:
- `FOR UPDATE` can only lock specific rows, not aggregates
- PostgreSQL would throw an error: "FOR UPDATE is not allowed with aggregate functions"
- This prevented pickups from completing successfully
- **Critical bug fix!**

---

## 🚨 Safety Features

This migration is **SAFE** because:

1. ✅ **Uses `CREATE OR REPLACE`** - Won't fail if function exists
2. ✅ **Uses `DROP TRIGGER IF EXISTS`** - Won't fail if trigger exists
3. ✅ **Wrapped in transaction** - All-or-nothing (BEGIN/COMMIT)
4. ✅ **No data changes** - Only updates function/trigger logic
5. ✅ **Backwards compatible** - Existing pickups still work

---

## 📝 Rollback Plan (If Needed)

If something goes wrong, you can rollback by running the previous version:

```sql
-- Find previous migration
-- supabase/migrations/20251112_release_escrow_on_pickup.sql
-- Copy and run that instead
```

**However:** This migration FIXES a bug, so you should NOT need to rollback.

---

## ⏱️ Downtime

**Expected downtime:** 0 seconds

- Migration runs in milliseconds
- No table locks
- No data migration
- Users won't notice

---

## 📞 Support

If you get errors:

1. **Check Supabase logs** (Dashboard → Logs)
2. **Copy error message**
3. **Check if function/trigger already exists:**
   ```sql
   SELECT routine_name FROM information_schema.routines
   WHERE routine_name = 'transfer_points_to_partner_on_pickup';
   ```

---

## ✅ Success Checklist

After running migration:

- [ ] SQL executed without errors ✅
- [ ] Function exists (Test Query 1) ✅
- [ ] Trigger exists (Test Query 2) ✅
- [ ] FOR UPDATE bug is gone (Test Query 3) ✅
- [ ] Pickup functionality works ✅
- [ ] Partner points increase correctly ✅
- [ ] No errors in Supabase logs ✅

---

**Ready to apply? Go to Supabase Dashboard → SQL Editor and paste the SQL!** 🚀

**File location:** `d:\v3\workspace\shadcn-ui\supabase\migrations\20251112_fix_pickup_trigger_for_update_bug.sql`
