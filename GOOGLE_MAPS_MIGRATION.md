# Google Maps Migration Guide

This guide covers the complete migration from MapLibre GL to Google Maps JavaScript API for SmartPick.

## 📋 Overview

**What Changed:**
- ✅ MapLibre GL → Google Maps JavaScript API
- ✅ Leaflet (partner location) → Google Maps + Places Autocomplete
- ✅ Separate reservation page → In-page reservation modal
- ✅ No navigation → Live GPS navigation mode
- ✅ Distance calculations via API → Client-side Haversine formula

## 🔑 Step 1: Get Google Maps API Key

### Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project: "SmartPick"
3. Enable billing account

### Enable Required APIs

Navigate to **APIs & Services** → **Library** and enable:

- ✅ **Maps JavaScript API** (map display)
- ✅ **Places API** (address autocomplete)
- ✅ **Geocoding API** (lat/lng ↔ address conversion)
- ✅ **Directions API** (route drawing)

**DO NOT ENABLE:**
- ❌ Distance Matrix API (not needed, we calculate distance client-side)
- ❌ Routes API (Advanced) (not needed, using standard Directions)

### Create API Key

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **API Key**
3. Copy your API key
4. Click **Restrict Key**:
   - **Application restrictions**: HTTP referrers
     - Add: `https://yourdomain.com/*`
     - Add: `http://localhost:*` (for development)
   - **API restrictions**: Restrict key
     - Select only the 4 APIs listed above

## 🔧 Step 2: Environment Variables

### Add to `.env` or `.env.local`:

```bash
# Google Maps API Key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy... your_actual_key_here

# OR if using Vite
VITE_GOOGLE_MAPS_API_KEY=AIzaSy... your_actual_key_here
```

### For Production (Vercel/Netlify):

Add environment variable in your deployment platform:
- **Key**: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- **Value**: Your API key

## 📦 Step 3: Install Dependencies

The migration uses existing dependencies. **No new npm packages required!**

Removed dependencies (you can uninstall if not used elsewhere):
```bash
npm uninstall maplibre-gl leaflet react-leaflet
```

## 🏗️ Step 4: Update App Structure

### Wrap Your App with GoogleMapProvider

**File**: `src/App.tsx` or `src/app/layout.tsx` or your root component

```tsx
import { GoogleMapProvider } from '@/components/map/GoogleMapProvider';

export default function App() {
  return (
    <GoogleMapProvider>
      {/* Your app content */}
    </GoogleMapProvider>
  );
}
```

### Update Homepage/Index Page

**What you need to do:**

1. Replace `MapSectionNew` component that uses MapLibre with Google Maps version
2. Add reservation modal state
3. Add navigation mode state
4. Wire up the new components

**Example integration** (see HOMEPAGE_INTEGRATION.md for complete code):

```tsx
import SmartPickGoogleMap from '@/components/map/SmartPickGoogleMap';
import ReservationModalNew from '@/components/map/ReservationModalNew';
import NavigationMode from '@/components/map/NavigationMode';

function HomePage() {
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [navigationMode, setNavigationMode] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);
  
  // ... rest of your state
  
  return (
    <>
      {/* Map */}
      <SmartPickGoogleMap
        offers={mapFilteredOffers}
        onMarkerClick={handleMarkerClick}
        userLocation={userLocation}
        selectedOffer={selectedOffer}
        // ... other props
      />
      
      {/* Reservation Modal */}
      {selectedOffer && (
        <ReservationModalNew
          offer={selectedOffer}
          user={user}
          open={showReservationModal}
          onClose={() => setShowReservationModal(false)}
          onReservationCreated={(id) => {
            setReservationId(id);
            setNavigationMode(true);
          }}
        />
      )}
      
      {/* Navigation Mode */}
      {navigationMode && selectedOffer?.partner && (
        <NavigationMode
          mapInstance={mapRef.current}
          destination={{
            lat: selectedOffer.partner.latitude,
            lng: selectedOffer.partner.longitude,
            name: selectedOffer.partner.business_name,
          }}
          userLocation={userLocation}
          onStop={() => setNavigationMode(false)}
        />
      )}
    </>
  );
}
```

## 🗺️ New Components Reference

### 1. SmartPickGoogleMap

Replacement for MapLibre map. Shows partners, user location, handles clicks.

```tsx
<SmartPickGoogleMap
  offers={offers}
  onMarkerClick={(partnerName, address, offers) => {
    // Filter offers by partner
  }}
  userLocation={userLocation}
  selectedOffer={selectedOffer}
  showUserLocation={true}
  onLocationChange={(location) => setUserLocation(location)}
/>
```

### 2. PartnerLocationPicker

For partner registration. Has autocomplete + draggable marker.

```tsx
<PartnerLocationPicker
  initialLocation={{
    address: 'Rustaveli Ave 12',
    latitude: 41.7151,
    longitude: 44.8271,
  }}
  onChange={(location) => {
    console.log(location.address, location.latitude, location.longitude);
  }}
/>
```

### 3. ReservationModalNew

In-page reservation modal (no navigation to separate page).

```tsx
<ReservationModalNew
  offer={offer}
  user={user}
  open={showModal}
  onClose={() => setShowModal(false)}
  onReservationCreated={(reservationId) => {
    // Enter navigation mode
  }}
/>
```

### 4. NavigationMode

Live GPS tracking with route drawing.

