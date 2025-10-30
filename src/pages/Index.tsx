import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Offer, User } from '@/lib/types';
import { getActiveOffers, getCurrentUser, signOut } from '@/lib/api';
import { isDemoMode } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import OfferMap from '@/components/OfferMap';
import AuthDialog from '@/components/AuthDialog';
import ReservationModal from '@/components/ReservationModal';
import { MapPin, Clock, ShoppingBag, LogIn, LogOut, AlertCircle, Shield, Leaf, DollarSign, Globe, Footprints, ArrowDown, ChevronDown } from 'lucide-react';
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
  const navigate = useNavigate();

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
        
        @keyframes bounce-pin {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        
        @keyframes bounce-pin-mobile {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        
        @keyframes float-arrow {
          0%, 100% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(8px); opacity: 0.5; }
        }
        
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        
        @keyframes gradient-drift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes tap-vibrate {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }
        
        .find-smart-btn {
          animation: pulse-animation 3s ease-in-out infinite;
          background: linear-gradient(90deg, #4CC9A8, #3FB08F);
          background-size: 200% auto;
          position: relative;
          overflow: hidden;
        }
        
        .find-smart-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          transition: left 0.5s;
        }
        
        .find-smart-btn:hover::before,
        .find-smart-btn:active::before {
          left: 100%;
        }
        
        .find-smart-btn:active {
          animation: tap-vibrate 0.3s ease-in-out;
        }
        
        .floating-pin {
          animation: bounce-pin 1.5s ease-in-out infinite;
        }
        
        @media (max-width: 768px) {
          .floating-pin {
            animation: bounce-pin-mobile 1.5s ease-in-out infinite;
          }
        }
        
        .float-arrow {
          animation: float-arrow 2s linear infinite;
        }
        
        .hero-bg-animated {
          background: linear-gradient(135deg, rgba(76, 201, 168, 0.05), rgba(255, 255, 255, 0), rgba(255, 111, 97, 0.03));
          background-size: 200% 200%;
          animation: gradient-drift 8s ease infinite;
        }
        
        .pulse-focus {
          animation: pulse-animation 0.6s ease-in-out;
          box-shadow: 0 0 0 4px rgba(76, 201, 168, 0.3);
          border-radius: 12px;
        }
        
        @media (prefers-reduced-motion: reduce) {
          .find-smart-btn,
          .floating-pin,
          .float-arrow,
          .hero-bg-animated {
            animation: none !important;
          }
        }
        
        @media (max-height: 700px) {
          .hero-section-compact {
            padding-top: 2rem !important;
            padding-bottom: 2rem !important;
          }
          .hero-section-compact h2 {
            font-size: 2rem !important;
            margin-bottom: 1rem !important;
          }
          .hero-section-compact p {
            font-size: 1rem !important;
            margin-bottom: 0.5rem !important;
          }
        }
      `}</style>

      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-6">
            {/* Logo and Title */}
            <div className="flex items-center gap-2">
              <img src="/logo-icon.png" alt="SmartPick Logo" className="h-8 md:h-10 w-auto object-contain" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold">
                  <span style={{ color: '#1A1E29' }}>Smart</span>
                  <span style={{ color: '#2FB673' }}>Pick</span>
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">Be Smart. Pick Smart.</p>
              </div>
            </div>
            
            {/* Become a Partner Button - Next to Logo */}
            <div className="flex items-center gap-2">
              <Button 
                size="sm"
                onClick={() => navigate('/partner/apply')}
                className="bg-[#FF6F61] hover:bg-[#ff5545] text-white hover:scale-105 transition-all duration-250 font-semibold shadow-md hover:shadow-lg"
              >
                <span className="hidden sm:inline">Become a Partner</span>
                <span className="sm:hidden">Partner</span>
              </Button>

              {/* Language switch: English / Georgian only */}
              <LanguageButtons />
            </div>
          </div>
          
          {/* Right Side Navigation */}
          <div className="flex items-center gap-2 md:gap-3">
            {user ? (
              <>
                <span className="text-sm text-gray-600 hidden lg:inline">Hello, {user.name}</span>
                {user.role === 'ADMIN' && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate('/admin-dashboard')}
                    className="border-[#4CC9A8] text-[#4CC9A8] hover:bg-[#4CC9A8] hover:text-white transition-all duration-250 hidden md:flex"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Admin
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => navigate('/my-picks')} className="hover:scale-105 transition-transform duration-250 hidden sm:flex">
                  My Picks
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/partner')} className="hover:scale-105 transition-transform duration-250 hidden sm:flex">
                  Partner
                </Button>
                <Button variant="outline" size="sm" onClick={handleSignOut} className="hover:scale-105 transition-transform duration-250">
                  <LogOut className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Sign Out</span>
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setShowAuthDialog(true)} className="hover:scale-105 transition-transform duration-250">
                <LogIn className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Sign In</span>
              </Button>
            )}
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

      {/* Combined Hero & How It Works Section - Mobile First */}
      <section className="hero-bg-animated hero-section-compact py-12 md:py-16 lg:py-20 relative overflow-hidden">
        <div className="container mx-auto px-4">
          {/* Hero Content */}
          <div className="text-center mb-16 md:mb-20">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 md:mb-4 leading-tight">
              <span style={{ color: '#1A1E29' }}>Smart</span> food. <span style={{ color: '#1A1E29' }}>Smart</span> people.<br className="hidden sm:block" />
              <span className="sm:hidden"> </span>
              <span style={{ color: '#1A1E29' }}>Smart</span><span style={{ color: '#2FB673' }}>Pick</span>.
            </h2>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-700 mb-2 md:mb-3 max-w-3xl mx-auto font-medium px-2">
              Fresh meals, ready to go — from the places you love, at the perfect time.
            </p>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 mb-8 md:mb-10 max-w-2xl mx-auto px-2">
              Your city's freshest finds, for those who know where to look.
            </p>
            
            {/* Enhanced CTA Button */}
            <div className="flex flex-col items-center gap-4 mb-4 md:mb-6">
              <div className="relative w-full max-w-md px-4">
                <Button 
                  size="lg"
                  className="find-smart-btn w-full text-white rounded-2xl font-bold text-base md:text-lg shadow-[0_8px_24px_rgba(76,201,168,0.4)] hover:shadow-[0_12px_32px_rgba(76,201,168,0.5)] transition-all duration-300 min-h-[56px] md:min-h-[60px] border-0 relative overflow-hidden group"
                  onClick={handleFindSmartPicksClick}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <MapPin className="w-5 h-5 md:w-6 md:h-6 animate-pulse" />
                    <span className="tracking-wide">Find <span style={{ color: '#1A1E29' }}>Smart</span> <span style={{ color: '#2FB673' }}>Picks</span> Near You</span>
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </Button>
              </div>
            </div>
          </div>

          {/* How It Works - Integrated with Visual Flow */}
          <div className="max-w-6xl mx-auto relative">
            {/* Decorative gradient background */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#4CC9A8]/5 to-transparent rounded-3xl -z-10"></div>
            
            <div className="text-center mb-10 md:mb-14">
              <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 md:mb-4">
                How It Works
              </h3>
              <p className="text-sm md:text-base text-gray-600 max-w-2xl mx-auto">
                Three simple steps to fresh, local meals
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 relative px-4 md:px-0">
              {/* Animated Progress Line - Desktop only */}
              <div className="hidden md:block absolute top-20 left-0 right-0 h-0.5" style={{ left: '20%', right: '20%' }}>
                <div className="w-full h-full bg-gradient-to-r from-[#4CC9A8] via-[#4CC9A8] to-[#FF6F61] opacity-20 rounded-full"></div>
              </div>

              {/* Step 1 */}
              <Card className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-0 relative hover:-translate-y-2 group">
                <CardContent className="p-6 md:p-8">
                  <div className="relative">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-[#4CC9A8] to-[#3FB08F] text-white rounded-2xl flex items-center justify-center mx-auto mb-5 md:mb-6 font-bold text-2xl md:text-3xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                      1
                    </div>
                    {/* Arrow connector - mobile only */}
                    <div className="md:hidden flex justify-center my-4">
                      <div className="w-px h-8 bg-gradient-to-b from-[#4CC9A8] to-transparent"></div>
                    </div>
                  </div>
                  <h4 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 mb-3 md:mb-4 text-center">Find Nearby Offers</h4>
                  <p className="text-sm md:text-base text-gray-600 text-center leading-relaxed">
                    <MapPin className="w-4 h-4 md:w-5 md:h-5 text-[#4CC9A8] inline-block mr-1" />
                    Discover fresh meals around you
                  </p>
                </CardContent>
              </Card>

              {/* Step 2 */}
              <Card className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-0 relative hover:-translate-y-2 group md:mt-0">
                <CardContent className="p-6 md:p-8">
                  <div className="relative">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-[#4CC9A8] to-[#3FB08F] text-white rounded-2xl flex items-center justify-center mx-auto mb-5 md:mb-6 font-bold text-2xl md:text-3xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                      2
                    </div>
                    {/* Arrow connector - mobile only */}
                    <div className="md:hidden flex justify-center my-4">
                      <div className="w-px h-8 bg-gradient-to-b from-[#4CC9A8] to-transparent"></div>
                    </div>
                  </div>
                  <h4 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 mb-3 md:mb-4 text-center">Reserve Your Pick</h4>
                  <p className="text-sm md:text-base text-gray-600 text-center leading-relaxed">
                    <ShoppingBag className="w-4 h-4 md:w-5 md:h-5 text-[#4CC9A8] inline-block mr-1" />
                    Secure your meal instantly
                  </p>
                </CardContent>
              </Card>

              {/* Step 3 */}
              <Card className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-0 relative hover:-translate-y-2 group">
                <CardContent className="p-6 md:p-8">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-[#FF6F61] to-[#ff5545] text-white rounded-2xl flex items-center justify-center mx-auto mb-5 md:mb-6 font-bold text-2xl md:text-3xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    3
                  </div>
                  <h4 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 mb-3 md:mb-4 text-center">Walk, Pick, Enjoy</h4>
                  <p className="text-sm md:text-base text-gray-600 text-center leading-relaxed">
                    <Footprints className="w-4 h-4 md:w-5 md:h-5 text-[#FF6F61] inline-block mr-1" />
                    Get moving and taste your city
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="flex flex-col items-center gap-3 mt-16 md:mt-20">
            <p className="text-sm md:text-base text-gray-600 font-medium">
              Explore what's fresh near you 🍞
            </p>
            <ChevronDown className="float-arrow w-6 h-6 text-[#4CC9A8] opacity-70" />
          </div>
        </div>
      </section>

      

      {/* Category Filters */}
      <section className="container mx-auto px-4 py-6 md:py-8 bg-[#FAFAFA]" id="offers">
        <div className="text-center mb-4 md:mb-6">
          <h3 className="text-xl md:text-2xl lg:text-4xl font-bold text-gray-900 mb-2 md:mb-4">
            Browse <span style={{ color: '#1A1E29' }}>Smart</span> <span style={{ color: '#2FB673' }}>Picks</span>
          </h3>
          <p className="text-sm md:text-base text-gray-600">Filter by category to find exactly what you're looking for</p>
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
              {category}
            </Badge>
          ))}
        </div>
      </section>

      {/* Offers Map/List */}
      <section id="map-view" className="container mx-auto px-4 pb-12 md:pb-16 bg-[#FAFAFA] transition-all duration-300">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-2 border-[#4CC9A8] mx-auto mb-4"></div>
            <p className="text-sm md:text-base text-gray-500">Loading <span style={{ color: '#1A1E29' }}>Smart</span> <span style={{ color: '#2FB673' }}>Picks</span>...</p>
          </div>
        ) : offers.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-base md:text-lg text-gray-500">No offers available at the moment.</p>
            <p className="text-xs md:text-sm text-gray-400 mt-2">Check back soon for new <span style={{ color: '#1A1E29' }}>Smart</span> <span style={{ color: '#2FB673' }}>Picks</span>!</p>
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
              When you pick, you make your city smarter.
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-10">
              <div className="flex items-start gap-3 text-left">
                <div className="w-7 h-7 md:w-8 md:h-8 bg-[#4CC9A8] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white font-bold text-sm">✓</span>
                </div>
                <p className="text-base md:text-lg text-gray-700">More freshness shared</p>
              </div>

              <div className="flex items-start gap-3 text-left">
                <div className="w-7 h-7 md:w-8 md:h-8 bg-[#4CC9A8] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white font-bold text-sm">✓</span>
                </div>
                <p className="text-base md:text-lg text-gray-700">More people walking</p>
              </div>

              <div className="flex items-start gap-3 text-left">
                <div className="w-7 h-7 md:w-8 md:h-8 bg-[#4CC9A8] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white font-bold text-sm">✓</span>
                </div>
                <p className="text-base md:text-lg text-gray-700">Stronger local shops</p>
              </div>

              <div className="flex items-start gap-3 text-left">
                <div className="w-7 h-7 md:w-8 md:h-8 bg-[#4CC9A8] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white font-bold text-sm">✓</span>
                </div>
                <p className="text-base md:text-lg text-gray-700">A better rhythm of living</p>
              </div>
            </div>

            <p className="text-lg md:text-xl text-gray-700 italic font-medium px-2">
              Every <span style={{ color: '#1A1E29' }}>Smart</span><span style={{ color: '#2FB673' }}>Pick</span> is a moment of connection — between you, your city, and what's fresh.
            </p>
          </div>
        </div>
      </section>

      {/* The Movement Manifesto */}
      <section className="py-12 md:py-16 lg:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-2xl md:text-3xl lg:text-5xl font-bold text-gray-900 mb-6 md:mb-8 relative inline-block px-2">
              We believe in freshness, movement, and mindful living.
            </h3>

            <div className="space-y-4 md:space-y-6 text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed px-2">
              <p>
                <span style={{ color: '#1A1E29' }}>Smart</span><span style={{ color: '#2FB673' }}>Pick</span> isn't just an app — it's a rhythm.
              </p>
              <p>
                A way to live lighter, walk more, and connect with the real taste of your city.
              </p>
              <p>
                Every time you walk, pick, and share, you become part of something smarter.
              </p>
              <p className="font-semibold text-[#4CC9A8]">
                Together, we keep the circle flowing — fresh, simple, and real.
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
              <span style={{ color: '#FFFFFF' }}>Smart</span><span style={{ color: '#2FB673' }}>Pick</span> helps local businesses share more of what they create, and less of it go to waste — naturally.
            </p>
          </div>
          
          <div className="border-t border-gray-800 pt-6 md:pt-8 text-center">
            <p className="text-xs md:text-sm text-gray-500">
              © 2025 <span style={{ color: '#FFFFFF' }}>Smart</span><span style={{ color: '#2FB673' }}>Pick</span>. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}