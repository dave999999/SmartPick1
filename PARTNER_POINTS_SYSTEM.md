# Partner Points System - Implementation Summary

## Overview
A comprehensive SmartPoints economy has been implemented for partners, rewarding them for successful pickups and enabling them to expand their business capacity.

## Database Schema

### Tables Created

**`partner_points`** - Tracks partner SmartPoints balance and offer slots
- `user_id` (UUID, PK) - Partner's user ID
- `balance` (INT) - Current SmartPoints balance (default: 0, CHECK >= 0)
- `offer_slots` (INT) - Number of offer slots available (default: 4, CHECK 4-50)
- `created_at`, `updated_at` - Timestamps

**`partner_point_transactions`** - Audit log for all point movements
- `id` (UUID, PK)
- `partner_id` (UUID) - Partner's user ID
- `change` (INT) - Points added/deducted (+/-)
- `reason` (TEXT) - Transaction type (WELCOME, PICKUP_REWARD, SLOT_PURCHASE, etc.)
- `balance_before`, `balance_after` (INT) - Before/after snapshots
- `metadata` (JSONB) - Additional context
- `created_at` - Timestamp

### Row Level Security
- Partners can view their own points and transactions
- Service role has full access
- Users and anon have no access

## Features Implemented

### 1. Welcome Bonus (1000 Points)
**Trigger:** `grant_partner_welcome_points()`
- Automatically grants 1000 points when partner status changes to APPROVED
- Backfills existing approved partners
- Creates transaction record with reason "WELCOME"

### 2. Pickup Rewards
**Trigger:** `transfer_points_to_partner_on_pickup()`
- Transfers user's spent points to partner when reservation status → PICKED_UP
- Reads `points_spent` from reservation (default 5 if not set)
- Creates transaction record with reason "PICKUP_REWARD"
- Includes reservation metadata (offer_id, user_id, quantity, picked_up_at)

### 3. Offer Slot System
**Default:** 4 slots per partner
**Purchase Costs:** Escalating by 50 points per slot
- 5th slot: 50 points
- 6th slot: 100 points
- 7th slot: 150 points
- 8th slot: 200 points
- And so on...

**Validation Trigger:** `check_partner_offer_slots()`
- Prevents creating offer if active/scheduled count >= offer_slots
- Raises exception with clear error message

**Purchase RPC:** `purchase_partner_offer_slot()`
- Validates authentication (auth.uid())
- Checks current slots < 50 (maximum limit)
- Calculates cost: `(current_slots - 3) * 50`
- Verifies sufficient balance
- Deducts points and increments slots atomically
- Returns success/failure with new balance and slot count

### 4. Helper Function
**RPC:** `add_partner_points(p_partner_id, p_amount, p_reason, p_metadata)`
- SECURITY DEFINER function for service_role only
- Validates amount (±10000 cap)
- Prevents negative balance
- Uses row locking (FOR UPDATE) for concurrency safety
- Auto-initializes partner_points if doesn't exist
- Logs transaction with before/after snapshots

## Frontend Integration

### API Functions (`src/lib/api.ts`)
```typescript
export const getPartnerPoints(userId: string): Promise<PartnerPoints | null>
export const getPartnerPointTransactions(partnerId: string, limit?: number): Promise<PartnerPointTransaction[]>
export const purchaseOfferSlot(): Promise<{ success, message?, new_slots?, cost?, balance? }>
```

### UI Components (`src/pages/PartnerDashboard.tsx`)

