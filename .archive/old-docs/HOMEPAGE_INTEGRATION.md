# Homepage Integration Example

Complete example showing how to integrate the new Google Maps components into your existing Index/HomePage.

## Current Structure

Your homepage likely has this structure (based on `src/pages/Index.tsx` or `src/pages/IndexRedesigned.tsx`):

```tsx
- TopSearchBarRedesigned (filters, search)
- MapSectionNew (MapLibre map)
- OfferBottomSheet (carousel)
```

## New Structure

```tsx
- GoogleMapProvider (wrap at app level)
- TopSearchBarRedesigned (same)
- SmartPickGoogleMap (replaces MapLibre)
- OfferBottomSheet (same, but opens reservation modal)
- ReservationModalNew (new)
- NavigationMode (new, conditional)
```

## Complete Integration Code

```tsx
import { useState, useEffect, useRef } from 'react';
import { Offer, User } from '@/lib/types';
import { useGoogleMaps } from '@/components/map/GoogleMapProvider';
import SmartPickGoogleMap from '@/components/map/SmartPickGoogleMap';
import ReservationModalNew from '@/components/map/ReservationModalNew';
import NavigationMode from '@/components/map/NavigationMode';
import { OfferBottomSheet } from '@/components/OfferBottomSheet';
import TopSearchBarRedesigned from '@/components/home/TopSearchBarRedesigned';
// ... other imports

export default function HomePage() {
  const { isLoaded: googleMapsLoaded } = useGoogleMaps();
  
  // Existing state
  const [offers, setOffers] = useState<Offer[]>([]);
  const [filteredOffers, setFilteredOffers] = useState<Offer[]>([]);
  const [mapFilteredOffers, setMapFilteredOffers] = useState<Offer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [selectedOfferIndex, setSelectedOfferIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    price: { min: 0, max: 100 },
    distance: 10,
    availableNow: false,
  });
  const [sortBy, setSortBy] = useState<'newest' | 'nearest' | 'price'>('newest');
  
  // NEW: Reservation and navigation state
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [navigationMode, setNavigationMode] = useState(false);
  const [activeReservationId, setActiveReservationId] = useState<string | null>(null);
  const mapRef = useRef<any>(null); // Store Google Maps instance
  
  // Load user and offers (existing logic)
  useEffect(() => {
    loadUser();
    loadOffers();
    tryGetUserLocation();
  }, []);
  
  const loadUser = async () => {
    const { user } = await getCurrentUser();
    setUser(user);
  };
  
  const loadOffers = async () => {
    const data = await getAllOffers();
    setOffers(data);
    setFilteredOffers(data);
    setMapFilteredOffers(data);
  };
  
  const tryGetUserLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => console.warn('Could not get location:', error)
      );
    }
  };
  
  // Filter offers (existing logic with modifications)
  useEffect(() => {
    let result = [...offers];
    
    // Category filter
    if (selectedCategory) {
      result = result.filter(offer => offer.category === selectedCategory);
    }
    
    // Search filter
    if (searchQuery) {
      result = result.filter(offer => 
        offer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        offer.partner?.business_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Distance filter (if user location available)
    if (userLocation && filters.distance < 10) {
      result = result.filter(offer => {
        if (!offer.partner?.latitude || !offer.partner?.longitude) return false;
        const distance = calculateDistance(
          userLocation[0], 
          userLocation[1],
          offer.partner.latitude,
          offer.partner.longitude
        );
        return distance <= filters.distance;
      });
    }
    
    // Price filter
    result = result.filter(offer => 
      offer.smart_price >= filters.price.min && 
      offer.smart_price <= filters.price.max
    );
    
    // Available now filter
    if (filters.availableNow) {
      const now = new Date();
      result = result.filter(offer => {
        const expires = new Date(offer.expires_at);
        return expires > now;
      });
    }
    
    // Sort
    if (sortBy === 'price') {
      result.sort((a, b) => a.smart_price - b.smart_price);
    } else if (sortBy === 'nearest' && userLocation) {
      result.sort((a, b) => {
        const distA = a.partner?.latitude 
          ? calculateDistance(userLocation[0], userLocation[1], a.partner.latitude, a.partner.longitude)
          : Infinity;
        const distB = b.partner?.latitude
          ? calculateDistance(userLocation[0], userLocation[1], b.partner.latitude, b.partner.longitude)
          : Infinity;
        return distA - distB;
      });
    } else {
      result.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    
    setFilteredOffers(result);
    setMapFilteredOffers(result);
  }, [offers, selectedCategory, searchQuery, filters, sortBy, userLocation]);
  
  // Handle marker click on map
  const handleMarkerClick = (partnerName: string, partnerAddress: string | undefined, partnerOffers: Offer[]) => {
    if (partnerOffers.length === 0) {
      // Clicked empty space - clear filters
      setSearchQuery('');
      setMapFilteredOffers(filteredOffers);
      setShowBottomSheet(false);
      return;
    }
    
    // Filter offers to only this partner
    setMapFilteredOffers(partnerOffers);
    setSelectedOffer(partnerOffers[0]);
    setSelectedOfferIndex(0);
    setShowBottomSheet(true);
  };
  
  // Handle carousel index change (user swiped to different offer)
  const handleOfferIndexChange = (index: number) => {
    setSelectedOfferIndex(index);
    const offer = mapFilteredOffers[index];
    setSelectedOffer(offer);
    // Map will auto-center on this offer via selectedOffer prop
  };
  
  // NEW: Handle "Reserve" button click in carousel
  const handleReserveClick = (offer: Offer) => {
    if (!user) {
      // Show auth dialog (existing logic)
      toast.error('Please sign in to reserve');
      return;
    }
    
    setSelectedOffer(offer);
    setShowReservationModal(true);
  };
  
  // NEW: Handle reservation created
  const handleReservationCreated = (reservationId: string) => {
    setActiveReservationId(reservationId);
    setNavigationMode(true);
    setShowBottomSheet(false); // Hide carousel during navigation
  };
  
  // NEW: Handle navigation stop
  const handleNavigationStop = () => {
    setNavigationMode(false);
    setActiveReservationId(null);
    setShowBottomSheet(true); // Show carousel again
  };
  
  return (
    <div className="h-screen w-screen overflow-hidden relative">
      {/* Top Search Bar */}
      <div className="absolute top-0 left-0 right-0 z-30">
        <TopSearchBarRedesigned
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
          filters={filters}
          onFiltersChange={setFilters}
          sortBy={sortBy}
          onSortChange={setSortBy}
          user={user}
        />
      </div>
      
      {/* Google Map - Full Screen */}
      <div className="w-full h-full">
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
      </div>
      
      {/* Offer Bottom Sheet Carousel */}
      {showBottomSheet && mapFilteredOffers.length > 0 && !navigationMode && (
        <OfferBottomSheet
          offers={mapFilteredOffers}
          initialIndex={selectedOfferIndex}
          user={user}
          open={showBottomSheet}
          onClose={() => setShowBottomSheet(false)}
          onIndexChange={handleOfferIndexChange}
          onReserveClick={handleReserveClick} // NEW: Pass reserve handler
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
        />
      )}
      
      {/* NEW: Reservation Modal */}
      {selectedOffer && (
        <ReservationModalNew
          offer={selectedOffer}
          user={user}
          open={showReservationModal}
          onClose={() => setShowReservationModal(false)}
          onReservationCreated={handleReservationCreated}
        />
      )}
      
      {/* NEW: Navigation Mode */}
      {navigationMode && selectedOffer?.partner && userLocation && googleMapsLoaded && (
        <NavigationMode
          mapInstance={mapRef.current}
          destination={{
            lat: selectedOffer.partner.latitude!,
            lng: selectedOffer.partner.longitude!,
            name: selectedOffer.partner.business_name,
          }}
          userLocation={userLocation}
          onStop={handleNavigationStop}
        />
      )}
    </div>
  );
}

// Helper function
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
```

