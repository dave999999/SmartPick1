# 🚀 UNIFIED DISCOVER SYSTEM - QUICK START

## Files Created

```
✅ src/types/discover.ts              (Type definitions)
✅ src/lib/offerFilters.ts            (Filtering/sorting logic)
✅ src/components/discover/OfferCard.tsx
✅ src/components/discover/NewDiscoverSheet.tsx
✅ src/index.css                      (Added scrollbar-hide)
✅ src/pages/IndexRedesigned.tsx      (Updated with new sheet)
```

## Enable the New Sheet

In `IndexRedesigned.tsx`, find this line (around line 605):

```tsx
{false && (
  <NewDiscoverSheet
```

Change `false` to `true`:

```tsx
{true && (
  <NewDiscoverSheet
```

Then disable the old sheet (around line 570):

```tsx
{false && (
  <UnifiedDiscoverSheet
```

## Test It

1. **Open Discover Mode:**
   - Click the ⭐ star button in bottom nav
   - Sheet should slide up to mid-height
   - See search bar, sort pills, categories, and offers

2. **Try Dragging:**
   - Drag handle up → expands to full height
   - Drag down → collapses to peek
   - Drag down again → closes sheet

3. **Test Search & Filters:**
   - Type in search bar (debounced 300ms)
   - Click sort pills (Recommended, Nearest, etc.)
   - Click category chips (Bakery, Restaurant, etc.)

4. **Partner Mode:**
   - Click any map pin
   - Should open sheet in partner carousel mode
   - Swipe left/right to browse partner's offers
   - Click back button (←) to return to discover

5. **Offer Selection:**
   - Click any offer card
   - Should open reservation modal
   - Sheet stays in place behind modal

## Quick Customization

### Change Colors

In `NewDiscoverSheet.tsx` and other files, find:
```tsx
className="... from-orange-500 to-orange-600 ..."
```

Replace with your brand colors.

### Adjust Heights

In `NewDiscoverSheet.tsx`, around line 28:
```tsx
const HEIGHTS = {
  collapsed: '15vh',  // Change these
  mid: '50vh',
  full: '85vh',
};
```

### Modify Sort Options

In `DiscoverModeContent.tsx`, around line 9:
```tsx
const SORT_OPTIONS = [
  { id: 'recommended', label: 'Recommended', emoji: '⭐' },
  // Add or remove options
];
```

### Add/Remove Categories

In `DiscoverModeContent.tsx`, around line 17:
```tsx
const CATEGORIES = [
  { id: 'bakery', label: 'Bakery', emoji: '🍞' },
  // Add or remove categories
];
```

## Troubleshooting

### Sheet Not Opening
- Check `discoverSheetOpen` state
- Ensure z-index is correct (z-50)
- Verify FloatingStarButton onClick handler

### Dragging Not Working
- Check if `touchAction: 'none'` is applied
- Verify Framer Motion is installed: `npm install framer-motion`

### Offers Not Showing
- Console log `filteredOffers` in IndexRedesigned
- Check if offers have required fields (id, title, partner, etc.)
- Verify `computeVisibleOffers()` is working

### Map Sync Not Working
- Check if `onOfferInView` callback is firing
- Verify Intersection Observer setup in OfferCard
- Ensure `highlightedOfferId` state is updating

## Performance Tips

1. **Large Offer Lists (>100 items):**
   ```tsx
   // Add virtualization
   npm install react-window
   // Implement in DiscoverModeContent
   ```

2. **Slow Animations:**
   ```tsx
   // Reduce spring stiffness
   stiffness: 200,  // instead of 300
   ```

3. **Memory Issues:**
   ```tsx
   // Add React.memo to OfferCard
   export const OfferCard = React.memo(({ offer, ...props }) => {
     // ...
   });
   ```

## Need Help?

📖 **Full Documentation:** `UNIFIED_DISCOVER_IMPLEMENTATION_GUIDE.md`
📊 **Status Report:** `UNIFIED_DISCOVER_IMPLEMENTATION_STATUS.md`
🎯 **Design Phases:** All 10 phases in the implementation guide

## Quick Links

- **Type Definitions:** `src/types/discover.ts`
- **Main Component:** `src/components/discover/NewDiscoverSheet.tsx`
- **Filter Logic:** `src/lib/offerFilters.ts`
- **Integration:** `src/pages/IndexRedesigned.tsx`

---

**Status:** ✅ Ready to use!
**Version:** 1.0.0
**Date:** December 1, 2025
