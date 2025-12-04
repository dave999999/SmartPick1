import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Offer, User } from '@/lib/types';
import { getActiveOffers, getCurrentUser } from '@/lib/api-lite';
import { getActiveOffersInViewport } from '@/lib/api/offers';
import { isDemoMode, supabase } from '@/lib/supabase';
import { indexedDBManager } from '@/lib/indexedDB';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import SplashScreen from '@/components/SplashScreen';
import { lazy, Suspense } from 'react';
const AuthDialog = lazy(() => import('@/components/AuthDialog'));
import { OffersSheetNew } from '@/components/offers/OffersSheetNew';
import { AnimatePresence } from 'framer-motion';
import { useGoogleMaps } from '@/components/map/GoogleMapProvider';
import SmartPickGoogleMap from '@/components/map/SmartPickGoogleMap';
import ReservationModalNew from '@/components/map/ReservationModalNew';
import NavigationMode from '@/components/map/NavigationMode';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { DEFAULT_24H_OFFER_DURATION_HOURS } from '@/lib/constants';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { FilterState, SortOption } from '@/components/SearchAndFilters';
import { CheckCircle } from 'lucide-react';
import PickupSuccessModal from '@/components/PickupSuccessModal';
const AnnouncementPopup = lazy(() => import('@/components/AnnouncementPopup').then(m => ({ default: m.AnnouncementPopup })));

// NEW: Post-Reservation Experience Components
import { LiveRouteDrawer } from '@/components/reservation/LiveRouteDrawer';
import { ActiveReservationCard } from '@/components/reservation/ActiveReservationCard';
import type { ActiveReservation } from '@/components/reservation/ActiveReservationCard';
import { useLiveGPS } from '@/hooks/useLiveGPS';
import { getReservationById, cancelReservation } from '@/lib/api/reservations';
import { Reservation } from '@/lib/types';

// Premium Navigation Components
import { BottomNavPremium as FloatingBottomNav } from '@/components/navigation';
import { SUBCATEGORIES } from '@/lib/categories';

