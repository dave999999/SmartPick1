/**
 * Distance and ETA Calculations
 * 
 * Provides client-side distance/time calculations without external API calls.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface DistanceResult {
  distanceKm: number;
  distanceText: string;
  durationMinutes: number;
  durationText: string;
}

/**
 * Calculate distance between two points using Haversine formula
 * 
 * @param from - Starting point
 * @param to - Destination point
 * @returns Distance in kilometers
 */
export function calculateDistance(from: LatLng, to: LatLng): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

/**
 * Calculate ETA based on distance
 * 
 * @param distanceKm - Distance in kilometers
 * @param mode - Travel mode ('walking' | 'driving')
 * @returns Estimated time in minutes
 */
export function calculateETA(
  distanceKm: number,
  mode: 'walking' | 'driving' = 'walking'
): number {
  // Walking: ~5 km/h average
  // Driving: ~30 km/h average (city traffic)
  const speedKmPerHour = mode === 'walking' ? 5 : 30;
  const minutes = (distanceKm / speedKmPerHour) * 60;
  return Math.round(minutes);
}

/**
 * Get distance and ETA with formatted text
 * 
 * @param from - Starting point
 * @param to - Destination point
 * @param mode - Travel mode
 * @returns Distance and ETA with formatted strings
 */
export function getDistanceAndETA(
  from: LatLng,
  to: LatLng,
  mode: 'walking' | 'driving' = 'walking'
): DistanceResult {
  const distanceKm = calculateDistance(from, to);
  const durationMinutes = calculateETA(distanceKm, mode);
  
  return {
    distanceKm,
    distanceText: formatDistance(distanceKm),
    durationMinutes,
    durationText: formatDuration(durationMinutes),
  };
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

/**
 * Format duration for display
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if location is within radius
 */
export function isWithinRadius(
  center: LatLng,
  point: LatLng,
  radiusKm: number
): boolean {
  const distance = calculateDistance(center, point);
  return distance <= radiusKm;
}

/**
 * Get center point of multiple locations (bounds center)
 */
export function getCenterPoint(locations: LatLng[]): LatLng {
  if (locations.length === 0) {
    return { lat: 41.7151, lng: 44.8271 }; // Default to Tbilisi
  }
  
  if (locations.length === 1) {
    return locations[0];
  }
  
  const sum = locations.reduce(
    (acc, loc) => ({
      lat: acc.lat + loc.lat,
      lng: acc.lng + loc.lng,
    }),
    { lat: 0, lng: 0 }
  );
  
  return {
    lat: sum.lat / locations.length,
    lng: sum.lng / locations.length,
  };
}
