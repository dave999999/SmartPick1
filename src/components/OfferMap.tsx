import { useState, useEffect, useRef, memo, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Offer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Navigation, Minimize2 } from 'lucide-react';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

// Fix Leaflet default marker icon issue
const DefaultIcon = L.Icon.Default.prototype as L.Icon & { _getIconUrl?: () => string };
delete DefaultIcon._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Create custom marker icon using emoji for each category
/* const createCustomIcon = (category: string, count: number, isHighlighted: boolean = false) => {
  const emojis: Record<string, string> = {
    BAKERY: "🥐",
    RESTAURANT: "🍕",
    CAFE: "☕",
    GROCERY: "🛒",
  };

  const emoji = emojis[category] || "📍"; // fallback emoji
  const scale = isHighlighted ? 1.2 : 1;
  const shadow = isHighlighted ? '0 4px 12px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.3)';
  const background = isHighlighted ? '#2CB97A' : '#ffffff'; // mint green when highlighted
  const textColor = isHighlighted ? '#ffffff' : '#2CB97A';

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: ${40 * scale}px;
        height: ${40 * scale}px;
        border-radius: 50%;
        background: ${background};
        border: 3px solid white;
        box-shadow: ${shadow};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${22 * scale}px;
        color: ${textColor};
        transition: all 0.3s ease;
        transform: translateY(-4px);
        position: relative;
      ">
        ${emoji}
        ${count > 1 ? `
          <div style="
            position: absolute;
            top: -6px;
            right: -6px;
            background-color: #EF4444;
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: bold;
            border: 2px solid white;
          ">${count}</div>
        ` : ''}
      </div>
    `,
    iconSize: [40 * scale, 40 * scale],
    iconAnchor: [20 * scale, 40 * scale],
    popupAnchor: [0, -40 * scale],
  });
}; */


interface OfferMapProps {
  offers: Offer[];
  onOfferClick: (offer: Offer) => void;
  onMarkerClick?: (partnerName: string, partnerAddress: string | undefined, offers: Offer[]) => void;
  selectedCategory?: string;
  onCategorySelect?: (category: string) => void;
  highlightedOfferId?: string;
  onLocationChange?: (location: [number, number] | null) => void;
  // Scope user location feature (marker + circle + auto-watch) to callers that opt-in
  showUserLocation?: boolean;
}

interface GroupedLocation {
  lat: number;
  lng: number;
  partnerId: string;
  partnerName: string;
  offers: Offer[];
  category: string;
}

// Component to handle map centering
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  
  return null;
}

