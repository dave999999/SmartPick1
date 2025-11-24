import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Offer, User } from '@/lib/types';
import { getActiveOffers, getCurrentUser } from '@/lib/api-lite';
import { isDemoMode, supabase } from '@/lib/supabase';
import { indexedDBManager } from '@/lib/indexedDB';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import SplashScreen from '@/components/SplashScreen';
import { lazy, Suspense } from 'react';
const AuthDialog = lazy(() => import('@/components/AuthDialog'));
const ReservationModal = lazy(() => import('@/components/ReservationModal'));
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { DEFAULT_24H_OFFER_DURATION_HOURS } from '@/lib/constants';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { FilterState, SortOption } from '@/components/SearchAndFilters';
const AnnouncementPopup = lazy(() => import('@/components/AnnouncementPopup').then(m => ({ default: m.AnnouncementPopup })));

// New redesigned components
import { TopSearchBarRedesigned } from '@/components/home/TopSearchBarRedesigned';
import { MapSection } from '@/components/home/MapSection';
import { BottomSheetRedesigned } from '@/components/home/BottomSheetRedesigned';
import { BottomNavBar } from '@/components/home/BottomNavBar';
import { FilterDrawer } from '@/components/home/FilterDrawer';
import PartnerOffersModal from '@/components/PartnerOffersModal';

