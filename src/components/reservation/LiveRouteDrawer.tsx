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
  const partnerMarkerRef = useRef<google.maps.Marker | null>(null);
  const lastUpdateRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!map || !window.google) {
      console.log('⚠️ Map or Google not ready:', { hasMap: !!map, hasGoogle: !!window.google });
      return;
    }

    console.log('✅ Initializing DirectionsService and DirectionsRenderer');

    // Initialize services
    if (!directionsServiceRef.current) {
      directionsServiceRef.current = new google.maps.DirectionsService();
      console.log('📍 DirectionsService created');
    }

    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new google.maps.DirectionsRenderer({
        map,
        suppressMarkers: true, // Hide A/B markers, only show custom markers
        polylineOptions: {
          strokeColor: '#4285F4', // Google Maps blue
          strokeWeight: 5,
          strokeOpacity: 0.9,
        },
      });
      console.log('📍 DirectionsRenderer created and attached to map');
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

  // Draw route when reservation exists or navigation starts
  useEffect(() => {
    console.log('🧭 LiveRouteDrawer effect:', { 
      hasMap: !!map, 
      hasUserLocation: !!userLocation, 
      isNavigating, 
      hasReservation: !!reservation,
      reservationId: reservation?.id
    });
    
    if (!map || !userLocation || !reservation) {
      // Clear route when no reservation
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setDirections({ routes: [] } as any);
      }
      if (partnerMarkerRef.current) {
        partnerMarkerRef.current.setMap(null);
        partnerMarkerRef.current = null;
      }
      lastUpdateRef.current = null; // Reset on clear
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

    if (!partnerLat || !partnerLng) {
      console.log('⚠️ No partner coordinates found');
      return;
    }

    // Check if this is a new reservation or user moved significantly (> 50 meters)
    const isNewReservation = !lastUpdateRef.current || lastUpdateRef.current.reservationId !== reservation.id;
    
    if (!isNewReservation && lastUpdateRef.current) {
      const distance = calculateDistanceMeters(
        lastUpdateRef.current.lat,
        lastUpdateRef.current.lng,
        userLocation.lat,
        userLocation.lng
      );
      if (distance < 50) {
        console.log('⏭️ Skipping route update - user moved < 50m');
        return; // Don't update if moved < 50m
      }
    }

    console.log(isNewReservation ? '🆕 Drawing route for new reservation' : '🔄 Updating route - user moved > 50m');
    lastUpdateRef.current = { ...userLocation, reservationId: reservation.id } as any;

    // Request directions
    const request: google.maps.DirectionsRequest = {
      origin: new google.maps.LatLng(userLocation.lat, userLocation.lng),
      destination: new google.maps.LatLng(partnerLat, partnerLng),
      travelMode: google.maps.TravelMode.WALKING,
    };

    directionsServiceRef.current?.route(request, (result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
      console.log('🗺️ Directions API response:', { status, hasResult: !!result });
      
      if (status === google.maps.DirectionsStatus.OK && result) {
        console.log('✅ Drawing route on map');
        directionsRendererRef.current?.setDirections(result);

        // Create custom partner marker (since we suppressed default A/B markers)
        if (partnerMarkerRef.current) {
          partnerMarkerRef.current.setMap(null);
        }
        
        const partnerMarker = new google.maps.Marker({
          position: { lat: partnerLat, lng: partnerLng },
          map: map,
          icon: {
            url: '/icons/map-pins/all.png?v=2',
            scaledSize: new google.maps.Size(64, 64),
            anchor: new google.maps.Point(32, 64),
            optimized: false
          },
          title: reservation.partner?.business_name || 'Partner Location',
          zIndex: 1000
        });
        
        partnerMarkerRef.current = partnerMarker as any;

        // Auto-center map on route with padding
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(userLocation);
        bounds.extend({ lat: partnerLat, lng: partnerLng });
        map.fitBounds(bounds, { top: 120, bottom: 120, left: 60, right: 60 });
      } else {
        console.error('❌ Directions request failed:', status);
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
