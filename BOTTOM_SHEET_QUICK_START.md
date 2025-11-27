# SmartPick Bottom Sheet - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Import the Component
```typescript
import { OfferBottomSheet } from '@/components/OfferBottomSheet';
```

### 2. Add State to Your Component
```typescript
const [showBottomSheet, setShowBottomSheet] = useState(false);
const [selectedOfferIndex, setSelectedOfferIndex] = useState(0);
const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
```

### 3. Handle Offer Clicks
```typescript
const handleOfferClick = (offer: Offer) => {
  // Find index in your offers array
  const index = offers.findIndex(o => o.id === offer.id);
  
  setSelectedOffer(offer);
  setSelectedOfferIndex(index >= 0 ? index : 0);
  
  // Check authentication
  if (!user) {
    setShowAuthDialog(true);
  } else {
    setShowBottomSheet(true); // Open the sheet!
  }
};
```

### 4. Handle Navigation
```typescript
const handleIndexChange = (newIndex: number) => {
  if (newIndex >= 0 && newIndex < offers.length) {
    setSelectedOfferIndex(newIndex);
    setSelectedOffer(offers[newIndex]);
    
    // Optional: Update URL
    const params = new URLSearchParams(window.location.search);
    params.set('selected', offers[newIndex].id);
    window.history.replaceState({}, '', `?${params}`);
  }
};
```

### 5. Render the Component
```tsx
{user && offers.length > 0 && (
  <OfferBottomSheet
    offers={offers}
    initialIndex={selectedOfferIndex}
    user={user}
    open={showBottomSheet}
    onClose={() => setShowBottomSheet(false)}
    onIndexChange={handleIndexChange}
    onReserveSuccess={() => {
      // Refresh offers, navigate, etc.
      setShowBottomSheet(false);
    }}
  />
)}
```

---

## 📋 Props Reference

```typescript
interface OfferBottomSheetProps {
  offers: Offer[];              // Array of offers to navigate
  initialIndex: number;          // Starting position in array
  user: User | null;            // Current user (required)
  open: boolean;                // Controls visibility
  onClose: () => void;          // Called when sheet closes
  onIndexChange?: (index: number) => void;  // Called on navigation
  onReserveSuccess?: () => void; // Called after successful reservation
}
```

---

## 🎯 Key Features

### Swipe Gestures
- **Swipe up** from collapsed → expands sheet
- **Swipe down** from expanded → collapses sheet
- **Swipe down** from collapsed → closes sheet
- **Swipe left** → next offer
- **Swipe right** → previous offer

### Navigation Buttons
- **← Arrow** - Previous offer (disabled at start)
- **→ Arrow** - Next offer (disabled at end)
- **✕ Button** - Close sheet

### States
- **Collapsed (45%)** - Quick preview
- **Expanded (92%)** - Full details
- **Closed** - Hidden

---

## 🎨 Customization

### Adjust Heights
Edit `OfferBottomSheet.tsx`:
```typescript
const COLLAPSED_HEIGHT = '45vh'; // Change this
const EXPANDED_HEIGHT = '92vh';  // Change this
```

### Change Colors
All colors use Tailwind classes, so you can:
1. Edit component files directly
2. OR update your `tailwind.config.js`

### Adjust Animation Speed
Edit the spring config:
```typescript
{
  type: 'spring',
  damping: 30,      // Higher = less bouncy
  stiffness: 300,   // Higher = faster
  mass: 0.8         // Higher = slower
}
```

---

## 🐛 Troubleshooting

### Sheet Doesn't Open
**Check:**
- Is `open` prop true?
- Is `user` not null?
- Is `offers` array not empty?

### Navigation Not Working
**Check:**
- Are arrow buttons visible?
- Is `onIndexChange` handler defined?
- Are there multiple offers in array?

### Content Not Showing
**Check:**
- Is sheet in expanded state?
- Is content scrollable?
- Check browser console for errors

### Animations Laggy
**Check:**
- Reduce shadow complexity
- Disable backdrop-filter on older devices
- Check CPU usage in DevTools

---

## 📱 Testing

### Quick Visual Test
1. Click any offer card
2. Sheet should slide up to 45%
3. Swipe up → should expand to 92%
4. Swipe left → should show next offer
5. Tap X → should close

### Mobile Test
1. Test on actual device (not just emulator)
2. Check safe area on iPhone notches
3. Test landscape mode
4. Test with keyboard open

---

## 🎓 Learn More

- **Full Documentation:** `BOTTOM_SHEET_IMPLEMENTATION_GUIDE.md`
- **Visual Reference:** `BOTTOM_SHEET_VISUAL_REFERENCE.md`
- **Implementation Details:** `BOTTOM_SHEET_IMPLEMENTATION_SUMMARY.md`

---

## 💡 Tips

1. **Always pass filtered offers** - Navigation works within the array you pass
2. **Handle authentication first** - Check user before opening sheet
3. **Update URL for deep linking** - Users can share specific offers
4. **Test on real devices** - Gestures feel different on touch screens
5. **Monitor performance** - Open DevTools Performance tab

---

## ✨ That's It!

You now have a premium bottom sheet offer viewer that:
- ✅ Matches Airbnb/TooGoodToGo UX
- ✅ Has smooth animations
- ✅ Supports navigation
- ✅ Clearly explains business logic
- ✅ Works great on mobile

**Happy coding! 🚀**

---

**Quick Start Version:** 1.0  
**Last Updated:** November 27, 2025
