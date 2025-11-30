# 🔧 Quick Integration Checklist

This is your step-by-step checklist to integrate the Google Maps migration into your SmartPick codebase.

---

## ✅ Step 1: Environment Setup (5 minutes)

### 1.1 Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project "SmartPick"
3. Enable APIs: Maps JavaScript API, Places API, Directions API, Geocoding API
4. Create API key
5. Restrict key to your domains

### 1.2 Add to Environment

Create or update `.env.local`:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
# OR for Vite:
VITE_GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

For production, add to Vercel/Netlify environment variables.

---

## ✅ Step 2: Wrap App with GoogleMapProvider (2 minutes)

Find your main app entry point:
- **Next.js**: `src/app/layout.tsx`
- **Vite/React**: `src/App.tsx` or `src/main.tsx`

### Before:
```tsx
export default function App() {
  return (
    <Router>
      {/* Your app */}
    </Router>
  );
}
```

### After:
```tsx
import { GoogleMapProvider } from '@/components/map/GoogleMapProvider';

export default function App() {
  return (
    <GoogleMapProvider>
      <Router>
        {/* Your app */}
      </Router>
    </GoogleMapProvider>
  );
}
```

---

## ✅ Step 3: Update Homepage Map (10 minutes)

Find your homepage file (likely `src/pages/Index.tsx` or `src/pages/IndexRedesigned.tsx`)

### 3.1 Update Imports

**Remove:**
```tsx
import { MapSectionNew } from '@/components/home/MapSectionNew';
```

**Add:**
```tsx
import { useGoogleMaps } from '@/components/map/GoogleMapProvider';
import SmartPickGoogleMap from '@/components/map/SmartPickGoogleMap';
import ReservationModalNew from '@/components/map/ReservationModalNew';
import NavigationMode from '@/components/map/NavigationMode';
```

### 3.2 Add State

Add these to your component state:

```tsx
const { isLoaded: googleMapsLoaded } = useGoogleMaps();
const [showReservationModal, setShowReservationModal] = useState(false);
const [navigationMode, setNavigationMode] = useState(false);
const [activeReservationId, setActiveReservationId] = useState<string | null>(null);
const mapRef = useRef<any>(null);
```

### 3.3 Replace Map Component

**Before:**
```tsx
<MapSectionNew
  offers={mapFilteredOffers}
  onOfferClick={handleOfferClick}
  onMarkerClick={handleMarkerClick}
  selectedCategory={selectedCategory}
  onCategorySelect={setSelectedCategory}
  onLocationChange={setUserLocation}
  userLocation={userLocation}
/>
```

**After:**
```tsx
{googleMapsLoaded ? (
  <SmartPickGoogleMap
    offers={mapFilteredOffers}
    onMarkerClick={handleMarkerClick}
    userLocation={userLocation}
    selectedOffer={selectedOffer}
    showUserLocation={true}
    onLocationChange={setUserLocation}
    selectedCategory={selectedCategory}
    onCategorySelect={setSelectedCategory}
  />
) : (
  <div className="w-full h-full flex items-center justify-center bg-gray-100">
    <p className="text-gray-600">Loading map...</p>
  </div>
)}
```

### 3.4 Add Reservation Modal

After your `<OfferBottomSheet>`:

```tsx
{/* Reservation Modal */}
{selectedOffer && (
  <ReservationModalNew
    offer={selectedOffer}
    user={user}
    open={showReservationModal}
    onClose={() => setShowReservationModal(false)}
    onReservationCreated={(id) => {
      setActiveReservationId(id);
      setNavigationMode(true);
      setShowBottomSheet(false);
    }}
  />
)}
```

### 3.5 Add Navigation Mode

After reservation modal:

```tsx
{/* Navigation Mode */}
{navigationMode && selectedOffer?.partner && userLocation && googleMapsLoaded && (
  <NavigationMode
    mapInstance={mapRef.current}
    destination={{
      lat: selectedOffer.partner.latitude!,
      lng: selectedOffer.partner.longitude!,
      name: selectedOffer.partner.business_name,
    }}
    userLocation={userLocation}
    onStop={() => {
      setNavigationMode(false);
      setActiveReservationId(null);
      setShowBottomSheet(true);
    }}
  />
)}
```

---

## ✅ Step 4: Update OfferBottomSheet Reserve Button (5 minutes)

### Option A: If your OfferBottomSheet has the Reserve button inside

Find the Reserve button in `src/components/OfferBottomSheet.tsx` or `src/components/bottomsheet/OfferContent.tsx`:

