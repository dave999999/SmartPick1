# Partner Slots System Update - Complete Guide

## 📋 Summary of Changes

### What Changed?
1. **Starting Slots**: Partners now start with **10 slots** (previously 4)
2. **Progressive Pricing**: Additional slots now cost 100, 200, 300, 400, etc. (previously 50, 100, 150, 200)

### New Pricing Structure

| Slot Number | Cost (SmartPoints) |
|-------------|-------------------|
| 1-10        | FREE (included)   |
| 11th slot   | 100 points        |
| 12th slot   | 200 points        |
| 13th slot   | 300 points        |
| 14th slot   | 400 points        |
| 15th slot   | 500 points        |
| ...         | ...               |
| 50th slot   | 4,000 points (MAX)|

**Formula**: Cost = (slot_number - 9) × 100

---

## 🚀 How to Apply the Update

### Step 1: Run the SQL Migration

1. Open **Supabase Dashboard**
2. Go to **SQL Editor**
3. Open the file: `UPDATE_PARTNER_SLOTS_SYSTEM.sql`
4. Click **Run**

### Step 2: Verify Database Changes

Run this query to verify:

```sql
-- Check updated slots and defaults
SELECT 
  COUNT(*) as partner_count,
  MIN(offer_slots) as min_slots,
  MAX(offer_slots) as max_slots,
  AVG(offer_slots) as avg_slots
FROM partner_points;

-- Should show min_slots = 10
```

### Step 3: Frontend is Already Updated ✅

The following files have been automatically updated:

- ✅ `src/pages/PartnerDashboard.tsx` - Updated pricing calculation
- ✅ `src/lib/api/offers.ts` - Updated default slots from 4 to 10 (3 locations)

---

## 📊 What This Means for Partners

### For Existing Partners
- All existing partners automatically upgraded to **10 slots minimum**
- No points charged for the upgrade
- Any slots beyond 10 will use new pricing

### For New Partners
- Start with **10 free slots** immediately after approval
- Can purchase additional slots using the new progressive pricing
- Maximum of 50 slots total

---

## 🔧 Technical Details

### Database Changes

1. **Table: `partner_points`**
   - Default `offer_slots` changed from 4 → 10
   - CHECK constraint updated: `offer_slots >= 10 AND offer_slots <= 50`

2. **Function: `grant_partner_welcome_points()`**
   - New partners get 10 slots by default

3. **Function: `purchase_partner_offer_slot()`**
   - New pricing formula: `(current_slots - 9) × 100`
   - Example: If you have 15 slots, 16th slot costs (16 - 9) × 100 = 700 points

4. **Function: `check_partner_offer_slots()`**
   - Updated default fallback from 4 → 10

### Frontend Changes

1. **PartnerDashboard.tsx** (line ~877)
   ```typescript
   // OLD: const nextSlotCost = (partnerPoints.offer_slots - 3) * 50;
   // NEW: const nextSlotCost = (partnerPoints.offer_slots - 9) * 100;
   ```

2. **offers.ts** (3 occurrences)
   ```typescript
   // OLD: const maxSlots = partnerPoints?.offer_slots || 4;
   // NEW: const maxSlots = partnerPoints?.offer_slots || 10;
   ```

---

## 🧪 Testing Checklist

After applying the update, test:

- [ ] **Existing Partner Login**: Verify they see 10 slots
- [ ] **New Partner Approval**: Check they get 10 slots automatically
- [ ] **Create Offer**: Ensure slot limits work correctly
- [ ] **Purchase Slot**: Verify pricing shows correctly (11th slot = 100 points)
- [ ] **Dashboard Display**: Check slot count displays correctly

---

## 🐛 Rollback Plan (Just in Case)

If you need to revert these changes:

```sql
BEGIN;

-- Revert to 4 slots default
ALTER TABLE public.partner_points 
  ALTER COLUMN offer_slots SET DEFAULT 4;

-- Revert constraint
ALTER TABLE public.partner_points 
  DROP CONSTRAINT IF EXISTS partner_points_offer_slots_check;

ALTER TABLE public.partner_points 
  ADD CONSTRAINT partner_points_offer_slots_check 
  CHECK (offer_slots >= 4 AND offer_slots <= 50);

-- Revert pricing formula in purchase function (old: (slot - 3) * 50)
-- Revert grant function to use 4 slots
-- (Full rollback SQL available on request)

COMMIT;
```

---

## 📞 Support

If you encounter any issues after applying this update:

1. Check the console for any errors
2. Verify the SQL migration completed successfully
3. Clear browser cache and reload
4. Check Supabase logs for any database errors

---

## ✅ Update Complete!

Once you've run the SQL migration, the system will automatically:
- ✅ Upgrade all existing partners to 10 slots
- ✅ Set new partners to start with 10 slots
- ✅ Apply new progressive pricing (100, 200, 300...)
- ✅ Frontend already reflects these changes

**No further action needed!** 🎉
