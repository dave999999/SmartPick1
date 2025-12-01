/**
 * EXAMPLE: IndexRedesigned.tsx Integration
 * 
 * This shows how to integrate the new ExploreSheet into your homepage.
 * Copy the relevant sections into your actual IndexRedesigned.tsx
 */

// ============================================
// STEP 1: ADD IMPORTS
// ============================================

import { ExploreSheet } from '@/components/explore/ExploreSheet';
import { FloatingStarButton } from '@/components/explore/FloatingStarButton';

// ============================================
// STEP 2: ADD STATE VARIABLES
// ============================================

export default function IndexRedesigned() {
  // ... existing state ...
  
  // NEW: Explore Sheet state
  const [exploreSheetOpen, setExploreSheetOpen] = useState(false);
  const [highlightedOfferId, setHighlightedOfferId] = useState<string | null>(null);
  
  // ... rest of component ...

  // ============================================
  // STEP 3: REPLACE BOTTOM SHEET IN JSX
  // ============================================
  
  return (
    <div className="relative h-screen overflow-hidden bg-gray-50">
      {/* ... existing components (map, etc.) ... */}
      
      {/* OLD: Remove or comment out */}
      {/* <OfferBottomSheet
        offers={offers}
        initialIndex={selectedOfferIndex}
        user={user}
        open={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        // ...
      /> */}
      
      {/* NEW: Explore Sheet */}
      <ExploreSheet
        offers={offers}
        user={user}
        userLocation={userLocation}
        open={exploreSheetOpen}
        onClose={() => setExploreSheetOpen(false)}
        onOfferClick={(offer, index) => {
          setSelectedOffer(offer);
          setSelectedOfferIndex(index);
          // Open your existing offer detail modal
          setShowBottomSheet(true);
        }}
        onCategorySelect={setSelectedCategory}
        selectedCategory={selectedCategory}
        onMapHighlight={setHighlightedOfferId}
        onMapCenter={(location) => {
          // Center Google Map
          if (googleMap) {
            googleMap.panTo(location);
            googleMap.setZoom(15);
          }
        }}
      />
      
      {/* NEW: Floating Star Button */}
      <FloatingStarButton
        exploreOpen={exploreSheetOpen}
        onOpenExplore={() => setExploreSheetOpen(true)}
        onSortChange={(sort) => {
          console.log('Sort changed:', sort);
          // Sort is handled internally by ExploreSheet
        }}
      />
    </div>
  );
}

// ============================================
// STEP 4: MAP MARKER HIGHLIGHTING (OPTIONAL)
// ============================================

// In your SmartPickGoogleMap component, add:

useEffect(() => {
  if (highlightedOfferId && markers[highlightedOfferId]) {
    // Bounce the marker
    markers[highlightedOfferId].setAnimation(google.maps.Animation.BOUNCE);
    
    // Stop after 1 second
    setTimeout(() => {
      markers[highlightedOfferId].setAnimation(null);
    }, 1000);
  }
}, [highlightedOfferId, markers]);

// ============================================
// STEP 5: TEST THE FLOW
// ============================================

/**
 * User Flow:
 * 1. Click Star Button → Opens ExploreSheet (medium state)
 * 2. Drag up → Expands to full screen
 * 3. Search/Filter/Sort → Updates offers dynamically
 * 4. Scroll cards → Map centers on each offer location
 * 5. Tap card → Opens existing offer detail modal
 * 6. Star Button (when explore open) → Shows sort menu
 */

// ============================================
// OPTIONAL: KEEP OLD BOTTOM SHEET FOR DETAILS
// ============================================

/**
 * You can keep the old OfferBottomSheet for showing
 * detailed offer information (after tapping a card in ExploreSheet).
 * 
 * Flow:
 * - ExploreSheet: Discovery and browsing
 * - OfferBottomSheet: Detailed single-offer view
 */

<ExploreSheet
  // ... props
  onOfferClick={(offer, index) => {
    setSelectedOffer(offer);
    setSelectedOfferIndex(index);
    
    // Close explore sheet
    setExploreSheetOpen(false);
    
    // Open detail sheet
    setShowBottomSheet(true);
  }}
/>

<OfferBottomSheet
  offers={offers}
  initialIndex={selectedOfferIndex}
  user={user}
  open={showBottomSheet}
  onClose={() => setShowBottomSheet(false)}
  // ... other props
/>
