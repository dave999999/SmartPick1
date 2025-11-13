import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Offer } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Navigation, Maximize2, Minimize2 } from 'lucide-react';
import { subscribeToOffers, resolveOfferImageUrl } from '@/lib/api';
import { logger } from '@/lib/logger';
import { DEFAULT_24H_OFFER_DURATION_HOURS } from '@/lib/constants';
import FavoriteButton from '@/components/FavoriteButton';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';

// Fix Leaflet default marker icon issue
const DefaultIcon = L.Icon.Default.prototype as L.Icon & { _getIconUrl?: () => string };
delete DefaultIcon._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Category colors for markers
const CATEGORY_COLORS: Record<string, string> = {
  BAKERY: '#F59E0B',
  RESTAURANT: '#EF4444',
  CAFE: '#8B5CF6',
  GROCERY: '#10B981',
};

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
  selectedCategory?: string;
  onCategorySelect?: (category: string) => void;
  highlightedOfferId?: string;
  onLocationChange?: (location: [number, number] | null) => void;
}

interface GroupedLocation {
  lat: number;
  lng: number;
  partnerId: string;
  partnerName: string;
  offers: Offer[];
}

// Component to handle map centering
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  
  return null;
}

export default function OfferMap({ offers, onOfferClick, selectedCategory, onCategorySelect, highlightedOfferId, onLocationChange }: OfferMapProps) {
  const { t } = useI18n();
  const [filteredOffers, setFilteredOffers] = useState<Offer[]>([]);
  // Always show map, including on mobile
  const [showMap, setShowMap] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([41.7151, 44.8271]); // Tbilisi
  const [mapZoom, setMapZoom] = useState(13);
  const mapRef = useRef<L.Map | null>(null);
  const [listReady, setListReady] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Categories - Unique SmartPick style with brand colors
  const categories = [
    { value: '', emoji: '🌍', labelKey: 'category.All', bgColor: 'bg-gradient-to-br from-[#00C896] to-[#009B77]' },
    { value: 'BAKERY', emoji: '🥐', labelKey: 'category.BAKERY', bgColor: 'bg-gradient-to-br from-orange-400 to-orange-600' },
    { value: 'CAFE', emoji: '☕', labelKey: 'category.CAFE', bgColor: 'bg-gradient-to-br from-amber-600 to-amber-800' },
    { value: 'RESTAURANT', emoji: '🍽️', labelKey: 'category.RESTAURANT', bgColor: 'bg-gradient-to-br from-red-500 to-pink-600' },
    { value: 'FAST_FOOD', emoji: '🍔', labelKey: 'category.FAST_FOOD', bgColor: 'bg-gradient-to-br from-yellow-400 to-orange-500' },
    { value: 'ALCOHOL', emoji: '🍷', labelKey: 'category.ALCOHOL', bgColor: 'bg-gradient-to-br from-purple-500 to-purple-700' },
    { value: 'GROCERY', emoji: '🛒', labelKey: 'category.GROCERY', bgColor: 'bg-gradient-to-br from-blue-500 to-blue-700' },
  ];

  // Default center: Tbilisi, Georgia
  const defaultCenter: [number, number] = [41.7151, 44.8271];

  // Use light pink/beige map style like in reference
  const tileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  // Create orange teardrop pin with fork/knife icon (exactly like reference)
  const makeCategoryIcon = (
    category: string,
    count: number,
    isHighlighted: boolean = false
  ) => {
    const size = isHighlighted ? 50 : 44;
    const bgColor = '#FF6B5A'; // Coral orange from screenshot
    const shadow = '0 6px 20px rgba(255, 107, 90, 0.4)';

    return L.divIcon({
      className: 'smartpick-marker',
      html: `
        <div class="marker-container" style="
          position: relative;
          width: ${size}px;
          height: ${size + 14}px;
          filter: drop-shadow(${shadow});
        ">
          <svg width="${size}" height="${size + 14}" viewBox="0 0 44 58" xmlns="http://www.w3.org/2000/svg">
            <!-- Teardrop shape -->
            <path d="M22 0C13.163 0 6 7.163 6 16c0 9.837 16 42 16 42s16-32.163 16-42c0-8.837-7.163-16-16-16z"
              fill="${bgColor}" stroke="none"/>
            
            <!-- White circle background -->
            <circle cx="22" cy="16" r="12" fill="white" />
            
            <!-- Fork and Knife icon -->
            <g transform="translate(22, 16)">
              <!-- Fork (left side) -->
              <g transform="translate(-4, 0)">
                <line x1="0" y1="-5" x2="0" y2="5" stroke="#1F2937" stroke-width="1.2" stroke-linecap="round"/>
                <line x1="-2" y1="-5" x2="-2" y2="1" stroke="#1F2937" stroke-width="1.2" stroke-linecap="round"/>
                <line x1="2" y1="-5" x2="2" y2="1" stroke="#1F2937" stroke-width="1.2" stroke-linecap="round"/>
              </g>
              
              <!-- Knife (right side) -->
              <g transform="translate(4, 0)">
                <line x1="0" y1="-5" x2="0" y2="5" stroke="#1F2937" stroke-width="1.2" stroke-linecap="round"/>
                <path d="M-2,-4 L2,-5 L0,-3 Z" fill="#1F2937"/>
              </g>
            </g>
          </svg>
        </div>
      `,
      iconSize: [size, size + 14],
      iconAnchor: [size / 2, size + 14],
      popupAnchor: [0, -(size + 14)],
    });
  };

  // Set up realtime subscription
  useEffect(() => {
    const subscription = subscribeToOffers((payload) => {
      logger.log('Realtime offer update:', payload);
      // Trigger a refresh by updating the offers state in parent
      toast.info('Offers updated in real-time');
    });

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, []);

  // Invalidate size shortly after mount to fix mobile render
  useEffect(() => {
    const t = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 300);
    return () => clearTimeout(t);
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

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeRemaining = (expiresAt?: string) => {
    const now = new Date();
    const target = expiresAt || new Date(Date.now() + DEFAULT_24H_OFFER_DURATION_HOURS * 60 * 60 * 1000).toISOString();
    const expires = new Date(target);
    const diff = expires.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (diff <= 0) return 'Expired';
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const isExpiringSoon = (expiresAt?: string) => {
    const target = expiresAt || new Date(Date.now() + DEFAULT_24H_OFFER_DURATION_HOURS * 60 * 60 * 1000).toISOString();
    const diff = new Date(target).getTime() - new Date().getTime();
    return diff > 0 && diff < 60 * 60 * 1000; // Less than 1 hour
  };

  const isExpired = (expiresAt?: string) => {
    const target = expiresAt || new Date(Date.now() + DEFAULT_24H_OFFER_DURATION_HOURS * 60 * 60 * 1000).toISOString();
    return new Date(target).getTime() <= new Date().getTime();
  };

  // Unified expiry getter: prefer DB field, fallback to auto field, then default +12h
  const getOfferExpiry = (offer: Offer): string => {
    return (
      (offer as any)?.expires_at ||
      (offer as any)?.auto_expire_in ||
      new Date(Date.now() + DEFAULT_24H_OFFER_DURATION_HOURS * 60 * 60 * 1000).toISOString()
    );
  };

  // Helper function to get pickup times from offer
  const getPickupTimes = (offer: Offer) => {
    if (offer.pickup_window?.start && offer.pickup_window?.end) {
      return {
        start: offer.pickup_window.start,
        end: offer.pickup_window.end,
      };
    }
    return {
      start: offer.pickup_start || '',
      end: offer.pickup_end || '',
    };
  };

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

  // Group offers by partner location
  const groupOffersByLocation = (): GroupedLocation[] => {
    const locationMap = new Map<string, GroupedLocation>();
    
    filteredOffers.forEach(offer => {
      const location = getPartnerLocation(offer);
      if (!location || !offer.partner) return;
      
      const key = `${location.lat},${location.lng}`;
      
      if (locationMap.has(key)) {
        locationMap.get(key)!.offers.push(offer);
      } else {
        locationMap.set(key, {
          lat: location.lat,
          lng: location.lng,
          partnerId: offer.partner_id,
          partnerName: offer.partner.business_name,
          offers: [offer],
        });
      }
    });
    
    return Array.from(locationMap.values());
  };

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
          setMapCenter(userPos);
          setMapZoom(14);
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

  // Filter offers within 5km of user location
  const getOffersNearUser = () => {
    if (!userLocation) return filteredOffers;

    return filteredOffers.filter(offer => {
      const location = getPartnerLocation(offer);
      if (!location) return false;

      // Calculate distance using Haversine formula
      const R = 6371; // Earth's radius in km
      const dLat = (location.lat - userLocation[0]) * Math.PI / 180;
      const dLon = (location.lng - userLocation[1]) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(userLocation[0] * Math.PI / 180) *
        Math.cos(location.lat * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      return distance <= 5; // Within 5km
    });
  };

  const displayOffers = userLocation ? getOffersNearUser() : filteredOffers;
  const groupedLocations = groupOffersByLocation();

  // Handle offer click from list to highlight on map
  const handleOfferClickFromList = (offer: Offer) => {
    const location = getPartnerLocation(offer);
    if (location && showMap) {
      setMapCenter([location.lat, location.lng]);
      setMapZoom(16);
    }
    onOfferClick(offer);
  };

  return (
    <div className="w-full">{/* Clean map without header */}

      {/* Interactive Map - Borderless Fullscreen */}
      {showMap && (
        <div className="absolute inset-0 w-full h-full m-0 p-0 border-none">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            className="w-full h-full"
            style={{ height: '100%', width: '100%', margin: 0, padding: 0, border: 'none' }}
            scrollWheelZoom={true}
            zoomControl={false}
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
                setListReady(true);
                setTimeout(() => setMapLoaded(true), 200);
              } catch (err) {
                logger.error('Map whenReady handler failed:', err);
              }
            }}
            ref={mapRef}
          >
            <MapController center={mapCenter} zoom={mapZoom} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url={tileUrl}
              subdomains="abcd"
              maxZoom={20}
            />
            
            {/* User location marker */}
            {userLocation && (
              <Marker
                position={userLocation}
                icon={L.divIcon({
                  className: 'user-location-marker',
                  html: '<div style="background: linear-gradient(135deg, #00C896 0%, #009B77 100%); width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 3px 12px rgba(0, 200, 150, 0.4);"></div>',
                  iconSize: [24, 24],
                  iconAnchor: [12, 12],
                })}
              >
                <Popup>📍 Your Location</Popup>
              </Marker>
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
                      e.target.openPopup();
                    },
                    mouseover: (e) => {
                      e.target.openPopup();
                    },
                  }}
                >
                  <Popup
                    maxWidth={260}
                    minWidth={240}
                    closeButton={true}
                    className="compact-popup"
                    autoPan={true}
                  >
                    <div className="w-full">
                      {/* Restaurant Header - Compact */}
                      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-4 py-3 -mx-2 -mt-2 mb-3 rounded-t-lg">
                        <h3 className="font-bold text-base mb-0.5 leading-tight">
                          {location.partnerName}
                        </h3>
                        <p className="text-xs text-gray-300">
                          {location.offers.length} offer{location.offers.length > 1 ? 's' : ''} available
                        </p>
                      </div>

                      {/* Compact Offer Cards */}
                      <div className="space-y-2 max-h-[280px] overflow-y-auto px-1">
                        {location.offers.slice(0, 5).map((offer) => {
                          const pickupTimes = getPickupTimes(offer);
                          const expiry = getOfferExpiry(offer);
                          const expiringSoon = isExpiringSoon(expiry);
                          const expired = isExpired(expiry);

                          return (
                            <div
                              key={offer.id}
                              className={`bg-white border border-gray-200 rounded-xl p-2.5 hover:shadow-md cursor-pointer transition-all ${
                                expired ? 'opacity-50' : ''
                              }`}
                              onClick={() => {
                                onOfferClick(offer);
                              }}
                            >
                              <div className="flex gap-2.5">
                                {/* Compact Image */}
                                {offer.images && offer.images[0] && (
                                  <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                                    <img
                                      src={resolveOfferImageUrl(offer.images[0], offer.category)}
                                      alt={offer.title}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}

                                {/* Compact Info */}
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-sm text-gray-900 line-clamp-1 mb-1">
                                    {offer.title}
                                  </h4>

                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-base font-bold text-[#FF6B5A]">
                                      ${offer.smart_price}
                                    </span>
                                    {offer.original_price > offer.smart_price && (
                                      <span className="text-xs text-gray-400 line-through">
                                        ${offer.original_price}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-gray-500 font-medium">
                                      {offer.quantity_available} left
                                    </span>
                                    {pickupTimes.start && (
                                      <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                                        <Clock className="w-2.5 h-2.5" />
                                        {formatTime(pickupTimes.start)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* View All Button - If more than 5 offers */}
                      {location.offers.length > 5 && (
                        <button
                          type="button"
                          className="w-full mt-3 text-center text-xs font-semibold text-gray-600 hover:text-gray-900 py-2 border-t border-gray-100 transition"
                          onClick={() => {
                            const detail = { partnerId: location.partnerId, partnerName: location.partnerName };
                            window.dispatchEvent(new CustomEvent('smartpick:viewPartnerOffers', { detail }));
                          }}
                        >
                          View all {location.offers.length} offers →
                        </button>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* No legend/chips per design request */}

          {/* Floating Near Me button - Always visible */}
          {!isFullscreen && (
            <Button
              variant="default"
              className="absolute bottom-6 right-6 z-[1000] bg-gradient-to-r from-[#00C896] to-[#009B77] hover:from-[#00B588] hover:to-[#008866] text-white px-6 py-3 rounded-full shadow-2xl hover:shadow-[0_8px_30px_rgba(0,200,150,0.4)] active:scale-95 transition-all duration-300 font-semibold flex items-center gap-2"
              onClick={handleNearMe}
            >
              <Navigation className="w-5 h-5" />
              <span>Near Me</span>
            </Button>
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
      )}

      {/* Offers Grid - Moved to RecentOffersSlider component */}

      {/* Global marker and popup styles */}
      <style>{`
        /* Map fade-in animation */
        .leaflet-container {
          transition: opacity 0.8s ease-in-out;
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
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15) !important;
          overflow: hidden !important;
        }

        .leaflet-popup-content {
          margin: 0 !important;
          width: 240px !important;
          max-width: 90vw !important;
        }

        .leaflet-popup-close-button {
          color: white !important;
          font-size: 20px !important;
          padding: 8px !important;
          width: 32px !important;
          height: 32px !important;
          top: 4px !important;
          right: 4px !important;
          z-index: 10 !important;
          background: rgba(0, 0, 0, 0.2) !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .leaflet-popup-close-button:hover {
          background: rgba(0, 0, 0, 0.3) !important;
        }

        .leaflet-popup-tip-container {
          display: none !important;
        }

        /* Scrollbar styling for offer list */
        .leaflet-popup-content ::-webkit-scrollbar {
          width: 4px;
        }

        .leaflet-popup-content ::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 2px;
        }

        .leaflet-popup-content ::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 2px;
        }

        .leaflet-popup-content ::-webkit-scrollbar-thumb:hover {
          background: #555;
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
}

