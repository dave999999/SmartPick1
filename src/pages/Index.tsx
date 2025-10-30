import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Offer, User } from '@/lib/types';
import { getActiveOffers, getCurrentUser, signOut } from '@/lib/api';
import { isDemoMode } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import OfferMap from '@/components/OfferMap';
import AuthDialog from '@/components/AuthDialog';
import ReservationModal from '@/components/ReservationModal';
import HeroSection from '@/components/HeroSection';
import { MapPin, Clock, ShoppingBag, LogIn, LogOut, AlertCircle, Shield, Leaf, DollarSign, Globe, Footprints, ArrowDown, ChevronDown, Menu, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';

function LanguageButtons() {
  const { language, setLanguage } = useI18n();
  return (
    <div className="flex items-center gap-1">
      <button
        aria-label="English"
        onClick={() => setLanguage('en')}
        className={`px-2 py-1 rounded text-sm ${language === 'en' ? 'bg-gray-200' : 'bg-white'}`}
      >
        EN
      </button>
      <button
        aria-label="Georgian"
        onClick={() => setLanguage('ka')}
        className={`px-2 py-1 rounded text-sm ${language === 'ka' ? 'bg-gray-200' : 'bg-white'}`}
      >
        KA
      </button>
    </div>
  );
}

const CATEGORIES = ['All', 'BAKERY', 'RESTAURANT', 'CAFE', 'GROCERY'];

export default function Index() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    loadOffers();
    checkUser();
  }, []);

  const checkUser = async () => {
    const { user } = await getCurrentUser();
    setUser(user);
  };

  const loadOffers = async () => {
    try {
      setIsLoading(true);
      const data = await getActiveOffers();
      console.log('Loaded offers:', data);
      console.log('Offers with partner data:', data.filter(o => o.partner).length);
      setOffers(data);
    } catch (error) {
      console.error('Error loading offers:', error);
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
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  const handleOfferClick = (offer: Offer) => {
    setSelectedOffer(offer);
    if (!user) {
      setShowAuthDialog(true);
    } else {
      setShowReservationModal(true);
    }
  };

  const handleReservationSuccess = () => {
    loadOffers(); // Reload offers to update quantities
    setShowReservationModal(false);
    setSelectedOffer(null);
  };

  const handleFindSmartPicksClick = () => {
    const mapView = document.getElementById('map-view');
    if (mapView) {
      const rect = mapView.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight && rect.bottom >= 0;
      
      if (isVisible && window.innerWidth < 768) {
        // Map is already visible on mobile, just add a pulse effect
        mapView.classList.add('pulse-focus');
        setTimeout(() => mapView.classList.remove('pulse-focus'), 600);
      } else {
        // Scroll to map
        mapView.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const displayCategory = (category: string) => {
    if (category === 'All') return t('browse.all');
    return t(`category.${category}`) || category;
  };

  // Helper function to safely get pickup times
  const getPickupTimes = (offer: Offer) => {
    const start = offer.pickup_start || offer.pickup_window?.start || '';
    const end = offer.pickup_end || offer.pickup_window?.end || '';
    return { start, end };
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]" style={{ fontFamily: 'Manrope, Poppins, sans-serif' }}>
      <style>{`
        @keyframes pulse-animation {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }

        .pulse-focus {
          animation: pulse-animation 0.6s ease-in-out;
          box-shadow: 0 0 0 4px rgba(76, 201, 168, 0.3);
          border-radius: 12px;
        }

        @media (prefers-reduced-motion: reduce) {
          .pulse-focus {
            animation: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center gap-2">
            <img src="/logo-icon.png" alt="SmartPick Logo" className="h-8 md:h-10 w-auto object-contain" />
            <div>
              <h1 className="text-xl md:text-2xl font-bold">
                <span style={{ color: '#1A1E29' }}>Smart</span>
                <span style={{ color: '#2FB673' }}>Pick</span>
              </h1>
              <p className="text-xs text-gray-500 hidden sm:block">{t('header.tagline')}</p>
            </div>
          </div>

          {/* Desktop Navigation - Hidden on Mobile */}
          <div className="hidden md:flex items-center gap-2">
            <Button
              onClick={() => navigate('/partner/apply')}
              className="h-11 bg-[#FF6F61] hover:bg-[#ff5545] text-white hover:scale-105 transition-all duration-250 font-semibold shadow-md hover:shadow-lg"
            >
              {t('header.becomePartner')}
            </Button>
            <LanguageButtons />
            {user ? (
              <>
                <span className="text-sm text-gray-600 hidden lg:inline">Hello, {user.name}</span>
                {user.role === 'ADMIN' && (
                  <Button
                    variant="outline"
                    className="h-11"
                    onClick={() => navigate('/admin-dashboard')}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    {t('header.admin')}
                  </Button>
                )}
                <Button variant="outline" className="h-11" onClick={() => navigate('/my-picks')}>
                  {t('header.myPicks')}
                </Button>
                <Button variant="outline" className="h-11" onClick={() => navigate('/partner')}>
                  {t('header.partner')}
                </Button>
                <Button variant="outline" className="h-11" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('header.signOut')}
                </Button>
              </>
            ) : (
              <Button variant="outline" className="h-11" onClick={() => setShowAuthDialog(true)}>
                <LogIn className="w-4 h-4 mr-2" />
                {t('header.signIn')}
              </Button>
            )}
          </div>

          {/* Mobile Navigation - Hamburger Menu */}
          <div className="flex md:hidden items-center gap-2">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-11 w-11">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px]">
                <SheetHeader>
                  <SheetTitle className="text-left">Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 mt-6">
                  {/* Language Buttons in Mobile Menu */}
                  <div className="flex items-center gap-2 pb-4 border-b">
                    <span className="text-sm text-gray-600">Language:</span>
                    <LanguageButtons />
                  </div>

                  {/* Become a Partner Button */}
                  <Button
                    onClick={() => {
                      navigate('/partner/apply');
                      setMobileMenuOpen(false);
                    }}
                    className="h-11 w-full bg-[#FF6F61] hover:bg-[#ff5545] text-white font-semibold justify-start"
                  >
                    {t('header.becomePartner')}
                  </Button>

                  {user ? (
                    <>
                      <div className="text-sm text-gray-600 pb-2 border-b">
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
                          navigate('/my-picks');
                          setMobileMenuOpen(false);
                        }}
                      >
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        {t('header.myPicks')}
                      </Button>

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

      {/* Demo Mode Alert */}
      {isDemoMode && (
        <div className="container mx-auto px-4 pt-4">
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900 text-sm">
              <strong>Demo Mode:</strong> You're viewing sample data. To enable full functionality, please configure Supabase.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Minimalist Hero Section with Integrated How It Works */}
      <HeroSection onFindPicksClick={handleFindSmartPicksClick} />


      {/* Category Filters */}
      <section className="container mx-auto px-4 py-6 md:py-8 bg-[#FAFAFA]" id="offers">
        <div className="text-center mb-4 md:mb-6">
          <h3 className="text-xl md:text-2xl lg:text-4xl font-bold text-gray-900 mb-2 md:mb-4">
            {t('browse.title')}
          </h3>
          <p className="text-sm md:text-base text-gray-600">{t('browse.subtitle')}</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 justify-start md:justify-center">
          {CATEGORIES.map((category) => (
            <Badge
              key={category}
              variant={selectedCategory === (category === 'All' ? '' : category) ? 'default' : 'outline'}
              className={`cursor-pointer px-4 md:px-6 py-2 md:py-3 text-xs md:text-sm whitespace-nowrap rounded-xl font-semibold transition-all duration-250 ${
                selectedCategory === (category === 'All' ? '' : category)
                  ? 'bg-[#4CC9A8] hover:bg-[#3db891] text-white shadow-lg hover:scale-105'
                  : 'hover:bg-[#4CC9A8]/10 hover:border-[#4CC9A8] hover:scale-105'
              }`}
              onClick={() => setSelectedCategory(category === 'All' ? '' : category)}
            >
              {displayCategory(category)}
            </Badge>
          ))}
        </div>
      </section>

      {/* Offers Map/List */}
      <section id="map-view" className="container mx-auto px-4 pb-12 md:pb-16 bg-[#FAFAFA] transition-all duration-300">
        {isLoading ? (
              <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-2 border-[#4CC9A8] mx-auto mb-4"></div>
            <p className="text-sm md:text-base text-gray-500">{t('browse.loading')}</p>
          </div>
        ) : offers.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-base md:text-lg text-gray-500">{t('browse.noOffers')}</p>
            <p className="text-xs md:text-sm text-gray-400 mt-2">{t('browse.checkBack')}</p>
          </div>
        ) : (
          <OfferMap
            offers={offers}
            onOfferClick={handleOfferClick}
            selectedCategory={selectedCategory}
          />
        )}
      </section>
{/* Why It Matters */}
      <section className="py-12 md:py-16 lg:py-20 bg-gradient-to-br from-[#4CC9A8]/5 to-[#FF6F61]/5">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-2xl md:text-3xl lg:text-5xl font-bold text-gray-900 mb-8 md:mb-12 px-2">
              {t('why.title')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-10">
              <div className="flex items-start gap-3 text-left">
                <div className="w-7 h-7 md:w-8 md:h-8 bg-[#4CC9A8] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white font-bold text-sm">✓</span>
                </div>
                <p className="text-base md:text-lg text-gray-700">{t('why.point1')}</p>
              </div>

              <div className="flex items-start gap-3 text-left">
                <div className="w-7 h-7 md:w-8 md:h-8 bg-[#4CC9A8] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white font-bold text-sm">✓</span>
                </div>
                <p className="text-base md:text-lg text-gray-700">{t('why.point2')}</p>
              </div>

              <div className="flex items-start gap-3 text-left">
                <div className="w-7 h-7 md:w-8 md:h-8 bg-[#4CC9A8] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white font-bold text-sm">✓</span>
                </div>
                <p className="text-base md:text-lg text-gray-700">{t('why.point3')}</p>
              </div>

              <div className="flex items-start gap-3 text-left">
                <div className="w-7 h-7 md:w-8 md:h-8 bg-[#4CC9A8] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white font-bold text-sm">✓</span>
                </div>
                <p className="text-base md:text-lg text-gray-700">{t('why.point4')}</p>
              </div>
            </div>

            <p className="text-lg md:text-xl text-gray-700 italic font-medium px-2">
              {t('why.tagline')}
            </p>
          </div>
        </div>
      </section>

      {/* The Movement Manifesto */}
      <section className="py-12 md:py-16 lg:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-2xl md:text-3xl lg:text-5xl font-bold text-gray-900 mb-6 md:mb-8 relative inline-block px-2">
              {t('manifesto.title')}
            </h3>

            <div className="space-y-4 md:space-y-6 text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed px-2">
              <p>
                {t('manifesto.line1')}
              </p>
              <p>
                {t('manifesto.line2')}
              </p>
              <p>
                {t('manifesto.line3')}
              </p>
              <p className="font-semibold text-[#4CC9A8]">
                {t('manifesto.line4')}
              </p>
            </div>
          </div>
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
        onSuccess={() => {
          checkUser();
          if (selectedOffer) {
            setShowReservationModal(true);
          }
        }}
      />

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6 md:mb-8">
            <div className="flex items-center justify-center gap-2 mb-3 md:mb-4">
              <ShoppingBag className="w-6 h-6 md:w-8 md:h-8 text-[#4CC9A8]" />
              <h4 className="text-xl md:text-2xl font-bold">
                <span style={{ color: '#FFFFFF' }}>Smart</span><span style={{ color: '#2FB673' }}>Pick</span>
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
  );
}