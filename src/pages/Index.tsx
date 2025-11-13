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

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
        {/* NavBar */}
        <NavBar
          user={user}
          isPartner={isPartner}
          onAuthClick={() => setShowAuthDialog(true)}
          onFilterClick={() => setShowFilterDrawer(true)}
          onSignOut={() => {}}
        />

        {/* Category Tabs */}
        <CategoryTabs
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
        />

        {/* Demo Mode Alert */}
        {isDemoMode && (
          <div className="container mx-auto px-4 pt-4">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900 text-sm">
                <strong>Demo Mode:</strong> You're viewing sample data. Configure Supabase for full functionality.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Map Section */}
        <section className="container mx-auto px-4 pt-6">
          {isLoading ? (
            <div className="h-[70vh] md:h-[60vh] bg-slate-800/50 rounded-2xl animate-pulse flex items-center justify-center">
              <p className="text-gray-400">Loading map...</p>
            </div>
          ) : offers.length === 0 ? (
            <div className="h-[70vh] md:h-[60vh] bg-slate-800/50 rounded-2xl flex items-center justify-center">
              <div className="text-center">
                <p className="text-lg text-gray-300">No offers available</p>
                <p className="text-sm text-gray-500 mt-2">Check back later</p>
              </div>
            </div>
          ) : (
            <MapSection
              offers={filteredOffers}
              onOfferClick={handleOfferClick}
              selectedCategory={selectedCategory}
              onCategorySelect={setSelectedCategory}
              onLocationChange={setUserLocation}
            />
          )}
        </section>

        {/* Hot Deals */}
        {!isLoading && filteredOffers.length > 0 && (
          <section className="container mx-auto px-4">
            <HotDeals offers={filteredOffers} onOfferClick={handleOfferClick} />
          </section>
        )}

        {/* All Offers Grid */}
        {!isLoading && filteredOffers.length > 0 && (
          <section className="container mx-auto px-4 py-8">
            <div className="mb-6">
              <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#00C896] via-[#00E6A8] to-[#00FFBB] text-transparent bg-clip-text">
                All Available Offers
              </h2>
              <p className="text-sm md:text-base text-gray-400 mt-1.5 font-medium">
                {filteredOffers.length} offer{filteredOffers.length !== 1 ? 's' : ''} available near you
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredOffers.map((offer) => {
                const pickupTimes = offer.pickup_window?.start && offer.pickup_window?.end
                  ? { start: offer.pickup_window.start, end: offer.pickup_window.end }
                  : { start: offer.pickup_start || '', end: offer.pickup_end || '' };

                const expiry = (offer as any)?.expires_at || (offer as any)?.auto_expire_in || new Date(Date.now() + DEFAULT_24H_OFFER_DURATION_HOURS*60*60*1000).toISOString();
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
                  return diff > 0 && diff < 60 * 60 * 1000;
                };
                const expiringSoon = isExpiringSoon(expiry);
                const formatTime = (dateString: string) => {
                  return new Date(dateString).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                };

                return (
                  <div
                    key={offer.id}
                    className="bg-white rounded-2xl border border-[#E8F9F4] cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-[1.02] overflow-hidden"
                    onClick={() => handleOfferClick(offer)}
                  >
                    {offer.images && offer.images.length > 0 ? (
                      <div className="relative h-40 w-full overflow-hidden">
                        <img
                          src={resolveOfferImageUrl(offer.images[0], offer.category)}
                          alt={offer.title}
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg'; }}
                          className="w-full h-full object-cover"
                        />
                        {expiringSoon && (
                          <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-semibold px-2 py-1 rounded-full animate-pulse shadow-lg">
                            ⏰ Ending Soon!
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-gradient-to-r from-[#00C896] to-[#009B77] text-white text-xs font-semibold px-2 py-1 rounded-full shadow-lg">
                          {offer.category}
                        </div>
                      </div>
                    ) : (
                      <div className="relative h-40 w-full bg-gradient-to-br from-[#F9FFFB] to-[#EFFFF8] flex items-center justify-center">
                        <span className="text-6xl opacity-30">📦</span>
                        {expiringSoon && (
                          <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-semibold px-2 py-1 rounded-full animate-pulse shadow-lg">
                            ⏰ Ending Soon!
                          </div>
                        )}
                      </div>
                    )}

                    <div className="p-4">
                      <div className="space-y-2">
                        <h3 className="font-bold text-base text-gray-900 line-clamp-1">
                          {offer.title}
                        </h3>

                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="w-3 h-3 text-[#00C896]" />
                          <span className="line-clamp-1">{offer.partner?.business_name}</span>
                        </div>

                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold bg-gradient-to-r from-[#00C896] to-[#009B77] text-transparent bg-clip-text">
                            {offer.smart_price} ₾
                          </span>
                          <span className="text-sm text-gray-400 line-through">
                            {offer.original_price} ₾
                          </span>
                        </div>

                        {pickupTimes.start && pickupTimes.end && (
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Clock className="w-3 h-3 text-[#00C896]" />
                            <span>
                              {formatTime(pickupTimes.start)} - {formatTime(pickupTimes.end)}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <span className={`text-xs font-medium ${
                            expiringSoon ? 'text-orange-600' : 'text-[#00C896]'
                          }`}>
                            {getTimeRemaining(expiry)}
                          </span>
                          <div className="text-xs font-medium border border-[#E8F9F4] px-2 py-1 rounded-full">
                            {offer.quantity_available} left
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* FilterDrawer */}
        <FilterDrawer
          open={showFilterDrawer}
          onOpenChange={setShowFilterDrawer}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filters={filters}
          onFiltersChange={setFilters}
          sortBy={sortBy}
          onSortChange={setSortBy}
          showDistanceFilter={userLocation !== null}
        />

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
