import { useEffect, useRef, useState, useMemo, memo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Offer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Navigation } from 'lucide-react';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import smartpickStyle from '@/map/styles/smartpick-cosmic-dark.json';

interface SmartPickMapProps {
  offers: Offer[];
  onOfferClick: (offer: Offer) => void;
  onMarkerClick?: (partnerName: string, partnerAddress: string | undefined, offers: Offer[]) => void;
  selectedCategory?: string;
  onCategorySelect?: (category: string) => void;
  highlightedOfferId?: string;
  onLocationChange?: (location: [number, number] | null) => void;
  showUserLocation?: boolean;
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

// Create sticky marker - FIXED for no movement during zoom/pan
function createPulsingMarker(
  _map: maplibregl.Map,
  color: string = '#FF8A00',
  size: number = 48,
  category?: string
): HTMLElement {
  // Container with precise sizing and no transforms
  const markerEl = document.createElement('div');
  markerEl.className = 'smartpick-pulsing-marker';
  markerEl.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    cursor: pointer;
    position: relative;
    margin: 0;
    padding: 0;
    line-height: 0;
  `;
  
  // Image element with no transforms or animations
  const pinImage = document.createElement('img');
  pinImage.className = 'marker-pin-image';
  pinImage.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    display: block;
    margin: 0;
    padding: 0;
    object-fit: contain;
    filter: brightness(1.15) drop-shadow(0 3px 8px rgba(0, 0, 0, 0.75));
    image-rendering: crisp-edges;
    pointer-events: none;
    user-select: none;
  `;
  pinImage.draggable = false;
  
  // Set icon image source if category provided
  if (category) {
    pinImage.src = `/icons/map-pins/${category}.png`;
    pinImage.onerror = () => {
      console.error('Failed to load pin image:', category);
      // Fallback: create simple colored pin if image doesn't load
      pinImage.style.display = 'none';
      const fallback = document.createElement('div');
      fallback.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
        margin: 0;
        padding: 0;
      `;
      markerEl.appendChild(fallback);
    };
  }
  
  markerEl.appendChild(pinImage);
  
  return markerEl;
}

// Create expiring soon marker (mint glow)
function createExpiringMarker(map: maplibregl.Map, category?: string): HTMLElement {
  return createPulsingMarker(map, '#37E5AE', 48, category);
}

const SmartPickMap = memo(({
  offers,
  onMarkerClick,
  selectedCategory,
  onLocationChange,
  showUserLocation = false
}: SmartPickMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [filteredOffers, setFilteredOffers] = useState<Offer[]>([]);
  const [, setUserLocation] = useState<[number, number] | null>(null);

  // Get MapTiler API key from environment
  const mapTilerKey = import.meta.env.VITE_MAPTILER_KEY || import.meta.env.NEXT_PUBLIC_MAPTILER_KEY;

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    try {
      // Check if API key is available
      if (!mapTilerKey) {
        console.warn('MapTiler API key not found. Please add VITE_MAPTILER_KEY to your .env file.');
        logger.error('Map cannot load without MapTiler API key');
        toast.error('Map configuration missing. Please contact support.');
        return;
      }

      // Inject API key into style JSON
      const styleWithKey = JSON.parse(JSON.stringify(smartpickStyle));
      styleWithKey.sprite = `https://api.maptiler.com/maps/streets/sprite?key=${mapTilerKey}`;
      styleWithKey.glyphs = `https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${mapTilerKey}`;
      styleWithKey.sources.openmaptiles.url = `https://api.maptiler.com/tiles/v3/tiles.json?key=${mapTilerKey}`;

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: styleWithKey,
        center: [44.793, 41.72], // Tbilisi center
        zoom: 11.5, // Reduced initial zoom by ~10%
      });

      // Listen to geolocation events for "Near Me" button
      if (showUserLocation) {
        // No controls added - using custom "Near Me" button instead
      }

      mapRef.current = map;

      return () => {
        map.remove();
        mapRef.current = null;
      };
    } catch (error) {
      logger.error('Failed to initialize map:', error);
      toast.error('Failed to load map');
    }
  }, [mapTilerKey, showUserLocation, onLocationChange]);

  // Filter offers based on selected category
  useEffect(() => {
    if (selectedCategory && selectedCategory !== '') {
      const filtered = offers.filter(o => o.category === selectedCategory);
      setFilteredOffers(filtered);
    } else {
      setFilteredOffers(offers);
    }
  }, [offers, selectedCategory]);

  // Group offers by location
  const groupedLocations = useMemo((): GroupedLocation[] => {
    const locationMap: Record<string, GroupedLocation> = {};
    
    filteredOffers.forEach(offer => {
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
  }, [filteredOffers]);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateMarkers = () => {
      console.log('Creating markers for', groupedLocations.length, 'locations');

      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      // Add new markers
      groupedLocations.forEach(location => {
      // Check if any offer is expiring soon (within 2 hours)
      const now = new Date();
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const hasExpiringSoon = location.offers.some((offer: Offer) => {
        const expiresAt = new Date(offer.expires_at);
        return expiresAt <= twoHoursFromNow;
      });

      // Create marker element with category icon
      const markerEl = hasExpiringSoon
        ? createExpiringMarker(map, location.category)
        : createPulsingMarker(map, '#FF8A00', 48, location.category);

      // Create popup content
      const popupContent = document.createElement('div');
      popupContent.className = 'smartpick-popup';
      popupContent.style.cssText = `
        padding: 12px;
        min-width: 200px;
        max-width: 280px;
      `;

      const partnerName = document.createElement('div');
      partnerName.textContent = location.partnerName;
      partnerName.style.cssText = `
        font-weight: 600;
        font-size: 14px;
        color: #1a1a1a;
        margin-bottom: 8px;
      `;
      popupContent.appendChild(partnerName);

      if (location.partnerAddress) {
        const address = document.createElement('div');
        address.textContent = location.partnerAddress;
        address.style.cssText = `
          font-size: 12px;
          color: #666;
          margin-bottom: 8px;
        `;
        popupContent.appendChild(address);
      }

      const offersCount = document.createElement('div');
      offersCount.textContent = `${location.offers.length} offer${location.offers.length > 1 ? 's' : ''} available`;
      offersCount.style.cssText = `
        font-size: 12px;
        color: #FF8A00;
        font-weight: 500;
      `;
      popupContent.appendChild(offersCount);

      // Create popup
      const popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: false,
        offset: 25,
        className: 'smartpick-map-popup'
      }).setDOMContent(popupContent);

      // Create marker with BOTTOM anchor - pins stay perfectly locked
      const marker = new maplibregl.Marker({ 
        element: markerEl,
        anchor: 'bottom', // Bottom center of pin points to exact coordinate
        pitchAlignment: 'viewport', // Keeps pin upright
        rotationAlignment: 'viewport' // No rotation
      })
        .setLngLat([location.lng, location.lat])
        .setPopup(popup)
        .addTo(map);

      // Handle marker click
      markerEl.addEventListener('click', () => {
        if (onMarkerClick) {
          onMarkerClick(location.partnerName, location.partnerAddress, location.offers);
        }
      });

      markersRef.current.push(marker);
      });
    };

    // If map is already loaded, update markers immediately
    if (map.loaded()) {
      updateMarkers();
    } else {
      // Otherwise wait for the map to load
      map.once('load', updateMarkers);
    }

    return () => {
      // Cleanup: remove the load listener if it hasn't fired yet
      map.off('load', updateMarkers);
    };
  }, [groupedLocations, onMarkerClick]);

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

        const map = mapRef.current;
        if (map) {
          map.flyTo({
            center: [position.coords.longitude, position.coords.latitude],
            zoom: 14,
            duration: 1500
          });
        }

        toast.success('Showing offers near you');
      },
      (error) => {
        logger.error('Error getting location:', error);
        toast.error('Could not get your location');
      }
    );
  };

  return (
    <div className="w-full h-full relative">
      {/* Map Container */}
      <div
        ref={mapContainerRef}
        className="w-full h-full rounded-2xl"
        style={{ minHeight: '400px' }}
      />

      {/* Near Me Button */}
      {showUserLocation && (
        <Button
          onClick={handleNearMe}
          className="absolute bottom-4 left-4 bg-[#FF8A00] hover:bg-[#e67a00] text-white rounded-full p-3 shadow-lg z-10"
          size="icon"
        >
          <Navigation className="w-5 h-5" />
        </Button>
      )}

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes smartpick-pulse {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.5;
          }
          100% {
            transform: translate(-50%, -50%) scale(2.5);
            opacity: 0;
          }
        }

        .smartpick-pulsing-marker {
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .smartpick-pulsing-marker:hover {
          transform: scale(1.05);
        }

        .smartpick-pulsing-marker:active {
          transform: scale(0.95);
        }

        .maplibregl-popup-content {
          padding: 0;
          border-radius: 12px;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
          border: 1px solid #e5e7eb;
        }

        .maplibregl-popup-close-button {
          font-size: 20px;
          padding: 8px;
          width: 32px;
          height: 32px;
          color: #6b7280;
          right: 4px;
          top: 4px;
        }

        .maplibregl-popup-close-button:hover {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 50%;
        }

        .maplibregl-ctrl-bottom-right {
          bottom: 60px;
          right: 12px;
        }

        .maplibregl-ctrl-group {
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .maplibregl-ctrl-group button {
          width: 40px;
          height: 40px;
          background: transparent;
        }

        .maplibregl-ctrl-group button:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .maplibregl-ctrl-icon {
          filter: invert(1);
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .maplibregl-ctrl-bottom-right {
            bottom: 80px;
            right: 8px;
          }
          
          .smartpick-popup {
            max-width: 240px !important;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .marker-pulse {
            animation: none !important;
          }
          
          .smartpick-pulsing-marker:hover {
            transform: scale(1.02);
          }
        }

        /* Hide MapTiler attribution watermark */
        .maplibregl-ctrl-attrib {
          display: none !important;
        }

        .maplibregl-ctrl-bottom-left,
        .maplibregl-ctrl-bottom-right {
          display: none !important;
        }

        .maplibregl-compact {
          display: none !important;
        }
      `}</style>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.offers === nextProps.offers &&
    prevProps.selectedCategory === nextProps.selectedCategory &&
    prevProps.highlightedOfferId === nextProps.highlightedOfferId &&
    prevProps.showUserLocation === nextProps.showUserLocation
  );
});

SmartPickMap.displayName = 'SmartPickMap';

export default SmartPickMap;
