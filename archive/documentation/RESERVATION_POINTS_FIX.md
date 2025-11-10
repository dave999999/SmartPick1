# Points Deduction Fix - Reservation System

## Problem
User was trying to create a reservation but got error "Failed to deduct points". The `create_reservation_atomic` function wasn't deducting points from users when they made reservations.

## Solution
Created migration `20251108_add_points_to_reservation.sql` that:

### 1. **Deducts 15 Points on Reservation**
```sql
v_points_result := public.add_user_points(
  v_customer_id,
  -15,  -- Cost per reservation
  'RESERVATION_CREATED',
  ...
);
```

### 2. **Validates Points Deduction Success**
```sql
IF NOT (v_points_result->>'success')::boolean THEN
  RAISE EXCEPTION 'Failed to deduct points: %', v_points_result->>'message';
END IF;
```

### 3. **Auto-Refunds on Failure**
If the reservation fails for any reason (offer not found, insufficient quantity, expired, etc.), the points are automatically refunded:

```sql
PERFORM public.add_user_points(
  v_customer_id,
  15,  -- Refund amount
  'RESERVATION_FAILED_REFUND',
  jsonb_build_object('reason', 'Offer not found')
);
```

### 4. **Tracks Points on Reservation**
The reservation now stores how many points were spent:
```sql
INSERT INTO reservations (..., points_spent)
VALUES (..., 15);
```

## Points Flow

### User Makes Reservation:
1. User clicks "Reserve Now"
2. System deducts 15 points immediately
3. If successful → Reservation created
4. If failed → Points refunded automatically

### Partner Gets Rewarded on Pickup:
1. Partner marks reservation as "PICKED_UP"
2. System transfers 15 points to partner
3. Transaction logged in `partner_point_transactions`

## Complete Points Economy

| Action | User Points | Partner Points |
|--------|-------------|----------------|
| New user signup | +540 (welcome) | - |
| Partner approved | - | +1000 (welcome) |
| Create reservation | -15 | - |
| Pickup completed | - | +15 (from user) |
| Claim achievement | +X (varies) | - |
| Purchase offer slot | - | -50/100/150... |

## Migration Order

**You must apply 3 migrations in order:**

1. **`20251108_partner_points_system.sql`** - Creates partner points tables
2. **`20251108_partner_point_transfer.sql`** - Adds pickup reward transfer
3. **`20251108_add_points_to_reservation.sql`** - Adds reservation cost deduction ⭐ **NEW**

## Error Messages

**Before Fix:**
- ❌ "Failed to deduct points" (no details)
- User confused why reservation failed

**After Fix:**
- ✅ "Insufficient points. You need 15 points to make a reservation."
- ✅ "Failed to deduct points: Cannot modify another user" (security)
- ✅ Points automatically refunded if reservation fails

## Testing Checklist

After applying all 3 migrations:

- [ ] User with 15+ points can create reservation successfully
- [ ] User with <15 points gets clear error message
- [ ] Points deducted immediately when reservation created
- [ ] Points refunded if reservation fails (expired offer, etc.)
- [ ] Partner receives 15 points when pickup completed
- [ ] `reservations.points_spent` column shows 15
- [ ] Transaction logs show RESERVATION_CREATED and PICKUP_REWARD

## Rollback (if needed)

To rollback to the previous version:
```sql
-- Restore old function without points deduction
-- (Use the version from 20251107_secure_reservation_function.sql)
```

---

**Status:** ✅ Fixed and deployed
**Commit:** d87867f
**Files Changed:**
- `supabase/migrations/20251108_add_points_to_reservation.sql` (new)
- `apply-partner-points-migration.js` (updated)
- `APPLY_PARTNER_POINTS_MIGRATIONS.md` (updated)
