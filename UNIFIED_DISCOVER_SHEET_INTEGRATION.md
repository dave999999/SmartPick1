# 🚀 Unified Discover Sheet — Integration Guide

**How to integrate the new unified bottom sheet into your SmartPick app**

---

## 📋 Quick Summary

The new `UnifiedDiscoverSheet` replaces both:
- The old `ExploreSheet` (discovery browsing)
- The concept of a separate partner carousel

It provides **ONE unified component** that handles:
- ✅ Discovery mode (browse all offers)
- ✅ Partner mode (partner-specific carousel)
- ✅ 3 height states (collapsed, mid, full)
- ✅ Search, sort, filter, categories
- ✅ Map synchronization
- ✅ Premium animations

---

## 🗂️ New File Structure

```
src/components/discover/
├── UnifiedDiscoverSheet.tsx       ← Main container
├── DiscoverModeContent.tsx        ← Discovery browsing UI
├── PartnerModeContent.tsx         ← Partner carousel UI
├── PartnerOfferCard.tsx           ← Large carousel cards
├── types.ts                       ← TypeScript definitions
└── (reuse existing)
    ├── OfferCard.tsx              ← Compact 2-col cards (from explore/)
```

**Note:** The existing `src/components/explore/OfferCard.tsx` is reused as-is.

---

## 📦 Step 1: Update IndexRedesigned.tsx

**Note:** Your app uses `IndexRedesigned.tsx` as the main homepage component.

### 1.1 Update Imports

Replace the old imports with new ones:

```tsx
// OLD (remove these)
import { ExploreSheet } from '@/components/explore/ExploreSheet';
import { FloatingStarButton } from '@/components/explore/FloatingStarButton';

// NEW (add these)
import { UnifiedDiscoverSheet } from '@/components/discover/UnifiedDiscoverSheet';
import { FloatingStarButton } from '@/components/explore/FloatingStarButton'; // Keep this
```

### 1.2 Add State Variables

Add these to your component state:

```tsx
export default function IndexRedesigned() {
  // Existing state...
  const [offers, setOffers] = useState<Offer[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  
  // NEW: Unified sheet state
  const [discoverSheetOpen, setDiscoverSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<'discover' | 'partner'>('discover');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSort, setSelectedSort] = useState<'recommended' | 'nearest' | 'cheapest' | 'expiring' | 'newest'>('recommended');
  const [highlightedOfferId, setHighlightedOfferId] = useState<string | null>(null);
  
  // Existing reservation state...
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [showReservationModal, setShowReservationModal] = useState(false);
  
  // ... rest of state
}
```

### 1.3 Replace Sheet Component

Find the old `<ExploreSheet>` and replace with:

```tsx
{/* NEW: Unified Discover Sheet */}
<UnifiedDiscoverSheet
  offers={filteredOffers}
  user={user}
  userLocation={userLocation}
  open={discoverSheetOpen}
  onClose={() => {
    setDiscoverSheetOpen(false);
    setSelectedPartnerId(null);
    setSheetMode('discover');
  }}
  
  // Mode control
  mode={sheetMode}
  partnerId={selectedPartnerId}
  onModeChange={setSheetMode}
  
  // Discovery props
  selectedCategory={selectedCategory}
  selectedSort={selectedSort}
  onCategorySelect={setSelectedCategory}
  onSortChange={setSelectedSort}
  
  // Callbacks
  onOfferClick={(offer, index) => {
    setSelectedOffer(offer);
    setShowReservationModal(true);
  }}
  onMapHighlight={setHighlightedOfferId}
  onMapCenter={(location) => {
    if (googleMap) {
      googleMap.panTo(location);
      googleMap.setZoom(15);
    }
  }}
/>
```

### 1.4 Update FloatingStarButton

Update to open the unified sheet:

```tsx
<FloatingStarButton
  exploreOpen={discoverSheetOpen}
  onOpenExplore={() => {
    setDiscoverSheetOpen(true);
    setSheetMode('discover');
    setSelectedPartnerId(null);
  }}
  onSortChange={setSelectedSort}
  currentSort={selectedSort}
/>
```

---

## 🗺️ Step 2: Integrate with Map Pins

### 2.1 Handle Pin Click

