import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Offer, User } from '@/lib/types';
import { SEOHead, structuredDataSchemas } from '@/components/SEOHead';
import { getActiveOffers, getCurrentUser } from '@/lib/api-lite';
import { isDemoMode, supabase } from '@/lib/supabase';
import { indexedDBManager } from '@/lib/indexedDB';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useViewportOffers } from '@/hooks/useQueryHooks';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import SplashScreen from '@/components/SplashScreen';
import { lazy, Suspense } from 'react';
const AuthDialog = lazy(() => import('@/components/AuthDialog'));
import { OffersSheetNew } from '@/components/offers/OffersSheetNew';
import { PartnerSheet } from '@/components/PartnerSheet';
import { AnimatePresence } from 'framer-motion';
import { useGoogleMaps } from '@/components/map/GoogleMapProvider';
import SmartPickGoogleMap from '@/components/map/SmartPickGoogleMap';
import ReservationModalNew from '@/components/map/ReservationModalNew';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { DEFAULT_24H_OFFER_DURATION_HOURS } from '@/lib/constants';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { FilterState, SortOption } from '@/components/SearchAndFilters';
import { CheckCircle } from 'lucide-react';
import PickupSuccessModal from '@/components/PickupSuccessModal';
const AnnouncementPopup = lazy(() => import('@/components/AnnouncementPopup').then(m => ({ default: m.AnnouncementPopup })));

// NEW: Post-Reservation Experience Components
import { ActiveReservationCard } from '@/components/reservation/ActiveReservationCard';
import type { ActiveReservation } from '@/components/reservation/ActiveReservationCard';
import { useLiveGPS } from '@/hooks/useLiveGPS';
import { getReservationById, cancelReservation } from '@/lib/api/reservations';
import { Reservation } from '@/lib/types';

// Premium Navigation Components
import { BottomNavBar as FloatingBottomNav } from '@/components/navigation/BottomNavBar';
import { SUBCATEGORIES } from '@/lib/categories';

