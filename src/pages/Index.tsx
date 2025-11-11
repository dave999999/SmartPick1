import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Offer, User, Partner } from '@/lib/types';
import { getActiveOffers, getCurrentUser, signOut, resolveOfferImageUrl, getPartnerByUserId } from '@/lib/api';
import { isDemoMode } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import OfferMap from '@/components/OfferMap';
import CategoryBar from '@/components/CategoryBar';
import SplashScreen from '@/components/SplashScreen';
import AuthDialog from '@/components/AuthDialog';
import ReservationModal from '@/components/ReservationModal';
import RecentOffersSlider from '@/components/RecentOffersSlider';
import SearchAndFilters, { FilterState, SortOption } from '@/components/SearchAndFilters';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import ShoppingBag from 'lucide-react/dist/esm/icons/shopping-bag';
import LogIn from 'lucide-react/dist/esm/icons/log-in';
import LogOut from 'lucide-react/dist/esm/icons/log-out';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import Shield from 'lucide-react/dist/esm/icons/shield';
import Globe from 'lucide-react/dist/esm/icons/globe';
import Menu from 'lucide-react/dist/esm/icons/menu';
import UserIcon from 'lucide-react/dist/esm/icons/user';
import MousePointerClick from 'lucide-react/dist/esm/icons/mouse-pointer-click';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Clock from 'lucide-react/dist/esm/icons/clock';
import { useI18n } from '@/lib/i18n';
import { DEFAULT_24H_OFFER_DURATION_HOURS } from '@/lib/constants';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

function LanguageButtons() {
  const { language, setLanguage } = useI18n();
  return (
    <div className="flex items-center gap-1">
      <button
        aria-label="English"
        onClick={() => setLanguage('en')}
        className={`px-3 py-1 rounded-xl text-sm font-semibold border transition-colors ${
          language === 'en'
            ? 'bg-white text-gray-900 border-gray-200 shadow-sm'
            : 'bg-transparent text-gray-200 border-white/20 hover:bg-white/10'
        }`}
      >
        EN
      </button>
      <button
        aria-label="Georgian"
        onClick={() => setLanguage('ka')}
        className={`px-3 py-1 rounded-xl text-sm font-semibold border transition-colors ${
          language === 'ka'
            ? 'bg-white text-gray-900 border-gray-200 shadow-sm'
            : 'bg-transparent text-gray-200 border-white/20 hover:bg-white/10'
        }`}
      >
        KA
      </button>
    </div>
  );
}

