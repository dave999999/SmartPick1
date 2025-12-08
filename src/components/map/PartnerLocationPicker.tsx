/**
 * PartnerLocationPicker
 * 
 * Google Maps + Places Autocomplete for partner address selection.
 * Features:
 * - Places Autocomplete for address search
 * - Interactive map with draggable marker
 * - Real-time lat/lng updates
 */

import { useEffect, useRef, useState } from 'react';
import { useGoogleMaps } from './GoogleMapProvider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MapPin } from 'lucide-react';
import { logger } from '@/lib/logger';

export interface PartnerLocation {
  address: string;
  latitude: number;
  longitude: number;
}

interface PartnerLocationPickerProps {
  initialLocation?: PartnerLocation;
  onChange: (location: PartnerLocation) => void;
}

const DEFAULT_LOCATION = {
  lat: 41.7151,
  lng: 44.8271,
}; // Tbilisi

export default function PartnerLocationPicker({
  initialLocation,
  onChange,
}: PartnerLocationPickerProps) {
  const { isLoaded, google } = useGoogleMaps();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const autocompleteRef = useRef<any>(null);

  const [address, setAddress] = useState(initialLocation?.address || '');
  const [markerPosition, setMarkerPosition] = useState({
    lat: initialLocation?.latitude || DEFAULT_LOCATION.lat,
    lng: initialLocation?.longitude || DEFAULT_LOCATION.lng,
  });

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !google || !mapContainerRef.current) return;
    if (mapRef.current) return; // Already initialized

    logger.log('Initializing partner location picker map...', { isLoaded, hasGoogle: !!google, hasContainer: !!mapContainerRef.current });

    try {
      // Ensure google.maps.Map is available
      if (!google.maps || !google.maps.Map) {
        logger.error('google.maps.Map not available');
        return;
      }

      const map = new google.maps.Map(mapContainerRef.current, {
        center: markerPosition,
        zoom: 15,
        mapId: 'PARTNER_LOCATION_PICKER', // Required for AdvancedMarkerElement
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          {
            featureType: "administrative",
            elementType: "geometry.fill",
            stylers: [{ visibility: "on" }, { color: "#ffffff" }]
          },
          {
            featureType: "administrative",
            elementType: "labels.text.fill",
            stylers: [{ gamma: "0.00" }, { weight: "0.01" }, { visibility: "on" }, { color: "#8c8c8c" }]
          },
          {
            featureType: "administrative.neighborhood",
            elementType: "labels.text",
            stylers: [{ visibility: "on" }]
          },
          {
            featureType: "administrative.neighborhood",
            elementType: "labels.text.fill",
            stylers: [{ color: "#898989" }]
          },
          {
            featureType: "administrative.neighborhood",
            elementType: "labels.text.stroke",
            stylers: [{ color: "#ffffff" }, { weight: "4.00" }]
          },
          {
            featureType: "landscape",
            elementType: "all",
            stylers: [{ color: "#ffffff" }]
          },
          {
            featureType: "landscape.man_made",
            elementType: "geometry.fill",
            stylers: [{ visibility: "simplified" }, { color: "#ffffff" }]
          },
          {
            featureType: "landscape.natural",
            elementType: "geometry",
            stylers: [{ visibility: "on" }]
          },
          {
            featureType: "landscape.natural",
            elementType: "labels.text.fill",
            stylers: [{ color: "#8d8d8d" }]
          },
          {
            featureType: "landscape.natural.terrain",
            elementType: "geometry.stroke",
            stylers: [{ visibility: "on" }]
          },
          {
            featureType: "poi",
            elementType: "all",
            stylers: [{ visibility: "off" }]
          },
          {
            featureType: "poi.park",
            elementType: "geometry.fill",
            stylers: [{ color: "#cef8d5" }, { visibility: "on" }]
          },
          {
            featureType: "poi.park",
            elementType: "labels.text.fill",
            stylers: [{ visibility: "on" }, { color: "#60b36c" }]
          },
          {
            featureType: "poi.park",
            elementType: "labels.text.stroke",
            stylers: [{ visibility: "on" }, { color: "#ffffff" }]
          },
          {
            featureType: "poi.park",
            elementType: "labels.icon",
            stylers: [{ visibility: "off" }]
          },
          {
            featureType: "road",
            elementType: "all",
            stylers: [{ saturation: "-100" }, { lightness: "32" }, { visibility: "on" }]
          },
          {
            featureType: "road",
            elementType: "geometry.fill",
            stylers: [{ color: "#f3f3f3" }]
          },
          {
            featureType: "road",
            elementType: "geometry.stroke",
            stylers: [{ color: "#e1e1e1" }]
          },
          {
            featureType: "road",
            elementType: "labels.text",
            stylers: [{ visibility: "on" }]
          },
          {
            featureType: "road.highway",
            elementType: "all",
            stylers: [{ visibility: "simplified" }]
          },
          {
            featureType: "road.highway",
            elementType: "geometry",
            stylers: [{ visibility: "on" }, { lightness: "63" }]
          },
          {
            featureType: "road.highway",
            elementType: "geometry.fill",
            stylers: [{ color: "#f3f3f3" }]
          },
          {
            featureType: "road.highway",
            elementType: "geometry.stroke",
            stylers: [{ color: "#e1e1e1" }]
          },
          {
            featureType: "road.highway",
            elementType: "labels.text",
            stylers: [{ visibility: "off" }]
          },
          {
            featureType: "road.highway",
            elementType: "labels.icon",
            stylers: [{ visibility: "off" }]
          },
          {
            featureType: "road.arterial",
            elementType: "labels.icon",
            stylers: [{ visibility: "off" }]
          },
          {
            featureType: "transit",
            elementType: "all",
            stylers: [{ visibility: "off" }]
          },
          {
            featureType: "transit.station",
            elementType: "all",
            stylers: [{ visibility: "off" }]
          },
          {
            featureType: "water",
            elementType: "all",
            stylers: [{ visibility: "on" }, { color: "#eeeeee" }]
          },
          {
            featureType: "water",
            elementType: "geometry.fill",
            stylers: [{ color: "#cce4ff" }]
          },
          {
            featureType: "water",
            elementType: "labels.text.fill",
            stylers: [{ visibility: "on" }, { color: "#6095a5" }]
          }
        ],
      });

      mapRef.current = map;

      // Create modern AdvancedMarkerElement with custom pin
      const pinElement = new google.maps.marker.PinElement({
        background: '#10B981',
        borderColor: '#FFFFFF',
        glyphColor: '#FFFFFF',
        scale: 1.2,
      });

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: markerPosition,
        content: pinElement.element,
        gmpDraggable: true,
        title: 'Business Location',
      });

      markerRef.current = marker;

      // Handle marker drag
      marker.addListener('dragend', (event: any) => {
        const newPos = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng(),
        };
        setMarkerPosition(newPos);
        
        // Reverse geocode to get address
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: newPos }, (results: any, status: any) => {
          if (status === 'OK' && results[0]) {
            const newAddress = results[0].formatted_address;
            setAddress(newAddress);
            onChange({
              address: newAddress,
              latitude: newPos.lat,
              longitude: newPos.lng,
            });
          }
        });
      });

      // Handle map click
      map.addListener('click', (event: any) => {
        const newPos = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng(),
        };
        marker.position = newPos;
        setMarkerPosition(newPos);
        map.panTo(newPos);

        // Reverse geocode
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: newPos }, (results: any, status: any) => {
          if (status === 'OK' && results[0]) {
            const newAddress = results[0].formatted_address;
            setAddress(newAddress);
            onChange({
              address: newAddress,
              latitude: newPos.lat,
              longitude: newPos.lng,
            });
          }
        });
      });

      logger.log('Partner location picker map initialized');
    } catch (error) {
      logger.error('Failed to initialize location picker map:', error);
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
    };
  }, [isLoaded, google]);

  // Initialize Places Autocomplete
  useEffect(() => {
    if (!isLoaded || !google || !inputRef.current || autocompleteRef.current) return;

    try {
      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'ge' }, // Georgia
        fields: ['formatted_address', 'geometry', 'name'],
      });

      autocompleteRef.current = autocomplete;

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();

        if (!place.geometry || !place.geometry.location) {
          logger.warn('Place has no geometry');
          return;
        }

        const newPos = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };

        const newAddress = place.formatted_address || place.name || '';

        setAddress(newAddress);
        setMarkerPosition(newPos);

        // Update map and marker
        if (mapRef.current) {
          mapRef.current.panTo(newPos);
          mapRef.current.setZoom(16);
        }

        if (markerRef.current) {
          markerRef.current.position = newPos;
        }

        // Notify parent
        onChange({
          address: newAddress,
          latitude: newPos.lat,
          longitude: newPos.lng,
        });
      });

      logger.log('Places Autocomplete initialized');
    } catch (error) {
      logger.error('Failed to initialize Places Autocomplete:', error);
    }
  }, [isLoaded, google, onChange]);

  // Handle manual address input
  const handleAddressChange = (value: string) => {
    setAddress(value);
  };

  if (!isLoaded) {
    return (
      <div className="space-y-2">
        <Label>Business Location</Label>
        <div className="w-full h-[300px] bg-gray-100 rounded-lg flex items-center justify-center">
          <span className="text-gray-500">Loading map...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Address Input with Autocomplete */}
      <Label htmlFor="address" className="flex items-center gap-2">
        <MapPin className="w-4 h-4" />
        Business Address *
      </Label>
      <Input
        id="address"
        ref={inputRef}
        value={address}
        onChange={(e) => handleAddressChange(e.target.value)}
        placeholder="Start typing your address..."
        className="text-base"
        required
      />

      {/* Interactive Map */}
      <div className="w-full h-[300px] rounded-lg overflow-hidden border-2 border-gray-300">
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      <p className="text-xs text-gray-500">
        📍 Search for your address above, or click/drag the pin on the map to set your exact location
      </p>
    </div>
  );
}
