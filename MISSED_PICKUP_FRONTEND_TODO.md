# MISSED PICKUP WARNING SYSTEM - FRONTEND INTEGRATION

## ✅ BACKEND COMPLETE
- ✅ Table: `user_missed_pickups` created
- ✅ Function: `get_user_missed_pickup_status()` deployed
- ✅ Function: `expire_user_reservations()` tracks missed pickups separately
- ✅ Data tracked correctly (warning_shown = false)

## ❌ FRONTEND MISSING
The frontend doesn't check for missed pickup warnings yet!

### What needs to be added:

#### 1. **src/App.tsx** - Check for missed pickup warnings on load

Add after line 318 (in `checkPenaltyOnLoad` function):

```typescript
// Check for missed pickup warnings (separate from penalties)
const { data: missedPickupStatus, error: missedError } = await supabase
  .rpc('get_user_missed_pickup_status', {
    p_user_id: (user as any).id
  })
  .maybeSingle();

if (!cancelled && missedPickupStatus && missedPickupStatus.needs_warning) {
  // Show friendly warning dialog
  logger.debug('💛 Missed pickup warning:', missedPickupStatus);
  // TODO: Show MissedPickupWarningDialog component
  setMissedPickupWarning(missedPickupStatus);
  setShowMissedPickupDialog(true);
}
```

#### 2. **Create Component**: `src/components/MissedPickupWarningDialog.tsx`

```typescript
interface MissedPickupWarningProps {
  total_missed: number;
  warning_level: number;
  warning_message: string;
  warning_emoji: string;
  onAcknowledge: () => void;
}

export function MissedPickupWarningDialog({ ... }) {
  // Show friendly dialog with:
  // - Emoji (💛🧡🔴)
  // - Message ("You have 3 chances - stay careful!")
  // - "I Understand" button
  // - Dismissible
}
```

#### 3. **Mark warning as shown** when user acknowledges:

```typescript
const handleAcknowledge = async () => {
  await supabase
    .from('user_missed_pickups')
    .update({ warning_shown: true })
    .eq('user_id', userId)
    .eq('warning_shown', false);
  
  setShowMissedPickupDialog(false);
};
```

---

## ALTERNATIVE: Use Existing PenaltyModal

You already have `src/components/PenaltyModal.tsx` and `src/components/PenaltyWarningDialog.tsx`.

You could:
1. Add missed pickup check to App.tsx
2. Reuse existing PenaltyModal/PenaltyWarningDialog
3. Pass missed pickup data as props

---

## DATABASE QUERY NEEDED

Frontend needs to call:

```sql
SELECT * FROM get_user_missed_pickup_status(user_id);
```

Returns:
- total_missed: 1, 2, or 3
- warning_level: 1, 2, or 3
- needs_warning: true (if warning not shown yet)
- warning_message: "You have 3 chances - stay careful!"
- warning_emoji: 💛, 🧡, or 🔴

---

## CURRENT STATUS

❌ **Warning dialog does NOT appear** because:
1. Frontend doesn't call `get_user_missed_pickup_status()`
2. No component listens for missed pickup warnings
3. No dialog component for missed pickup warnings

✅ **Backend works perfectly:**
- Expired reservations tracked in `user_missed_pickups`
- Warning levels calculated correctly
- Separate from cancellation cooldown system

---

## NEXT STEPS

1. Add missed pickup check to `src/App.tsx` (in `checkPenaltyOnLoad`)
2. Create or reuse warning dialog component
3. Mark warnings as shown when user acknowledges
4. Test with davetest@gmail.com (1 missed pickup already tracked)
