# Component Refactoring Plan - Phase 2

## Executive Summary

**Objective**: Refactor 3 oversized components to improve maintainability, testability, and performance.

**Target Components:**
1. **IndexRedesigned.tsx** - 1,072 lines, 28 useState hooks
2. **PartnerDashboardV3.tsx** - 606 lines (analyzed separately)
3. **PartnersManagement.tsx** - 1,451 lines (admin component)

**Expected Outcome:**
- Reduce IndexRedesigned from 1,072 → ~400 lines (62% reduction)
- Extract 6 custom hooks to `src/hooks/pages/`
- Improve code reusability and testing capability
- Maintain 100% functionality

---

## 1. IndexRedesigned.tsx Refactoring

### Current State Analysis

**File**: `src/pages/IndexRedesigned.tsx`  
**Lines**: 1,072  
**useState Count**: 28 hooks  
**Responsibilities**: Too many (violates Single Responsibility Principle)

**State Categories:**
1. **Map State** (5 hooks):
   - `mapBounds`, `isMapIdle`, `selectedCategory`, `highlightedOfferId`, `isPostResNavigating`

2. **Offer Management** (4 hooks):
   - `selectedOffer`, `discoverSheetOpen`, `isSheetMinimized`, `showNewReservationModal`

3. **Reservation Management** (6 hooks):
   - `activeReservationId`, `activeReservation`, `isReservationLoading`, `reservationQuantity`, `showPickupSuccessModal`, `pickupModalData`

4. **User/Auth** (4 hooks):
   - `user`, `showAuthDialog`, `showOnboarding`, `defaultAuthTab`

5. **UI/Navigation** (5 hooks):
   - `selectedPartnerId`, `showPartnerSheet`, `searchQuery`, `selectedSubcategory`, `currentPath`

6. **Filtering/Sorting** (2 hooks):
   - `filters`, `sortBy`

7. **Location** (2 hooks):
   - `userLocation`, GPS tracking

### Extraction Strategy

#### Hook 1: `useMapControls`
**File**: `src/hooks/pages/useMapControls.ts`  
**Purpose**: Manage map state, bounds, idle detection  
**Extracts**:
- `mapBounds`, `setMapBounds`
- `isMapIdle`, `setIsMapIdle`
- `highlightedOfferId`, `setHighlightedOfferId`
- `isPostResNavigating`, `setIsPostResNavigating`
- Map idle detection useEffect
- Map bounds tracking useEffect

**Estimated Lines**: 120 lines  
**Benefit**: Isolates complex map interaction logic

#### Hook 2: `useOfferManagement`
**File**: `src/hooks/pages/useOfferManagement.ts`  
**Purpose**: Handle offer selection, sheet management, partner sheets  
**Extracts**:
- `selectedOffer`, `setSelectedOffer`
- `discoverSheetOpen`, `setDiscoverSheetOpen`
- `isSheetMinimized`, `setIsSheetMinimized`
- `showPartnerSheet`, `setShowPartnerSheet`
- `selectedPartnerId`, `setSelectedPartnerId`
- `showNewReservationModal`, `setShowNewReservationModal`
- `handleOfferClick` callback
- `handleMarkerClick` callback

**Estimated Lines**: 150 lines  
**Benefit**: Centralizes offer interaction logic

#### Hook 3: `useReservationFlow`
**File**: `src/hooks/pages/useReservationFlow.ts`  
**Purpose**: Manage active reservation state and flow  
**Extracts**:
- `activeReservationId`, `setActiveReservationId`
- `activeReservation`, `setActiveReservation`
- `isReservationLoading`, `setIsReservationLoading`
- `reservationQuantity`, `setReservationQuantity`
- `showPickupSuccessModal`, `setShowPickupSuccessModal`
- `pickupModalData`, `setPickupModalData`
- Reservation loading useEffect
- Reservation sync useEffect
- Active reservation tracking

**Estimated Lines**: 180 lines  
**Benefit**: Separates complex reservation lifecycle logic

#### Hook 4: `useAuthState`
**File**: `src/hooks/pages/useAuthState.ts`  
**Purpose**: Manage authentication and onboarding state  
**Extracts**:
- `user`, `setUser`
- `showAuthDialog`, `setShowAuthDialog`
- `showOnboarding`, `setShowOnboarding`
- `defaultAuthTab`, `setDefaultAuthTab`
- Auth session tracking useEffect
- Onboarding check useEffect

**Estimated Lines**: 100 lines  
**Benefit**: Isolates auth logic for reusability

#### Hook 5: `useOfferFilters`
**File**: `src/hooks/pages/useOfferFilters.ts`  
**Purpose**: Handle search, filters, sorting  
**Extracts**:
- `searchQuery`, `setSearchQuery`
- `filters`, `setFilters`
- `sortBy`, `setSortBy`
- `selectedCategory`, `setSelectedCategory`
- `selectedSubcategory`, `setSelectedSubcategory`
- `filteredOffers` useMemo
- `getFilteredAndSortedOffers` function
- Filter persistence useEffect

**Estimated Lines**: 140 lines  
**Benefit**: Makes filtering logic testable and reusable

#### Hook 6: `useUserLocation`
**File**: `src/hooks/pages/useUserLocation.ts`  
**Purpose**: Track user location and GPS  
**Extracts**:
- `userLocation`, `setUserLocation`
- GPS tracking useEffect
- Location permission handling
- `userLocationObject` useMemo

