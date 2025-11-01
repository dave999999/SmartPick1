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
import { toast } from 'sonner';

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
  highlightedOfferId?: string;
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

export default function OfferMap({ offers, onOfferClick, selectedCategory, highlightedOfferId }: OfferMapProps) {
  const [filteredOffers, setFilteredOffers] = useState<Offer[]>([]);
  // Always show map, including on mobile
  const [showMap, setShowMap] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([41.7151, 44.8271]); // Tbilisi
  const [mapZoom, setMapZoom] = useState(13);
  const mapRef = useRef<L.Map | null>(null);
  const [listReady, setListReady] = useState(false);
  const [tilesLoaded, setTilesLoaded] = useState(false);

  // Detect preferred color scheme for tile selection
  const prefersDark = typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  const tileUrl = prefersDark
    ? 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png'
    : 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png';

  // Default center: Tbilisi, Georgia
  const defaultCenter: [number, number] = [41.7151, 44.8271];

  // Create category icon using clear, optimized SVG icons
  const makeCategoryIcon = (
    category: string,
    count: number,
    isHighlighted: boolean = false
  ) => {
    const categoryIcons: Record<string, string> = {
      BAKERY: 'croissant.svg',
      RESTAURANT: 'plate-fork-knife.svg',
      CAFE: 'coffee-cup.svg',
      GROCERY: 'shopping-basket.svg',
      ALCOHOL: 'wine-glass.svg',
      FAST_FOOD: 'burger.svg',
    };

    const iconFile = categoryIcons[category] || 'plate-fork-knife.svg';
    const size = isHighlighted ? 44 : 36;
    const bgColor = isHighlighted ? '#00C896' : '#FFFFFF';
    const borderColor = isHighlighted ? '#FFFFFF' : '#00C896';
    const shadow = isHighlighted
      ? '0 6px 16px rgba(0, 200, 150, 0.5), 0 2px 4px rgba(0,0,0,0.1)'
      : '0 3px 8px rgba(0, 0, 0, 0.2), 0 1px 3px rgba(0,0,0,0.1)';

    return L.divIcon({
      className: 'smartpick-marker',
      html: `
        <div class="marker-container" style="
          position: relative;
          width: ${size}px;
          height: ${size}px;
          filter: drop-shadow(${shadow});
        ">
          <div class="marker-circle" style="
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background: ${bgColor};
            border: 2.5px solid ${borderColor};
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          ">
            <img
              src="/icons/categories/${iconFile}"
              style="
                width: ${size - 12}px;
                height: ${size - 12}px;
                object-fit: contain;
                ${isHighlighted ? 'filter: brightness(0) invert(1);' : ''}
              "
              alt="${category}"
            />
          </div>
          ${count > 1 ? `
            <div class="marker-badge" style="
              position: absolute;
              top: -6px;
              right: -6px;
              min-width: 22px;
              height: 22px;
              padding: 0 6px;
              background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
              color: white;
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 11px;
              font-weight: 700;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              border: 2px solid white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            ">${count}</div>
          ` : ''}
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size],
      popupAnchor: [0, -size],
    });
  };

  // Set up realtime subscription
  useEffect(() => {
    const subscription = subscribeToOffers((payload) => {
      console.log('Realtime offer update:', payload);
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
    console.log('Offers received:', offers.length);
    console.log('Selected category:', selectedCategory);
    
    if (selectedCategory && selectedCategory !== '') {
      const filtered = offers.filter(o => o.category === selectedCategory);
      console.log('Filtered offers:', filtered.length);
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

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diff <= 0) return 'Expired';
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const isExpiringSoon = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - new Date().getTime();
    return diff > 0 && diff < 60 * 60 * 1000; // Less than 1 hour
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt).getTime() <= new Date().getTime();
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
          toast.success('Showing offers near you');
        },
        (error) => {
          console.error('Error getting location:', error);
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
    <div className="w-full space-y-6">
      {/* Near Me Control - Prominent and Floating */}
      <div className="flex flex-wrap gap-3 items-center justify-between px-4 md:px-6 py-4">
        <Button
          variant="default"
          onClick={handleNearMe}
          className="bg-gradient-to-r from-[#00C896] to-[#009B77] hover:from-[#00B588] hover:to-[#008866] text-white rounded-full shadow-md hover:shadow-lg transition-all duration-300 px-6 py-3 font-semibold"
        >
          <Navigation className="w-4 h-4 mr-2" />
          📍 Near Me
        </Button>
        <div className="text-sm md:text-base text-[#6E7A78] font-medium flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-[#00C896] to-[#009B77] text-white font-bold text-sm shadow-sm">
            {displayOffers.length}
          </span>
          <span className="hidden sm:inline">Smart Picks {userLocation ? 'near you' : 'available'}</span>
          <span className="sm:hidden">{displayOffers.length} picks</span>
        </div>
      </div>

      {/* Interactive Map - Reduced height for slider below */}
      {showMap && (
        <div
          id="map"
          className={`relative w-full ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'h-[60vh] md:h-[70vh] min-h-[400px]'} rounded-t-2xl overflow-hidden border border-[#E8F9F4] shadow-lg`}
          style={{ opacity: tilesLoaded ? 1 : 0, transition: 'opacity 0.8s ease-in-out' }}
        >
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            className="w-full h-full"
            style={{ height: '100%', width: '100%', minHeight: '420px' }}
            scrollWheelZoom={true}
            whenReady={(e) => {
              mapRef.current = (e as unknown as { target: L.Map }).target;
              mapRef.current.invalidateSize();
              setTimeout(() => mapRef.current && mapRef.current.invalidateSize(), 300);
              setListReady(true);
            }}
            ref={mapRef}
          >
            <MapController center={mapCenter} zoom={mapZoom} />
            <TileLayer
              url={tileUrl}
              maxZoom={19}
              attribution='&copy; OpenStreetMap &copy; Stadia Maps'
              eventHandlers={{ load: () => setTilesLoaded(true) }}
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
                    mouseover: (e) => {
                      e.target.openPopup();
                    },
                  }}
                >
                  <Popup maxWidth={400} maxHeight={400}>
                    <div className="p-2 max-h-[350px] overflow-y-auto">
                      <h3 className="font-bold text-lg mb-2 sticky top-0 bg-white pb-2 border-b">
                        {location.partnerName}
                      </h3>
                      <p className="text-xs text-gray-500 mb-3">
                        {location.offers.length} offer{location.offers.length > 1 ? 's' : ''} available
                      </p>
                      
                      <div className="space-y-3">
                        {location.offers.map((offer) => {
                          const pickupTimes = getPickupTimes(offer);
                          const expiringSoon = isExpiringSoon(offer.expires_at);
                          const expired = isExpired(offer.expires_at);
                          
                          return (
                            <div
                              key={offer.id}
                              className={`relative border rounded-lg p-3 hover:shadow-lg cursor-pointer transition-all overflow-hidden ${
                                expired ? 'opacity-40' : expiringSoon ? 'border-orange-400' : ''
                              }`}
                              onClick={() => onOfferClick(offer)}
                            >
                              {/* Background Image with 60% opacity */}
                              {offer.images && offer.images[0] && (
                                <>
                                  <div
                                    className="absolute inset-0 bg-cover bg-center"
                                    style={{
                                      backgroundImage: `url(${resolveOfferImageUrl(offer.images[0], offer.category)})`,
                                      opacity: 0.6,
                                    }}
                                  />
                                  {/* White overlay for text readability */}
                                  <div className="absolute inset-0 bg-white/40" />
                                </>
                              )}

                              {/* Content with relative positioning to appear above background */}
                              <div className="relative z-10">
                                <div className="flex items-start justify-between mb-2">
                                  <h4 className="font-bold text-sm flex-1 text-gray-900 drop-shadow">{offer.title}</h4>
                                  <Badge className="ml-2 text-xs shadow-sm" style={{ backgroundColor: CATEGORY_COLORS[offer.category] }}>
                                    {offer.category}
                                  </Badge>
                                </div>

                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-lg font-bold text-[#00C896] drop-shadow">
                                    {offer.smart_price} GEL
                                  </span>
                                  <span className="text-xs text-gray-600 line-through font-semibold">
                                    {offer.original_price} GEL
                                  </span>
                                  <Badge variant="outline" className="text-xs ml-auto bg-white/80 border-gray-400 font-semibold">
                                    {offer.quantity_available} left
                                  </Badge>
                                </div>

                                {pickupTimes.start && pickupTimes.end && (
                                  <div className="text-xs text-gray-700 font-medium flex items-center gap-1 mb-1 drop-shadow-sm">
                                    <Clock className="w-3 h-3" />
                                    {formatTime(pickupTimes.start)} - {formatTime(pickupTimes.end)}
                                  </div>
                                )}

                                <div className={`text-xs font-bold drop-shadow ${
                                  expired ? 'text-gray-700' : expiringSoon ? 'text-orange-600' : 'text-coral-600'
                                }`}>
                                  {getTimeRemaining(offer.expires_at)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
          
          {/* Map Legend removed per request */}
          
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

      {/* Global marker styles */}
      <style>{`
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
