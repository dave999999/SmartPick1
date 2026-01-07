# 🚨 CRITICAL BUG: Cooldown Dialogs Missing on ReserveOffer Page

## Problem

User canceled 3 times and tried to reserve for the 4th time. They were BLOCKED but **NO DIALOG appeared** to agree/lift cooldown.

## Root Cause

The cooldown lift dialogs (`CancellationCooldownCard`, `PaidCooldownLiftModal`) are **only in `ReservationModalNew.tsx`** (map popup), but the user is reserving from **`ReserveOffer.tsx`** page which only has a simple "wait" dialog (`CooldownSheet`).

## Files Comparison

### ReservationModalNew.tsx (HAS the dialogs ✅)
- Line 592: Count=3 → Free lift modal with checkbox
- Line 618: Count=4 → Paid lift (100 points)  
- Line 628: Count=5+ → Blocked until tomorrow

### ReserveOffer.tsx (MISSING the dialogs ❌)
- Line 200-207: Only checks cooldown and shows simple `CooldownSheet`
- **NO lift modals** - just blocks without option to agree

## What Needs to Happen

When user has 3 cancellations and tries to reserve:

1. **Detect cooldown** (already working line 200)
2. **Show appropriate dialog based on count:**
   - Count=3 + no lifts used → Free lift dialog with "I understand" button
   - Count=4 OR (count=3 + 1 lift used) → Paid lift (100 points)
   - Count=5+ → Blocked completely

3. **User clicks button** → Lift cooldown → Allow reservation

## Solution Options

### Option 1: Add Full Cooldown State to ReserveOffer.tsx

Copy the cooldown handling logic from `ReservationModalNew.tsx` (lines 70-140) to `ReserveOffer.tsx`:

```tsx
// Add state
const [cooldownData, setCooldownData] = useState({
  isInCooldown: false,
  cancellationCount: 0,
  resetCount: 0,
  timeUntilUnlock: '',
  unlockTime: null,
  resetCooldownUsed: false,
  resetLoading: false
});

// Check cooldown with full data
const cooldownStatus = await getUserCooldownStatus(user.id);
if (cooldownStatus.inCooldown) {
  // Set cooldown data
  setCooldownData({
    isInCooldown: true,
    cancellationCount: cooldownStatus.cancellationCount,
    // ... get resetCount from user_cooldown_lifts table
  });
  // Don't proceed with reservation
  return;
}

// Add modals at bottom:
{cooldownData.isInCooldown && cooldownData.cancellationCount === 3 && (
  <CancellationCooldownCard ... />
)}
{cooldownData.isInCooldown && cooldownData.cancellationCount === 4 && (
  <PaidCooldownLiftModal ... />
)}
{cooldownData.isInCooldown && cooldownData.cancellationCount >= 5 && (
  <BlockedUntilTomorrowModal ... />
)}
```

### Option 2: Extract Cooldown Logic to Shared Hook

Create `useCooldownHandling` hook that both pages can use:

```tsx
// hooks/useCooldownHandling.ts
export function useCooldownHandling() {
  const [cooldownState, setCooldownState] = useState(...);
  
  const checkCooldown = async (userId) => {
    // Check status + get lift count
    // Return shouldBlock, showDialog, dialogType
  };
  
  const liftCooldown = async () => {
    // Call lift_cooldown_with_points or reset_user_cooldown
  };
  
  return { cooldownState, checkCooldown, liftCooldown, CooldownDialog };
}
```

### Option 3: Redirect to Map Modal (Quick Fix)

When cooldown detected on ReserveOffer page, redirect to map with auto-open modal:

```tsx
if (cooldownStatus.inCooldown) {
  navigate(`/?offer=${offerId}&showReserveModal=true`);
  return;
}
```

## Recommended: Option 1

Add the full cooldown dialog system to ReserveOffer.tsx. It's more work but provides consistent UX.

## Required Imports

```tsx
import { CancellationCooldownCard } from '@/components/reservation/CancellationCooldownCard';
import { PaidCooldownLiftModal } from '@/components/reservation/PaidCooldownLiftModal';
```

## Testing After Fix

1. Reset DB with RESET_USER_FOR_TESTING.sql
2. Cancel 3 times
3. Try to reserve 4th time from offer detail page
4. **Should show:** Free lift dialog with "I understand" checkbox + button
5. Click button → Cooldown lifted → Can reserve
6. Cancel 4th time
7. Try to reserve 5th time
8. **Should show:** Paid lift dialog (100 points required)

## Current Status

❌ **BROKEN**: ReserveOffer page blocks without showing lift dialog  
✅ **WORKS**: Map popup (ReservationModalNew) shows dialogs correctly

## Priority

**HIGH** - Users are confused when blocked without explanation or option to proceed
