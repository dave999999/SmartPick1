/**
 * useLiveRoute - Lightweight client-side live route tracking
 * 
 * Provides real-time GPS tracking and straight-line route visualization
 * WITHOUT using expensive Google Directions API.
 * 
 * Features:
 * - Real-time GPS tracking via watchPosition
 * - Straight-line polyline path calculation
 * - Distance calculation using Haversine formula
 * - ETA estimation based on walking speed (5 km/h)
 * - Auto-updates every 5 seconds
 * - Clean TypeScript types
 */

import { useState, useEffect, useRef } from 'react';

interface Coordinates {
  lat: number;
  lng: number;
}

interface LiveRouteResult {
  polylinePath: Coordinates[];
  distanceInMeters: number;
  etaInMinutes: number;
  currentLocation: Coordinates | null;
  isTracking: boolean;
  error: string | null;
}

interface UseLiveRouteOptions {
  enabled?: boolean;
  updateInterval?: number; // milliseconds
  walkingSpeedKmh?: number; // for ETA calculation
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (coord1.lat * Math.PI) / 180;
  const φ2 = (coord2.lat * Math.PI) / 180;
  const Δφ = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const Δλ = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Generate straight-line polyline between two points
 * For more advanced routing, integrate with @mapbox/polyline or similar
 */
function generatePolyline(start: Coordinates, end: Coordinates): Coordinates[] {
  return [start, end];
}

/**
 * Calculate ETA in minutes based on distance and walking speed
 */
function calculateETA(distanceMeters: number, speedKmh: number): number {
  const speedMetersPerMinute = (speedKmh * 1000) / 60;
  return Math.ceil(distanceMeters / speedMetersPerMinute);
}

export function useLiveRoute(
  userLocation: Coordinates | null,
  partnerLocation: Coordinates | null,
  options: UseLiveRouteOptions = {}
): LiveRouteResult {
  const {
    enabled = true,
    updateInterval = 5000,
    walkingSpeedKmh = 5,
  } = options;

  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(userLocation);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Start GPS tracking
  useEffect(() => {
    if (!enabled || !partnerLocation) {
      setIsTracking(false);
      return;
    }

    if (!navigator.geolocation) {
      setError('Geolocation not supported by your browser');
      return;
    }

    setIsTracking(true);
    setError(null);

    const successHandler = (position: GeolocationPosition) => {
      const now = Date.now();
      
      // Throttle updates based on updateInterval
      if (now - lastUpdateRef.current < updateInterval) {
        return;
      }

      lastUpdateRef.current = now;
      setCurrentLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    };

    const errorHandler = (err: GeolocationPositionError) => {
      let errorMessage = 'Location error';
      switch (err.code) {
        case err.PERMISSION_DENIED:
          errorMessage = 'Location permission denied';
          break;
        case err.POSITION_UNAVAILABLE:
          errorMessage = 'Location unavailable';
          break;
        case err.TIMEOUT:
          errorMessage = 'Location request timed out';
          break;
      }
      setError(errorMessage);
      setIsTracking(false);
    };

    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(
      successHandler,
      errorHandler,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    // Cleanup
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsTracking(false);
    };
  }, [enabled, partnerLocation, updateInterval]);

  // Calculate route data
  const routeData: LiveRouteResult = {
    polylinePath: [],
    distanceInMeters: 0,
    etaInMinutes: 0,
    currentLocation,
    isTracking,
    error,
  };

  if (currentLocation && partnerLocation) {
    const distance = calculateDistance(currentLocation, partnerLocation);
    const eta = calculateETA(distance, walkingSpeedKmh);
    const polyline = generatePolyline(currentLocation, partnerLocation);

    routeData.polylinePath = polyline;
    routeData.distanceInMeters = Math.round(distance);
    routeData.etaInMinutes = eta;
  }

  return routeData;
}
