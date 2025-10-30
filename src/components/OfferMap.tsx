import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Offer } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Navigation, Maximize2, Minimize2 } from 'lucide-react';
import { subscribeToOffers } from '@/lib/api';
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
const createCustomIcon = (category: string, count: number, isHighlighted: boolean = false) => {
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
};


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
  const [showMap, setShowMap] = useState(window.innerWidth >= 768); // Default to list on mobile
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([41.7151, 44.8271]); // Tbilisi
  const [mapZoom, setMapZoom] = useState(13);
  const mapRef = useRef<L.Map | null>(null);

  // Default center: Tbilisi, Georgia
  const defaultCenter: [number, number] = [41.7151, 44.8271];

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

  // Handle responsive view
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && showMap) {
        setShowMap(false); // Auto-switch to list on mobile
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showMap]);

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
      {/* View Toggle and Controls */}
      <div className="flex flex-wrap gap-2 items-center">
        <Button
          variant={showMap ? 'default' : 'outline'}
          onClick={() => setShowMap(true)}
          className={showMap ? 'bg-mint-600 hover:bg-mint-700' : ''}
        >
          <MapPin className="w-4 h-4 mr-2" />
          Map View
        </Button>
        <Button
          variant={!showMap ? 'default' : 'outline'}
          onClick={() => setShowMap(false)}
          className={!showMap ? 'bg-mint-600 hover:bg-mint-700' : ''}
        >
          List View
        </Button>
        {showMap && (
          <>
            <Button
              variant="outline"
              onClick={handleNearMe}
              className="border-mint-600 text-mint-600 hover:bg-mint-50"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Near Me
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </>
        )}
        <div className="ml-auto text-sm text-gray-600 flex items-center">
          {displayOffers.length} Smart Picks {userLocation ? 'near you' : 'available'}
        </div>
      </div>

      {/* Interactive Map */}
      {showMap && (
        <div className={`w-full ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'h-[60vh] md:h-[500px]'} rounded-lg overflow-hidden border-2 border-gray-200 shadow-lg`}>
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
            ref={mapRef}
          >
            <MapController center={mapCenter} zoom={mapZoom} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* User location marker */}
            {userLocation && (
              <Marker
                position={userLocation}
                icon={L.divIcon({
                  className: 'user-location-marker',
                  html: '<div style="background: #3B82F6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
                  iconSize: [20, 20],
                  iconAnchor: [10, 10],
                })}
              >
                <Popup>Your Location</Popup>
              </Marker>
            )}
            
            {groupedLocations.map((location, index) => {
              const primaryOffer = location.offers[0];
              const isHighlighted = location.offers.some(o => o.id === highlightedOfferId);
              
              return (
                <Marker
                  key={`${location.partnerId}-${index}`}
                  position={[location.lat, location.lng]}
                  icon={createCustomIcon(primaryOffer.category, location.offers.length, isHighlighted)}
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
                              className={`border rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-all ${
                                expired ? 'opacity-40' : expiringSoon ? 'border-orange-400 bg-orange-50' : ''
                              }`}
                              onClick={() => onOfferClick(offer)}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-semibold text-sm flex-1">{offer.title}</h4>
                                <Badge className="ml-2 text-xs" style={{ backgroundColor: CATEGORY_COLORS[offer.category] }}>
                                  {offer.category}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg font-bold text-mint-600">
                                  {offer.smart_price} GEL
                                </span>
                                <span className="text-xs text-gray-400 line-through">
                                  {offer.original_price} GEL
                                </span>
                                <Badge variant="outline" className="text-xs ml-auto">
                                  {offer.quantity_available} left
                                </Badge>
                              </div>
                              
                              {pickupTimes.start && pickupTimes.end && (
                                <div className="text-xs text-gray-600 flex items-center gap-1 mb-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(pickupTimes.start)} - {formatTime(pickupTimes.end)}
                                </div>
                              )}
                              
                              <div className={`text-xs font-medium ${
                                expired ? 'text-gray-500' : expiringSoon ? 'text-orange-600' : 'text-coral-600'
                              }`}>
                                {getTimeRemaining(offer.expires_at)}
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
          
          {/* Map Legend */}
          <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-lg z-[1000]">
            <h4 className="font-semibold text-xs mb-2">Categories</h4>
            <div className="space-y-1">
              {Object.entries(CATEGORY_COLORS).map(([category, color]) => (
                <div key={category} className="flex items-center gap-2 text-xs">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: color }}
                  />
                  <span>{category}</span>
                </div>
              ))}
            </div>
          </div>
          
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

      {/* Offers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayOffers.map((offer) => {
          const pickupTimes = getPickupTimes(offer);
          const expiringSoon = isExpiringSoon(offer.expires_at);
          const expired = isExpired(offer.expires_at);
          
          return (
            <Card
              key={offer.id}
              className={`cursor-pointer hover:shadow-lg transition-all duration-200 ${
                expired ? 'opacity-50' : ''
              } ${expiringSoon ? 'border-2 border-orange-400' : ''}`}
              onClick={() => handleOfferClickFromList(offer)}
            >
              {offer.images && offer.images.length > 0 && (
                <div className="relative h-48 w-full overflow-hidden rounded-t-lg">
                  <img
                    src={offer.images[0]}
                    alt={offer.title}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                  />
                  <Badge 
                    className="absolute top-2 right-2 hover:bg-opacity-90"
                    style={{ backgroundColor: CATEGORY_COLORS[offer.category] }}
                  >
                    {offer.category}
                  </Badge>
                  {expiringSoon && !expired && (
                    <Badge className="absolute top-2 left-2 bg-orange-500 hover:bg-orange-600 animate-pulse">
                      Ending Soon!
                    </Badge>
                  )}
                  {expired && (
                    <Badge className="absolute top-2 left-2 bg-gray-500">
                      Expired
                    </Badge>
                  )}
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-lg">{offer.title}</CardTitle>
                <CardDescription className="flex items-center gap-1 text-sm">
                  <MapPin className="w-3 h-3" />
                  {offer.partner?.business_name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-bold text-mint-600">
                        {offer.smart_price} GEL
                      </span>
                      <span className="text-sm text-gray-400 line-through ml-2">
                        {offer.original_price} GEL
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {offer.quantity_available} left
                    </Badge>
                  </div>
                  {pickupTimes.start && pickupTimes.end && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>
                        {formatTime(pickupTimes.start)} - {formatTime(pickupTimes.end)}
                      </span>
                    </div>
                  )}
                  <div className={`text-xs font-medium ${
                    expired ? 'text-gray-500' : expiringSoon ? 'text-orange-600' : 'text-coral-600'
                  }`}>
                    {getTimeRemaining(offer.expires_at)}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {displayOffers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {userLocation 
              ? 'No Smart Picks available within 5km of your location' 
              : 'No Smart Picks available in this category'}
          </p>
          <p className="text-sm text-gray-400 mt-2">Check back soon for fresh offers!</p>
        </div>
      )}
    </div>
  );
}