## Key Changes Summary

### 1. State Changes

**Added:**
```tsx
const [showReservationModal, setShowReservationModal] = useState(false);
const [navigationMode, setNavigationMode] = useState(false);
const [activeReservationId, setActiveReservationId] = useState<string | null>(null);
const mapRef = useRef<any>(null);
```

### 2. OfferBottomSheet Modification

**Before:**
```tsx
<OfferBottomSheet
  offers={offers}
  // ... props
  onReserveSuccess={() => {
    // Refreshed data
  }}
/>
```

**After:**
```tsx
<OfferBottomSheet
  offers={offers}
  // ... props
  onReserveClick={handleReserveClick} // NEW: Opens modal instead of navigating
/>
```

**Update OfferBottomSheet component:**

In `src/components/OfferBottomSheet.tsx` or the relevant file, modify the Reserve button:

```tsx
// BEFORE (if it navigates to /reserve/:id)
<Button onClick={() => navigate(`/reserve/${offer.id}`)}>
  Reserve
</Button>

// AFTER (call parent handler)
<Button onClick={() => onReserveClick?.(offer)}>
  Reserve
</Button>
```

### 3. Map Component Swap

**Before:**
```tsx
<MapSectionNew
  offers={offers}
  onOfferClick={handleOfferClick}
  // ...
/>
```

