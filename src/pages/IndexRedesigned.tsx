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
import { MegaBottomSheet } from '@/components/discover/MegaBottomSheet';
import { useGoogleMaps } from '@/components/map/GoogleMapProvider';
import SmartPickGoogleMap from '@/components/map/SmartPickGoogleMap';
import ReservationModalNew from '@/components/map/ReservationModalNew';
import NavigationMode from '@/components/map/NavigationMode';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { DEFAULT_24H_OFFER_DURATION_HOURS } from '@/lib/constants';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { FilterState, SortOption } from '@/components/SearchAndFilters';
const AnnouncementPopup = lazy(() => import('@/components/AnnouncementPopup').then(m => ({ default: m.AnnouncementPopup })));

// NEW: Post-Reservation Experience Components
import { ReservationStateManager } from '@/components/reservation/ReservationStateManager';
import { LiveRouteDrawer } from '@/components/reservation/LiveRouteDrawer';
import { ReservationSheet } from '@/components/reservation/ReservationSheet';
import type { Reservation as ReservationSheetData } from '@/components/reservation/ReservationSheet';
import { useLiveGPS } from '@/hooks/useLiveGPS';
import { getReservationById, cancelReservation } from '@/lib/api/reservations';
import { Reservation } from '@/lib/types';

// Premium Dark Design Components
import { TopSearchBarRedesigned } from '@/components/home/TopSearchBarRedesigned';
// import { MapSectionNew } from '@/components/home/MapSectionNew'; // REPLACED by SmartPickGoogleMap
import { VerticalNav } from '@/components/home/VerticalNav';
import { FilterDrawer } from '@/components/home/FilterDrawer';
import { FloatingBottomNav } from '@/components/FloatingBottomNav';

