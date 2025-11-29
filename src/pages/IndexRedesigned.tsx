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
import { OfferBottomSheet } from '@/components/OfferBottomSheet';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { DEFAULT_24H_OFFER_DURATION_HOURS } from '@/lib/constants';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { FilterState, SortOption } from '@/components/SearchAndFilters';
const AnnouncementPopup = lazy(() => import('@/components/AnnouncementPopup').then(m => ({ default: m.AnnouncementPopup })));

// Premium Dark Design Components
import { TopSearchBarRedesigned } from '@/components/home/TopSearchBarRedesigned';
import { MapSectionNew } from '@/components/home/MapSectionNew';
import { VerticalNav } from '@/components/home/VerticalNav';
import { FilterDrawer } from '@/components/home/FilterDrawer';

export default function IndexRedesigned() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [selectedOfferIndex, setSelectedOfferIndex] = useState<number>(0);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
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

    // Get user's current location on app load
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error('Error getting location:', error);
          // Set default location (Tbilisi, Georgia) if location access denied
          setUserLocation([41.7151, 44.8271]);
        }
      );
    } else {
      // Set default location if geolocation not supported
      setUserLocation([41.7151, 44.8271]);
    }

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
      console.log('🔍 Filtering by category:', selectedCategory);
      console.log('📊 Total offers before filter:', filtered.length);
      filtered = filtered.filter(o => o.category === selectedCategory);
      console.log('✅ Offers after filter:', filtered.length);
      console.log('📦 Sample filtered offers:', filtered.slice(0, 3).map(o => ({ title: o.title, category: o.category })));
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
      
      const params = new URLSearchParams(window.location.search);
      params.set('selected', filteredOffers[newIndex].id);
      params.set('index', newIndex.toString());
      window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
    }
  }, [filteredOffers, addRecentlyViewed]);

  const handleMarkerClick = useCallback((partnerName: string, partnerAddress: string | undefined, partnerOffers: Offer[]) => {
    // If empty partner name, clear filters (map clicked on empty area)
    if (!partnerName || partnerOffers.length === 0) {
      setSearchQuery('');
      setShowBottomSheet(false);
      setSelectedOffer(null);
      return;
    }
    
    // Open carousel with partner's offers
    if (partnerOffers.length > 0) {
      // Filter to show only this partner's offers
      setSearchQuery(partnerName);
      
      // Wait for filteredOffers to update, then open bottom sheet with first offer
      setTimeout(() => {
        const firstOfferIndex = offers.findIndex(o => 
          o.partner_id === partnerOffers[0].partner_id
        );
        if (firstOfferIndex >= 0) {
          setSelectedOfferIndex(firstOfferIndex);
          setSelectedOffer(partnerOffers[0]);
          setShowBottomSheet(true);
        }
      }, 100);
    }
  }, [offers]);

  return (
    <>
      <SplashScreen />
      <Suspense fallback={null}><AnnouncementPopup /></Suspense>

      <div className="min-h-screen bg-sp-bg overflow-hidden fixed inset-0 safe-area">
        <div className="absolute inset-0 w-full h-full">
          {isLoading ? (
            <div className="w-full h-full bg-gradient-to-b from-sp-bg to-sp-surface1 relative">
              <div className="absolute inset-0 flex items-center justify-center gap-8">
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-sp-surface2 rounded-full animate-pulse"></div>
                  <div className="w-12 h-12 bg-sp-surface2 rounded-full animate-pulse delay-100"></div>
                  <div className="w-12 h-12 bg-sp-surface2 rounded-full animate-pulse delay-200"></div>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-[28%] bg-sp-surface1 rounded-t-[28px] shadow-lg p-4 space-y-3 border-t border-sp-border-soft">
                <div className="h-24 bg-sp-surface2 rounded-xl animate-pulse"></div>
                <div className="h-24 bg-sp-surface2 rounded-xl animate-pulse delay-100"></div>
              </div>
            </div>
          ) : (
            <>
              {/* Full Screen Map */}
              <div className="absolute inset-0 w-full h-full z-10">
                <MapSectionNew
                  offers={filteredOffers}
                  onOfferClick={handleOfferClick}
                  onMarkerClick={handleMarkerClick}
                  selectedCategory={selectedCategory}
                  onCategorySelect={setSelectedCategory}
                  onLocationChange={setUserLocation}
                  userLocation={userLocation}
                />
              </div>

              {/* Search Bar Overlay */}
              <div className="absolute top-3 left-4 right-16 z-50">
                <TopSearchBarRedesigned 
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onFilterClick={() => setShowFilterDrawer(true)} 
                />
              </div>

              {/* Floating Vertical Navigation */}
              {/* VerticalNav hidden - theme toggle moved to top-left */}
              {false && <VerticalNav />}
            </>
          )}
        </div>

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

        {/* Old ReservationModal - Disabled in favor of BottomSheet */}
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
            selectedCategory={selectedCategory}
            onCategorySelect={setSelectedCategory}
          />
        )}

        <Suspense fallback={null}>
          <AuthDialog
            open={showAuthDialog}
            onOpenChange={setShowAuthDialog}
            defaultTab={defaultAuthTab}
            onSuccess={() => {
              checkUser();
              if (selectedOffer) {
                setShowBottomSheet(true);
              }
            }}
          />
        </Suspense>
      </div>
    </>
  );
}
