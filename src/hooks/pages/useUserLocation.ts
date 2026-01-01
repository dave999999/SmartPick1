/**
 * useUserLocation - User geolocation tracking
 * 
 * Manages user's current location using browser geolocation API.
 * Extracted from IndexRedesigned.tsx for reusability.
 */

import { useState, useEffect, useMemo } from 'react';
import { logger } from '@/lib/logger';

// Default location: Tbilisi, Georgia
const DEFAULT_LOCATION: [number, number] = [41.7151, 44.8271];

export interface UserLocationState {
  userLocation: [number, number] | null;
  userLocationObject: { lat: number; lng: number } | null;
  setUserLocation: (location: [number, number] | null) => void;
}

export function useUserLocation(): UserLocationState {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Convert [lat, lng] array to { lat, lng } object for map libraries
  const userLocationObject = useMemo(() => {
    return userLocation ? { lat: userLocation[0], lng: userLocation[1] } : null;
  }, [userLocation]);

  // Request user's location on mount
  useEffect(() => {
    // 🔧 ANDROID EMULATOR FIX: Force Tbilisi location on Capacitor
    const isAndroid = (window as any).Capacitor;
    if (isAndroid) {
      setUserLocation(DEFAULT_LOCATION);
      return;
    }
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation: [number, number] = [
            position.coords.latitude,
            position.coords.longitude,
          ];
          setUserLocation(newLocation);
          logger.info('📍 User location obtained:', newLocation);
        },
        (error) => {
          logger.warn('⚠️ Error getting user location:', error.message);
          // Set default location (Tbilisi) if location access denied
          setUserLocation(DEFAULT_LOCATION);
          logger.info('📍 Using default location (Tbilisi)');
        }
      );
    } else {
      // Set default location if geolocation not supported
      logger.warn('⚠️ Geolocation not supported by browser');
      setUserLocation(DEFAULT_LOCATION);
      logger.info('📍 Using default location (Tbilisi)');
    }
  }, []);

  return {
    userLocation,
    userLocationObject,
    setUserLocation,
  };
}
