/**
 * SmartPickGoogleMap - Google Maps implementation for SmartPick
 * 
 * Features:
 * - Partner offer markers with custom icons
 * - User location tracking
 * - Click to filter offers by partner
 * - Distance/ETA labels above selected marker
 * - Custom light style matching SmartPick design
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import { Offer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Navigation, X } from 'lucide-react';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { useGoogleMaps } from './GoogleMapProvider';
import { getDistanceAndETA, type LatLng } from '@/lib/maps/distance';

interface SmartPickGoogleMapProps {
  offers: Offer[];
  onOfferClick?: (offer: Offer) => void;
  onMarkerClick?: (partnerName: string, partnerAddress: string | undefined, offers: Offer[]) => void;
  selectedCategory?: string;
  onCategorySelect?: (category: string) => void;
  onLocationChange?: (location: [number, number] | null) => void;
  userLocation?: [number, number] | null;
  showUserLocation?: boolean;
  selectedOffer?: Offer | null;
  highlightedOfferId?: string | null;
  hideMarkers?: boolean; // Hide all offer markers (e.g., during navigation)
}

interface GroupedLocation {
  lat: number;
  lng: number;
  partnerId: string;
  partnerName: string;
  partnerAddress?: string;
  offers: Offer[];
  category: string;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  'RESTAURANT': '🍽️',
  'FAST_FOOD': '🍔',
  'BAKERY': '🥐',
  'DESSERTS_SWEETS': '🍰',
  'CAFE': '☕',
  'DRINKS_JUICE': '🥤',
  'GROCERY': '🛒',
  'MINI_MARKET': '🏪',
  'MEAT_BUTCHER': '🥩',
  'FISH_SEAFOOD': '🐟',
  'ALCOHOL': '🍷',
  'DRIVE': '🚗'
};

const CATEGORY_COLORS: Record<string, string> = {
  'RESTAURANT': '#ef4444', // red
  'FAST_FOOD': '#f97316', // orange
  'BAKERY': '#f59e0b', // amber
  'DESSERTS_SWEETS': '#ec4899', // pink
  'CAFE': '#8b5cf6', // purple
  'DRINKS_JUICE': '#06b6d4', // cyan
  'GROCERY': '#10b981', // green
  'MINI_MARKET': '#14b8a6', // teal
  'MEAT_BUTCHER': '#dc2626', // dark red
  'FISH_SEAFOOD': '#3b82f6', // blue
  'ALCOHOL': '#9333ea', // violet
  'DRIVE': '#6366f1' // indigo
};

// Create simple circular marker with category color and emoji
function createCustomMarker(emoji: string, color: string): string {
  return `
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <!-- Drop shadow -->
      <defs>
        <filter id="shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
        </filter>
      </defs>
      
      <!-- Colored circle background -->
      <circle cx="20" cy="20" r="18" fill="${color}" filter="url(#shadow)"/>
      
      <!-- White inner circle -->
      <circle cx="20" cy="20" r="14" fill="white"/>
      
      <!-- Emoji text -->
      <text x="20" y="20" 
            font-size="20" 
            text-anchor="middle" 
            dominant-baseline="central" 
            font-family="Arial, sans-serif">
        ${emoji}
      </text>
    </svg>
  `;
}

// Light map style matching SmartPick design
const SMARTPICK_MAP_STYLE = [
  {
    featureType: 'all',
    elementType: 'labels',
    stylers: [{ visibility: 'on' }]
  },
  {
    featureType: 'poi',
    elementType: 'all',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ visibility: 'on' }, { color: '#e8f5e9' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }]
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9e9e9e' }]
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#c8e6ff' }]
  },
  {
    featureType: 'transit',
    elementType: 'all',
    stylers: [{ visibility: 'simplified' }]
  }
];

export default function SmartPickGoogleMap({
  offers,
  onMarkerClick,
  userLocation: externalUserLocation,
  showUserLocation = false,
  onLocationChange,
  selectedOffer,
  highlightedOfferId,
  hideMarkers = false,
}: SmartPickGoogleMapProps) {
  const { isLoaded, google, setGoogleMap } = useGoogleMaps();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    externalUserLocation || null
  );

  // Sync external userLocation
  useEffect(() => {
    if (externalUserLocation) {
      setUserLocation(externalUserLocation);
    }
  }, [externalUserLocation]);

  // Group offers by location
  const groupedLocations = useMemo((): GroupedLocation[] => {
    const locationMap: Record<string, GroupedLocation> = {};
    
    offers.forEach(offer => {
      if (!offer.partner?.latitude || !offer.partner?.longitude) return;
      
      const key = `${offer.partner.latitude.toFixed(6)},${offer.partner.longitude.toFixed(6)}`;
      
      if (locationMap[key]) {
        locationMap[key].offers.push(offer);
      } else {
        locationMap[key] = {
          lat: offer.partner.latitude,
          lng: offer.partner.longitude,
          partnerId: offer.partner_id,
          partnerName: offer.partner.business_name,
          partnerAddress: offer.partner.address,
          offers: [offer],
          category: offer.category,
        };
      }
    });
    
    return Object.values(locationMap);
  }, [offers]);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !google || !mapContainerRef.current) return;
    if (mapRef.current) return; // Already initialized

    try {
      const map = new google.maps.Map(mapContainerRef.current, {
        center: { lat: 41.7151, lng: 44.8271 }, // Tbilisi
        zoom: 13,
        mapId: '923c0e6030ce547166b44338', // Map ID with custom style (no POI icons)
        disableDefaultUI: true,
        zoomControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: 'greedy',
        clickableIcons: false,
      });

      mapRef.current = map;
      setGoogleMap(map); // Expose map instance to context
      logger.log('Google Map initialized');

      // Clear selection on map click
      map.addListener('click', () => {
        if (infoWindowRef.current) {
          infoWindowRef.current.close();
        }
        if (onMarkerClick) {
          onMarkerClick('', undefined, []);
        }
      });
    } catch (error) {
      logger.error('Failed to initialize Google Map:', error);
      toast.error('Failed to load map');
    }

    return () => {
      // Cleanup on unmount only
      if (mapRef.current) {
        setGoogleMap(null);
        mapRef.current = null;
      }
    };
  }, [isLoaded, google, setGoogleMap]);

  // Update markers
  useEffect(() => {
    if (!mapRef.current || !google) return;

    const map = mapRef.current;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // If markers should be hidden (e.g., during navigation), don't render them
    if (hideMarkers) {
      return;
    }

    // Create info window if not exists
    if (!infoWindowRef.current) {
      infoWindowRef.current = new google.maps.InfoWindow();
    }

    // Add new markers
    groupedLocations.forEach(location => {
      // Check if expiring soon
      const now = new Date();
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const hasExpiringSoon = location.offers.some((offer: Offer) => {
        const expiresAt = new Date(offer.expires_at);
        return expiresAt <= twoHoursFromNow;
      });

      // Create custom colored pin marker
      const emoji = CATEGORY_EMOJIS[location.category] || '📍';
      const color = CATEGORY_COLORS[location.category] || '#6b7280';
      const svgString = createCustomMarker(emoji, color);
      
      const markerDiv = document.createElement('div');
      markerDiv.innerHTML = svgString;
      markerDiv.style.cursor = 'pointer';
      markerDiv.style.userSelect = 'none';
      markerDiv.style.transition = 'transform 0.2s';
      markerDiv.style.width = '40px';
      markerDiv.style.height = '40px';
      
      // Add glow effect for expiring soon
      if (hasExpiringSoon) {
        markerDiv.style.filter = 'drop-shadow(0 0 12px #37E5AE)';
      }

      markerDiv.addEventListener('mouseenter', () => {
        markerDiv.style.transform = 'scale(1.1)';
      });
      markerDiv.addEventListener('mouseleave', () => {
        markerDiv.style.transform = 'scale(1)';
      });

      // Use Overlay to position custom HTML marker
      const marker = new google.maps.OverlayView();
      marker.onAdd = function() {
        this.getPanes()!.overlayMouseTarget.appendChild(markerDiv);
      };
      marker.draw = function() {
        const projection = this.getProjection();
        const position = projection.fromLatLngToDivPixel(
          new google.maps.LatLng(location.lat, location.lng)
        );
        if (position) {
          markerDiv.style.position = 'absolute';
          markerDiv.style.left = (position.x - 20) + 'px';
          markerDiv.style.top = (position.y - 20) + 'px';
        }
      };
      marker.onRemove = function() {
        if (markerDiv.parentNode) {
          markerDiv.parentNode.removeChild(markerDiv);
        }
      };
      marker.setMap(map);

      // Handle marker click
      markerDiv.addEventListener('click', () => {
        // Show distance info if user location available
        if (userLocation) {
          const from: LatLng = { lat: userLocation[0], lng: userLocation[1] };
          const to: LatLng = { lat: location.lat, lng: location.lng };
          const { distanceText, durationText } = getDistanceAndETA(from, to);

          const content = `
            <div style="padding: 8px; min-width: 150px;">
              <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">
                ${location.partnerName}
              </div>
              <div style="color: #666; font-size: 12px;">
                📍 ${distanceText} • ${durationText}
              </div>
            </div>
          `;

          infoWindowRef.current.setContent(content);
          infoWindowRef.current.open(map, marker);
        }

        // Filter offers by this partner
        if (onMarkerClick) {
          onMarkerClick(location.partnerName, location.partnerAddress, location.offers);
        }
      });

      markersRef.current.push(marker);
    });

    logger.log(`Added ${markersRef.current.length} markers to Google Map`);
  }, [groupedLocations, google, userLocation, onMarkerClick, hideMarkers]);

  // Update user location marker
  useEffect(() => {
    if (!mapRef.current || !google || !userLocation) return;

    const map = mapRef.current;

    // Remove existing user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
    }

    // Create user marker
    const userMarkerDiv = document.createElement('div');
    userMarkerDiv.style.cssText = `
      width: 16px;
      height: 16px;
      background: #FF8A00;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      position: relative;
    `;

    // Pulsing ring
    const ring = document.createElement('div');
    ring.style.cssText = `
      position: absolute;
      width: 36px;
      height: 36px;
      background: rgba(255, 138, 0, 0.3);
      border-radius: 50%;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      animation: pulse 2s infinite;
    `;
    userMarkerDiv.appendChild(ring);

    // Use Overlay for user marker
    const userMarker = new google.maps.OverlayView();
    userMarker.onAdd = function() {
      this.getPanes()!.overlayMouseTarget.appendChild(userMarkerDiv);
    };
    userMarker.draw = function() {
      const projection = this.getProjection();
      const position = projection.fromLatLngToDivPixel(
        new google.maps.LatLng(userLocation[0], userLocation[1])
      );
      if (position) {
        userMarkerDiv.style.position = 'absolute';
        userMarkerDiv.style.left = (position.x - 8) + 'px';
        userMarkerDiv.style.top = (position.y - 8) + 'px';
      }
    };
    userMarker.onRemove = function() {
      if (userMarkerDiv.parentNode) {
        userMarkerDiv.parentNode.removeChild(userMarkerDiv);
      }
    };
    userMarker.setMap(map);

    userMarkerRef.current = userMarker;

    // Center map on user
    map.panTo({ lat: userLocation[0], lng: userLocation[1] });
    if (map.getZoom() < 13) {
      map.setZoom(13);
    }
  }, [userLocation, google]);

  // Center on selected offer
  useEffect(() => {
    if (!mapRef.current || !google || !selectedOffer?.partner) return;

    const map = mapRef.current;
    const { latitude, longitude } = selectedOffer.partner;

    if (latitude && longitude) {
      map.panTo({ lat: latitude, lng: longitude });
      
      // Show distance label if user location available
      if (userLocation) {
        const from: LatLng = { lat: userLocation[0], lng: userLocation[1] };
        const to: LatLng = { lat: latitude, lng: longitude };
        const { distanceText, durationText } = getDistanceAndETA(from, to);

        const content = `
          <div style="padding: 8px; min-width: 150px;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">
              ${selectedOffer.partner.business_name}
            </div>
            <div style="color: #666; font-size: 12px;">
              📍 ${distanceText} • ${durationText}
            </div>
          </div>
        `;

        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(content);
          infoWindowRef.current.setPosition({ lat: latitude, lng: longitude });
          infoWindowRef.current.open(map);
        }
      }
    }
  }, [selectedOffer, google, userLocation]);

  // NEW: Highlight marker when card is scrolled into view
  useEffect(() => {
    if (!google || !highlightedOfferId || markersRef.current.length === 0) return;

    // Find marker for highlighted offer
    const marker = markersRef.current.find((m: any) => {
      const offers = m.offers || [];
      return offers.some((offer: Offer) => offer.id === highlightedOfferId);
    });

    if (marker) {
      // Bounce animation
      marker.setAnimation(google.maps.Animation.BOUNCE);
      
      // Stop after 1 second
      setTimeout(() => {
        if (marker) marker.setAnimation(null);
      }, 1000);
    }
  }, [highlightedOfferId, google]);

  // Handle "Near Me" button
  const handleNearMe = () => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: [number, number] = [
          position.coords.latitude,
          position.coords.longitude
        ];
        setUserLocation(location);
        onLocationChange?.(location);

        if (mapRef.current) {
          mapRef.current.panTo({ 
            lat: position.coords.latitude, 
            lng: position.coords.longitude 
          });
          mapRef.current.setZoom(14);
        }

        toast.success('Showing offers near you');
      },
      (error) => {
        logger.error('Error getting location:', error);
        toast.error('Could not get your location');
      }
    );
  };

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-gray-600 text-sm">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <div
        ref={mapContainerRef}
        className="w-full h-full rounded-2xl"
        style={{ minHeight: '400px' }}
      />

      {/* Near Me Button */}
      {showUserLocation && (
        <Button
          onClick={handleNearMe}
          className="absolute top-1/2 -translate-y-1/2 right-4 bg-[#FF8A00] hover:bg-[#e67a00] text-white rounded-full p-3 shadow-lg z-10"
          size="icon"
        >
          <Navigation className="w-5 h-5" />
        </Button>
      )}

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
    </div>
  );
}