**Before:**
```tsx
<Button onClick={() => navigate(`/reserve/${offer.id}`)}>
  Reserve Now
</Button>
```

**After:**
```tsx
<Button onClick={() => onReserveClick?.(offer)}>
  Reserve Now
</Button>
```

Then pass `onReserveClick` prop from parent:

```tsx
// In parent (HomePage)
<OfferBottomSheet
  // ... existing props
  onReserveClick={(offer) => {
    if (!user) {
      toast.error('Please sign in to reserve');
      return;
    }
    setSelectedOffer(offer);
    setShowReservationModal(true);
  }}
/>
```

### Option B: If Reserve button is in OfferContent component

**File**: `src/components/bottomsheet/OfferContent.tsx`

Add `onReserveClick` prop to component interface and button:

```tsx
interface OfferContentProps {
  offer: Offer;
  user: User | null;
  isExpanded: boolean;
  onReserveSuccess?: () => void;
  onReserveClick?: (offer: Offer) => void; // ADD THIS
}

// Then in the button:
<Button
  onClick={() => onReserveClick?.(offer)}
  // ... rest of props
>
  Reserve Now
</Button>
```

---

## ✅ Step 5: Test Everything (15 minutes)

### 5.1 Map Display
- [ ] Run `npm run dev`
- [ ] Map loads with Google Maps tiles
- [ ] Partner markers visible with emoji icons
- [ ] Click marker → offers filter
- [ ] "Near Me" button centers on user

### 5.2 Reservation Flow
- [ ] Click "Reserve" on an offer
- [ ] Modal opens (stays on homepage)
- [ ] Adjust quantity
- [ ] Click "Confirm Reservation"
- [ ] Modal closes
- [ ] Navigation mode starts

### 5.3 Navigation Mode
- [ ] Route draws from user to partner
- [ ] Distance/ETA card shows at top
- [ ] GPS updates user marker
- [ ] Click X to stop navigation

### 5.4 Partner Profile
- [ ] Go to partner dashboard
- [ ] Edit profile
- [ ] Address autocomplete works
- [ ] Map marker draggable
- [ ] Save works

---

## ✅ Step 6: Deploy (10 minutes)

### 6.1 Add Environment Variable to Production

**Vercel:**
```bash
Settings → Environment Variables
Add: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
```

**Netlify:**
```bash
Site settings → Build & deploy → Environment
Add: VITE_GOOGLE_MAPS_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
```

### 6.2 Deploy

```bash
git add .
git commit -m "feat: migrate to Google Maps + add navigation mode"
git push
```

### 6.3 Verify Production

- [ ] Map loads on production
- [ ] No console errors
- [ ] Navigation works on mobile
- [ ] Check Google Cloud Console for API usage

---

## 🔍 Troubleshooting

### Map shows "This page can't load Google Maps correctly"

**Solution:**
- Check API key is correct in `.env`
- Verify billing is enabled in Google Cloud
- Check domain restrictions on API key
- Add `http://localhost:*` for local development

### Markers not showing

**Solution:**
- Check offers have `partner.latitude` and `partner.longitude`
- Check browser console for errors
- Verify Google Maps loaded: `window.google !== undefined`

### Navigation not starting

**Solution:**
- Check userLocation is set (permission granted)
- Check HTTPS enabled (geolocation requires secure context)
- Verify Directions API is enabled in Google Cloud
- Check mapRef.current is not null

### TypeScript errors

**Solution:**
- Restart TypeScript server in VS Code: Cmd+Shift+P → "Restart TS Server"
- Check all imports are correct
- Verify `@/` path alias works

---

## 📞 Need Help?

Check the detailed guides:
- **`GOOGLE_MAPS_MIGRATION.md`** - Complete migration guide
- **`HOMEPAGE_INTEGRATION.md`** - Full code example
- **`GOOGLE_MAPS_MIGRATION_SUMMARY.md`** - High-level overview

Look at inline code comments in:
- `src/components/map/SmartPickGoogleMap.tsx`
- `src/components/map/NavigationMode.tsx`
- `src/components/map/ReservationModalNew.tsx`

---

## ✅ You're Done!

Your SmartPick app now has:
- ✅ Google Maps integration
- ✅ In-page reservation flow
- ✅ Live GPS navigation
- ✅ Google Places autocomplete for partners
- ✅ Client-side distance calculations

**Total Time: ~45 minutes** (including testing)

🎉 Enjoy your upgraded map experience!
