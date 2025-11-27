import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Offer, User } from '@/lib/types';
// Using lightweight API module to defer heavy supabase & full api bundle
import { getActiveOffers, getCurrentUser } from '@/lib/api-lite';
import { isDemoMode, supabase } from '@/lib/supabase';
import { indexedDBManager, STORES } from '@/lib/indexedDB';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import SplashScreen from '@/components/SplashScreen';
import { lazy, Suspense } from 'react';
const AuthDialog = lazy(() => import('@/components/AuthDialog'));
const ReservationModal = lazy(() => import('@/components/ReservationModal'));
import { OfferBottomSheet } from '@/components/OfferBottomSheet';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { DEFAULT_24H_OFFER_DURATION_HOURS } from '@/lib/constants';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { FilterState, SortOption } from '@/components/SearchAndFilters';
const AnnouncementPopup = lazy(() => import('@/components/AnnouncementPopup').then(m => ({ default: m.AnnouncementPopup })));

// New components
import { TopSearchBar } from '@/components/home/TopSearchBar';
import { MapSection } from '@/components/home/MapSection';
import { RestaurantFoodSection } from '@/components/home/RestaurantFoodSection';
import { BottomNavBar } from '@/components/home/BottomNavBar';
import { FilterDrawer } from '@/components/home/FilterDrawer';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import PartnerOffersModal from '@/components/PartnerOffersModal';

