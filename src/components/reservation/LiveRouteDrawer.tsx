/**
 * LiveRouteDrawer - Handles live route drawing on Google Maps
 * Updates route as user moves, shows partner marker with pulse
 */

import { useEffect, useRef } from 'react';
import { Reservation } from '@/lib/types';

interface LiveRouteDrawerProps {
  map: google.maps.Map | null;
  reservation: Reservation | null;
  userLocation: { lat: number; lng: number } | null;
  isNavigating: boolean;
}

export function LiveRouteDrawer({
  map,
  reservation,
  userLocation,
  isNavigating,
}: LiveRouteDrawerProps) {
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const partnerMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const lastUpdateRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!map || !window.google) return;

    // Initialize services
    if (!directionsServiceRef.current) {
      directionsServiceRef.current = new google.maps.DirectionsService();
    }

    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new google.maps.DirectionsRenderer({
        map,
        suppressMarkers: true, // We'll add custom markers
        polylineOptions: {
          strokeColor: '#FF7A00',
          strokeWeight: 5,
          strokeOpacity: 0.8,
        },
      });
    }

    return () => {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
      if (partnerMarkerRef.current) {
        partnerMarkerRef.current.map = null;
      }
    };
  }, [map]);

  // Draw route when navigation starts or user moves
  useEffect(() => {
    if (!map || !userLocation || !isNavigating || !reservation) {
      // Clear route when not navigating
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setDirections({ routes: [] } as any);
      }
      if (partnerMarkerRef.current) {
        partnerMarkerRef.current.map = null;
        partnerMarkerRef.current = null;
      }
      return;
    }

    // Get partner location from various possible paths
    const partnerLat = reservation.partner?.latitude || 
                      reservation.partner?.location?.latitude || 
                      reservation.offer?.partner?.latitude || 
                      reservation.offer?.partner?.location?.latitude;
    const partnerLng = reservation.partner?.longitude || 
                      reservation.partner?.location?.longitude || 
                      reservation.offer?.partner?.longitude || 
                      reservation.offer?.partner?.location?.longitude;

    if (!partnerLat || !partnerLng) return;

    // Check if user moved significantly (> 50 meters)
    if (lastUpdateRef.current) {
      const distance = calculateDistanceMeters(
        lastUpdateRef.current.lat,
        lastUpdateRef.current.lng,
        userLocation.lat,
        userLocation.lng
      );
      if (distance < 50) return; // Don't update if moved < 50m
    }

    lastUpdateRef.current = userLocation;

    // Request directions
    const request: google.maps.DirectionsRequest = {
      origin: new google.maps.LatLng(userLocation.lat, userLocation.lng),
      destination: new google.maps.LatLng(partnerLat, partnerLng),
      travelMode: google.maps.TravelMode.WALKING,
    };

    directionsServiceRef.current?.route(request, (result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
      if (status === google.maps.DirectionsStatus.OK && result) {
        directionsRendererRef.current?.setDirections(result);

        // Add custom partner marker with pulse
        if (!partnerMarkerRef.current) {
          const markerContent = document.createElement('div');
          markerContent.className = 'partner-marker-pulse';
          markerContent.innerHTML = `
            <div style="position: relative; width: 48px; height: 48px;">
              <!-- Pulse rings -->
              <div style="
                position: absolute;
                inset: 0;
                border-radius: 50%;
                background: rgba(249, 115, 22, 0.3);
                animation: pulse 2s ease-out infinite;
              "></div>
              <div style="
                position: absolute;
                inset: 0;
                border-radius: 50%;
                background: rgba(249, 115, 22, 0.2);
                animation: pulse 2s ease-out infinite 0.5s;
              "></div>
              <!-- Main marker -->
              <div style="
                position: absolute;
                inset: 8px;
                border-radius: 50%;
                background: linear-gradient(135deg, #FF7A00 0%, #F97316 100%);
                box-shadow: 0 4px 12px rgba(249, 115, 22, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                border: 3px solid white;
              ">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
              </div>
            </div>
          `;

          // Add pulse animation CSS
          const style = document.createElement('style');
          style.textContent = `
            @keyframes pulse {
              0% {
                transform: scale(1);
                opacity: 0.8;
              }
              100% {
                transform: scale(2);
                opacity: 0;
              }
            }
          `;
          document.head.appendChild(style);

          partnerMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
            map,
            position: { lat: partnerLat, lng: partnerLng },
            content: markerContent,
            title: reservation.partner?.business_name || 'Partner Location',
          });
        }

        // Auto-center map on route
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(userLocation);
        bounds.extend({ lat: partnerLat, lng: partnerLng });
        map.fitBounds(bounds, { top: 100, bottom: 100, left: 50, right: 50 });
      }
    });
  }, [map, reservation, userLocation, isNavigating]);

  return null; // This component only manages map state
}

// Helper function to calculate distance
function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