When a user taps a map pin, open the sheet in Partner Mode:

```tsx
// In your SmartPickGoogleMap component or map marker click handler:

const handleMarkerClick = (offer: Offer) => {
  // Open sheet in Partner Mode
  setSelectedPartnerId(offer.partner_id);
  setSheetMode('partner');
  setDiscoverSheetOpen(true);
  
  // Center map on partner
  if (googleMap && offer.partner?.location) {
    googleMap.panTo({
      lat: offer.partner.location.latitude,
      lng: offer.partner.location.longitude,
    });
    googleMap.setZoom(15);
  }
};
```

### 2.2 Highlight Pins on Scroll

In your map component, add a useEffect to highlight pins:

```tsx
useEffect(() => {
  if (highlightedOfferId && markers[highlightedOfferId]) {
    // Bounce the marker
    markers[highlightedOfferId].setAnimation(google.maps.Animation.BOUNCE);
    
    // Stop after 700ms
    setTimeout(() => {
      markers[highlightedOfferId].setAnimation(null);
    }, 700);
    
    // Optional: Increase scale
    const icon = markers[highlightedOfferId].getIcon();
    markers[highlightedOfferId].setIcon({
      ...icon,
      scale: 1.3,
    });
    
    // Reset after 2s
    setTimeout(() => {
      markers[highlightedOfferId].setIcon(icon);
    }, 2000);
  }
}, [highlightedOfferId, markers]);
```

---

## 🎨 Step 3: Remove Old Components

### 3.1 Deprecate Old ExploreSheet (Optional)

If you want to keep the old `ExploreSheet` for now as a fallback:

```tsx
// Rename the old file
src/components/explore/ExploreSheet.tsx 
  → src/components/explore/ExploreSheet.OLD.tsx
```

Or delete it entirely if you're confident.

### 3.2 Keep These Components

**DO NOT DELETE:**
- `src/components/explore/OfferCard.tsx` — Reused by new sheet
- `src/components/explore/FloatingStarButton.tsx` — Still used
- `src/components/OfferBottomSheet.tsx` — Kept for detailed single-offer view (optional)

---

## 🔗 Step 4: Connect to Reservation Flow

### 4.1 Open Reservation Modal

When user taps an offer card:

```tsx
onOfferClick={(offer, index) => {
  setSelectedOffer(offer);
  setShowReservationModal(true);
  // Optionally keep sheet open in background (dimmed)
  // Or close it: setDiscoverSheetOpen(false);
}}
```

### 4.2 After Reservation Success

```tsx
<ReservationModalNew
  offer={selectedOffer}
  user={user}
  open={showReservationModal}
  onClose={() => setShowReservationModal(false)}
  onReservationCreated={async (reservationId) => {
    // Close modals
    setShowReservationModal(false);
    setDiscoverSheetOpen(false);
    
    // Fetch reservation and show FloatingReservationCard
    const reservation = await getReservationById(reservationId);
    if (reservation) {
      setActiveReservation(reservation);
    }
  }}
/>
```

---

## 🎭 Step 5: Test All Scenarios

### Test Checklist

- [ ] **Discover Mode - Collapsed**
  - Tap star button → sheet opens in collapsed state
  - Shows "Explore Offers (X)" preview
  - Tap anywhere → expands to mid height

- [ ] **Discover Mode - Mid Height**
  - Search bar works with debounce
  - Sort pills change order
  - Category chips filter offers
  - 2-column offer grid displays

- [ ] **Discover Mode - Full Height**
  - Swipe up → expands to full screen
  - Backdrop dims map (40% opacity)
  - All sections visible (Trending, Closing Soon, etc.)
  - Scroll works smoothly

- [ ] **Partner Mode - Via Pin**
  - Tap map pin → sheet opens in Partner Mode
  - Shows partner name, location, tagline
  - Displays only that partner's offers
  - Carousel is swipeable

- [ ] **Partner Mode - Carousel**
  - Swipe left/right navigates offers
  - Pagination dots update
  - "Reserve Now" button works
  - "See all offers" button returns to Discover

- [ ] **Animations**
  - Sheet height transitions are smooth (spring physics)
  - Backdrop fades in/out
  - Card hover effects work
  - Drag handle pulses when collapsed

