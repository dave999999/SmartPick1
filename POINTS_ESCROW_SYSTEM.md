# Points Escrow System - Complete Implementation

## 🎯 Overview

A fair, secure escrow system where points are held until both parties confirm the transaction.

## 📊 Flow Diagram

```
USER RESERVES (15 points)
    ↓
[Points Deducted from User]
    ↓
[Points Held in Escrow] ← Not added to partner yet!
    ↓
    ├─→ PARTNER: Marks "Picked Up" → Status: PICKED_UP
    │       ↓
    │   USER: Confirms "Yes, I picked it up" → user_confirm_pickup()
    │       ↓
    │   ✅ 15 points → Partner Wallet
    │
    ├─→ PARTNER: Marks "No Show" → partner_mark_no_show()
    │       ↓
    │   ✅ 15 points → Partner Wallet (penalty)
    │
    └─→ USER: Cancels → user_cancel_reservation_split()
            ↓
        ✅ 7.5 points → Partner (cancellation fee)
        ✅ 7.5 points → User (refund)
```

## 🗄️ Database Changes

### New Column
```sql
ALTER TABLE reservations 
ADD COLUMN user_confirmed_pickup BOOLEAN DEFAULT FALSE;
```

### New Functions

**1. `user_confirm_pickup(reservation_id)`**
- **Who calls**: Authenticated user (customer)
- **When**: After partner marks as PICKED_UP
- **What**: Transfers 15 points to partner
- **Returns**: `{success, points_transferred}`

**2. `partner_mark_no_show(reservation_id)`**
- **Who calls**: Authenticated partner
- **When**: User didn't show up
- **What**: Transfers 15 points to partner as penalty
- **Returns**: `{success, points_transferred}`

**3. `user_cancel_reservation_split(reservation_id)`**
- **Who calls**: Authenticated user
- **When**: User wants to cancel ACTIVE reservation
- **What**: Splits points 50/50 (7.5 to partner, 7.5 refund to user)
- **Returns**: `{success, partner_received, user_refunded}`

## 📱 Frontend API

### New Functions in `src/lib/api.ts`

```typescript
// User confirms they picked up the order
await userConfirmPickup(reservationId);

// Partner marks user as no-show
await partnerMarkNoShow(reservationId);

// User cancels with 50/50 split
await userCancelReservationWithSplit(reservationId);
```

## 🔄 Status Flow

| Status | Meaning | Next Actions |
|--------|---------|--------------|
| `ACTIVE` | User reserved, waiting | Partner: Mark Picked Up / No Show<br>User: Cancel |
| `PICKED_UP` | Partner confirmed pickup | User: Confirm Pickup |
| `CANCELLED` | Cancelled or no-show | None (final state) |

## 💰 Points Distribution

### Scenario 1: Happy Path (Both Confirm)
```
User Reserves       : User -15 pts (held)
Partner Confirms    : Status → PICKED_UP
User Confirms       : Partner +15 pts
```

### Scenario 2: No-Show (Partner Reports)
```
User Reserves       : User -15 pts (held)
Partner: No-Show    : Partner +15 pts (penalty)
                      Status → CANCELLED
```

### Scenario 3: User Cancels
```
User Reserves       : User -15 pts (held)
User Cancels        : Partner +7.5 pts (fee)
                      User +7.5 pts (refund)
                      Offer quantity restored
```

## 🎨 UI Updates Needed

### MyPicks Page (User View)

**For ACTIVE reservations:**
- ✅ Show: "Reserved" badge
- ✅ Show: Cancel button → calls `userCancelReservationWithSplit()`
- ⚠️ Warn: "Cancel fee: 7.5 points (50%) to partner"

**For PICKED_UP reservations:**
- ✅ Show: "Ready for Pickup" badge
- ✅ Show: "Confirm Pickup" button → calls `userConfirmPickup()`
- 📝 Note: "Confirm once you've picked up your order"

### Partner Dashboard (Partner View)

