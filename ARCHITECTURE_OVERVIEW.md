# 🏗️ Google Maps Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         SmartPick App                           │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │          GoogleMapProvider (Context)                   │   │
│  │  • Loads Google Maps JS API once                       │   │
│  │  • Provides google instance to all children            │   │
│  │  • Handles API key from environment                    │   │
│  └────────────────────────────────────────────────────────┘   │
│                            │                                    │
│         ┌──────────────────┼──────────────────┐               │
│         │                  │                  │               │
│         ▼                  ▼                  ▼               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Homepage   │  │   Partner    │  │   Other      │       │
│  │             │  │  Dashboard   │  │   Pages      │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## Homepage Component Tree

```
HomePage
├── TopSearchBarRedesigned
│   ├── Search input
│   ├── Category filters
│   ├── Price/distance filters
│   └── Sort options
│
├── SmartPickGoogleMap (REPLACES MapLibre)
│   ├── Google Map instance
│   ├── Partner markers (emoji icons)
│   ├── User location marker (pulsing)
│   ├── Info windows (distance/ETA)
│   └── "Near Me" button
│
├── OfferBottomSheet
│   ├── Swipeable carousel
│   ├── Offer cards
│   ├── Category filter bar
│   └── Reserve button → Opens modal (not navigation)
│
├── ReservationModalNew (NEW)
│   ├── Offer details
│   ├── Quantity selector
│   ├── SmartPoints calculation
│   ├── Confirm button
│   └── On success → Start navigation
│
└── NavigationMode (NEW, conditional)
    ├── Route polyline (Google Directions API)
    ├── User marker (live GPS)
    ├── Destination marker
    ├── Distance/ETA card (top)
    └── Stop button
```

## Partner Dashboard Component Tree

```
PartnerDashboard
└── EditPartnerProfile
    ├── Business info fields
    ├── PartnerLocationPicker (REPLACES Leaflet)
    │   ├── Google Places Autocomplete input
    │   ├── Google Map
    │   ├── Draggable marker
    │   └── Reverse geocoding
    └── Operating hours
```

## Data Flow: Reservation & Navigation

```
User clicks "Reserve" on offer
          ↓
ReservationModalNew opens
          ↓
User adjusts quantity, clicks "Confirm"
          ↓
createReservation() API call
          ↓
Reservation created in Supabase
          ↓
Modal closes
          ↓
navigationMode = true
          ↓
NavigationMode component renders
          ↓
┌─────────────────────────────────────────────┐
│  Google Directions API called               │
│  • Origin: userLocation                     │
│  • Destination: partner location            │
│  • Mode: WALKING                            │
│  • Returns: route polyline + distance/time  │
└─────────────────────────────────────────────┘
          ↓
Route polyline drawn on map
          ↓
GPS tracking starts (watchPosition)
          ↓
Every ~5 seconds:
  • Update user marker position
  • Calculate new distance/ETA (client-side)
  • If moved >100m → redraw route
          ↓
User clicks Stop → GPS stops, route cleared
```

## API Calls Architecture

```
┌──────────────────────────────────────────────────────────┐
│                 Google Maps APIs Used                    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  1. Maps JavaScript API                                  │
│     • Load map tiles                                     │
│     • Display map UI                                     │
│     • Cost: $7 per 1,000 loads                          │
│                                                          │
│  2. Places API (Autocomplete)                           │
│     • Address search suggestions                         │
│     • Used in: PartnerLocationPicker                    │
│     • Cost: $17 per 1,000 requests                      │
│                                                          │
│  3. Directions API                                      │
│     • Calculate walking routes                           │
│     • Used in: NavigationMode                           │
│     • Cost: $5 per 1,000 requests                       │
│     • Cached: Only re-requests when user moves >100m    │
│                                                          │
│  4. Geocoding API                                       │
│     • Lat/lng ↔ Address conversion                      │
│     • Used in: PartnerLocationPicker (reverse geocode)  │
│     • Cost: $5 per 1,000 requests                       │
│                                                          │
│  ❌ NOT USED: Distance Matrix API                       │
│     • We calculate distance client-side (Haversine)     │
│     • Saves: $5-$10 per 1,000 requests                  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Distance Calculation: Client vs Server

```
OLD (MapLibre): No distance calculation
NEW (Google Maps): Client-side calculation

