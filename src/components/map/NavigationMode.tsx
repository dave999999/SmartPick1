/**
 * NavigationMode - Live GPS tracking with route display
 * 
 * Features:
 * - Draw walking route using Google Directions API
 * - Live user location updates (every ~5 seconds)
 * - Distance and ETA display
 * - Route updates as user moves
 * - Battery-optimized tracking
 */

import { useEffect, useRef, useState } from 'react';
import { useGoogleMaps } from './GoogleMapProvider';
import { getDistanceAndETA, type LatLng } from '@/lib/maps/distance';
import { Button } from '@/components/ui/button';
import { X, Navigation2 } from 'lucide-react';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

interface NavigationModeProps {
  mapInstance: any; // google.maps.Map
  destination: {
    lat: number;
    lng: number;
    name: string;
  };
  userLocation: [number, number];
  onStop: () => void;
}

export default function NavigationMode({
  mapInstance,
  destination,
  userLocation: initialUserLocation,
  onStop,
}: NavigationModeProps) {
  const { google } = useGoogleMaps();
  const [userLocation, setUserLocation] = useState<LatLng>({
    lat: initialUserLocation[0],
    lng: initialUserLocation[1],
  });
  const [distance, setDistance] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [routePolyline, setRoutePolyline] = useState<any>(null);
  const [userMarker, setUserMarker] = useState<any>(null);
  const [destMarker, setDestMarker] = useState<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastRouteUpdateRef = useRef<{ lat: number; lng: number } | null>(null);

  // Initialize markers and route
  useEffect(() => {
    if (!mapInstance || !google) return;

    // Create user marker
    const userMarkerDiv = document.createElement('div');
    userMarkerDiv.innerHTML = `
      <div style="position: relative;">
        <div style="
          width: 20px;
          height: 20px;
          background: #FF8A00;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        "></div>
        <div style="
          position: absolute;
          width: 40px;
          height: 40px;
          background: rgba(255, 138, 0, 0.3);
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: pulse 2s infinite;
        "></div>
      </div>
    `;

    const userMkr = new google.maps.marker.AdvancedMarkerElement({
      map: mapInstance,
      position: userLocation,
      content: userMarkerDiv,
      title: 'Your Location',
    });

    setUserMarker(userMkr);

    // Create destination marker
    const destMarkerDiv = document.createElement('div');
    destMarkerDiv.innerHTML = '🏪';
    destMarkerDiv.style.fontSize = '32px';

    const destMkr = new google.maps.marker.AdvancedMarkerElement({
      map: mapInstance,
      position: { lat: destination.lat, lng: destination.lng },
      content: destMarkerDiv,
      title: destination.name,
    });

    setDestMarker(destMkr);

    // Draw initial route
    drawRoute(userLocation);

    return () => {
      userMkr?.setMap(null);
      destMkr?.setMap(null);
    };
  }, [mapInstance, google, destination]);

  // Start GPS tracking
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation not supported');
      return;
    }

    // Watch position with battery-optimized settings
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setUserLocation(newLocation);

        // Update user marker
        if (userMarker) {
          userMarker.position = newLocation;
        }

        // Update map center (smooth pan)
        if (mapInstance) {
          mapInstance.panTo(newLocation);
        }

        // Update distance/ETA
        const { distanceKm, durationMinutes } = getDistanceAndETA(
          newLocation,
          { lat: destination.lat, lng: destination.lng }
        );
        setDistance(distanceKm);
        setDuration(durationMinutes);

        // Re-draw route if user moved significantly (> 100m)
        if (lastRouteUpdateRef.current) {
          const movedDistance = getDistanceAndETA(
            lastRouteUpdateRef.current,
            newLocation
          ).distanceKm;

          if (movedDistance > 0.1) {
            // Moved more than 100m
            drawRoute(newLocation);
          }
        }
      },
      (error) => {
        logger.error('Geolocation error:', error);
        toast.error('Could not get your location');
      },
      {
        enableHighAccuracy: false, // Battery-friendly
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [mapInstance, userMarker, destination]);

  // Draw route using Google Directions API
  const drawRoute = async (from: LatLng) => {
    if (!google || !mapInstance) return;

    try {
      const directionsService = new google.maps.DirectionsService();
      
      const request = {
        origin: from,
        destination: { lat: destination.lat, lng: destination.lng },
        travelMode: google.maps.TravelMode.WALKING,
      };

      directionsService.route(request, (result: any, status: any) => {
        if (status === 'OK' && result) {
          // Remove old polyline
          if (routePolyline) {
            routePolyline.setMap(null);
          }

          // Draw new polyline
          const path = result.routes[0].overview_path;
          
          const newPolyline = new google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: '#FF5722',
            strokeOpacity: 0.8,
            strokeWeight: 4,
            map: mapInstance,
          });

          setRoutePolyline(newPolyline);
          lastRouteUpdateRef.current = from;

          // Extract distance and duration from result
          const leg = result.routes[0].legs[0];
          setDistance(leg.distance.value / 1000); // Convert meters to km
          setDuration(leg.duration.value / 60); // Convert seconds to minutes

          // Fit bounds to show entire route
          const bounds = new google.maps.LatLngBounds();
          path.forEach((point: any) => bounds.extend(point));
          mapInstance.fitBounds(bounds, {
            top: 120,
            bottom: 300,
            left: 80,
            right: 80,
          });
        } else {
          // Fallback: draw straight line
          logger.warn('Directions request failed:', status);
          const straightPath = [from, { lat: destination.lat, lng: destination.lng }];
          
          if (routePolyline) {
            routePolyline.setMap(null);
          }

          const newPolyline = new google.maps.Polyline({
            path: straightPath,
            geodesic: true,
            strokeColor: '#FF5722',
            strokeOpacity: 0.8,
            strokeWeight: 4,
            map: mapInstance,
          });

          setRoutePolyline(newPolyline);
        }
      });
    } catch (error) {
      logger.error('Error drawing route:', error);
    }
  };

  // Stop navigation
  const handleStop = () => {
    // Clear GPS tracking
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    // Remove route polyline
    if (routePolyline) {
      routePolyline.setMap(null);
    }

    // Remove markers
    if (userMarker) {
      userMarker.setMap(null);
    }
    if (destMarker) {
      destMarker.setMap(null);
    }

    onStop();
  };

  return (
    <>
      {/* Navigation Info Card */}
      <div className="absolute top-20 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 z-20 border border-gray-200 max-w-md mx-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Navigation2 className="w-5 h-5 text-orange-500" />
              <span className="font-bold text-gray-900">Navigating to</span>
            </div>
            <p className="text-sm font-semibold text-gray-800 mb-1">{destination.name}</p>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="font-medium">
                📍 {distance.toFixed(1)} km
              </span>
              <span className="text-gray-400">•</span>
              <span className="font-medium">
                ⏱ {Math.round(duration)} min
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleStop}
            className="flex-shrink-0 hover:bg-red-50"
          >
            <X className="w-5 h-5 text-gray-600" />
          </Button>
        </div>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.5;
            transform: translate(-50%, -50%) scale(1.5);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(2);
          }
        }
      `}</style>
    </>
  );
}
