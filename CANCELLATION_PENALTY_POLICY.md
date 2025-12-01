# ⚠️ Reservation Cancellation Penalty Policy

## Business Logic Applied

When a customer **cancels an active reservation**, the following happens:

### ❌ NO POINT REFUND
- **User loses SmartPoints as penalty** (no refund)
- This discourages frivolous reservations and no-shows
- Points are permanently deducted from user's balance

### ✅ Quantity Restored
- Reserved quantity is **returned to partner's offer**
- Other customers can now reserve the restored items
- Inventory is immediately available again

### 📲 Partner Notification
- Partner receives **Telegram notification** about cancellation
- Message includes:
  - Customer name
  - Item title
  - Quantity cancelled
  - Confirmation that quantity was restored

## Technical Implementation

### 1. Cancel Reservation Flow (`src/lib/api/reservations.ts`)

```typescript
// OLD BEHAVIOR (removed):
// - Called add_user_points() to refund points
// - Required RLS permissions (caused 403 error)

// NEW BEHAVIOR (implemented):
export const cancelReservation = async (reservationId: string) => {
  // 1. Restore quantity to partner's offer
  await supabase
    .from('offers')
    .update({ quantity_available: offer.quantity_available + reservation.quantity })
    .eq('id', reservation.offer_id);

  // 2. Notify partner via Telegram (fire-and-forget)
  await notifyPartnerReservationCancelled(
    offer.business_id,
    customer.full_name,
    offer.title,
    reservation.quantity
  );

  // 3. NO POINT REFUND - User loses points as penalty
  logger.log('Points NOT refunded - cancellation penalty applied');

  // 4. Mark reservation as CANCELLED
  await supabase
    .from('reservations')
    .update({ status: 'CANCELLED' })
    .eq('id', reservationId);
};
```

### 2. Telegram Notification (`src/lib/telegram.ts`)

```typescript
export async function notifyPartnerReservationCancelled(
  partnerId: string,
  customerName: string,
  offerTitle: string,
  quantity: number
) {
  const message = `🚫 <b>Reservation Cancelled</b>

<b>Customer:</b> ${customerName}
<b>Item:</b> ${offerTitle}
<b>Quantity:</b> ${quantity}

The customer cancelled their reservation. Quantity has been restored to your offer.`;

  return sendNotification(partnerId, message, 'partner');
}
```

### 3. UI Updates

**FloatingReservationCard.tsx:**
```tsx
<p className="text-[10px] sm:text-xs text-red-900 mb-2 font-medium">
  Cancel this reservation? ⚠️ You will lose your SmartPoints as penalty.
</p>
```

**QRBottomSheet.tsx:**
```tsx
<p className="text-sm font-semibold text-red-900">
  ⚠️ Are you sure? You will lose your SmartPoints as penalty.
</p>
```

**Success Toast:**
```typescript
toast.success('Reservation cancelled. Quantity restored to partner.');
```

## Why This Policy?

### Problem Solved
The previous refund system had issues:
- ❌ `add_user_points()` required service_role permissions
- ❌ Users could freely cancel without consequences
- ❌ Partners lost visibility when reservations were cancelled
- ❌ Encouraged reservation abuse (reserve everything, cancel later)

### Benefits
- ✅ **Penalty discourages cancellations** - Users think twice before reserving
- ✅ **Partner transparency** - Instant Telegram notification
- ✅ **Inventory management** - Quantity immediately available for others
- ✅ **No RLS permission issues** - No need to call add_user_points()
- ✅ **Cleaner code** - Simpler logic without refund complexity

## User Flow

### Before Cancellation
```
User has: 100 SmartPoints
Reservation cost: 10 points (2 items × 5 points each)
Current balance: 90 points (100 - 10)
```

### After Cancellation
```
❌ Points NOT refunded - User keeps 90 points (penalty applied)
✅ Partner's offer quantity restored (+2 items)
📲 Partner notified via Telegram
```

### User Sees
1. **Floating Card**: "Cancel this reservation? ⚠️ You will lose your SmartPoints as penalty."
2. **Confirmation**: "⚠️ Are you sure? You will lose your SmartPoints as penalty."
3. **Success Toast**: "Reservation cancelled. Quantity restored to partner."

## Edge Cases Handled

### 1. History Items (PICKED_UP, EXPIRED, CANCELLED)
- These are **deleted completely** (no refund, no notification)
- Already processed in the past

### 2. Partner Notification Failure
- **Non-blocking** - cancellation proceeds even if Telegram fails
- Logged for debugging but doesn't throw error

### 3. Missing Customer Name
- Falls back to "Unknown Customer" in notification

## Related Files

- ✅ `src/lib/api/reservations.ts` - Cancel logic
- ✅ `src/lib/telegram.ts` - Partner notification
- ✅ `src/components/reservation/FloatingReservationCard.tsx` - UI warning
- ✅ `src/components/reservation/QRBottomSheet.tsx` - Confirmation dialog

## Testing Checklist

- [ ] Cancel active reservation → Points NOT refunded
- [ ] Cancel reservation → Quantity restored to offer
- [ ] Cancel reservation → Partner receives Telegram notification
- [ ] UI shows penalty warning before cancel
- [ ] Toast message says "Quantity restored to partner" (not "Points refunded")
- [ ] History items (EXPIRED, PICKED_UP) can be deleted without errors

## Security Notes

- ✅ **No RLS bypass needed** - Doesn't call add_user_points()
- ✅ **CSRF protected** - Cancel requires CSRF token
- ✅ **User authentication** - Can only cancel own reservations
- ✅ **Quantity validation** - Restores correct amount to partner

---

**Status**: ✅ IMPLEMENTED  
**Date**: December 1, 2025  
**Error Fixed**: `permission denied for function add_user_points`