- [ ] **Map Sync**
  - Scrolling offers highlights map pins
  - Pin bounces for 700ms
  - Map centers on highlighted offer

- [ ] **Search & Filters**
  - Search input debounces (300ms)
  - Clear (X) button appears when typing
  - "Clear Filters" resets all filters
  - Empty state shows fallback offers

- [ ] **Responsive**
  - Works on iPhone 14 Pro (393x852)
  - Works on iPhone SE (375x667)
  - Works on Android (various sizes)
  - Safe area padding works

- [ ] **Performance**
  - First interaction < 100ms
  - Scroll at 60 FPS
  - No layout shifts
  - Images lazy load

---

## 🐛 Troubleshooting

### Sheet Not Opening

**Check:**
- `discoverSheetOpen` state is set to `true`
- Component is imported correctly
- No z-index conflicts (sheet uses z-50)

**Fix:**
```tsx
console.log('Sheet open:', discoverSheetOpen); // Debug
```

---

### Partner Mode Not Switching

**Check:**
- `selectedPartnerId` is set correctly
- `mode` prop is `'partner'`
- Offers array is filtered by `partner_id`

**Fix:**
```tsx
console.log('Partner ID:', selectedPartnerId);
console.log('Sheet mode:', sheetMode);
console.log('Partner offers:', offers.filter(o => o.partner_id === selectedPartnerId));
```

---

### Map Pins Not Highlighting

**Check:**
- `onMapHighlight` callback is passed
- `highlightedOfferId` state is updating
- Markers object has the offer ID

**Fix:**
```tsx
console.log('Highlighted offer:', highlightedOfferId);
console.log('Markers:', Object.keys(markers));
```

---

### Animations Stuttering

**Possible causes:**
- Too many re-renders
- Heavy components in sheet
- Images not optimized

**Fix:**
- Use `React.memo()` for offer cards
- Add `loading="lazy"` to images
- Reduce animation complexity

---

## 📊 Performance Tips

### 1. Virtualize Long Lists

If you have > 50 offers, consider virtualizing:

```tsx
import { Virtuoso } from 'react-virtuoso';

<Virtuoso
  data={filteredOffers}
  itemContent={(index, offer) => (
    <OfferCard offer={offer} ... />
  )}
/>
```

### 2. Debounce Scroll Events

```tsx
import { debounce } from 'lodash';

const handleScroll = debounce((e) => {
  // Scroll logic
}, 100);
```

### 3. Lazy Load Images

```tsx
<img
  src={offer.images?.[0]}
  loading="lazy"
  decoding="async"
/>
```

---

## 🎯 Next Steps

### Enhancements to Consider

1. **Persistent Sheet State**
   - Save last viewed category to localStorage
   - Remember user's preferred sort option
   - Restore sheet height on return

2. **Advanced Filters**
   - Price range slider
   - Distance radius
   - Dietary preferences
   - Opening hours

3. **Offline Support**
   - Cache offers in IndexedDB
   - Show cached offers when offline
   - Sync when back online

4. **Analytics**
   - Track sheet open/close events
   - Log sort/filter usage
   - Measure time to reservation

5. **Accessibility**
   - Add ARIA labels
   - Keyboard navigation (Tab, Enter, Esc)
   - Screen reader support

---

## 📚 Related Documentation

- [UNIFIED_DISCOVER_SHEET_SPEC.md](./UNIFIED_DISCOVER_SHEET_SPEC.md) — Full specification
- [FLOATING_BOTTOM_NAV_GUIDE.md](./FLOATING_BOTTOM_NAV_GUIDE.md) — Navigation bar
- [POST_RESERVATION_COMPLETE.md](./POST_RESERVATION_COMPLETE.md) — Reservation flow
- [EXPLORE_SHEET_DESIGN_REFERENCE.md](./EXPLORE_SHEET_DESIGN_REFERENCE.md) — Old design (archived)

---

## 🆘 Support

If you encounter issues:

1. Check console for errors
2. Verify all imports are correct
3. Test on latest Chrome/Safari
4. Review the specification document

**Questions?** Contact: engineering@smartpick.ge

---

**Version:** 1.0  
**Last Updated:** December 1, 2025  
**Status:** Ready for Integration ✅