**For ACTIVE reservations:**
- ✅ Show: "Awaiting Pickup" badge
- ✅ Show: "Mark Picked Up" button → calls existing `markAsPickedUp()`
- ✅ Show: "Mark No-Show" button → calls `partnerMarkNoShow()`

**For PICKED_UP reservations:**
- ✅ Show: "Waiting for User Confirmation" badge
- 📝 Note: "User will confirm pickup to release points"

## 🔐 Security

### Validation Checks

**user_confirm_pickup:**
- ✅ Must be authenticated
- ✅ Must own the reservation
- ✅ Reservation must be in PICKED_UP status
- ✅ Cannot confirm twice

**partner_mark_no_show:**
- ✅ Must be authenticated
- ✅ Must be the partner for this reservation
- ✅ Reservation must be in ACTIVE status

**user_cancel_reservation_split:**
- ✅ Must be authenticated
- ✅ Must own the reservation
- ✅ Reservation must be in ACTIVE status
- ✅ Cannot cancel after pickup

## 📝 Transaction Reasons

New transaction types in `point_transactions` and `partner_point_transactions`:

- `RESERVATION_CREATED` - User's points deducted
- `PICKUP_CONFIRMED` - Points transferred to partner (happy path)
- `NO_SHOW_PENALTY` - Points transferred to partner (penalty)
- `CANCELLATION_FEE` - Partner receives 50%
- `CANCELLATION_REFUND` - User receives 50% back

## 🚀 Migration Order

Apply these migrations IN ORDER:

1. **`20251108_partner_points_system_SAFE.sql`**
   - Partner points tables and welcome bonus

2. **`20251108_add_points_to_reservation.sql`** 
   - Deduct user points on reservation (**UPDATED**: uses 'ACTIVE' status)

3. **`20251108_points_escrow_system.sql`** ⭐ **NEW**
   - Adds escrow system
   - Removes auto-transfer
   - Adds 3 new functions

## ✅ Testing Checklist

### Happy Path
- [ ] User reserves offer → 15 points deducted
- [ ] Partner marks "Picked Up" → Status becomes PICKED_UP
- [ ] User clicks "Confirm Pickup" → 15 points go to partner
- [ ] Check `partner_point_transactions` for PICKUP_CONFIRMED

### No-Show Path
- [ ] User reserves offer → 15 points deducted
- [ ] Partner marks "No Show" → 15 points go to partner
- [ ] Status becomes CANCELLED
- [ ] Check transaction for NO_SHOW_PENALTY

### Cancellation Path
- [ ] User reserves offer → 15 points deducted
- [ ] User cancels → 7.5 points to partner, 7.5 back to user
- [ ] Offer quantity restored (+1)
- [ ] Check both transaction logs

## 🐛 Troubleshooting

**"Reservation not ready for confirmation"**
- Partner hasn't marked as picked up yet
- Wait for partner to confirm first

**"Cannot cancel at this stage"**
- Reservation already picked up
- Can only cancel ACTIVE reservations

**"Already confirmed"**
- User already confirmed this pickup
- Check `user_confirmed_pickup` column

## 📊 Database Queries for Debugging

```sql
-- Check escrow status
SELECT 
  id,
  status,
  points_spent,
  user_confirmed_pickup,
  created_at
FROM reservations
WHERE status IN ('ACTIVE', 'PICKED_UP')
ORDER BY created_at DESC;

-- Check pending partner rewards
SELECT r.id, r.status, r.points_spent, r.user_confirmed_pickup, p.business_name
FROM reservations r
JOIN partners p ON p.id = r.partner_id
WHERE r.status = 'PICKED_UP' 
  AND r.user_confirmed_pickup = FALSE;

-- Check transaction types
SELECT reason, COUNT(*), SUM(change)
FROM partner_point_transactions
GROUP BY reason
ORDER BY COUNT(*) DESC;
```

---

**Status:** ✅ Backend complete, ready for UI implementation
**Commit:** 3b1aeae
**Next Steps:** Add UI buttons and confirmation dialogs in MyPicks and PartnerDashboard