**After:**
```tsx
<SmartPickGoogleMap
  offers={mapFilteredOffers}
  onMarkerClick={handleMarkerClick}
  userLocation={userLocation}
  selectedOffer={selectedOffer}
  showUserLocation={true}
  onLocationChange={setUserLocation}
/>
```

### 4. Navigation Mode Integration

When reservation is created, navigation mode starts:

```tsx
{navigationMode && selectedOffer?.partner && (
  <NavigationMode
    mapInstance={mapRef.current}
    destination={{
      lat: selectedOffer.partner.latitude!,
      lng: selectedOffer.partner.longitude!,
      name: selectedOffer.partner.business_name,
    }}
    userLocation={userLocation}
    onStop={handleNavigationStop}
  />
)}
```

## Testing the Integration

### 1. Map Display
- Map should load with Google Maps tiles
- Partner markers visible with emoji icons
- Click marker → filters offers to that partner
- Bottom sheet opens with filtered offers

### 2. Carousel Interaction
- Swipe left/right → map centers on that offer's partner
- Distance/ETA label appears above selected marker

### 3. Reservation Flow
- Click "Reserve" in carousel
- Modal opens (stays on homepage)
- Adjust quantity
- Click "Confirm Reservation"
- Modal closes
- Navigation mode starts

### 4. Navigation Mode
- Route draws from user to partner
- User marker pulses
- Distance/ETA card at top
- GPS updates every ~5 seconds
- Click X to stop navigation

## Common Issues

### OfferBottomSheet not showing Reserve button

Make sure `OfferContent` component (used inside OfferBottomSheet) has the reserve handler:

```tsx
// In src/components/bottomsheet/OfferContent.tsx
<Button
  onClick={() => onReserveClick?.(offer)}
  disabled={!user}
>
  {user ? 'Reserve Now' : 'Sign In to Reserve'}
</Button>
```

### Map instance not passed to NavigationMode

Get map ref from SmartPickGoogleMap:

```tsx
// Update SmartPickGoogleMap.tsx to expose map ref
useEffect(() => {
  if (mapRef.current) {
    // Expose map via callback
    onMapReady?.(mapRef.current);
  }
}, [mapRef.current]);

// Then in HomePage:
<SmartPickGoogleMap
  onMapReady={(map) => mapRef.current = map}
  // ... other props
/>
```

### Navigation doesn't start

Check:
1. User location is available
2. Partner has latitude/longitude
3. Google Maps is loaded (`googleMapsLoaded === true`)
4. mapRef.current is not null

---

This integration preserves all your existing business logic while adding the new UX improvements!
