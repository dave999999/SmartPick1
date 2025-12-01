/**
 * useLiveGPS - Hook for continuous GPS tracking during navigation
 * Updates user position every 2-3 seconds
 */

import { useState, useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';

interface GPSPosition {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: number;
}

interface UseLiveGPSOptions {
  enabled: boolean;
  highAccuracy?: boolean;
  updateInterval?: number; // in milliseconds
}

export function useLiveGPS(options: UseLiveGPSOptions) {
  const { enabled, highAccuracy = true, updateInterval = 3000 } = options;
  const [position, setPosition] = useState<GPSPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled || !navigator.geolocation) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    setIsLoading(true);

    const successHandler = (pos: GeolocationPosition) => {
      const now = Date.now();
      
      // Throttle updates based on updateInterval
      if (now - lastUpdateRef.current < updateInterval) {
        return;
      }

      lastUpdateRef.current = now;

      const gpsPosition: GPSPosition = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp,
      };

      setPosition(gpsPosition);
      setError(null);
      setIsLoading(false);

      logger.log('GPS position updated:', {
        lat: gpsPosition.lat,
        lng: gpsPosition.lng,
        accuracy: gpsPosition.accuracy,
      });
    };

    const errorHandler = (err: GeolocationPositionError) => {
      let errorMessage = 'Failed to get location';
      
      switch (err.code) {
        case err.PERMISSION_DENIED:
          errorMessage = 'Location permission denied. Please enable location access.';
          break;
        case err.POSITION_UNAVAILABLE:
          errorMessage = 'Location unavailable. Please check your GPS.';
          break;
        case err.TIMEOUT:
          errorMessage = 'Location request timed out.';
          break;
      }

      setError(errorMessage);
      setIsLoading(false);
      logger.error('GPS error:', errorMessage);
    };

    const geoOptions: PositionOptions = {
      enableHighAccuracy: highAccuracy,
      timeout: 10000,
      maximumAge: 0,
    };

    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(
      successHandler,
      errorHandler,
      geoOptions
    );

    // Cleanup
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled, highAccuracy, updateInterval]);

  return { position, error, isLoading };
}