```tsx
<NavigationMode
  mapInstance={mapRef.current}
  destination={{
    lat: 41.7151,
    lng: 44.8271,
    name: 'Partner Name',
  }}
  userLocation={[41.72, 44.79]}
  onStop={() => setNavigationMode(false)}
/>
```

## 🔍 Distance Calculation

The new system calculates distance/ETA **client-side** using Haversine formula:

```tsx
import { getDistanceAndETA, calculateDistance } from '@/lib/maps/distance';

// Get distance and ETA
const result = getDistanceAndETA(
  { lat: 41.7151, lng: 44.8271 }, // from
  { lat: 41.7200, lng: 44.8300 }, // to
  'walking' // or 'driving'
);

console.log(result.distanceKm); // 0.8
console.log(result.distanceText); // "0.8km"
console.log(result.durationMinutes); // 9
console.log(result.durationText); // "9min"
```

**No Distance Matrix API calls = No extra costs!**

## 🔐 Security: Content Security Policy

If you're using CSP headers, add these domains:

```
Content-Security-Policy:
  script-src 'self' https://maps.googleapis.com;
  img-src 'self' https://*.googleapis.com https://*.gstatic.com data:;
  connect-src 'self' https://*.googleapis.com;
  frame-src https://www.google.com;
```

## 💰 Cost Estimation

Google Maps pricing (as of 2024):

| API | Monthly Free Tier | Cost per 1,000 requests |
|-----|-------------------|-------------------------|
| Maps JavaScript API | $200 credit (~28,000 loads) | $7 |
| Places Autocomplete | $200 credit (~1,000 requests) | $17 |
| Directions API | $200 credit (~40,000 requests) | $5 |
| Geocoding API | $200 credit (~40,000 requests) | $5 |

**Estimated monthly cost for SmartPick:**
- 10,000 users, each viewing map 3 times/day = 900,000 map loads
- Cost: ~$225/month (after $200 free credit)

**Tips to reduce costs:**
- Map loads are cached per session (user doesn't reload map on every page)
- Distance calculations are client-side (free!)
- Navigation routes cached and only re-fetched when user moves >100m

## 🧪 Testing Checklist

### Map Display
- [ ] Map loads with Tbilisi as default center
- [ ] Partner markers show correct emoji icons
- [ ] Clicking marker filters offers
- [ ] "Near Me" button requests location and centers map
- [ ] User location shows with pulsing blue dot

### Partner Registration
- [ ] Address autocomplete suggests Georgian addresses
- [ ] Selecting address updates map marker
- [ ] Dragging marker updates address field
- [ ] Clicking map updates marker and address
- [ ] Coordinates saved to database

### Reservation Flow
- [ ] Clicking "Reserve" opens modal (not new page)
- [ ] Quantity selector works
- [ ] Reservation creates successfully
- [ ] Modal closes and navigation mode starts

### Navigation Mode
- [ ] Route draws from user to partner
- [ ] Distance and ETA display
- [ ] GPS updates every ~5 seconds
- [ ] User marker moves smoothly
- [ ] Route redraws when user moves >100m
- [ ] "Stop" button exits navigation cleanly

### Performance
- [ ] Map loads in <2 seconds
- [ ] No console errors
- [ ] Mobile gestures work (pinch, pan)
- [ ] Battery impact is reasonable (GPS at 5s intervals)

## 🚨 Troubleshooting

### Map Not Loading

**Check:**
1. API key is correctly set in `.env`
2. Billing is enabled on Google Cloud project
3. APIs are enabled (Maps JavaScript API, Places, Directions, Geocoding)
4. Check browser console for specific error messages

### "This page can't load Google Maps correctly"

**Solution:**
- API key restrictions are too strict
- Add your domain to HTTP referrer restrictions
- For local dev, add `http://localhost:*`

### Navigation Not Working

**Check:**
1. User location permission granted
2. HTTPS enabled (geolocation requires secure context)
3. Directions API is enabled in Google Cloud Console

### Markers Not Showing

**Check:**
1. Offers have `partner.latitude` and `partner.longitude` fields populated
2. Check browser console for marker creation errors
3. Verify Advanced Markers are supported (requires Maps JavaScript API)

## 📝 Migration Checklist

- [ ] Google Cloud project created
- [ ] Billing enabled
- [ ] 4 APIs enabled (Maps JS, Places, Directions, Geocoding)
- [ ] API key created and restricted
- [ ] Environment variable set
- [ ] GoogleMapProvider wraps app
- [ ] Homepage uses SmartPickGoogleMap
- [ ] EditPartnerProfile uses PartnerLocationPicker
- [ ] Reservation modal integrated
- [ ] Navigation mode tested
- [ ] Old dependencies removed (maplibre-gl, leaflet)
- [ ] CSP headers updated (if applicable)
- [ ] Production deployment tested

## 🎉 Benefits

✅ **Better UX**: In-page reservations, live navigation
✅ **Lower costs**: Client-side distance calculations
✅ **Better address search**: Google Places Autocomplete
✅ **Industry standard**: Google Maps familiar to all users
✅ **Better mobile support**: Native gesture handling
✅ **More accurate routes**: Real walking directions vs straight lines

## 📚 Additional Resources

- [Google Maps JavaScript API Docs](https://developers.google.com/maps/documentation/javascript)
- [Places Autocomplete Guide](https://developers.google.com/maps/documentation/javascript/places-autocomplete)
- [Directions API Reference](https://developers.google.com/maps/documentation/javascript/directions)
- [Advanced Markers](https://developers.google.com/maps/documentation/javascript/advanced-markers)

---

**Questions?** Check the inline code comments or reach out to the team.