const OfferMap = memo(({ offers, onOfferClick, onMarkerClick, selectedCategory, highlightedOfferId, onLocationChange, showUserLocation = false }: OfferMapProps) => {
  const [filteredOffers, setFilteredOffers] = useState<Offer[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([41.7151, 44.8271]); // Tbilisi
  const [mapZoom, setMapZoom] = useState(13);
  // userAccuracy retained in watch for potential future use (e.g., dynamic radius) but not required now
  // Remove state to eliminate unused variable warning until needed.
  // const [userAccuracy, setUserAccuracy] = useState<number | null>(null);
  const USER_RADIUS_METERS = 3000; // Fixed 3km visibility radius
  const mapRef = useRef<L.Map | null>(null);
  // Ensure we only auto-fit to user radius once on load/permission grant
  const hasFittedToUserRef = useRef(false);
  // View preferences: show a bit more context around the radius
  const FIT_PADDING_PX: [number, number] = [72, 72];
  const FIT_MAX_ZOOM = 11; // 2x closer than zoom 10

  // Map theme configuration for easier future switching.
  // Current: CARTO Dark Matter (close to provided reference).
  // To try MapTiler Dark (needs key): `https://api.maptiler.com/maps/dark/{z}/{x}/{y}.png?key=YOUR_KEY`
  // To try Stadia Alidade Dark: `https://tiles.stadiamaps.com/tiles/alidade_dark/{z}/{x}/{y}{r}.png`
  // If you obtain a Mapbox style & token using MapLibre, migrate to vector for pixel‑perfect colors.
  const MAP_THEME = {
    // Dark muted style - matching food delivery app aesthetic
    // Base: CARTO Dark Matter with custom CSS filters for muted military/tactical look
    // Colors: dark gray-green background, subtle roads, minimal labels
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  } as const;

  // Create category-specific teardrop pin icons using optimized images
  const makeCategoryIcon = (
    category: string,
    _count: number, // count intentionally unused (badge hidden per request)
    isHighlighted: boolean = false
  ) => {
    const size = isHighlighted ? 60 : 50; // Smaller partner icons
    const height = size * 1.3;

    // Map category to image filename - Updated for 12-category system
    const imageMap: Record<string, string> = {
      RESTAURANT: 'restaurant.png',
      FAST_FOOD: 'fast-food.png',
      BAKERY: 'bakery.png',
      DESSERTS_SWEETS: 'dessert.png',
      CAFE: 'cafe.png',
      DRINKS_JUICE: 'juice.png',
      GROCERY: 'grocery.png',
      MINI_MARKET: 'minimarket.png',
      MEAT_BUTCHER: 'meat.png',
      FISH_SEAFOOD: 'fish.png',
      ALCOHOL: 'alcohol.png',
      GEORGIAN_TRADITIONAL: 'georgian.png',
    };

    const imagePath = `/images/pins/${imageMap[category] || 'restaurant.png'}`;

    return L.divIcon({
      className: 'smartpick-marker',
      html: `
        <div style="position: relative; width: ${size}px; height: ${height}px;">
          <img 
            src="${imagePath}" 
            alt="${category} pin"
            style="
              width: 100%;
              height: 100%;
              object-fit: contain;
              filter: drop-shadow(0 4px 12px rgba(0,0,0,0.55));
            "
            onerror="this.style.display='none'"
          />
        </div>
      `,
      iconSize: [size, height],
      iconAnchor: [size / 2, height],
      popupAnchor: [0, -height],
    });
  };

  // Removed realtime subscription due to security vulnerability
  // (was leaking all partner offers globally without filtering)
  // Map now relies on parent component's refresh logic or polling



  // Invalidate size shortly after mount to fix mobile render
  useEffect(() => {
    const t = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 300);
    return () => clearTimeout(t);
  }, []);

  // Invalidate on container resize (handles responsive height changes)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const el = map.getContainer();
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      try { map.invalidateSize(); } catch { /* noop */ }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Update filtered offers when offers or selectedCategory changes
  useEffect(() => {
    logger.log('Offers received:', offers.length);
    logger.log('Selected category:', selectedCategory);
    
    if (selectedCategory && selectedCategory !== '') {
      const filtered = offers.filter(o => o.category === selectedCategory);
      logger.log('Filtered offers:', filtered.length);
      setFilteredOffers(filtered);
    } else {
      setFilteredOffers(offers);
    }
  }, [offers, selectedCategory]);

  // Keep map visible on mobile; no forced list switch
  useEffect(() => {
    // No-op: previously forced list on small screens
  }, []);

  // Automatically watch user location & update marker. On first fix, fit map to show full 3km radius.
  useEffect(() => {
    if (!showUserLocation) return;
    if (!('geolocation' in navigator)) {
      logger.warn('Geolocation not supported');
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(loc);
        // On first successful location, fit the map so the entire 3km circle is visible
        try {
          const map = mapRef.current;
          if (map && !hasFittedToUserRef.current) {
            const bounds = L.circle(loc, { radius: USER_RADIUS_METERS }).getBounds();
            map.fitBounds(bounds, { padding: FIT_PADDING_PX, maxZoom: FIT_MAX_ZOOM });
            // Sync state to current map view to keep MapController in agreement
            setMapCenter([map.getCenter().lat, map.getCenter().lng]);
            setMapZoom(map.getZoom());
            hasFittedToUserRef.current = true;
          }
        } catch (e) {
          // Fallback: center on user with a reasonable zoom if fitBounds fails
          setMapCenter(loc);
          setMapZoom(FIT_MAX_ZOOM);
        }
        onLocationChange?.(loc);
      },
      (err) => {
        logger.warn('Geolocation watch error', err);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [onLocationChange, showUserLocation]);

  // Helper function to get partner location
  const getPartnerLocation = (offer: Offer) => {
    if (offer.partner?.location?.latitude && offer.partner?.location?.longitude) {
      return {
        lat: offer.partner.location.latitude,
        lng: offer.partner.location.longitude,
      };
    }
    if (offer.partner?.latitude && offer.partner?.longitude) {
      return {
        lat: offer.partner.latitude,
        lng: offer.partner.longitude,
      };
    }
    return null;
  };

  // Group offers by partner location - memoized to prevent recalculation
  const groupedLocations = useMemo((): GroupedLocation[] => {
    const locationMap = new Map<string, GroupedLocation>();

    console.log('🔍 Grouping offers by location, total filtered offers:', filteredOffers.length);

    filteredOffers.forEach(offer => {
      const location = getPartnerLocation(offer);
      if (!location) {
        console.warn('⚠️ Offer missing location:', offer.id, offer.title);
        return;
      }
      if (!offer.partner) {
        console.warn('⚠️ Offer missing partner:', offer.id, offer.title);
        return;
      }

      const key = `${location.lat},${location.lng}`;

      if (locationMap.has(key)) {
        locationMap.get(key)!.offers.push(offer);
      } else {
        console.log('✅ Creating marker at:', location.lat, location.lng, 'for', offer.partner.business_name);
        locationMap.set(key, {
          lat: location.lat,
          lng: location.lng,
          partnerId: offer.partner_id,
          partnerName: offer.partner.business_name,
          offers: [offer],
        });
      }
    });

    const result = Array.from(locationMap.values());
    console.log('📍 Total grouped locations (markers):', result.length);
    return result;
  }, [filteredOffers]);

  // Get user's current location
  const handleNearMe = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos: [number, number] = [
            position.coords.latitude,
            position.coords.longitude,
          ];
          setUserLocation(userPos);
          try {
            const map = mapRef.current;
            if (map) {
              const bounds = L.circle(userPos, { radius: USER_RADIUS_METERS }).getBounds();
              map.fitBounds(bounds, { padding: FIT_PADDING_PX, maxZoom: FIT_MAX_ZOOM });
              setMapCenter([map.getCenter().lat, map.getCenter().lng]);
              setMapZoom(map.getZoom());
            } else {
              setMapCenter(userPos);
              setMapZoom(FIT_MAX_ZOOM);
            }
          } catch {
            setMapCenter(userPos);
            setMapZoom(FIT_MAX_ZOOM);
          }
          onLocationChange?.(userPos);
          toast.success('Showing offers near you');
        },
        (error) => {
          logger.error('Error getting location:', error);
          toast.error('Could not get your location');
        }
      );
    } else {
      toast.error('Geolocation is not supported by your browser');
    }
  };

  // Debug logging
  console.log('🗺️ OfferMap Debug:', {
    totalOffers: offers.length,
    filteredOffers: filteredOffers.length,
    groupedLocations: groupedLocations.length,
    groupedData: groupedLocations.map(loc => ({
      partner: loc.partnerName,
      lat: loc.lat,
      lng: loc.lng,
      offerCount: loc.offers.length
    }))
  });

  return (
    <div className="w-full">
      {/* Clean map without header */}
      {/* Interactive Map - Borderless Fullscreen */}
      <div className="absolute inset-0 w-full h-full m-0 p-0 border-none">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            className="w-full h-full"
            style={{ height: '100%', width: '100%', margin: 0, padding: 0, border: 'none' }}
            scrollWheelZoom={true}
            zoomControl={false}
            doubleClickZoom={false}
            whenReady={() => {
              try {
                const map = mapRef.current;
                if (map) {
                  requestAnimationFrame(() => {
                    try { map.invalidateSize(); } catch { /* noop */ }
                  });
                  setTimeout(() => {
                    if (mapRef.current) {
                      try { mapRef.current.invalidateSize(); } catch { /* noop */ }
                    }
                  }, 300);
                }
              } catch (err) {
                logger.error('Map whenReady handler failed:', err);
              }
            }}
            ref={mapRef}
          >
            <MapController center={mapCenter} zoom={mapZoom} />
            <TileLayer
              attribution={MAP_THEME.attribution}
              url={MAP_THEME.url}
              subdomains="abcd"
              maxZoom={20}
              className="custom-dark-map-tiles"
            />
            
            {/* User location marker - Custom pin with pulse animation */}
            {showUserLocation && userLocation && (
              <Marker
                position={userLocation}
                icon={L.divIcon({
                  className: 'user-location-marker',
                  html: `
                    <div class="user-marker-wrapper">
                      <div class="user-pulse-ring"></div>
                      <div class="user-pulse-ring" style="animation-delay: 0.6s;"></div>
                      <img src="/images/pins/user-pin.png" alt="Your location" class="user-marker-pin" />
                    </div>`,
                  iconSize: [1, 1],
                  iconAnchor: [0, 0],
                })}
              />
            )}
            
            {groupedLocations.map((location, index) => {
              const primaryOffer = location.offers[0];
              const isHighlighted = location.offers.some(o => o.id === highlightedOfferId);
              
              return (
                <Marker
                  key={`${location.partnerId}-${index}`}
                  position={[location.lat, location.lng]}
                  icon={makeCategoryIcon(primaryOffer.category, location.offers.length, isHighlighted)}
                  eventHandlers={{
                    click: (e) => {
                      console.log('🎯 Marker clicked:', location.partnerName);

                      // Prevent event from bubbling to map
                      if (e.originalEvent) {
                        L.DomEvent.stopPropagation(e.originalEvent);
                        L.DomEvent.preventDefault(e.originalEvent);
                      }

                      // If onMarkerClick is provided, show partner offers modal
                      // Otherwise, directly open reservation for first offer
                      if (onMarkerClick) {
                        onMarkerClick(location.partnerName, primaryOffer.partner?.address, location.offers);
                      } else {
                        onOfferClick(primaryOffer);
                      }
                    },
                  }}
                >
                </Marker>
              );
            })}
          </MapContainer>

          {/* No legend/chips per design request */}

          {/* Floating Near Me button - Smaller glossy dark style */}
          {!isFullscreen && (
            <button
              onClick={handleNearMe}
              className="absolute bottom-4 right-4 z-[1000] min-w-[44px] min-h-[44px] bg-black/70 backdrop-blur-md hover:bg-black/80 rounded-full shadow-xl hover:shadow-2xl active:scale-95 transition-all duration-200 flex items-center justify-center border border-white/10"
              aria-label="Near Me"
            >
              <Navigation className="w-4 h-4 text-orange-500" strokeWidth={2.5} />
            </button>
          )}

          {isFullscreen && (
            <Button
              variant="outline"
              size="icon"
              className="absolute top-4 left-4 z-[1000] bg-white"
              onClick={() => setIsFullscreen(false)}
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
          )}
        </div>

      {/* Offers Grid - Moved to RecentOffersSlider component */}

      {/* Global marker and popup styles */}
      <style>{`
        /* Map fade-in animation */
        .leaflet-container {
          transition: opacity 0.8s ease-in-out;
          background:#f5f5f6; /* Light neutral while tiles load */
        }
        .leaflet-tile {
          /* Subtle contrast for crisp roads; no heavy darkening */
          filter: contrast(1.04) saturate(0.55);
        }

        .smartpick-marker {
          cursor: pointer !important;
        }

        .smartpick-marker .marker-container {
          transform-origin: center bottom;
          animation: marker-appear 0.3s ease-out;
        }

        @keyframes marker-appear {
          from {
            transform: scale(0) translateY(10px);
            opacity: 0;
          }
          to {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }

        /* User location pulse */
        @keyframes userPulse {
          0% { transform: scale(0.4); opacity: 0.6; }
          60% { transform: scale(1.8); opacity: 0; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        .user-marker-wrapper {
          position: relative;
          width: 30px; height: 30px;
        }
        .user-marker-core {
          position: absolute; inset: 0;
          border-radius: 50%;
          background: linear-gradient(135deg,#00D8A0,#00AA80);
          border: 3px solid #fff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        }
        .user-marker-core::after {
          content: '';
          position: absolute; left:50%; top:50%; transform:translate(-50%,-50%);
          width: 10px; height: 10px; border-radius:50%; background:#ffffff;
        }
        .user-pulse-ring {
          position: absolute; inset:0; border-radius:50%;
          background: rgba(0,200,150,0.35);
          animation: userPulse 3s ease-out infinite;
          pointer-events:none;
        }

        .smartpick-marker:hover .marker-circle {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0, 200, 150, 0.3);
        }

        .smartpick-marker:active .marker-circle {
          transform: scale(0.95);
        }

        /* Ensure map markers are clickable and above listings overlay */
        .leaflet-marker-pane {
          z-index: 1000 !important;
        }

        .leaflet-marker-icon {
          pointer-events: auto !important;
          cursor: pointer !important;
        }

        .leaflet-popup-pane {
          pointer-events: auto !important;
          z-index: 2000 !important;
        }

        .leaflet-shadow-pane {
          z-index: 999 !important;
        }

        /* Ensure map base layers stay below */
        .leaflet-tile-pane,
        .leaflet-overlay-pane {
          z-index: 1 !important;
        }

        /* Compact Mobile-Friendly Popup Styles */
        .leaflet-popup-content-wrapper {
          padding: 0 !important;
          border-radius: 12px !important;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12) !important;
          overflow: hidden !important;
            background: #ffffff !important;
          border: 1px solid #e5e7eb !important;
        }

        .leaflet-popup-content {
          margin: 0 !important;
          width: 240px !important;
          max-width: 90vw !important;
          color: #374151 !important;
          font-weight: 500;
        }

        .leaflet-popup-close-button {
          color: #6b7280 !important;
          font-size: 20px !important;
          padding: 8px !important;
          width: 32px !important;
          height: 32px !important;
          top: 4px !important;
          right: 4px !important;
          z-index: 10 !important;
          background: rgba(0, 0, 0, 0.05) !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .leaflet-popup-close-button:hover {
          background: rgba(0,0,0,0.10) !important;
        }

        .leaflet-popup-tip-container {
          display: none !important;
        }

        /* Scrollbar styling for offer list */
        .leaflet-popup-content ::-webkit-scrollbar {
          width: 4px;
        }

        .leaflet-popup-content ::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 2px;
        }

        .leaflet-popup-content ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 2px;
        }

        .leaflet-popup-content ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        /* Hide scrollbar for category pills */
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        @media (prefers-reduced-motion: reduce) {
          .smartpick-marker .marker-container {
            animation: none;
          }
          .smartpick-marker:hover .marker-circle {
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if offers array reference changes
  return prevProps.offers === nextProps.offers &&
    prevProps.selectedCategory === nextProps.selectedCategory &&
    prevProps.highlightedOfferId === nextProps.highlightedOfferId &&
    prevProps.showUserLocation === nextProps.showUserLocation;
});

export default OfferMap;