export default function Index() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [selectedOfferIndex, setSelectedOfferIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
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

  // Bottom sheet swipe states
  const [sheetHeight, setSheetHeight] = useState(45); // Percentage: 45% = half, 90% = full
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(45);
  const sheetRef = useRef<HTMLDivElement>(null);

  const { addRecentlyViewed } = useRecentlyViewed();
  const [searchParams] = useSearchParams();
  const isOnline = useOnlineStatus();

  async function loadOffers() {
    setIsLoading(true);
    
    try {
      // Try to load from network if online
      if (isOnline) {
        const data = await getActiveOffers();
        setOffers(data);
        
        // Cache offers for offline use
        await indexedDBManager.cacheOffers(data);
        
        logger.info('[Index] Offers loaded and cached', { count: data.length });
      } else {
        // Load from cache when offline
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
      
      // Try to load from cache as fallback
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

    // Listen for sync events from request queue
    const handleReservationSynced = () => {
      loadOffers(); // Refresh offers after sync
      toast.success('✅ Queued reservation synced!');
    };

    window.addEventListener('reservation-synced', handleReservationSynced);

    return () => {
      window.removeEventListener('reservation-synced', handleReservationSynced);
    };
  }, []);

  // Listen for auth changes (login/logout from any component)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        checkUser(); // Update user state when logged in
      } else if (event === 'SIGNED_OUT') {
        setUser(null); // Clear user state when logged out
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Reload offers when coming back online
  useEffect(() => {
    if (isOnline) {
      loadOffers();
    }
  }, [isOnline]);



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

    // Partner status check removed (unused)
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

    if (filters.availableNow) {
      filtered = filtered.filter(offer => offer.quantity_available > 0);
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
    // Find index in filtered offers for navigation
    const index = filteredOffers.findIndex(o => o.id === offer.id);
    setSelectedOffer(offer);
    setSelectedOfferIndex(index >= 0 ? index : 0);
    addRecentlyViewed(offer.id, 'offer');

    if (!user) {
      setShowAuthDialog(true);
    } else {
      setShowBottomSheet(true);
    }
  }, [user, addRecentlyViewed, filteredOffers]);

  const handleReservationSuccess = useCallback(() => {
    loadOffers();
    setShowReservationModal(false);
    setShowBottomSheet(false);
    setSelectedOffer(null);
  }, []);

  const handleBottomSheetIndexChange = useCallback((newIndex: number) => {
    if (newIndex >= 0 && newIndex < filteredOffers.length) {
      setSelectedOfferIndex(newIndex);
      setSelectedOffer(filteredOffers[newIndex]);
      addRecentlyViewed(filteredOffers[newIndex].id, 'offer');
      
      // Update URL with selected offer
      const params = new URLSearchParams(window.location.search);
      params.set('selected', filteredOffers[newIndex].id);
      params.set('index', newIndex.toString());
      window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
    }
  }, [filteredOffers, addRecentlyViewed]);

  const handleMarkerClick = useCallback((partnerName: string, partnerAddress: string | undefined, offers: Offer[]) => {
    setSelectedPartner({ name: partnerName, address: partnerAddress, offers });
    setShowPartnerOffersModal(true);
  }, []);

  return (
    <>
      <SplashScreen />
      <Suspense fallback={null}><AnnouncementPopup /></Suspense>

      <div className="min-h-screen bg-white dark:bg-gray-900 overflow-hidden fixed inset-0 safe-area">
        {/* Map Section - Full Screen Borderless */}
        <div className="absolute inset-0 w-full h-full">
          {isLoading ? (
            <div className="w-full h-full bg-gradient-to-b from-gray-50 to-gray-100 relative">
              {/* Skeleton Map Pins */}
              <div className="absolute inset-0 flex items-center justify-center gap-8">
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse delay-100"></div>
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse delay-200"></div>
                </div>
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse delay-150"></div>
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse delay-300"></div>
                </div>
              </div>
              {/* Loading Cards at Bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-[45%] bg-white dark:bg-gray-800 rounded-t-[24px] shadow-lg p-4 space-y-3">
                <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
                <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse delay-100"></div>
                <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse delay-200"></div>
              </div>
            </div>
          ) : (
            <>
              {/* Full Screen Borderless Map - Base layer (z-10) */}
              <div className="absolute inset-0 w-full h-full z-10">
                <MapSection
                  offers={filteredOffers}
                  onOfferClick={handleOfferClick}
                  onMarkerClick={handleMarkerClick}
                  selectedCategory={selectedCategory}
                  onCategorySelect={setSelectedCategory}
                  onLocationChange={setUserLocation}
                />
              </div>

              {/* Swipeable Bottom Sheet - Restaurant Listings */}
              {filteredOffers.length > 0 && (
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a] rounded-t-[24px] shadow-[0_-8px_32px_rgba(0,0,0,0.6)] overflow-hidden z-20 transition-all duration-300 border-t border-white/5"
                  style={{ 
                    height: `${sheetHeight}%`,
                    maxHeight: 'calc(100% - max(80px, env(safe-area-inset-top) + 80px))',
                    paddingBottom: 'max(16px, env(safe-area-inset-bottom))'
                  }}
                >
                  {/* Drag Handle - Increased height for better touch target */}
                  <div 
                    className="flex justify-center pt-2 pb-2 pointer-events-auto cursor-grab active:cursor-grabbing"
                    onTouchStart={(e) => {
                      dragStartY.current = e.touches[0].clientY;
                      dragStartHeight.current = sheetHeight;
                      setIsDragging(true);
                    }}
                    onTouchMove={(e) => {
                      if (!isDragging) return;
                      
                      const currentY = e.touches[0].clientY;
                      const deltaY = dragStartY.current - currentY;
                      const windowHeight = window.innerHeight;
                      const deltaPercent = (deltaY / windowHeight) * 100;
                      const newHeight = Math.max(45, Math.min(90, dragStartHeight.current + deltaPercent));
                      setSheetHeight(newHeight);
                    }}
                    onTouchEnd={() => {
                      setIsDragging(false);
                      // Snap to nearest position
                      if (sheetHeight > 67) {
                        setSheetHeight(90);
                      } else {
                        setSheetHeight(45);
                      }
                    }}
                  >
                    <div className="w-12 h-1.5 bg-gray-400 dark:bg-white/30 rounded-full shadow-lg" />
                  </div>
                  
                  {/* Scrollable Content */}
                  <div className="h-[calc(100%-28px)] overflow-y-auto pb-4 pointer-events-auto">
                    <RestaurantFoodSection
                      offers={filteredOffers}
                      onOfferClick={handleOfferClick}
                    />
                  </div>
                </div>
              )}

              {/* Empty State */}
              {filteredOffers.length === 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-[45%] bg-white dark:bg-gray-800 rounded-t-[24px] shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-20 flex flex-col items-center justify-center p-8 pointer-events-auto">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No offers match your filters</h3>
                  <p className="text-gray-600 text-center mb-6">Try expanding your search area or adjusting your filters to discover more deals!</p>
                  <button
                    onClick={() => {
                      setFilters({ maxDistance: 10, minPrice: 0, maxPrice: 100 });
                      setSearchQuery('');
                      setSelectedCategory('');
                      setSortBy('newest');
                    }}
                    className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}

              {/* Theme Toggle - Top Left */}
              <div className="absolute top-3 left-3 md:top-4 md:left-4 z-50 pointer-events-auto">
                <ThemeToggle />
              </div>

              {/* Search Bar Overlay - leave space on left and right */}
              <div className="absolute top-3 left-16 right-20 md:left-20 md:right-24 z-50 pointer-events-auto">
                <TopSearchBar 
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onFilterClick={() => setShowFilterDrawer(true)} 
                />
              </div>
            </>
          )}
        </div>

        {/* Bottom Navigation - Fixed at bottom */}
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

        {/* New Bottom Sheet Offer Viewer */}
        {user && filteredOffers.length > 0 && (
          <OfferBottomSheet
            offers={filteredOffers}
            initialIndex={selectedOfferIndex}
            user={user}
            open={showBottomSheet}
            onClose={() => {
              setShowBottomSheet(false);
              setSelectedOffer(null);
            }}
            onIndexChange={handleBottomSheetIndexChange}
            onReserveSuccess={handleReservationSuccess}
          />
        )}

        {/* Old ReservationModal - Disabled in favor of BottomSheet */}
        {/* Keeping for reference, can be removed once BottomSheet is fully tested */}
        {false && (
          <Suspense fallback={null}>
            <ReservationModal
              offer={selectedOffer}
              user={user}
              open={showReservationModal}
              onOpenChange={setShowReservationModal}
              onSuccess={handleReservationSuccess}
            />
          </Suspense>
        )}

        <Suspense fallback={null}>
          <AuthDialog
            open={showAuthDialog}
            onOpenChange={setShowAuthDialog}
            defaultTab={defaultAuthTab}
            onSuccess={() => {
              checkUser();
              if (selectedOffer) {
                setShowBottomSheet(true); // Open bottom sheet instead!
              }
            }}
          />
        </Suspense>
      </div>
    </>
  );
}