┌────────────────────────────────────────────┐
│  Client-Side Distance (Haversine)         │
│                                            │
│  Input:                                    │
│    • User lat/lng                          │
│    • Partner lat/lng                       │
│                                            │
│  Process:                                  │
│    • Calculate great-circle distance       │
│    • Formula: Haversine                    │
│    • ETA: distance / 5 km/h (walking)     │
│                                            │
│  Output:                                   │
│    • Distance: "1.2km"                     │
│    • Duration: "14min"                     │
│                                            │
│  Benefits:                                 │
│    ✅ Free (no API calls)                  │
│    ✅ Instant (no network latency)         │
│    ✅ Works offline                        │
│    ✅ Accurate for short distances         │
│                                            │
└────────────────────────────────────────────┘
```

## Navigation Mode: GPS Tracking Flow

```
Start Navigation
     ↓
navigator.geolocation.watchPosition()
     ↓
┌─────────────────────────────────────┐
│  Every ~5 seconds:                  │
│                                     │
│  1. Get new GPS coordinates         │
│  2. Update user marker on map       │
│  3. Calculate distance to partner   │
│     (client-side Haversine)         │
│  4. Update distance/ETA display     │
│  5. Check if moved >100m:           │
│     • YES → Re-call Directions API  │
│     • NO → Keep current route       │
│                                     │
└─────────────────────────────────────┘
     ↓
User clicks Stop
     ↓
clearWatch(watchId)
     ↓
Remove route polyline
     ↓
Navigation ends
```

## State Management

```
HomePage State:
├── offers: Offer[]                     (all offers from Supabase)
├── filteredOffers: Offer[]             (after filters applied)
├── mapFilteredOffers: Offer[]          (after partner click filter)
├── selectedOffer: Offer | null         (current offer in carousel)
├── selectedOfferIndex: number          (carousel position)
├── userLocation: [lat, lng] | null     (GPS coordinates)
├── selectedCategory: string            (filter state)
├── searchQuery: string                 (search text)
├── filters: { price, distance, ... }   (filter state)
├── sortBy: 'newest' | 'nearest' | ...  (sort option)
├── showBottomSheet: boolean            (carousel visibility)
├── showReservationModal: boolean       (NEW: modal visibility)
├── navigationMode: boolean             (NEW: nav mode active)
└── activeReservationId: string | null  (NEW: current reservation)
```

## File Structure

```
src/
├── lib/
│   └── maps/
│       ├── googleMapsLoader.ts        (NEW: API loader)
│       └── distance.ts                 (NEW: Haversine calculations)
│
├── components/
│   └── map/
│       ├── GoogleMapProvider.tsx       (NEW: Context provider)
│       ├── SmartPickGoogleMap.tsx      (NEW: Main map component)
│       ├── PartnerLocationPicker.tsx   (NEW: Partner address picker)
│       ├── ReservationModalNew.tsx     (NEW: In-page reservation)
│       └── NavigationMode.tsx          (NEW: GPS navigation)
│
├── components/
│   ├── home/
│   │   └── MapSectionNew.tsx           (DEPRECATED: Replace with SmartPickGoogleMap)
│   │
│   └── partner/
│       └── EditPartnerProfile.tsx      (MODIFIED: Uses PartnerLocationPicker)
│
└── pages/
    ├── Index.tsx / IndexRedesigned.tsx (MODIFY: Add new components)
    └── ReserveOffer.tsx                (DEPRECATED: Use modal instead)
```

## Key Differences: Old vs New

| Feature | OLD (MapLibre + Leaflet) | NEW (Google Maps) |
|---------|--------------------------|-------------------|
| Homepage map | MapLibre GL + MapTiler | Google Maps JS API |
| Partner location | Leaflet + OSM tiles | Google Maps + Places Autocomplete |
| Address search | Manual input | Google Places suggestions |
| Reservation | Navigate to /reserve/:id | Modal on homepage |
| Navigation | None | Live GPS + route drawing |
| Distance calc | None | Client-side Haversine |
| Route display | None | Google Directions API |
| Map style | Custom MapLibre JSON | Google Maps styles array |
| Markers | Custom MapLibre markers | AdvancedMarkerElement (HTML) |
| User location | Basic pin | Pulsing animated dot |

## Security: CSP Headers

If using Content Security Policy:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://maps.googleapis.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' https://*.googleapis.com https://*.gstatic.com data: blob:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://*.googleapis.com;
  frame-src 'self' https://www.google.com;
```

## Environment Variables

```
Development (.env.local):
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
  
Production (Vercel/Netlify):
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
  
Google Cloud Console:
  • API Key restrictions:
    - HTTP referrers
    - Add: https://smartpick.ge/*
    - Add: http://localhost:*
```

---

This architecture provides a scalable, performant, and cost-effective mapping solution for SmartPick! 🗺️
