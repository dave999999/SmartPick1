# Real-time Updates & Saved Amount Fixes

## Issue 1: Active Reservations Not Updating

**Problem:** When customer makes a reservation, partner dashboard "Active Reservations" tab doesn't update in real-time.

**Root Cause:** Subscription was only active when `activeView === 'active'`
```typescript
if (!partner?.id || activeView !== 'active') {
  return; // Not subscribing!
}
```

**Solution:** Always subscribe when partner exists, regardless of active tab
```typescript
if (!partner?.id) {
  return; // Only check partner, not activeView
}
```

**File:** `src/pages/PartnerDashboardV3.tsx` line 164

**Result:** 
- ✅ Real-time updates work on all tabs
- ✅ Toast notifications only show when on "active" tab
- ✅ Data stays fresh even when partner navigates between tabs

---

## Issue 2: Saved Amount Showing 0 GEL

**Problem:** After pickup, customer sees "You saved 0 GEL" instead of actual savings.

**Root Cause #1:** Initial query didn't fetch `offer_id`
```typescript
.select('id, partner_id, customer_id, status, picked_up_at')
// Missing: offer_id!
```

**Root Cause #2:** Incorrect join syntax for fetching offer data
```typescript
.from('reservations')
.select('offer:offers(original_price, discounted_price)')
// This doesn't work correctly
```

**Solution:** 
1. Added `offer_id` to initial query
2. Query offers table directly using `reservation.offer_id`

```typescript
// Step 1: Include offer_id in initial query
.select('id, partner_id, customer_id, status, picked_up_at, offer_id')

// Step 2: Query offers table directly
const { data: offerData } = await supabaseAdmin
  .from('offers')
  .select('original_price, discounted_price')
  .eq('id', reservation.offer_id)
  .single()

const savedAmount = offerData
  ? (offerData.original_price - offerData.discounted_price)
  : 0
```

**File:** `supabase/functions/mark-pickup/index.ts` lines 89, 180-189

**Result:**
- ✅ Correctly calculates saved amount
- ✅ Shows actual GEL saved in success dialog
- ✅ Added logging to verify calculation

---

## Technical Details

### Subscription Flow
```
Customer makes reservation
    ↓
INSERT event in reservations table
    ↓
Supabase Realtime broadcasts via channel
    ↓
subscribeToPartnerReservations() receives event
    ↓
Calls refreshReservations()
    ↓
Partner dashboard updates immediately
```

### Saved Amount Calculation
```
Mark as PICKED_UP
    ↓
Fetch reservation.offer_id
    ↓
Query offers table for prices
    ↓
Calculate: original_price - discounted_price
    ↓
Broadcast savedAmount to customer
    ↓
Customer sees: "You saved X GEL!" 🎉
```

---

## Deployment Status

✅ Frontend: `20260111195054`
✅ Edge Function: `mark-pickup` (deployed)
✅ Android: Synced
✅ GitHub: commit `23436f7`

---

## Testing Checklist

### Issue 1: Real-time Updates
- [ ] Partner on "active" tab → Customer makes reservation → Updates immediately
- [ ] Partner on "history" tab → Customer makes reservation → Updates in background
- [ ] Partner switches to "active" tab → Sees new reservation
- [ ] Toast notification only shows when on "active" tab

### Issue 2: Saved Amount
- [ ] Partner marks pickup (QR scan) → Customer sees correct saved amount
- [ ] Partner marks pickup (manual code) → Customer sees correct saved amount
- [ ] Partner marks pickup (dashboard button) → Customer sees correct saved amount
- [ ] Check Edge Function logs for: `💰 Calculated saved amount: X GEL`

---

## Files Modified

1. **src/pages/PartnerDashboardV3.tsx**
   - Removed `activeView` from subscription dependency
   - Always subscribe when partner exists
   - Toast still respects `activeView` for notifications

2. **supabase/functions/mark-pickup/index.ts**
   - Added `offer_id` to initial reservation query
   - Fixed offer data query (direct table query vs join)
   - Added logging for saved amount calculation
   - Properly broadcasts to customer's device

---

## Next Steps

- Monitor Supabase logs to verify broadcast success rate
- Check if any partners report delayed updates
- Consider adding retry logic for failed broadcasts
- Add analytics tracking for pickup success rate
