import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useSearchParams } from 'react-router-dom';
import { Offer, User } from '@/lib/types';
import { getActiveOffers, getCurrentUser, signOut, getPartnerByUserId } from '@/lib/api';
import { isDemoMode } from '@/lib/supabase';
import { Alert, AlertDescription } from '@/components/ui/alert';
import SplashScreen from '@/components/SplashScreen';
import AuthDialog from '@/components/AuthDialog';
import ReservationModal from '@/components/ReservationModal';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import { DEFAULT_24H_OFFER_DURATION_HOURS } from '@/lib/constants';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { FilterState, SortOption } from '@/components/SearchAndFilters';

// New components
import { NavBar } from '@/components/home/NavBar';
import { CategoryTabs } from '@/components/home/CategoryTabs';
import { FilterDrawer } from '@/components/home/FilterDrawer';
import { HotDeals } from '@/components/home/HotDeals';
import { MapSection } from '@/components/home/MapSection';

// Existing components for offers grid
import { MapPin, Clock } from 'lucide-react';
import { resolveOfferImageUrl } from '@/lib/api';

export default function Index() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isPartner, setIsPartner] = useState<boolean>(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [defaultAuthTab, setDefaultAuthTab] = useState<'signin' | 'signup'>('signin');

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    maxDistance: 50,
    minPrice: 0,
    maxPrice: 500,
  });
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const { addRecentlyViewed } = useRecentlyViewed();
  const [searchParams] = useSearchParams();


  function loadOffers() {
    setIsLoading(true);
    getActiveOffers().then(data => {
      setOffers(data);
    }).catch(error => {
      logger.error('Error loading offers:', error);
      if (!isDemoMode) {
        toast.error('Failed to load offers');
      }
    }).finally(() => {
      setIsLoading(false);
    });
  }

  useEffect(() => {
    loadOffers();
    checkUser();
  }, []);

  // Check for referral code in URL
  useEffect(() => {
    const refParam = searchParams.get('ref');
    if (refParam) {
      setDefaultAuthTab('signup');
      setShowAuthDialog(true);
      toast.success(`🎁 Welcome! Referral code ${refParam.toUpperCase()} is ready to use!`);
    }
  }, [searchParams]);

  const checkUser = async () => {
    const { user } = await getCurrentUser();
    setUser(user);

    if (user) {
      const partner = await getPartnerByUserId(user.id);
      setIsPartner(partner !== null && partner.status === 'APPROVED');
    } else {
      setIsPartner(false);
    }
  };

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Get partner location from offer
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

  // Filter and sort offers
  const getFilteredAndSortedOffers = (): Offer[] => {
    let filtered = [...offers];

    if (selectedCategory && selectedCategory !== '') {
      filtered = filtered.filter(o => o.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(offer =>
        offer.title.toLowerCase().includes(query) ||
        offer.partner?.business_name?.toLowerCase().includes(query) ||
        offer.category.toLowerCase().includes(query)
      );
    }

    filtered = filtered.filter(offer =>
      Number(offer.smart_price) >= filters.minPrice &&
      Number(offer.smart_price) <= filters.maxPrice
    );

    if (userLocation && filters.maxDistance < 50) {
      filtered = filtered.filter(offer => {
        const location = getPartnerLocation(offer);
        if (!location) return false;
        const distance = calculateDistance(
          userLocation[0],
          userLocation[1],
          location.lat,
          location.lng
        );
        return distance <= filters.maxDistance;
      });
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'nearest':
          if (!userLocation) return 0;
          const locA = getPartnerLocation(a);
          const locB = getPartnerLocation(b);
          if (!locA || !locB) return 0;
          const distA = calculateDistance(userLocation[0], userLocation[1], locA.lat, locA.lng);
          const distB = calculateDistance(userLocation[0], userLocation[1], locB.lat, locB.lng);
          return distA - distB;

        case 'cheapest':
          return Number(a.smart_price) - Number(b.smart_price);

        case 'expiring':
          const expiryA = (a as any)?.expires_at || (a as any)?.auto_expire_in || new Date(Date.now() + DEFAULT_24H_OFFER_DURATION_HOURS * 60 * 60 * 1000).toISOString();
          const expiryB = (b as any)?.expires_at || (b as any)?.auto_expire_in || new Date(Date.now() + DEFAULT_24H_OFFER_DURATION_HOURS * 60 * 60 * 1000).toISOString();
          return new Date(expiryA).getTime() - new Date(expiryB).getTime();

        case 'newest':
        default:
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
    });

    return filtered;
  };

  const filteredOffers = useMemo(() => getFilteredAndSortedOffers(), [
    offers,
    selectedCategory,
    searchQuery,
    filters.minPrice,
    filters.maxPrice,
    filters.maxDistance,
    userLocation,
    sortBy
  ]);

  const handleOfferClick = useCallback((offer: Offer) => {
    setSelectedOffer(offer);
    addRecentlyViewed(offer.id, 'offer');

    if (!user) {
      setShowAuthDialog(true);
    } else {
      setShowReservationModal(true);
    }
  }, [user, addRecentlyViewed]);

  const handleReservationSuccess = useCallback(() => {
  loadOffers();
  setShowReservationModal(false);
  setSelectedOffer(null);
  }, []);

  return (
    <>
      <SplashScreen />

      <div className="min-h-screen bg-white">
        {/* Category Tabs at very top - sticky */}
        <CategoryTabs
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
        />

        {/* Map Section with search bar inside */}
        <section className="container mx-auto px-4 pt-4">
          {isLoading ? (
            <div className="h-[70vh] md:h-[60vh] bg-gray-100 rounded-2xl animate-pulse flex items-center justify-center">
              <p className="text-gray-400">Loading...</p>
            </div>
          ) : (
            <MapSection
              offers={filteredOffers}
              onOfferClick={handleOfferClick}
              selectedCategory={selectedCategory}
              onCategorySelect={setSelectedCategory}
              onLocationChange={setUserLocation}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          )}
        </section>

        {/* Point-based Item List - scrollable below map */}
        {!isLoading && filteredOffers.length > 0 && (
          <section className="container mx-auto px-4 py-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Available Offers
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {filteredOffers.length} offer{filteredOffers.length !== 1 ? 's' : ''} near you
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOffers.map((offer) => {
                const getDistanceText = () => {
                  if (!userLocation || !offer.partner) return null;
                  const lat1 = userLocation[0];
                  const lon1 = userLocation[1];
                  const lat2 = offer.partner.latitude || offer.partner.location?.latitude;
                  const lon2 = offer.partner.longitude || offer.partner.location?.longitude;
                  if (lat2 && lon2) {
                    const R = 6371;
                    const dLat = (lat2 - lat1) * Math.PI / 180;
                    const dLon = (lon2 - lon1) * Math.PI / 180;
                    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    return (R * c).toFixed(1);
                  }
                  return null;
                };

                const pickupTime = offer.pickup_start && offer.pickup_end 
                  ? `${new Date(offer.pickup_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(offer.pickup_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                  : '30 min delivery';

                return (
                  <div
                    key={offer.id}
                    className="bg-white rounded-2xl shadow-md hover:shadow-xl cursor-pointer transition-all duration-200 overflow-hidden border border-gray-100"
                    onClick={() => handleOfferClick(offer)}
                  >
                    {/* Image */}
                    <div className="relative h-48 w-full overflow-hidden">
                      <img
                        src={offer.images && offer.images.length > 0 ? resolveOfferImageUrl(offer.images[0], offer.category) : '/placeholder.png'}
                        alt={offer.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg'; }}
                      />
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1">
                        {offer.title}
                      </h3>
                      
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                        <span className="font-bold text-[#00C896] text-2xl">{offer.smart_price} pts</span>
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-500 font-semibold">⭐ 4.8</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {getDistanceText() && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>{getDistanceText()}km</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{pickupTime}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Modals */}
        <ReservationModal
          offer={selectedOffer}
          user={user}
          open={showReservationModal}
          onOpenChange={setShowReservationModal}
          onSuccess={handleReservationSuccess}
        />

        <AuthDialog
          open={showAuthDialog}
          onOpenChange={setShowAuthDialog}
          defaultTab={defaultAuthTab}
          onSuccess={() => {
            checkUser();
            if (selectedOffer) {
              setShowReservationModal(true);
            }
          }}
        />
      </div>
    </>
  );
}
