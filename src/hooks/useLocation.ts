/**
 * useLocation.ts
 * Hook for managing user location
 */

import { useState, useEffect } from 'react';

interface UserLocation {
  address: string;
  latitude: number;
  longitude: number;
}

export function useLocation() {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Try to get location from localStorage
    const stored = localStorage.getItem('user_location');
    if (stored) {
      try {
        setUserLocation(JSON.parse(stored));
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  const updateLocation = (location: UserLocation) => {
    setUserLocation(location);
    localStorage.setItem('user_location', JSON.stringify(location));
  };

  return { userLocation, loading, updateLocation };
}
