import { useEffect, useRef, useState, useMemo, memo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Offer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Navigation } from 'lucide-react';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import lightStyle from '@/map/styles/smartpick-light.maplibre.json';
import { supabase } from '@/lib/supabase';

interface SmartPickMapProps {
  offers: Offer[];
  onOfferClick: (offer: Offer) => void;
  onMarkerClick?: (partnerName: string, partnerAddress: string | undefined, offers: Offer[]) => void;
  selectedCategory?: string;
  onCategorySelect?: (category: string) => void;
  highlightedOfferId?: string;
  onLocationChange?: (location: [number, number] | null) => void;
  userLocation?: [number, number] | null;
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

// Category emoji mapping (same as CategoryBar)
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

// Create marker element with emoji
function createPulsingMarker(
  _map: maplibregl.Map,
  color: string = '#FF8A00',
  category?: string
): HTMLElement {
  const el = document.createElement('div');
  el.className = 'sp-marker';
  
  // Add category attribute for CSS targeting
  if (category) {
    el.setAttribute('data-category', category);
  }
  
  // Use emoji instead of image
  const emoji = category ? CATEGORY_EMOJIS[category] || '📍' : '📍';
  el.textContent = emoji;
  
  return el;
}

// Create expiring soon marker
function createExpiringMarker(map: maplibregl.Map, category?: string): HTMLElement {
  const el = createPulsingMarker(map, '#37E5AE', category);
  el.classList.add('sp-marker--active');
  return el;
}

const SmartPickMap = memo(({
  offers,
  onMarkerClick,
  selectedCategory,
  onLocationChange,
  userLocation: externalUserLocation,
  showUserLocation = false
}: SmartPickMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [filteredOffers, setFilteredOffers] = useState<Offer[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(externalUserLocation || null);
  const [mapTilerKey, setMapTilerKey] = useState<string | null>(null);

  // Sync external userLocation with internal state
  useEffect(() => {
    if (externalUserLocation) {
      setUserLocation(externalUserLocation);
    }
  }, [externalUserLocation]);

  // Fetch MapTiler API key from Supabase
  useEffect(() => {
    const fetchMapConfig = async () => {
      try {
        // Try environment variable first (for local dev and production)
        const envKey = import.meta.env.VITE_MAPTILER_KEY || 
                       import.meta.env.NEXT_PUBLIC_MAPTILER_KEY ||
                       import.meta.env.MAPTILER_KEY;
        if (envKey && envKey !== 'your_maptiler_api_key_here') {
          console.log('✅ Using MapTiler key from environment');
          setMapTilerKey(envKey);
          return;
        }

        console.log('⏳ Fetching MapTiler key from Supabase...');
        // Fetch from Supabase app_config table
        const { data, error } = await supabase
          .from('app_config')
          .select('config_value')
          .eq('config_key', 'maptiler_api_key')
          .single();

        if (error) {
          console.warn('Failed to fetch MapTiler key from Supabase:', error);
          logger.error('Map configuration not found');
          toast.error('Map configuration missing. Please contact support.');
          return;
        }

        if (data?.config_value && data.config_value !== 'your_maptiler_api_key_here') {
          console.log('✅ Using MapTiler key from Supabase');
          setMapTilerKey(data.config_value);
        } else {
          console.error('❌ No valid MapTiler key found');
        }
      } catch (err) {
        console.error('Error fetching map config:', err);
        logger.error('Map configuration error');
      }
    };

    fetchMapConfig();
  }, []);

  // Initialize map (only once)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !mapTilerKey) return;

    try {
      // Always use light style
      const baseStyle = lightStyle;
      
      // Inject API key into style JSON
      const styleWithKey = JSON.parse(JSON.stringify(baseStyle));
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
      
      // Force markers to be added after map loads
      map.once('load', () => {
        console.log('🗺️ Map loaded, ready for markers');
      });

      return () => {
        map.remove();
        mapRef.current = null;
      };
    } catch (error) {
      logger.error('Failed to initialize map:', error);
      toast.error('Failed to load map');
    }
  }, [mapTilerKey, showUserLocation, onLocationChange]);

  // Use offers directly - they are already filtered by parent component
  useEffect(() => {
    console.log('📍 Map received offers:', offers.length);
    console.log('📦 Sample offers:', offers.slice(0, 3).map(o => ({ 
      title: o.title, 
      category: o.category,
      hasLocation: !!(o.partner?.latitude && o.partner?.longitude)
    })));
    setFilteredOffers(offers);
  }, [offers]);

  // Group offers by location
  const groupedLocations = useMemo((): GroupedLocation[] => {
    const locationMap: Record<string, GroupedLocation> = {};
    
    filteredOffers.forEach(offer => {
      if (!offer.partner?.latitude || !offer.partner?.longitude) {
        console.log('⚠️ Offer missing location:', offer.title);
        return;
      }
      
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
    
    const locations = Object.values(locationMap);
    console.log('📍 Grouped locations for markers:', locations.length);
    return locations;
  }, [filteredOffers]);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      console.log('⚠️ Cannot update markers: map not initialized');
      return;
    }

    const updateMarkers = () => {
      console.log('🎯 Updating markers, grouped locations:', groupedLocations.length);
      
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
        : createPulsingMarker(map, '#FF8A00', location.category);

      // Create marker - Fixed positioning with center anchor (no drift)
      const marker = new maplibregl.Marker({ 
        element: markerEl,
        anchor: 'center'
      })
        .setLngLat([location.lng, location.lat])
        .addTo(map);

      // Handle marker click - directly open modal without popup
      markerEl.addEventListener('click', () => {
        if (onMarkerClick) {
          onMarkerClick(location.partnerName, location.partnerAddress, location.offers);
        }
      });

      markersRef.current.push(marker);
      });
      
      console.log('✅ Added', markersRef.current.length, 'markers to map');
    };