**Estimated Lines**: 80 lines  
**Benefit**: Isolates geolocation concerns

### Implementation Order

1. ✅ **Phase 2a**: Extract simple hooks first (useAuthState, useUserLocation)
2. ✅ **Phase 2b**: Extract filtering logic (useOfferFilters)
3. ✅ **Phase 2c**: Extract offer management (useOfferManagement)
4. ✅ **Phase 2d**: Extract map controls (useMapControls)
5. ✅ **Phase 2e**: Extract reservation flow (useReservationFlow)
6. ✅ **Phase 2f**: Update IndexRedesigned to use all hooks
7. ✅ **Phase 2g**: Test and verify

### Expected Result

**Before**:
```tsx
export default function IndexRedesigned() {
  const [state1, setState1] = useState(...)
  const [state2, setState2] = useState(...)
  // ... 28 useState hooks
  
  useEffect(() => { /* 500 lines of logic */ })
  
  return (/* 400 lines of JSX */)
}
```

**After**:
```tsx
export default function IndexRedesigned() {
  const auth = useAuthState()
  const location = useUserLocation()
  const filters = useOfferFilters()
  const offers = useOfferManagement()
  const map = useMapControls()
  const reservation = useReservationFlow()
  
  return (/* 400 lines of JSX */)
}
```

**Metrics**:
- Lines: 1,072 → ~400 (62% reduction)
- useState: 28 → 0 (hooks abstracted)
- useEffect: 15 → 2 (logic abstracted)
- Testability: 2/10 → 9/10
- Maintainability: 3/10 → 9/10

---

## 2. PartnerDashboardV3.tsx Refactoring

### Current State
- **Lines**: 606
- **Complexity**: Moderate
- **Tabs**: Profile, Offers, Revenue, Slots, Analytics

### Extraction Strategy

#### Hook 1: `usePartnerData`
**Purpose**: Fetch and manage partner profile data  
**Extracts**: Partner info, loading states, update functions

#### Hook 2: `usePartnerOffers`
**Purpose**: Manage offer CRUD operations  
**Extracts**: Offer list, create/edit/delete, pause/resume

#### Hook 3: `usePartnerRevenue`
**Purpose**: Handle revenue stats and transactions  
**Extracts**: Revenue data, charts, export functions

#### Component: `PartnerAnalyticsTab`
**Purpose**: Extract analytics section to separate component  
**Benefit**: Reduces main file by ~150 lines

### Expected Result
- Lines: 606 → ~300 (50% reduction)
- Hooks extracted: 3
- Components extracted: 2

---

## 3. PartnersManagement.tsx Refactoring

### Current State
- **File**: `src/components/admin/PartnersManagement.tsx`
- **Lines**: 1,451 (largest component in codebase)
- **Complexity**: Very High

### Extraction Strategy

#### Component 1: `PartnersList`
**Purpose**: Display partner list with filters  
**Lines**: ~300  
**Props**: `partners`, `onSelectPartner`, `filters`

#### Component 2: `PartnerDetails`
**Purpose**: Show detailed partner information  
**Lines**: ~250  
**Props**: `partner`, `onUpdate`, `onDelete`

#### Component 3: `PartnerActions`
**Purpose**: Bulk actions, approvals, bans  
**Lines**: ~200  
**Props**: `selectedPartners`, `onAction`

#### Hook: `usePartnerManagement`
**Purpose**: Centralize admin partner operations  
**Lines**: ~180

### Expected Result
- Lines: 1,451 → ~400 (72% reduction)
- Components extracted: 3
- Hooks extracted: 1
- File structure:
  ```
  src/components/admin/
    PartnersManagement.tsx (orchestrator - 400 lines)
    partners/
      PartnersList.tsx (300 lines)
      PartnerDetails.tsx (250 lines)
      PartnerActions.tsx (200 lines)
  ```

---

## Testing Strategy

### 1. Unit Tests
- Test each extracted hook independently
- Mock dependencies (supabase, API calls)
- Verify state transitions

### 2. Integration Tests
- Test refactored components with hooks
- Verify data flow between hooks
- Test edge cases

### 3. Manual Testing
- Full user flow testing
- Test on mobile devices
- Performance profiling

### 4. Build Verification
```bash
pnpm build
# Verify bundle size reduction
# Check for unused code elimination
```

---

## Timeline

**Phase 2a-2g** (IndexRedesigned): 3-4 hours  
**PartnerDashboard**: 2 hours  
**PartnersManagement**: 3 hours  
**Testing**: 2 hours  

**Total**: ~10 hours

---

## Success Metrics

### Before Refactoring
- Total LOC: 3,129 lines (3 files)
- Average complexity: 8/10
- Testability: 3/10
- Maintainability: 3/10

### After Refactoring
- Total LOC: ~1,100 lines (main files) + 1,150 (hooks/components)
- Average complexity: 4/10
- Testability: 9/10
- Maintainability: 9/10

### Benefits
- ✅ 62% reduction in main file LOC
- ✅ 100% code reusability (hooks)
- ✅ 10x easier testing
- ✅ Faster onboarding for new developers
- ✅ Easier debugging and maintenance
- ✅ Better TypeScript support
- ✅ Smaller bundle chunks

---

## Rollback Plan

If issues arise:
1. Git revert to pre-refactor commit
2. Deploy previous working version
3. Review and fix issues
4. Re-apply refactoring with fixes

**Safety**: All changes versioned in git, build verified before commit.