export default function IndexRedesigned() {
  const { isLoaded: googleMapsLoaded, google } = useGoogleMaps();
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
  const [smartPointsBalance, setSmartPointsBalance] = useState<number>(0);
  const [defaultAuthTab, setDefaultAuthTab] = useState<'signin' | 'signup'>('signin');
  
  // NEW: Unified Discover Sheet state
  const [discoverSheetOpen, setDiscoverSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<'discover' | 'carousel' | 'reservation' | 'qr'>('discover');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [highlightedOfferId, setHighlightedOfferId] = useState<string | null>(null);
  const [selectedSort, setSelectedSort] = useState<'recommended' | 'nearest' | 'cheapest' | 'expiring' | 'newest'>('recommended');
  
  // NEW: Google Maps navigation state
  const [showNewReservationModal, setShowNewReservationModal] = useState(false);
  const [reservationQuantity, setReservationQuantity] = useState(1);
  const [navigationMode, setNavigationMode] = useState(false);
  const [activeReservationId, setActiveReservationId] = useState<string | null>(null);
  const mapInstanceRef = useCallback((mapInstance: any) => {
    // Store map instance for NavigationMode
    (window as any).__smartPickMapInstance = mapInstance;
  }, []);

  // NEW: Post-Reservation System State
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null);
  const [isPostResNavigating, setIsPostResNavigating] = useState(false);
  const { googleMap } = useGoogleMaps();
  
  // Enable GPS tracking when navigating
  const { position: gpsPosition } = useLiveGPS({ 
    enabled: isPostResNavigating,
    updateInterval: 3000 
  });

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

  // Load active reservation when user is detected
  useEffect(() => {
    if (user?.id) {
      loadActiveReservation();
      
      // Refresh every 30 seconds to check for status changes
      const interval = setInterval(() => {
        loadActiveReservation();
      }, 30000);
      
      return () => clearInterval(interval);
    } else {
      setActiveReservation(null);
    }
  }, [user]);

  const loadActiveReservation = async () => {
    if (!user?.id) return;
    
    try {
      const { getCustomerReservations } = await import('@/lib/api/reservations');
      const reservations = await getCustomerReservations(user.id);
      
      // Find the first ACTIVE reservation
      const activeRes = reservations.find(r => r.status === 'ACTIVE');
      
      if (activeRes) {
        // Only update if it's a new reservation or status changed
        if (!activeReservation || activeReservation.id !== activeRes.id) {
          setActiveReservation(activeRes);
          logger.log('Active reservation loaded:', activeRes.id);
        }
      } else {
        // Clear if no active reservation found
        if (activeReservation) {
          setActiveReservation(null);
          logger.log('No active reservation found');
        }
      }
    } catch (error) {
      logger.error('Failed to load active reservation:', error);
    }
  };

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
    
    // Fetch balance from user_points table
    if (user?.id) {
      const { data: pointsData, error } = await supabase
        .from('user_points')
        .select('balance')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        logger.warn('Error fetching user points:', error);
        setSmartPointsBalance(0);
      } else {
        setSmartPointsBalance(pointsData?.balance || 0);
      }
    } else {
      setSmartPointsBalance(0);
    }
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

    // Apply search filter first (for partner name filtering)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(offer =>
        offer.title.toLowerCase().includes(query) ||
        offer.partner?.business_name?.toLowerCase().includes(query) ||
        offer.category.toLowerCase().includes(query)
      );
      
      // If searching for a partner, apply category filter to the carousel only
      // The category filter is applied AFTER partner filter so it only filters the partner's offers
      if (selectedCategory && selectedCategory !== '') {
        console.log('🔍 Filtering partner offers by category:', selectedCategory);
        filtered = filtered.filter(o => o.category === selectedCategory);
      }
    } else {
      // If NOT searching for a partner, apply category filter globally (affects map)
      if (selectedCategory && selectedCategory !== '') {
        console.log('🔍 Filtering all offers by category:', selectedCategory);
        console.log('📊 Total offers before category filter:', filtered.length);
        filtered = filtered.filter(o => o.category === selectedCategory);
        console.log('✅ Offers after category filter:', filtered.length);
        console.log('📦 Sample filtered offers:', filtered.slice(0, 3).map(o => ({ title: o.title, category: o.category })));
      }
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

  // Separate filtered offers for the map - don't apply category filter when partner is selected
  const getMapFilteredOffers = (): Offer[] => {
    let filtered = [...offers];

    // If partner search is active, show all pins (don't filter by category)
    if (searchQuery.trim()) {
      return offers;
    }

    // Otherwise, apply category filter to map
    if (selectedCategory && selectedCategory !== '') {
      filtered = filtered.filter(o => o.category === selectedCategory);
    }

    // Apply other filters
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

  const mapFilteredOffers = useMemo(() => getMapFilteredOffers(), [
    offers,
    selectedCategory,
    searchQuery,
    filters.minPrice,
    filters.maxPrice,
    filters.maxDistance,
    filters.availableNow,
    userLocation
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
      setSelectedCategory('');
      setDiscoverSheetOpen(false);
      return;
    }
    
    // Open unified sheet in Partner Mode with partner's offers
    if (partnerOffers.length > 0) {
      const partnerId = partnerOffers[0]?.partner_id;
      if (partnerId) {
        setSelectedPartnerId(partnerId);
        setSheetMode('carousel');
        setDiscoverSheetOpen(true);
        
        // Center map on partner
        if (googleMap && partnerOffers[0]?.partner?.location) {
          googleMap.panTo({
            lat: partnerOffers[0].partner.location.latitude,
            lng: partnerOffers[0].partner.location.longitude,
          });
          googleMap.setZoom(15);
        }
      }
    }
  }, [googleMap]);

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
              {/* Full Screen Map - Google Maps */}
              <div className="absolute inset-0 w-full h-full z-10">
                {googleMapsLoaded ? (
                  <SmartPickGoogleMap
                    offers={mapFilteredOffers}
                    onOfferClick={handleOfferClick}
                    onMarkerClick={handleMarkerClick}
                    selectedCategory={selectedCategory}
                    onCategorySelect={setSelectedCategory}
                    onLocationChange={setUserLocation}
                    userLocation={userLocation}
                    selectedOffer={selectedOffer}
                    showUserLocation={true}
                    highlightedOfferId={highlightedOfferId}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <div className="text-center space-y-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                      <p className="text-gray-600 text-sm">Loading map...</p>
                    </div>
                  </div>
                )}
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

      {/* MEGA BOTTOM SHEET - THE ONLY SHEET */}
      <MegaBottomSheet
        isOpen={discoverSheetOpen}
        mode={sheetMode}
        offers={filteredOffers.map(offer => ({
          ...offer,
          discount_percent: Math.round(
            ((offer.original_price - offer.smart_price) / offer.original_price) * 100
          ),
        }))}
        user={user}
        selectedOfferId={selectedOffer?.id}
        partnerId={selectedPartnerId}
        onClose={() => {
          setDiscoverSheetOpen(false);
          setSelectedPartnerId(null);
          setSheetMode('discover');
        }}
        onModeChange={setSheetMode}
        onOfferSelect={(offerId) => {
          const offer = filteredOffers.find(o => o.id === offerId);
          if (offer) {
            setSelectedOffer(offer);
            setHighlightedOfferId(offerId);
          }
        }}
        onReserve={(offerId, quantity) => {
          const offer = filteredOffers.find(o => o.id === offerId);
          if (offer) {
            setSelectedOffer(offer);
            setReservationQuantity(quantity);
            setShowNewReservationModal(true);
          }
        }}
      />

      {/* NEW: In-page Reservation Modal (replaces separate reservation page) */}
      {selectedOffer && (
        <ReservationModalNew
          offer={selectedOffer}
          user={user}
          open={showNewReservationModal}
          initialQuantity={reservationQuantity}
          onClose={() => setShowNewReservationModal(false)}
          onReservationCreated={async (reservationId) => {
            // Fetch full reservation data
            const reservation = await getReservationById(reservationId);
            if (reservation) {
              setActiveReservation(reservation);
              // Close all sheets and modals - only show FloatingReservationCard
              setShowBottomSheet(false);
              setShowNewReservationModal(false);
              setDiscoverSheetOpen(false);
              setSelectedOffer(null);
              setSheetMode('discover'); // Reset sheet mode
            }
          }}
        />
      )}
      
      {/* NEW: Bottom Sheet Reservation Experience */}
      <ReservationSheet
        reservation={activeReservation ? {
          id: activeReservation.id,
          offerId: activeReservation.offer_id,
          offerTitle: activeReservation.offer?.title || 'Offer',
          partnerName: activeReservation.partner?.business_name || activeReservation.offer?.partner?.business_name || 'Partner',
          imageUrl: activeReservation.offer?.images?.[0] || '/images/Map.jpg',
          pickupPriceGel: activeReservation.offer?.smart_price || 0,
          pointsUsed: activeReservation.smart_points_used || 0,
          quantity: activeReservation.quantity,
          pickupWindowStart: activeReservation.offer?.pickup_start_time || new Date().toISOString(),
          pickupWindowEnd: activeReservation.offer?.pickup_end_time || new Date().toISOString(),
          expiresAt: activeReservation.expires_at,
          distanceMeters: 230,
          durationMinutes: 3,
          qrPayload: activeReservation.qr_code || activeReservation.id,
          addressLine: activeReservation.offer?.pickup_location || 'Location',
          status: 'active',
        } : null}
        isVisible={!!activeReservation}
        onDismiss={() => setActiveReservation(null)}
        onNavigate={(reservation) => {
          const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(reservation.addressLine)}`;
          window.open(url, '_blank');
        }}
        onCancel={async (reservationId) => {
          try {
            await cancelReservation(reservationId);
            setActiveReservation(null);
            toast.success('Reservation cancelled. Your SmartPoints have been refunded.');
          } catch (error) {
            toast.error('Failed to cancel reservation');
            logger.error('Cancel reservation error:', error);
          }
        }}
        onReservationExpired={() => {
          setActiveReservation(null);
          toast.error('⏰ Your reservation has expired.');
        }}
      />
      
      {/* NEW: Live Route Drawing on Map */}
      <LiveRouteDrawer
        map={googleMap}
        reservation={activeReservation}
        userLocation={gpsPosition ? { lat: gpsPosition.lat, lng: gpsPosition.lng } : null}
        isNavigating={isPostResNavigating}
      />
      
      {/* NEW: Navigation Mode - Live GPS tracking with route */}
      {navigationMode && selectedOffer?.partner && userLocation && googleMapsLoaded && (
        <NavigationMode
          mapInstance={(window as any).__smartPickMapInstance}
          destination={{
            lat: selectedOffer.partner.latitude!,
            lng: selectedOffer.partner.longitude!,
            name: selectedOffer.partner.business_name,
          }}
          userLocation={userLocation}
          onStop={() => {
            setNavigationMode(false);
            setActiveReservationId(null);
            setShowBottomSheet(true);
            toast.info('Navigation stopped');
          }}
        />
      )}

      {/* Bottom Navigation - Premium Floating Style */}
      <FloatingBottomNav 
        onSearchClick={() => {
          // Open new discover sheet in discover mode
          if (discoverSheetOpen) {
            setDiscoverSheetOpen(false);
          } else {
            setDiscoverSheetOpen(true);
            setSheetMode('discover');
            setSelectedPartnerId(null);
          }
        }}
      />
    </>
  );
}