    // If map is already loaded, update markers immediately
    if (map.loaded()) {
      console.log('🗺️ Map already loaded, updating markers now');
      updateMarkers();
    } else {
      // Otherwise wait for the map to load
      console.log('⏳ Waiting for map to load before adding markers');
      map.once('load', updateMarkers);
    }
    
    // Re-add markers when style changes (theme switch)
    const handleStyleData = () => {
      if (map.isStyleLoaded()) {
        console.log('🎨 Map style loaded, re-adding markers');
        updateMarkers();
      }
    };
    
    map.on('styledata', handleStyleData);

    return () => {
      // Cleanup: remove listeners
      map.off('load', updateMarkers);
      map.off('styledata', handleStyleData);
    };
  }, [groupedLocations, onMarkerClick]);

  // Show user location marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;

    // Remove existing user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    // Create user location marker element
    const el = document.createElement('div');
    el.className = 'user-location-marker';
    el.style.cssText = `
      width: 20px;
      height: 20px;
      background: #4285F4;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      cursor: pointer;
    `;

    // Add pulsing ring
    const ring = document.createElement('div');
    ring.style.cssText = `
      position: absolute;
      width: 40px;
      height: 40px;
      background: rgba(66, 133, 244, 0.3);
      border-radius: 50%;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      animation: pulse 2s infinite;
    `;
    el.appendChild(ring);

    // Add marker
    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([userLocation[1], userLocation[0]])
      .addTo(map);

    userMarkerRef.current = marker;

    // Center map on user location with appropriate zoom for 4-5km radius
    map.flyTo({
      center: [userLocation[1], userLocation[0]],
      zoom: 13, // This shows approximately 4-5km radius
      duration: 1500
    });

    return () => {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
    };
  }, [userLocation]);

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
        /* Marker styling - NO transforms or animations */
        .sp-marker {
          /* No animation - it breaks MapLibre positioning */
        }

        .sp-marker:hover {
          opacity: 0.9;
          transition: opacity 0.2s ease;
        }

        .sp-marker:active {
          opacity: 0.8;
        }

        /* User location marker pulse animation */
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