export default function IndexRedesigned() {
  const { isLoaded: googleMapsLoaded, google, googleMap } = useGoogleMaps();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [defaultAuthTab, setDefaultAuthTab] = useState<'signin' | 'signup'>('signin');
  const [mapBounds, setMapBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  
  // NEW: Unified Discover Sheet state
  const [discoverSheetOpen, setDiscoverSheetOpen] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [highlightedOfferId, setHighlightedOfferId] = useState<string | null>(null);
  
  // NEW: Google Maps navigation state
  const [showNewReservationModal, setShowNewReservationModal] = useState(false);
  const [reservationQuantity, setReservationQuantity] = useState(1);
  const [navigationMode, setNavigationMode] = useState(false);
  const [activeReservationId, setActiveReservationId] = useState<string | null>(null);

  // NEW: Post-Reservation System State
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null);
  const [isPostResNavigating, setIsPostResNavigating] = useState(false);
  const [showPickupSuccessModal, setShowPickupSuccessModal] = useState(false);
  const [pickupModalData, setPickupModalData] = useState<{ savedAmount: number; pointsEarned: number } | null>(null);
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
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [currentPath, setCurrentPath] = useState<string>('/');

  const { addRecentlyViewed } = useRecentlyViewed();
  const [searchParams] = useSearchParams();
  const isOnline = useOnlineStatus();

  async function loadOffers() {
    setIsLoading(true);
    
    try {
      if (isOnline) {
        // 🚀 SCALABILITY FIX: Use viewport loading instead of loading ALL offers
        let data: Offer[];
        
        if (mapBounds) {
          // Load only offers in current viewport (100x faster)
          logger.info('[Index] Loading offers in viewport', mapBounds);
          data = await getActiveOffersInViewport(mapBounds, undefined, 200);
          logger.info('[Index] Viewport offers loaded', { count: data.length });
        } else {
          // Fallback: Load all offers (only on initial load before map is ready)
          logger.warn('[Index] Map bounds not available, loading all offers');
          data = await getActiveOffers();
        }
        
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

  // 🚀 SCALABILITY: Reload offers when map bounds change (debounced)
  useEffect(() => {
    if (!mapBounds) return;
    
    // Debounce to avoid too many requests while panning
    const timeoutId = setTimeout(() => {
      logger.info('[Index] Map bounds changed, reloading offers');
      loadOffers();
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [mapBounds]);

  // Load active reservation when user is detected
  useEffect(() => {
    if (user?.id) {
      loadActiveReservation();
      
      // Clean up old celebration keys (older than 24 hours) to prevent localStorage bloat
      const cleanupOldCelebrations = () => {
        const keys = Object.keys(localStorage);
        const celebrationKeys = keys.filter(k => k.startsWith('pickup-celebrated-'));
        logger.log(`🧹 Found ${celebrationKeys.length} celebration keys in localStorage`);
        
        // Keep only the last 5 celebration keys, remove the rest
        if (celebrationKeys.length > 5) {
          const keysToRemove = celebrationKeys.slice(0, celebrationKeys.length - 5);
          keysToRemove.forEach(key => localStorage.removeItem(key));
          logger.log(`🧹 Cleaned up ${keysToRemove.length} old celebration keys`);
        }
      };
      
      cleanupOldCelebrations();
    } else {
      setActiveReservation(null);
    }
  }, [user]);

  // Set up real-time subscription when active reservation exists
  useEffect(() => {
    if (!activeReservation?.id) {
      logger.log('🔌 No active reservation - skipping subscription setup');
      return;
    }

    logger.log('🔗 Setting up real-time subscription for reservation:', activeReservation.id);
    
    let isCleanedUp = false;

    const channel = supabase
      .channel(`reservation-${activeReservation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reservations',
          filter: `id=eq.${activeReservation.id}`
        },
        (payload) => {
          if (isCleanedUp) return; // Ignore events after cleanup
          
          logger.log('🔔 Real-time reservation update received:', payload);
          
          // Check if order was picked up
          if (payload.new && payload.new.status === 'PICKED_UP') {
            logger.log('✅ Order picked up detected via real-time!');
            
            // Check localStorage to prevent duplicate celebrations
            const celebrationKey = `pickup-celebrated-${activeReservation.id}`;
            if (!localStorage.getItem(celebrationKey)) {
              localStorage.setItem(celebrationKey, 'true');
              
              // Calculate actual savings: (original price * quantity) - discounted price
              const originalTotal = (activeReservation.offer?.original_price || 0) * activeReservation.quantity;
              const discountedPrice = activeReservation.total_price || 0;
              const savedAmount = originalTotal - discountedPrice;
              const pointsEarned = Math.floor(savedAmount * 10); // 10 points per GEL
              
              // Show pickup success modal
              setPickupModalData({ savedAmount, pointsEarned });
              setShowPickupSuccessModal(true);
              
              // Clear active reservation
              setActiveReservation(null);
            }
          } else {
            // Reload for other changes (but throttle this)
            if (!isCleanedUp) {
              loadActiveReservation();
            }
          }
        }
      )
      .subscribe((status) => {
        logger.log('📡 Subscription status:', status);
      });

    // Add polling fallback as backup (reduced to every 10 seconds to save battery)
    const pollingInterval = setInterval(() => {
      if (!isCleanedUp) {
        loadActiveReservation();
      }
    }, 10000); // Increased from 5s to 10s to reduce CPU/battery usage

    return () => {
      isCleanedUp = true;
      logger.log('🔌 Cleaning up reservation subscription and polling');
      clearInterval(pollingInterval);
      
      // Remove the channel completely
      channel.unsubscribe().then(() => {
        supabase.removeChannel(channel);
        logger.log('✅ Channel removed from Supabase client');
      });
    };
  }, [activeReservation?.id]);

  const loadActiveReservation = async () => {
    if (!user?.id) return;
    
    try {
      const { getCustomerReservations } = await import('@/lib/api/reservations');
      const reservations = await getCustomerReservations(user.id);
      
      // Check if current active reservation was picked up
      if (activeReservation) {
        const currentRes = reservations.find(r => r.id === activeReservation.id);
        if (currentRes && currentRes.status === 'PICKED_UP') {
          logger.log('✅ Order picked up detected via polling!');
          
          // Check localStorage to prevent duplicate celebrations
          const celebrationKey = `pickup-celebrated-${activeReservation.id}`;
          if (!localStorage.getItem(celebrationKey)) {
            localStorage.setItem(celebrationKey, 'true');
            
            // Calculate actual savings: (original price * quantity) - discounted price
            const originalTotal = (activeReservation.offer?.original_price || 0) * activeReservation.quantity;
            const discountedPrice = activeReservation.total_price || 0;
            const savedAmount = originalTotal - discountedPrice;
            const pointsEarned = Math.floor(savedAmount * 10); // 10 points per GEL
            
            // Show pickup success modal
            setPickupModalData({ savedAmount, pointsEarned });
            setShowPickupSuccessModal(true);
            
            // Clear active reservation
            setActiveReservation(null);
          } else {
            // Just clear if already celebrated
            setActiveReservation(null);
          }
          return;
        }
      }
      
      // Find the first ACTIVE reservation
      const activeRes = reservations.find(r => r.status === 'ACTIVE');
      
      if (activeRes) {
        // Only update if it's a new reservation or status changed
        if (!activeReservation || activeReservation.id !== activeRes.id) {
          setActiveReservation(activeRes);
          logger.log('✅ Active reservation state updated');
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

  // Auto-open OffersSheet after 1.5 seconds - give user time to see homepage first
  // BUT: Don't auto-open if there's an active reservation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!activeReservation) {
        setDiscoverSheetOpen(true);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [activeReservation]); // Only run when activeReservation changes

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
    setSelectedOffer(offer);
    addRecentlyViewed(offer.id, 'offer');

    if (!user) {
      setShowAuthDialog(true);
    }
  }, [user, addRecentlyViewed]);

  const handleMarkerClick = useCallback((partnerName: string, partnerAddress: string | undefined, partnerOffers: Offer[]) => {
    // If empty partner name, clear filters (map clicked on empty area)
    if (!partnerName || partnerOffers.length === 0) {
      setSearchQuery('');
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
                  <>
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
                      hideMarkers={!!activeReservation}
                      onMapBoundsChange={(bounds) => {
                        // 🚀 SCALABILITY: Track map bounds and reload offers when map moves
                        setMapBounds(bounds);
                      }}
                    />
                    {/* Debug: Check if pins are hidden */}
                    {!!activeReservation && console.log('🔵 Map pins HIDDEN - active reservation exists')}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <div className="text-center space-y-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                      <p className="text-gray-600 text-sm">Loading map...</p>
                    </div>
                  </div>
                )}
              </div>

            </>
          )}
        </div>

      </div>

      <Suspense fallback={null}>
        <AuthDialog
          open={showAuthDialog}
          onOpenChange={setShowAuthDialog}
          defaultTab={defaultAuthTab}
          onSuccess={() => {
            checkUser();
          }}
        />
      </Suspense>

      {/* NEW OFFERS SHEET - Pixel-Perfect Redesign */}
      <OffersSheetNew
        isOpen={discoverSheetOpen}
        onClose={() => {
          setDiscoverSheetOpen(false);
          setSelectedPartnerId(null);
        }}
        onOfferSelect={(offer) => {
          setSelectedOffer(offer);
          setHighlightedOfferId(offer.id);
          setShowNewReservationModal(true);
          setDiscoverSheetOpen(false);
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
            logger.log('🎯 onReservationCreated called with ID:', reservationId);
            
            // Close UI immediately for better UX
            setShowNewReservationModal(false);
            setDiscoverSheetOpen(false);
            setSelectedOffer(null);
            
            // Fetch full reservation data (this triggers the modal to appear)
            logger.log('🔄 Fetching reservation data...');
            const reservation = await getReservationById(reservationId);
            logger.log('✅ Reservation fetched:', reservation);
            
            if (reservation) {
              setActiveReservation(reservation);
              logger.log('✅ Active reservation state updated');
            } else {
              logger.error('❌ Failed to fetch reservation');
            }
          }}
        />
      )}
      
      {/* NEW: Active Reservation Card - Modern Design */}
      <AnimatePresence mode="wait">
        {activeReservation && (
          <ActiveReservationCard
            reservation={{
          id: activeReservation.id,
          offerTitle: activeReservation.offer?.title || 'Offer',
          partnerName: activeReservation.partner?.business_name || activeReservation.offer?.partner?.business_name || 'Partner',
          imageUrl: activeReservation.offer?.images?.[0] || '/images/Map.jpg',
          quantity: activeReservation.quantity,
          expiresAt: activeReservation.expires_at,
          pickupWindowStart: activeReservation.offer?.pickup_start_time || new Date().toISOString(),
          pickupWindowEnd: activeReservation.offer?.pickup_end_time || new Date().toISOString(),
          qrPayload: activeReservation.qr_code || activeReservation.id,
          partnerLocation: {
            lat: activeReservation.offer?.partner?.location?.latitude || 
                 activeReservation.offer?.partner?.latitude || 
                 activeReservation.partner?.location?.latitude || 
                 activeReservation.partner?.latitude || 41.7151,
            lng: activeReservation.offer?.partner?.location?.longitude || 
                 activeReservation.offer?.partner?.longitude || 
                 activeReservation.partner?.location?.longitude || 
                 activeReservation.partner?.longitude || 44.8271,
          },
          pickupAddress: activeReservation.offer?.pickup_location || 
                        activeReservation.partner?.address || 
                        activeReservation.offer?.partner?.address || 'Location',
            }}
            userLocation={userLocation ? { lat: userLocation[0], lng: userLocation[1] } : null}
            onNavigate={(reservation) => {
          // Option 1: Open Google Maps in new tab
          const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(reservation.pickupAddress)}`;
          window.open(url, '_blank');
          
          // Option 2: Pan map to partner location (uncomment if preferred)
          // if (googleMap) {
          //   googleMap.panTo(reservation.partnerLocation);
          //   googleMap.setZoom(16);
          // }
          // setIsPostResNavigating(true);
        }}
        onCancel={async (reservationId) => {
          try {
            await cancelReservation(reservationId);
            setActiveReservation(null);
            toast.success('Reservation cancelled');
          } catch (error) {
            toast.error('Failed to cancel reservation');
            logger.error('Cancel reservation error:', error);
          }
        }}
        onExpired={() => {
          setActiveReservation(null);
          toast.error('⏰ Your reservation has expired');
        }}
          />
        )}
      </AnimatePresence>
      
      {/* NEW: Live Route Drawing on Map */}
      <LiveRouteDrawer
        map={googleMap}
        reservation={activeReservation}
        userLocation={userLocation ? { lat: userLocation[0], lng: userLocation[1] } : null}
        isNavigating={!!activeReservation}
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

      {/* Pickup Success Modal with confetti and achievements */}
      {pickupModalData && (
        <PickupSuccessModal
          open={showPickupSuccessModal}
          onClose={() => {
            setShowPickupSuccessModal(false);
            setPickupModalData(null);
          }}
          savedAmount={pickupModalData.savedAmount}
          pointsEarned={pickupModalData.pointsEarned}
        />
      )}

      {/* Bottom Navigation - Premium iOS Glass Style */}
      <FloatingBottomNav 
        onCenterClick={() => {
          // Don't open offers sheet if there's an active reservation
          if (activeReservation) return;
          
          // Open new discover sheet in discover mode
          if (discoverSheetOpen) {
            setDiscoverSheetOpen(false);
          } else {
            setDiscoverSheetOpen(true);
            setSelectedPartnerId(null);
          }
        }}
      />
    </>
  );
}
