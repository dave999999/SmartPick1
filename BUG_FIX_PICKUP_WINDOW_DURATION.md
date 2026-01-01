# 🐛 BUG FIX: Pickup Window Duration Not Preserved on Refresh

## ❌ The Problem

When you "refreshed all partner offers" from the admin dashboard, it was **resetting ALL offers to 24 hours** instead of preserving their original duration.

### What "Pickup Window" Means

**Pickup window** = The time period when customers can pick up the offer

For **24-hour businesses** like "ემზარას საცხობი":
- ✅ **BEFORE (Correct):** Pickup window = Partner's chosen duration (2 days, 1 week, etc.)
- ❌ **BUG:** Bulk refresh was forcing 24 hours only
- ✅ **NOW (Fixed):** Pickup window = Preserves original duration

### Why This Broke Your Offers

**Your partner "ემზარას საცხობი" had 3 offers:**

1. **"კუბდარი"** - Created recently (9 days duration) ✅ Visible
2. **"qwsdasdas"** - Originally 6 days, but refresh reset to 24h ❌ Hidden after 24h
3. **"test55"** - Created with 14 days ✅ Visible

When you refreshed yesterday:
- All offers got reset to **24 hours**
- After 24 hours, "qwsdasdas" pickup window expired
- App filters out offers with `pickup_end < NOW()`
- Result: Only 2 visible instead of 3

## ✅ What Was Fixed

### 1. Bulk Refresh Action ([BulkActions.tsx](src/components/admin/BulkActions.tsx#L207-L240))

**BEFORE:**
```typescript
const pickupEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Always 24h!
```

**AFTER:**
```typescript
// Calculate original duration
const originalStart = new Date(offer.pickup_start || offer.created_at);
const originalEnd = new Date(offer.pickup_end || offer.expires_at);
const originalDuration = originalEnd.getTime() - originalStart.getTime();

// Preserve it when refreshing
const durationToUse = Math.max(originalDuration, 24 * 60 * 60 * 1000);
const pickupEnd = new Date(now.getTime() + durationToUse);
```

### 2. Individual Offer Refresh ([PartnersManagement.tsx](src/components/admin/PartnersManagement.tsx#L663))

Same fix applied to the individual refresh button in admin partner view.

### 3. Respects Business Hours

For **non-24h businesses**, pickup_end is automatically adjusted to closing time:
```typescript
if (!partner.open_24h && partner.business_hours?.close) {
  pickupEnd.setHours(closingHours, closingMinutes);
}
```

## 🔧 How to Fix Your Current Hidden Offer

### Option 1: Run SQL (Immediate)

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of [`FIX_HIDDEN_OFFER.sql`](FIX_HIDDEN_OFFER.sql)
3. Click **Run**
4. Offer "qwsdasdas" will be visible immediately with its original 6-day duration

### Option 2: Use Admin Dashboard (After deploying fix)

1. Go to Admin Dashboard → Partners
2. Find "ემზარას საცხობი"
3. Click "View" → Find "qwsdasdas" offer
4. Click refresh button (🔄)
5. It will now preserve the original duration!

## 📊 Understanding the Filtering Logic

### Customer-Facing Offers (Map/Discover)
```typescript
// src/hooks/useOffers.ts
.eq('status', 'ACTIVE')
.gt('quantity_available', 0)
.gt('expires_at', now)        // ✅ Must not be expired
.gt('pickup_end', now)        // ✅ Pickup window must be active
```

### Partner/Admin Dashboard
```typescript
// src/lib/api/partners.ts
// Shows ALL offers (including expired) for management
.eq('partner_id', partnerId)  
// No expiration filters
```

This is **intentional** - partners/admins need to see all offers to manage them.

## 🎯 Summary

**Root Cause:** Bulk refresh was hardcoded to 24 hours  
**Impact:** Multi-day offers became hidden after 24 hours  
**Solution:** Preserve original duration when refreshing  
**Status:** ✅ Fixed in both bulk and individual refresh  

**Your offers will now:**
- ✅ Keep their original duration when refreshed
- ✅ Show for the full period partners selected (2 days, 1 week, etc.)
- ✅ Work correctly for 24-hour businesses
- ✅ Respect business hours for scheduled businesses

## 🚀 Next Steps

1. **Deploy these fixes** to production
2. **Run the SQL** to fix the currently hidden offer
3. **Test:** Refresh partner offers and verify duration is preserved
4. All offers will now work as originally designed!