export default function Index() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isPartner, setIsPartner] = useState<boolean>(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const navigate = useNavigate();
  const { t } = useI18n();
  const { addRecentlyViewed } = useRecentlyViewed();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    loadOffers();
    checkUser();
  }, []);

  // Check for referral code in URL and auto-open signup
  useEffect(() => {
    const refParam = searchParams.get('ref');
    if (refParam) {
      // Auto-open signup dialog with referral code
      setDefaultAuthTab('signup');
      setShowAuthDialog(true);
      toast.success(`🎁 Welcome! Referral code ${refParam.toUpperCase()} is ready to use!`);
    }
  }, [searchParams]);

  const checkUser = async () => {
    const { user } = await getCurrentUser();
    setUser(user);
    
    // Check if user is a partner
    if (user) {
      const partner = await getPartnerByUserId(user.id);
      setIsPartner(partner !== null && partner.status === 'APPROVED');
    } else {
      setIsPartner(false);
    }
  };

  const loadOffers = async () => {
    try {
      setIsLoading(true);
      const data = await getActiveOffers();
      setOffers(data);
    } catch (error) {
      logger.error('Error loading offers:', error);
      if (!isDemoMode) {
        toast.error('Failed to load offers');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      setIsPartner(false);
      toast.success('Signed out successfully');
    } catch (error) {
      logger.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };



  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
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

    // Category filter
    if (selectedCategory && selectedCategory !== '') {
      filtered = filtered.filter(o => o.category === selectedCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(offer =>
        offer.title.toLowerCase().includes(query) ||
        offer.partner?.business_name?.toLowerCase().includes(query) ||
        offer.category.toLowerCase().includes(query)
      );
    }

    // Price filter
    filtered = filtered.filter(offer =>
      Number(offer.smart_price) >= filters.minPrice &&
      Number(offer.smart_price) <= filters.maxPrice
    );

    // Distance filter (only if user location is set)
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

    // Sorting
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

  // Memoize filtered offers to avoid recalculating on every render
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

  // Memoize handleOfferClick to prevent recreation on every render
  const handleOfferClick = useCallback((offer: Offer) => {
    setSelectedOffer(offer);
    addRecentlyViewed(offer.id, 'offer');

    if (!user) {
      setShowAuthDialog(true);
    } else {
      setShowReservationModal(true);
    }
  }, [user, addRecentlyViewed]);

  // Memoize handleReservationSuccess
  const handleReservationSuccess = useCallback(() => {
    loadOffers(); // Reload offers to update quantities
    setShowReservationModal(false);
    setSelectedOffer(null);
  }, []);

  return (
    <>
      {/* Splash Screen - Shows on first visit */}
      <SplashScreen />

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black" style={{ fontFamily: 'Inter, Poppins, sans-serif' }}>

      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          {/* Logo and Title */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <img
              src="/icon1.png"
              alt="SmartPick icon"
              className="h-12 w-12 sm:h-14 sm:w-14 object-contain"
              style={{ minHeight: '40px' }}
            />
            <div className="leading-tight">
              <h1 className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-[#00C896] to-[#009B77] text-transparent bg-clip-text">
                SmartPick
              </h1>
              <p className="text-[11px] md:text-xs text-gray-400 hidden sm:block">Smart choice every day</p>
            </div>
          </button>

          {/* Desktop Navigation - Hidden on Mobile */}
          <div className="hidden md:flex items-center gap-2">
            <Button
              onClick={() => navigate('/partner/apply')}
              className="h-11 rounded-full bg-gradient-to-r from-[#FF6F61] to-[#FF8A7A] hover:from-[#ff5545] hover:to-[#FF7565] text-white hover:scale-105 transition-all duration-300 font-semibold shadow-md hover:shadow-lg px-6"
            >
              🤝 {t('header.becomePartner')}
            </Button>
            <LanguageButtons />
            {user ? (
              <>
                <span className="text-sm text-gray-200 hidden lg:inline">Hello, {user.name}</span>
                {user.role === 'ADMIN' && (
                  <Button
                    variant="outline"
                    className="h-11 rounded-xl bg-white/95 text-gray-900 border border-gray-200 hover:bg-white shadow-sm hover:shadow-md px-4"
                    onClick={() => navigate('/admin-dashboard')}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    {t('header.admin')}
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="h-11 rounded-xl bg-white/95 text-gray-900 border border-gray-200 hover:bg-white shadow-sm hover:shadow-md px-4"
                  onClick={() => navigate('/profile')}
                >
                  <UserIcon className="w-4 h-4 mr-2" />
                  {t('header.profile')}
                </Button>
                <Button
                  variant="outline"
                  className="h-11 rounded-xl bg-white/95 text-gray-900 border border-gray-200 hover:bg-white shadow-sm hover:shadow-md px-4"
                  onClick={() => navigate('/my-picks')}
                >
                  {t('header.myPicks')}
                </Button>
                {isPartner && (
                  <Button
                    variant="outline"
                    className="h-11 rounded-xl bg-white/95 text-gray-900 border border-gray-200 hover:bg-white shadow-sm hover:shadow-md px-4"
                    onClick={() => navigate('/partner')}
                  >
                    {t('header.partner')}
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="h-11 rounded-xl bg-white/95 text-gray-900 border border-gray-200 hover:bg-white shadow-sm hover:shadow-md px-4"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('header.signOut')}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                className="h-11 rounded-xl bg-white/95 text-gray-900 border border-gray-200 hover:bg-white shadow-sm hover:shadow-md px-4"
                onClick={() => setShowAuthDialog(true)}
              >
                <LogIn className="w-4 h-4 mr-2" />
                {t('header.signIn')}
              </Button>
            )}
          </div>

          {/* Mobile Navigation - Hamburger Menu */}
          <div className="flex md:hidden items-center gap-2">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border-white/20 text-white">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px]">
                <SheetHeader>
                  <SheetTitle className="text-left">Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 mt-6">
                  {/* Language Buttons in Mobile Menu */}
                  <div className="flex items-center gap-2 pb-4 border-b border-gray-700">
                    <span className="text-sm text-gray-400">Language:</span>
                    <LanguageButtons />
                  </div>

                  {/* Become a Partner Button */}
                  <Button
                    onClick={() => {
                      navigate('/partner/apply');
                      setMobileMenuOpen(false);
                    }}
                    className="h-11 w-full rounded-full bg-gradient-to-r from-[#FF6F61] to-[#FF8A7A] hover:from-[#ff5545] hover:to-[#FF7565] text-white font-semibold justify-start shadow-md"
                  >
                    🤝 {t('header.becomePartner')}
                  </Button>

                  {user ? (
                    <>
                      <div className="text-sm text-gray-300 pb-2 border-b border-gray-700">
                        Hello, {user.name}
                      </div>

                      {user.role === 'ADMIN' && (
                        <Button
                          variant="outline"
                          className="h-11 w-full justify-start"
                          onClick={() => {
                            navigate('/admin-dashboard');
                            setMobileMenuOpen(false);
                          }}
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          {t('header.admin')}
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        className="h-11 w-full justify-start"
                        onClick={() => {
                          navigate('/profile');
                          setMobileMenuOpen(false);
                        }}
                      >
                        <UserIcon className="w-4 h-4 mr-2" />
                        {t('header.profile')}
                      </Button>

                      <Button
                        variant="outline"
                        className="h-11 w-full justify-start"
                        onClick={() => {
                          navigate('/my-picks');
                          setMobileMenuOpen(false);
                        }}
                      >
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        {t('header.myPicks')}
                      </Button>

                      {isPartner && (
                        <Button
                          variant="outline"
                          className="h-11 w-full justify-start"
                          onClick={() => {
                            navigate('/partner');
                            setMobileMenuOpen(false);
                          }}
                        >
                          <Globe className="w-4 h-4 mr-2" />
                          {t('header.partner')}
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        className="h-11 w-full justify-start mt-4 border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => {
                          handleSignOut();
                          setMobileMenuOpen(false);
                        }}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        {t('header.signOut')}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      className="h-11 w-full justify-start"
                      onClick={() => {
                        setShowAuthDialog(true);
                        setMobileMenuOpen(false);
                      }}
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      {t('header.signIn')}
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Modern Welcome Section - Compact for Mobile */}
      <div className="max-w-7xl mx-auto px-4 pt-4 md:pt-12 pb-2 md:pb-8">
        <div className="text-center mb-3 md:mb-10 space-y-2 md:space-y-8">
          {/* Main Title - Ultra Vibrant */}
          <h2 className="text-3xl md:text-6xl lg:text-7xl font-black bg-gradient-to-r from-[#00ffbb] via-[#00C896] to-[#00e6a8] text-transparent bg-clip-text mb-2 md:mb-6 leading-tight animate-pulse" style={{ animationDuration: '3s' }}>
            {t('browse.discoverDeals')}
          </h2>

          {/* How it Works - Ultra Compact for Mobile */}
          <div className="flex items-center justify-center gap-1.5 md:gap-6 max-w-4xl mx-auto">
            {/* Step 1: Reserve */}
            <div className="group relative flex-1 max-w-[140px] md:max-w-none">
              <div className="absolute inset-0 bg-gradient-to-r from-[#00C896] to-[#00e6a8] rounded-lg md:rounded-2xl blur-md md:blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
              <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 border border-[#00C896] md:border-2 rounded-lg md:rounded-2xl p-2 md:p-6 transform transition-all duration-300 hover:scale-105 hover:border-[#00ffbb]">
                <div className="w-7 h-7 md:w-12 md:h-12 mx-auto mb-1 md:mb-3 bg-[#00C896] rounded-full flex items-center justify-center">
                  <MousePointerClick className="w-3.5 h-3.5 md:w-6 md:h-6 text-white" />
                </div>
                <h3 className="text-xs md:text-xl font-bold text-[#00C896] mb-0 md:mb-1">Reserve</h3>
                <p className="text-xs text-gray-400 hidden md:block">{t('browse.clickReserve')}</p>
              </div>
            </div>

            {/* Arrow */}
            <div className="text-base md:text-3xl text-[#00C896] animate-pulse">→</div>

            {/* Step 2: Pick Up */}
            <div className="group relative flex-1 max-w-[140px] md:max-w-none">
              <div className="absolute inset-0 bg-gradient-to-r from-[#00e6a8] to-[#00ffbb] rounded-lg md:rounded-2xl blur-md md:blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
              <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 border border-[#00e6a8] md:border-2 rounded-lg md:rounded-2xl p-2 md:p-6 transform transition-all duration-300 hover:scale-105 hover:border-[#00ffbb]">
                <div className="w-7 h-7 md:w-12 md:h-12 mx-auto mb-1 md:mb-3 bg-[#00e6a8] rounded-full flex items-center justify-center">
                  <MapPin className="w-3.5 h-3.5 md:w-6 md:h-6 text-white" />
                </div>
                <h3 className="text-xs md:text-xl font-bold text-[#00e6a8] mb-0 md:mb-1">Pick Up</h3>
                <p className="text-xs text-gray-400 hidden md:block">{t('browse.visitLocation')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <SearchAndFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filters={filters}
          onFiltersChange={setFilters}
          sortBy={sortBy}
          onSortChange={setSortBy}
          showDistanceFilter={userLocation !== null}
        />
      </div>

      {/* Demo Mode Alert */}
      {isDemoMode && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900 text-sm">
              <strong>Demo Mode:</strong> You're viewing sample data. To enable full functionality, please configure Supabase.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Map-First Section: Offers Map/List */}
      <section id="map-view" className="w-full">
        <div className="max-w-7xl mx-auto px-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white rounded-2xl p-4 shadow-lg space-y-3">
                  <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
                  <div className="flex justify-between">
                    <div className="h-6 bg-gray-200 rounded animate-pulse w-20" />
                    <div className="h-6 bg-gray-200 rounded animate-pulse w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : offers.length === 0 ? (
            <div className="text-center py-12 bg-gray-900/50 rounded-2xl">
              <ShoppingBag className="w-12 h-12 md:w-16 md:h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-base md:text-lg text-gray-300">{t('browse.noOffers')}</p>
              <p className="text-xs md:text-sm text-gray-500 mt-2">{t('browse.checkBack')}</p>
            </div>
          ) : (
            <>
              <OfferMap
                offers={filteredOffers}
                onOfferClick={handleOfferClick}
                selectedCategory={selectedCategory}
                onCategorySelect={setSelectedCategory}
                onLocationChange={setUserLocation}
              />
              {/* Recently Added Offers Slider - Below Map */}
              <div className="mt-6">
                <RecentOffersSlider
                  offers={filteredOffers}
                  onOfferClick={handleOfferClick}
                  title="🔥 Hot Deals Right Now"
                />
              </div>

              {/* All Offers Grid - Below Recent Offers */}
              <div className="mt-10 mb-8">
                <div className="mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#00C896] via-[#00e6a8] to-[#00ffbb] text-transparent bg-clip-text">
                    All Available Offers
                  </h2>
                  <p className="text-sm md:text-base text-gray-400 mt-1.5 font-medium">
                    {filteredOffers.length} offer{filteredOffers.length !== 1 ? 's' : ''} available near you
                  </p>
                </div>

                {/* Offers Grid */}
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
                        {/* Image */}
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

                        {/* Content */}
                        <div className="p-4">
                          <div className="space-y-2">
                            {/* Title */}
                            <h3 className="font-bold text-base text-gray-900 line-clamp-1">
                              {offer.title}
                            </h3>

                            {/* Partner Name */}
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <MapPin className="w-3 h-3 text-[#00C896]" />
                              <span className="line-clamp-1">{offer.partner?.business_name}</span>
                            </div>

                            {/* Price */}
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold bg-gradient-to-r from-[#00C896] to-[#009B77] text-transparent bg-clip-text">
                                {offer.smart_price} ₾
                              </span>
                              <span className="text-sm text-gray-400 line-through">
                                {offer.original_price} ₾
                              </span>
                            </div>

                            {/* Pickup Time */}
                            {pickupTimes.start && pickupTimes.end && (
                              <div className="flex items-center gap-1 text-xs text-gray-600">
                                <Clock className="w-3 h-3 text-[#00C896]" />
                                <span>
                                  {formatTime(pickupTimes.start)} - {formatTime(pickupTimes.end)}
                                </span>
                              </div>
                            )}

                            {/* Time Remaining & Quantity */}
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
              </div>
            </>
          )}
        </div>
      </section>

      

      {/* Enhanced Reservation Modal */}
      <ReservationModal
        offer={selectedOffer}
        user={user}
        open={showReservationModal}
        onOpenChange={setShowReservationModal}
        onSuccess={handleReservationSuccess}
      />

      {/* Auth Dialog */}
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

      {/* Footer */}
      <footer className="bg-black border-t border-gray-800 text-white py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6 md:mb-8">
            <div className="flex items-center justify-center gap-2 mb-3 md:mb-4">
              <ShoppingBag className="w-6 h-6 md:w-8 md:h-8 text-[#00C896]" />
              <h4 className="text-xl md:text-2xl font-bold">
                <span style={{ color: '#FFFFFF' }}>Smart</span><span style={{ color: '#00C896' }}>Pick</span>
              </h4>
            </div>
            <p className="text-sm md:text-base text-gray-400 max-w-2xl mx-auto leading-relaxed px-2">
              {t('footer.description')}
            </p>
          </div>

          <div className="border-t border-gray-800 pt-6 md:pt-8 text-center">
            <p className="text-xs md:text-sm text-gray-500">
              {t('footer.copyright')}
            </p>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}