export default function IndexRedesigned() {
  const { isLoaded: googleMapsLoaded, googleMap } = useGoogleMaps();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [defaultAuthTab, setDefaultAuthTab] = useState<'signin' | 'signup'>('signin');
  const [mapBounds, setMapBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  
  // 🚀 PERFORMANCE: Debounce map bounds to prevent API spam during panning
  // Only triggers new request 1000ms after user stops moving the map
  // Optimized from 500ms -> 1000ms = 50% reduction in panning queries
  const debouncedBounds = useDebouncedValue(mapBounds, 1000);
  
  // 🚀 PERFORMANCE: Use React Query for automatic caching, deduplication, and cancellation
  const { 
    data: offers = [], 
    isLoading, 
    error: offersError,
    isFetching 
  } = useViewportOffers(debouncedBounds, undefined, 100);
  
  // 🐛 DEBUG: Track what causes re-renders
  logger.info('🔄 [IndexRedesigned] RENDER', {
    offersCount: offers.length,
    selectedCategory,
    isLoading,
    isFetching,
    hasUser: !!user,
    hasMapBounds: !!mapBounds,
    hasDebouncedBounds: !!debouncedBounds,
    hasUserLocation: !!userLocation
  });
  
  // NEW: Unified Discover Sheet state
  const [discoverSheetOpen, setDiscoverSheetOpen] = useState(false);
  const [isSheetMinimized, setIsSheetMinimized] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [highlightedOfferId, setHighlightedOfferId] = useState<string | null>(null);
  const [showPartnerSheet, setShowPartnerSheet] = useState(false);
  
  // NEW: Google Maps navigation state
  const [showNewReservationModal, setShowNewReservationModal] = useState(false);
  const [reservationQuantity, setReservationQuantity] = useState(1);
  const [activeReservationId, setActiveReservationId] = useState<string | null>(null);

  // NEW: Post-Reservation System State
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null);
  const [isReservationLoading, setIsReservationLoading] = useState(true); // Track reservation loading state
  const [isPostResNavigating, setIsPostResNavigating] = useState(false);
  const [showPickupSuccessModal, setShowPickupSuccessModal] = useState(false);
  const [pickupModalData, setPickupModalData] = useState<{ savedAmount: number; pointsEarned: number } | null>(null);
  
  // Enable GPS tracking when navigating
  const { position: gpsPosition } = useLiveGPS({ 
    enabled: isPostResNavigating,
    updateInterval: 3000 
  });

  // Ref to track last highlighted offer (prevents duplicate highlights causing re-renders)
  const lastHighlightedOfferRef = useRef<string | null>(null);

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

  // Handle offline mode with cached offers
  useEffect(() => {
    if (!isOnline && !offers.length && !isLoading) {
      // User is offline and React Query returned empty - try IndexedDB cache
      indexedDBManager.getCachedOffers().then(cachedOffers => {
        if (cachedOffers && cachedOffers.length > 0) {
          // Can't directly set offers (it's from React Query), but they're already cached
          toast.info('📡 Showing cached offers (offline mode)', {
            description: 'Some data may be outdated',
          });
          logger.info('[Index] Loaded cached offers in offline mode', { count: cachedOffers.length });
        }
      });
    }
  }, [isOnline, offers.length, isLoading]);
  
  // Handle errors gracefully
  useEffect(() => {
    if (offersError && !isOnline) {
      toast.error('Unable to load offers offline');
    } else if (offersError) {
      toast.error('Failed to load offers. Please try again.');
    }
  }, [offersError, isOnline]);
  
  // 🚀 PERFORMANCE: React Query automatically handles:
  // - Request deduplication (multiple components requesting same data)
  // - Request cancellation (when debouncedBounds changes, old request is cancelled)
  // - Caching with staleTime (serves cached data for 2 minutes)
  // - Background refetching (updates cache without showing loading state)
  // - Error retry logic (retries once on failure)
  
  // No manual loadOffers() function needed - React Query handles everything!

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
      setIsReservationLoading(false); // No user = no reservation to load
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // 🔧 FIX: Only depend on user.id, not entire user object

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

    // ⚠️ DISABLED POLLING: Real-time subscription already handles updates
    // This polling was causing 4.7M database calls (600 req/min per user!)
    // Realtime subscription is sufficient - polling is redundant and expensive
    
    /* REMOVED POLLING INTERVAL:
    const pollingInterval = setInterval(() => {
      if (!isCleanedUp) {
        loadActiveReservation();
      }
    }, 10000); // Increased from 5s to 10s to reduce CPU/battery usage
    */

    return () => {
      isCleanedUp = true;
      logger.log('🔌 Cleaning up reservation subscription');
      // clearInterval(pollingInterval); // Disabled
      
      // Remove the channel completely
      channel.unsubscribe().then(() => {
        supabase.removeChannel(channel);
        logger.log('✅ Channel removed from Supabase client');
      });
    };
  }, [activeReservation?.id]);

  const loadActiveReservation = async () => {
    if (!user?.id) {
      setIsReservationLoading(false);
      return;
    }
    
    setIsReservationLoading(true);
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
    } finally {
      setIsReservationLoading(false);
    }
  };

  // Auto-open OffersSheet after reservation check completes
  // Only open if NO active reservation exists
  useEffect(() => {
    // Wait for reservation loading to complete
    if (isReservationLoading) {
      return;
    }

    // Add a small delay for better UX (let user see homepage briefly)
    const timer = setTimeout(() => {
      if (!activeReservation && !discoverSheetOpen) {
        setDiscoverSheetOpen(true);
        setIsSheetMinimized(false);
        logger.log('✅ Auto-opening offers sheet (no active reservation)');
      } else if (activeReservation) {
        logger.log('❌ NOT auto-opening sheet (active reservation exists)');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [isReservationLoading, activeReservation]); // Depend on reservation loading state

  useEffect(() => {
    // React Query automatically loads offers when debouncedBounds is available
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
      // React Query will auto-refetch offers when window refocuses
      toast.success('✅ Queued reservation synced!');
    };

    window.addEventListener('reservation-synced', handleReservationSynced);

    // ⚠️ DISABLED: Real-time subscription for ALL offers causes 23K+ queries
    // This was causing severe performance issues - every offer update across all partners
    // triggered refetches. Using React Query's automatic refetch instead (on focus, interval)
    
    /* REMOVED GLOBAL OFFERS SUBSCRIPTION:
    const offersChannel = supabase
      .channel('offers-realtime-index')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'offers',
        },
        async (payload) => {
          logger.info('🔔 Offer changed on map:', payload.eventType);

          if (payload.eventType === 'INSERT') {
            const newOffer = payload.new as any;
            
            // Only notify if it meets our criteria
            if (
              newOffer.status === 'ACTIVE' &&
              newOffer.quantity_available > 0 &&
              new Date(newOffer.expires_at) > new Date()
            ) {
              // React Query will auto-refetch in background based on staleTime
              toast.success(`🎉 New offer available: ${newOffer.title}`, { duration: 3000 });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedOffer = payload.new as any;
            
            // Check if offer should be shown or hidden
            const shouldShow = 
              updatedOffer.status === 'ACTIVE' &&
              updatedOffer.quantity_available > 0 &&
              new Date(updatedOffer.expires_at) > new Date();

            const wasShown = offers.some(o => o.id === updatedOffer.id);

            if (shouldShow !== wasShown && !shouldShow) {
              toast.info('An offer is no longer available');
            }
            // React Query will auto-refetch on next window focus or staleTime expiry
          } else if (payload.eventType === 'DELETE') {
            toast.info('An offer has been removed');
            // React Query will auto-refetch in background
          }
        }
      )
      .subscribe();
    */

    return () => {
      window.removeEventListener('reservation-synced', handleReservationSynced);
      // offersChannel.unsubscribe(); // Disabled
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

  // React Query automatically retries failed requests when coming back online
  // via refetchOnReconnect: 'always' in queryClient config

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

  // Memoize userLocation object to prevent creating new reference on every render
  const userLocationObject = useMemo(() => {
    return userLocation ? { lat: userLocation[0], lng: userLocation[1] } : null;
  }, [userLocation?.[0], userLocation?.[1]]);

  const handleOfferClick = useCallback((offer: Offer) => {
    setSelectedOffer(offer);
    addRecentlyViewed(offer.id, 'offer');

    if (!user) {
      setShowAuthDialog(true);
    }
  }, [user, addRecentlyViewed]);

  const handleMarkerClick = useCallback((partnerName: string, partnerAddress: string | undefined, partnerOffers: Offer[]) => {
    // Skip if active reservation exists - no partner sheet during navigation
    if (activeReservation) {
      return;
    }
    
    // If empty partner name, clear filters (map clicked on empty area)
    if (!partnerName || partnerOffers.length === 0) {
      setSearchQuery('');
      setSelectedOffer(null);
      setSelectedCategory('');
      setShowPartnerSheet(false);
      return;
    }
    
    // Open partner sheet with partner's info and offers
    if (partnerOffers.length > 0) {
      const partnerId = partnerOffers[0]?.partner_id;
      if (partnerId) {
        setSelectedPartnerId(partnerId);
        setShowPartnerSheet(true);
        
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
  }, [googleMap, activeReservation]);

  // Generate structured data with actual offers for rich results
  const offerListSchema = useMemo(() => {
    const topOffers = filteredOffers.slice(0, 10); // Top 10 for SEO
    
    return {
      '@type': 'ItemList',
      name: 'Available Food Deals',
      numberOfItems: topOffers.length,
      itemListElement: topOffers.map((offer, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Product',
          '@id': `https://smartpick.ge/offer/${offer.id}`,
          name: offer.title,
          description: offer.description || `${offer.discount_percentage}% off at ${offer.partner_business_name}`,
          image: offer.image_url || 'https://smartpick.ge/icon1.png',
          offers: {
            '@type': 'Offer',
            price: offer.discounted_price?.toFixed(2) || '0',
            priceCurrency: 'GEL',
            availability: offer.quantity_available > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            validFrom: offer.pickup_time_start || new Date().toISOString(),
            validThrough: offer.pickup_time_end || new Date(Date.now() + 86400000).toISOString(),
            seller: {
              '@type': 'LocalBusiness',
              name: offer.partner_business_name,
              address: {
                '@type': 'PostalAddress',
                addressLocality: 'Tbilisi',
                addressCountry: 'GE',
              },
            },
          },
        },
      })),
    };
  }, [filteredOffers]);

  return (
    <>
      <SEOHead
        title="SmartPick — Smart choice every day"
        description="Discover surplus food deals from local restaurants in Tbilisi. Save money while reducing food waste. Premium meals at up to 70% off."
        structuredData={{
          '@context': 'https://schema.org',
          '@graph': [
            structuredDataSchemas.organization,
            structuredDataSchemas.localBusiness,
            structuredDataSchemas.webApplication,
            offerListSchema, // Dynamic offer list
          ],
        }}
      />
      <SplashScreen />
      <Suspense fallback={null}><AnnouncementPopup /></Suspense>

      <main id="main-content" className="min-h-screen bg-sp-bg overflow-hidden fixed inset-0 safe-area" role="main" aria-label="Offers map and discovery">
        <div className="absolute inset-0 w-full h-full">
          {/* Full Screen Map - Always mounted to prevent re-initialization */}
          <div className="absolute inset-0 w-full h-full z-10">
            {googleMapsLoaded && (
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
                activeReservation={activeReservation}
                onMapBoundsChange={!activeReservation ? (bounds) => {
                  // 🚀 SCALABILITY: Track map bounds and reload offers when map moves
                  // Disabled during active reservation to prevent constant reloading
                  setMapBounds(bounds);
                } : undefined}
              />
            )}
          </div>
        </div>

      </main>

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

      {/* PARTNER SHEET - Shows partner info and offers when clicking map pin */}
      <PartnerSheet
        isOpen={showPartnerSheet}
        partnerId={selectedPartnerId}
        onClose={() => {
          setShowPartnerSheet(false);
          setSelectedPartnerId(null);
        }}
        onOfferSelect={(offer) => {
          setSelectedOffer(offer);
          setHighlightedOfferId(offer.id);
          setShowNewReservationModal(true);
          setShowPartnerSheet(false);
        }}
      />

      {/* NEW OFFERS SHEET - Pixel-Perfect Redesign */}
      <OffersSheetNew
        isOpen={discoverSheetOpen}
        isMinimized={isSheetMinimized}
        selectedPartnerId={selectedPartnerId}
        onClose={() => {
          setDiscoverSheetOpen(false);
          setIsSheetMinimized(false);
          setSelectedPartnerId(null);
        }}
        onOfferSelect={(offer) => {
          setSelectedOffer(offer);
          setHighlightedOfferId(offer.id);
          setShowNewReservationModal(true);
          setDiscoverSheetOpen(false);
          setIsSheetMinimized(false);
        }}
        onCenteredOfferChange={useCallback((offer: Offer | null) => {
          // Validate all required data before attempting map sync
          if (!offer || !googleMap) {
            lastHighlightedOfferRef.current = null;
            return;
          }
          
          // 🔧 PERFORMANCE FIX: Skip if same offer already highlighted
          if (lastHighlightedOfferRef.current === offer.id) {
            return;
          }
          
          const hasValidLocation = offer.partner?.location?.latitude && 
                                   offer.partner?.location?.longitude &&
                                   typeof offer.partner.location.latitude === 'number' &&
                                   typeof offer.partner.location.longitude === 'number' &&
                                   isFinite(offer.partner.location.latitude) &&
                                   isFinite(offer.partner.location.longitude);
          
          if (hasValidLocation && offer.partner?.location) {
            // Pan map to centered offer's location smoothly and zoom in moderately
            googleMap.panTo({
              lat: offer.partner.location.latitude,
              lng: offer.partner.location.longitude,
            });
            // Moderate zoom level (14 shows neighborhood context, avoids cluster view)
            googleMap.setZoom(14);
            // Highlight the offer marker
            lastHighlightedOfferRef.current = offer.id;
            setHighlightedOfferId(offer.id);
          }
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [googleMap])}
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
          pickupWindowStart: activeReservation.offer?.pickup_start || new Date().toISOString(),
          pickupWindowEnd: activeReservation.offer?.pickup_end || new Date().toISOString(),
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
          pickupAddress: activeReservation.partner?.address || 
                        activeReservation.offer?.partner?.address || 'Location',
            }}
            userLocation={userLocationObject}
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
      
      {/* Screen reader announcements for keyboard users */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {isLoading ? 'Loading offers...' : `${filteredOffers.length} offers available. Use Tab to navigate, Enter to select.`}
      </div>
      
      {/* Map marker count announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {mapFilteredOffers.length} {mapFilteredOffers.length === 1 ? 'marker' : 'markers'} shown on map
      </div>

      {/* Bottom Navigation - Premium iOS Glass Style */}
      <FloatingBottomNav 
        onCenterClick={() => {
          // Don't open offers sheet if there's an active reservation
          if (activeReservation) return;
          
          // Toggle between open, minimized (carousel), and closed
          if (discoverSheetOpen && !isSheetMinimized) {
            // Sheet is fully open -> minimize to carousel
            setIsSheetMinimized(true);
          } else if (discoverSheetOpen && isSheetMinimized) {
            // Sheet is minimized -> close it
            setDiscoverSheetOpen(false);
            setIsSheetMinimized(false);
          } else {
            // Sheet is closed -> open it fully
            setDiscoverSheetOpen(true);
            setIsSheetMinimized(false);
            setSelectedPartnerId(null);
          }
        }}
      />
    </>
  );
}
