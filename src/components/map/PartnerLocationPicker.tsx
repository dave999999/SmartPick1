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
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      mapRef.current = map;

      // Create standard draggable marker (compatible without Map ID)
      const marker = new google.maps.Marker({
        map,
        position: markerPosition,
        draggable: true,
        title: 'Business Location',
        animation: google.maps.Animation.DROP,
      });

      markerRef.current = marker;

      // Handle marker drag
      google.maps.event.addListener(marker, 'dragend', (event: any) => {
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
      google.maps.event.addListener(map, 'click', (event: any) => {
        const newPos = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng(),
        };
        marker.setPosition(newPos);
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
          markerRef.current.setPosition(newPos);
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
