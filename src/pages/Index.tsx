import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  const [showBottomNav, setShowBottomNav] = useState(false);

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
  const navigate = useNavigate();


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

  // Scroll detection for bottom nav
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 300;
      setShowBottomNav(scrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-gray-50">
        {/* Category Tabs at very top - sticky */}
        <CategoryTabs
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
        />

        {/* Map Section - Full Width */}
        <section className="w-full relative z-0">
          {isLoading ? (
            <div className="h-[70vh] md:h-[60vh] bg-gradient-to-br from-orange-100 to-orange-50 animate-pulse flex items-center justify-center">
              <p className="text-orange-600 font-medium">Loading delicious offers...</p>
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

        {/* Point-based Item List - Starts immediately after map */}
        {!isLoading && filteredOffers.length > 0 && (
          <section className="bg-white relative z-30 pb-24">
            {/* Content with padding */}
            <div className="px-4 pt-4">

            {/* Category Pills */}
            <div className="flex gap-3 overflow-x-auto pb-4 mb-4 scrollbar-hide">
              <button className="px-4 py-2 bg-gray-100 rounded-full text-sm font-medium whitespace-nowrap">
                Food Item
              </button>
              <button className="px-4 py-2 bg-gray-100 rounded-full text-sm font-medium whitespace-nowrap">
                Drink Item
              </button>
              <button className="px-5 py-2 bg-yellow-400 rounded-full text-sm font-bold whitespace-nowrap">
                Dessert Item
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                    className="bg-white rounded-2xl shadow-md overflow-hidden cursor-pointer"
                    onClick={() => handleOfferClick(offer)}
                  >
                    {/* Image with Heart Icon */}
                    <div className="relative h-32 w-full overflow-hidden">
                      <img
                        src={offer.images && offer.images.length > 0 ? resolveOfferImageUrl(offer.images[0], offer.category) : '/placeholder.png'}
                        alt={offer.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg'; }}
                      />
                      {/* Heart Icon */}
                      <button className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-3">
                      <h3 className="font-bold text-sm text-gray-900 mb-1 line-clamp-1">
                        {offer.title}
                      </h3>
                      
                      {/* Price and Rating */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-baseline gap-1">
                          <span className="font-bold text-base text-gray-900">${offer.smart_price}</span>
                          <span className="text-xs text-gray-400 line-through">${offer.original_price}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <span className="text-yellow-500 text-sm">★</span>
                          <span className="text-xs font-semibold text-gray-900">4.8</span>
                        </div>
                      </div>

                      {/* Distance and Time */}
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {getDistanceText() && (
                          <span>{getDistanceText()}km</span>
                        )}
                        <span>{pickupTime}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          </section>
        )}

        {/* Bottom Navigation Menu - Shows on scroll */}
        <div className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-around z-50 shadow-lg transition-transform duration-300 ${showBottomNav ? 'translate-y-0' : 'translate-y-full'}`}>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
            <span className="text-xs font-medium text-gray-900">Home</span>
          </button>
          <button onClick={() => navigate('/my-picks')} className="flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
            <span className="text-xs font-medium text-gray-900">My Picks</span>
          </button>
          <button onClick={() => navigate('/favorites')} className="flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span className="text-xs font-medium text-gray-900">Favorite</span>
          </button>
          <button onClick={() => navigate('/profile')} className="flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
            <span className="text-xs font-medium text-gray-900">Profile</span>
          </button>
        </div>

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