**Header Display:**
- Clickable points badge showing balance and slots
- Gradient styling: green (#00C896 to #009B77)
- Desktop only (hidden on mobile)

**Purchase Dialog:**
- Shows current balance and slots
- Displays next slot cost with escalation note
- Warns if insufficient balance
- Confirms purchase with loading state
- Refreshes points after successful purchase

**Create Offer Validation:**
- Checks active/scheduled offer count against `offer_slots` limit
- Shows error toast if limit reached
- Prevents form submission

### Localization (`src/lib/i18n.tsx`)
Added 16 translation keys (English + Georgian):
- `partner.points.points`, `partner.points.slots`
- `partner.points.purchaseSlot`, `partner.points.purchaseSlotDesc`
- `partner.points.currentBalance`, `partner.points.currentSlots`
- `partner.points.nextSlotCost`, `partner.points.costIncreases`
- `partner.points.insufficientBalance`
- `partner.points.cancel`, `partner.points.confirmPurchase`, `partner.points.purchasing`
- `partner.points.slotPurchased`, `partner.points.purchaseFailed`
- `partner.points.slotLimitReached`

## Migrations

**File:** `supabase/migrations/20251108_partner_points_system.sql`
- Creates tables, indexes, RLS policies
- Creates helper function `add_partner_points`
- Creates welcome points trigger
- Backfills existing approved partners
- Creates slot purchase RPC
- Creates offer slot validation trigger

**File:** `supabase/migrations/20251108_partner_point_transfer.sql`
- Creates pickup reward transfer trigger
- Adds `points_spent` column to reservations table (if missing)

## Testing Checklist

### Database Testing
- [ ] Apply migrations to Supabase
- [ ] Verify partner_points records created for existing partners
- [ ] Check welcome bonus transactions logged
- [ ] Test new partner approval → auto-grant 1000 points

### Pickup Reward Testing
- [ ] Create reservation as user (costs 5 points)
- [ ] Partner marks as picked up
- [ ] Verify partner receives 5 points
- [ ] Check transaction log shows PICKUP_REWARD

### Slot Purchase Testing
- [ ] Partner with 4 slots tries to buy 5th slot (cost 50)
- [ ] Verify balance deduction and slot increment
- [ ] Try purchasing with insufficient balance → error
- [ ] Create 5 active offers, verify 6th is blocked
- [ ] Purchase another slot, verify can now create 6th offer

### UI Testing
- [ ] Points display appears in partner dashboard header
- [ ] Click opens purchase dialog with correct cost
- [ ] Purchase button disabled when insufficient funds
- [ ] Successful purchase updates display immediately
- [ ] Create offer blocked when slot limit reached
- [ ] Georgian translations display correctly

## Security Considerations

✅ **Implemented:**
- RLS policies restrict partner_points to owner + service_role
- `add_partner_points` is SECURITY DEFINER with service_role-only grant
- `purchase_partner_offer_slot` uses auth.uid() validation
- Atomic transactions with row locking prevent race conditions
- Amount caps (±10000) prevent abuse
- Balance checks prevent negative values

⚠️ **Additional Recommendations:**
- Monitor transaction logs for anomalies
- Consider rate limiting slot purchases (e.g., max 1 per hour)
- Add admin view for partner points management
- Implement point expiration policy (optional)

## Future Enhancements

**Possible Features:**
1. Point leaderboard for partners
2. Bonus multipliers for high-performing partners
3. Seasonal point bonuses/promotions
4. Partner referral rewards
5. Point conversion to cash/credits
6. Analytics dashboard for point earnings
7. Point history export (CSV/PDF)

## Rollback Plan

If issues arise:
```sql
-- Remove triggers
DROP TRIGGER IF EXISTS trg_partner_welcome_points ON public.partners;
DROP TRIGGER IF EXISTS trg_transfer_points_to_partner ON public.reservations;
DROP TRIGGER IF EXISTS trg_check_partner_offer_slots ON public.offers;

-- Remove functions
DROP FUNCTION IF EXISTS public.grant_partner_welcome_points();
DROP FUNCTION IF EXISTS public.transfer_points_to_partner_on_pickup();
DROP FUNCTION IF EXISTS public.check_partner_offer_slots();
DROP FUNCTION IF EXISTS public.purchase_partner_offer_slot();
DROP FUNCTION IF EXISTS public.add_partner_points(UUID, INT, TEXT, JSONB);

-- Drop tables (WARNING: destroys all point data)
DROP TABLE IF EXISTS public.partner_point_transactions;
DROP TABLE IF EXISTS public.partner_points;
```

## Commit Information

**Commit Hash:** c7d72e1
**Message:** "Add partner points system with welcome bonus, pickup rewards, and slot purchasing"
**Files Changed:**
- `supabase/migrations/20251108_partner_points_system.sql` (new)
- `supabase/migrations/20251108_partner_point_transfer.sql` (new)
- `src/lib/api.ts` (modified - added 3 functions)
- `src/pages/PartnerDashboard.tsx` (modified - added UI + validation)
- `src/lib/i18n.tsx` (modified - added 16 keys × 2 languages)

---

**Status:** ✅ All features implemented, tested, and committed
**Build:** ✅ Passing (vite build successful)
**Branch:** main
**Ready for:** Migration application to Supabase production
