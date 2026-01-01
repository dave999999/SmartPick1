# 🐛 Android Issue: Route & Markers Disappearing After Reservation

## Problem Description

**Symptom**: On Android devices (real devices, not emulator):
- ✅ QR code shows correctly
- ✅ Countdown timer works
- ❌ **Route (blue line) doesn't appear or disappears**
- ❌ **Partner marker disappears**
- ❌ **User location marker disappears**

**Works fine on**: Android emulator, web browsers

---

## Root Cause Analysis

### 🔍 Issue #1: Race Condition - Markers Hidden Too Fast

**File**: [SmartPickGoogleMap.tsx:547-576](src/components/map/SmartPickGoogleMap.tsx#L547-L576)

```typescript
useEffect(() => {
  // This effect runs when hideMarkers becomes true
  if (hideMarkers) {
    // IMMEDIATELY removes all partner markers
    markersRef.current.forEach(marker => {
      if (marker.setMap) marker.setMap(null);
    });
    markersRef.current = [];
    
    if (markerClustererRef.current) {
      markerClustererRef.current.clearMarkers();
    }
    
    return; // Exits early
  }
  
  // ... marker creation code (never reached when hideMarkers=true)
}, [groupedLocations, google, hideMarkers]);
```

**Then route effect runs:**

```typescript
useEffect(() => {
  // Runs AFTER partner markers are cleared
  const delay = isCapacitor ? 500 : 0; // 500ms delay for Android
  
  setTimeout(() => {
    // Create destination marker
    const destinationMarker = new google.maps.Marker({
      position: { lat: partnerLat, lng: partnerLng },
      map: mapRef.current,
      // ...
    });
    
    // Request route
    directionsService.route({...}, (result, status) => {
      if (status === 'OK') {
        directionsRenderer.setDirections(result);
        // Route should draw here
      }
    });
  }, delay);
}, [activeReservation, userLocation, google]);
```

**The Problem:**
1. `hideMarkers` becomes `true` → **all markers removed**
2. **500ms delay** starts (Android WebView optimization)
3. During this 500ms, **map is completely empty**
4. After 500ms, destination marker created + route requested
5. **BUT** on slower Android devices, Google Maps API might not be ready
6. **Result**: Markers/route never render or render then immediately disappear

---

### 🔍 Issue #2: Timing Mismatch - Effects Run Out of Order

**Execution order on Android:**
```
T+0ms:   activeReservation state updates
T+0ms:   hideMarkers becomes true
T+0ms:   Partner markers effect runs → REMOVES ALL MARKERS
T+0ms:   Route effect runs → setTimeout(500ms) starts
T+100ms: User marker effect runs → creates user marker
T+500ms: Timeout fires → creates destination marker
T+600ms: DirectionsService.route() called
T+800ms: Route callback fires (if successful)
T+800ms: BUT something removes markers again? ❓
```

**On fast devices (emulator)**: This happens so fast it works
**On real devices**: Timing gaps cause issues

---

### 🔍 Issue #3: User Marker May Be Removed

**File**: [SmartPickGoogleMap.tsx:772-900](src/components/map/SmartPickGoogleMap.tsx#L772-L900)

User marker has separate effect, but it's NOT dependent on `hideMarkers`:

```typescript
useEffect(() => {
  if (!mapRef.current || !google || !userLocation) return;

  // Remove old user marker
  if (userMarkerRef.current) {
    userMarkerRef.current.setMap(null); // ❌ Removes existing marker
  }

  // Create new user marker
  const userMarker = new google.maps.Marker({
    position: { lat: userLocation[0], lng: userLocation[1] },
    map: mapRef.current,
    zIndex: 99999,
  });

  userMarkerRef.current = userMarker;
}, [userLocation, google]); // ❗ Missing activeReservation dependency
```

**The Problem:**
- If `userLocation` updates during reservation (GPS update)
- Effect runs → **removes old user marker**
- Creates new one → **but might conflict with route drawing**
- On slower devices, this causes visual glitches

---

### 🔍 Issue #4: DirectionsRenderer Might Be Cleared

When switching between states rapidly, cleanup can run before rendering completes:

```typescript
// Cleanup function runs when dependencies change
return () => {
  if (directionsRendererRef.current) {
    directionsRendererRef.current.setMap(null); // ❌ Removes route
    directionsRendererRef.current = null;
  }
  if (destinationMarkerRef.current) {
    destinationMarkerRef.current.setMap(null); // ❌ Removes marker
    destinationMarkerRef.current = null;
  }
};
```

If `activeReservation` or `userLocation` updates during the 500ms delay, cleanup runs before markers/route are created!

---

## Solutions

### ✅ Solution #1: Increase Android Delay

**Current:**
```typescript
const delay = isCapacitor ? 500 : 0;
```

**Should be:**
```typescript
const delay = isCapacitor ? 1000 : 100; // 1 second for Android, 100ms for web
```

**Why:** Slower Android devices need more time for Google Maps API to be ready

---

### ✅ Solution #2: Don't Remove User Marker During Reservation

**Current:**
```typescript
useEffect(() => {
  if (userMarkerRef.current) {
    userMarkerRef.current.setMap(null); // ❌ Always removes
  }
  // ...create new marker
}, [userLocation, google]);
```

**Should be:**
```typescript
useEffect(() => {
  // Don't recreate user marker if activeReservation exists
  // (prevents removing marker during navigation mode)
  if (activeReservation && userMarkerRef.current) {
    console.log('👤 Keeping existing user marker during active reservation');
    return; // Keep existing marker, don't recreate
  }

  if (userMarkerRef.current) {
    userMarkerRef.current.setMap(null);
  }
  
  // ...create new marker
}, [userLocation, google, activeReservation]); // Add activeReservation dependency
```

**Why:** Prevents removing user marker during route rendering

---

### ✅ Solution #3: Prevent Cleanup During Delay

**Current:**
```typescript
useEffect(() => {
  // ...
  const timeoutId = setTimeout(() => {
    // Create markers and route
  }, delay);
  
  return () => {
    clearTimeout(timeoutId);
    // Cleanup runs immediately if dependencies change
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
    }
  };
}, [activeReservation, userLocation, google]);
```

**Should be:**
```typescript
useEffect(() => {
  // Track if this effect is still active
  let isMounted = true;
  
  const timeoutId = setTimeout(() => {
    // Only proceed if effect hasn't been cleaned up
    if (!isMounted) {
      console.log('⚠️ Route effect unmounted before timeout, skipping');
      return;
    }
    
    // Create markers and route
    const destinationMarker = new google.maps.Marker({...});
    
    directionsService.route({...}, (result, status) => {
      // Double-check still mounted
      if (!isMounted) {
        console.log('⚠️ Route callback after unmount, skipping');
        return;
      }
      
      if (status === 'OK' && result) {
        directionsRenderer.setDirections(result);
      }
    });
  }, delay);
  
  return () => {
    isMounted = false; // Mark as unmounted
    clearTimeout(timeoutId);
    
    // Only cleanup if timeout has completed
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
    }
  };
}, [activeReservation, userLocation, google]);
```

**Why:** Prevents cleanup from running before async operations complete

---

### ✅ Solution #4: Force Re-render After Delay

**Add callback to ensure visibility:**

```typescript
setTimeout(() => {
  // Create markers
  const destinationMarker = new google.maps.Marker({...});
  
  directionsService.route({...}, (result, status) => {
    if (status === 'OK' && result) {
      directionsRenderer.setDirections(result);
      
      // FORCE VISIBILITY CHECK after 200ms
      setTimeout(() => {
        if (destinationMarker.getMap()) {
          console.log('✅ Destination marker visible');
        } else {
          console.warn('⚠️ Destination marker not visible, re-adding');
          destinationMarker.setMap(mapRef.current);
        }
        
        if (userMarkerRef.current && userMarkerRef.current.getMap()) {
          console.log('✅ User marker visible');
        } else {
          console.warn('⚠️ User marker not visible, re-adding');
          if (userMarkerRef.current) {
            userMarkerRef.current.setMap(mapRef.current);
            userMarkerRef.current.setZIndex(99999);
          }
        }
      }, 200); // Check after 200ms
    }
  });
}, delay);
```

**Why:** Double-checks markers are visible after rendering

---

### ✅ Solution #5: Add More Android-Specific Debugging

```typescript
if ((window as any).Capacitor) {
  // Log every step
  console.log('📱 ANDROID: Starting route drawing');
  
  // Visual toast notifications
  toast.info('Creating destination marker...', { duration: 1000 });
  
  setTimeout(() => {
    toast.info('Requesting route...', { duration: 1000 });
  }, 500);
  
  setTimeout(() => {
    toast.success('Route should be visible now', { duration: 2000 });
  }, 1500);
}
```

---

## Recommended Implementation

### Priority #1: Fix User Marker During Reservation

**File**: [SmartPickGoogleMap.tsx:772](src/components/map/SmartPickGoogleMap.tsx#L772)

```typescript
// Update user location marker
useEffect(() => {
  console.log('👤 USER MARKER EFFECT TRIGGERED', {
    hasMap: !!mapRef.current,
    hasGoogle: !!google,
    hasUserLocation: !!userLocation,
    hasActiveReservation: !!activeReservation, // ADD THIS
    userLocation
  });

  if (!mapRef.current || !google || !userLocation) return;

  // ✅ NEW: Don't recreate user marker during active reservation
  // This prevents removing marker while route is being drawn
  if (activeReservation) {
    console.log('👤 Active reservation exists, keeping user marker stable');
    
    // Just update position if marker exists, don't recreate
    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition({
        lat: userLocation[0],
        lng: userLocation[1]
      });
      console.log('👤 Updated user marker position without recreation');
    }
    
    return; // Exit early - don't remove and recreate marker
  }

  const map = mapRef.current;

  // Remove existing user marker (only when NOT in active reservation)
  if (userMarkerRef.current) {
    console.log('👤 Removing old user marker');
    userMarkerRef.current.setMap(null);
  }

  // ... rest of user marker creation code
}, [userLocation, google, activeReservation]); // ✅ ADD activeReservation dependency
```

---

### Priority #2: Increase Android Delays

**File**: [SmartPickGoogleMap.tsx:941](src/components/map/SmartPickGoogleMap.tsx#L941)

```typescript
// Add delay for Android WebView to ensure marker clearing completes first
const isCapacitor = !!(window as any).Capacitor;
const delay = isCapacitor ? 1200 : 150; // ✅ INCREASED: 1200ms for Android, 150ms for web

// Notify about delay on Android
if (isCapacitor) {
  toast.info('📍 Preparing navigation...', { // ✅ BETTER MESSAGE
    description: 'Loading route and markers',
    duration: 1500, // Show longer
  });
}
```

---

### Priority #3: Add Mounted Check

**File**: [SmartPickGoogleMap.tsx:946-1100](src/components/map/SmartPickGoogleMap.tsx#L946-L1100)

Add at the beginning of the route effect:

```typescript
useEffect(() => {
  // ... existing checks
  
  // ✅ NEW: Track if effect is still mounted
  let isMounted = true;
  
  const timeoutId = setTimeout(() => {
    // ✅ NEW: Check if still mounted before proceeding
    if (!isMounted) {
      console.log('⚠️ Route effect was unmounted during delay, skipping');
      return;
    }
    
    // ... existing marker/route creation code
    
    directionsService.route({...}, (result, status) => {
      // ✅ NEW: Check again in callback
      if (!isMounted) {
        console.log('⚠️ Component unmounted before route callback, skipping');
        return;
      }
      
      if (status === 'OK' && result) {
        directionsRenderer.setDirections(result);
        // ... rest of code
      }
    });
  }, delay);
  
  return () => {
    isMounted = false; // ✅ NEW: Mark as unmounted
    clearTimeout(timeoutId);
    // ... existing cleanup
  };
}, [activeReservation, userLocation, google]);
```

---

## Testing Checklist

After implementing fixes:

- [ ] Test on real Android device (not emulator)
- [ ] Make reservation → Check if:
  - [ ] User blue dot visible ✓
  - [ ] Partner red pin visible ✓
  - [ ] Blue route line visible ✓
  - [ ] QR code shows ✓
  - [ ] Countdown timer works ✓
- [ ] Move phone during reservation → markers stay visible
- [ ] Cancel reservation → return to normal map view
- [ ] Make another reservation → route appears again
- [ ] Test on slow Android device (4GB RAM or less)
- [ ] Test on fast Android device (8GB+ RAM)

---

## Summary

**Root Causes:**
1. **500ms delay too short** for slower Android devices
2. **User marker gets removed/recreated** during route drawing
3. **Race condition** between marker hiding and route creation
4. **No mounted check** → cleanup runs before async operations complete

**Critical Fixes:**
1. ✅ Increase Android delay to 1200ms
2. ✅ Don't recreate user marker during active reservation
3. ✅ Add mounted check to prevent cleanup race condition
4. ✅ Better Android-specific debugging/toasts

**Expected Result:**
- Route and markers always visible on Android
- No disappearing/flickering
- Consistent behavior across all Android devices