export default function IndexRedesigned() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [showPartnerOffersModal, setShowPartnerOffersModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<{ name: string; address?: string; offers: Offer[] } | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [defaultAuthTab, setDefaultAuthTab] = useState<'signin' | 'signup'>('signin');

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    maxDistance: 10,
    minPrice: 0,
    maxPrice: 100,
  });
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Bottom sheet states - 3-stage system: 20%, 55%, 90%
  const [sheetHeight, setSheetHeight] = useState(20);

  const { addRecentlyViewed } = useRecentlyViewed();
  const [searchParams] = useSearchParams();
  const isOnline = useOnlineStatus();

  async function loadOffers() {
    setIsLoading(true);
    
    try {
      if (isOnline) {
        const data = await getActiveOffers();
        setOffers(data);
        await indexedDBManager.cacheOffers(data);
        logger.info('[Index] Offers loaded and cached', { count: data.length });
      } else {
        const cachedOffers = await indexedDBManager.getCachedOffers();
        
        if (cachedOffers.length > 0) {
          setOffers(cachedOffers);
          toast.info('📡 Showing cached offers (offline mode)', {
            description: 'Some data may be outdated',
          });
          logger.info('[Index] Loaded cached offers', { count: cachedOffers.length });
        } else {
          toast.error('No cached offers available offline');
          logger.warn('[Index] No cached offers found');
        }
      }
    } catch (error) {
      logger.error('Error loading offers:', error);
      
      try {
        const cachedOffers = await indexedDBManager.getCachedOffers();
        if (cachedOffers.length > 0) {
          setOffers(cachedOffers);
          toast.warning('Loaded cached offers due to network error');
        } else if (!isDemoMode) {
          toast.error('Failed to load offers');
        }
      } catch (cacheError) {
        logger.error('Error loading cached offers:', cacheError);
        if (!isDemoMode) {
          toast.error('Failed to load offers');
        }
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadOffers();
    checkUser();

    const handleReservationSynced = () => {
      loadOffers();
      toast.success('✅ Queued reservation synced!');
    };

    window.addEventListener('reservation-synced', handleReservationSynced);

    return () => {
      window.removeEventListener('reservation-synced', handleReservationSynced);
    };
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        checkUser();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isOnline) {
      loadOffers();
    }
  }, [isOnline]);

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
  };

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

    if (filters.availableNow) {
      filtered = filtered.filter(offer => (offer as any).available_quantity > 0);
    }

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
    filters.availableNow,
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

  const handleMarkerClick = useCallback((partnerName: string, partnerAddress: string | undefined, offers: Offer[]) => {
    setSelectedPartner({ name: partnerName, address: partnerAddress, offers });
    setShowPartnerOffersModal(true);
  }, []);

  return (
    <>
      <SplashScreen />
      <Suspense fallback={null}><AnnouncementPopup /></Suspense>

      <div className="min-h-screen bg-[#0a0a0a] overflow-hidden fixed inset-0 safe-area">
        {/* Map Section - Full Screen */}
        <div className="absolute inset-0 w-full h-full">
          {isLoading ? (
            <div className="w-full h-full bg-gradient-to-b from-[#0a0a0a] to-[#1a1a1a] relative">
              {/* Skeleton Loading */}
              <div className="absolute inset-0 flex items-center justify-center gap-8">
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-slate-800 rounded-full animate-pulse"></div>
                  <div className="w-12 h-12 bg-slate-800 rounded-full animate-pulse delay-100"></div>
                  <div className="w-12 h-12 bg-slate-800 rounded-full animate-pulse delay-200"></div>
                </div>
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-slate-800 rounded-full animate-pulse delay-150"></div>
                  <div className="w-12 h-12 bg-slate-800 rounded-full animate-pulse delay-300"></div>
                </div>
              </div>
              {/* Loading Sheet at Bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] rounded-t-[24px] shadow-lg p-4 space-y-3">
                <div className="h-24 bg-slate-800 rounded-xl animate-pulse"></div>
                <div className="h-24 bg-slate-800 rounded-xl animate-pulse delay-100"></div>
              </div>
            </div>
          ) : (
            <>
              {/* Full Screen Map - Base layer */}
              <div 
                className={`absolute inset-0 w-full h-full z-10 transition-opacity duration-300 ${
                  sheetHeight > 55 ? 'opacity-80' : 'opacity-100'
                }`}
              >
                <MapSection
                  offers={filteredOffers}
                  onOfferClick={handleOfferClick}
                  onMarkerClick={handleMarkerClick}
                  selectedCategory={selectedCategory}
                  onCategorySelect={setSelectedCategory}
                  onLocationChange={setUserLocation}
                />
              </div>

              {/* Redesigned 3-Stage Bottom Sheet */}
              {filteredOffers.length > 0 && (
                <BottomSheetRedesigned
                  offers={filteredOffers}
                  selectedCategory={selectedCategory}
                  onCategorySelect={setSelectedCategory}
                  onOfferClick={handleOfferClick}
                  sheetHeight={sheetHeight}
                  onHeightChange={setSheetHeight}
                  userLocation={userLocation}
                />
              )}

              {/* Empty State */}
              {filteredOffers.length === 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-[45%] bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] rounded-t-[24px] shadow-[0_-4px_20px_rgba(0,0,0,0.3)] z-20 flex flex-col items-center justify-center p-8">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-xl font-bold text-white mb-2">No offers match your filters</h3>
                  <p className="text-gray-400 text-center mb-6">Try expanding your search area or adjusting your filters to discover more deals!</p>
                  <button
                    onClick={() => {
                      setFilters({ maxDistance: 10, minPrice: 0, maxPrice: 100 });
                      setSearchQuery('');
                      setSelectedCategory('');
                      setSortBy('newest');
                    }}
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}

              {/* Redesigned Search Bar Overlay */}
              <div className="absolute top-4 left-4 right-4 z-50">
                <TopSearchBarRedesigned 
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onFilterClick={() => setShowFilterDrawer(true)} 
                />
              </div>
            </>
          )}
        </div>

        {/* Bottom Navigation */}
        <BottomNavBar />

        {/* Filter Drawer */}
        <FilterDrawer
          open={showFilterDrawer}
          onOpenChange={setShowFilterDrawer}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filters={filters}
          onFiltersChange={setFilters}
          sortBy={sortBy}
          onSortChange={setSortBy}
          showDistanceFilter={!!userLocation}
        />

        {/* Modals */}
        <PartnerOffersModal
          partnerName={selectedPartner?.name || ''}
          partnerAddress={selectedPartner?.address}
          offers={selectedPartner?.offers || []}
          open={showPartnerOffersModal}
          onOpenChange={setShowPartnerOffersModal}
          onOfferClick={handleOfferClick}
        />

        <Suspense fallback={null}>
          <ReservationModal
            offer={selectedOffer}
            user={user}
            open={showReservationModal}
            onOpenChange={setShowReservationModal}
            onSuccess={handleReservationSuccess}
          />
        </Suspense>

        <Suspense fallback={null}>
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
        </Suspense>
      </div>
    </>
  );
}
