import { Home, ShoppingBag, Bookmark, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { getCurrentUser, getPartnerByUserId } from '@/lib/api';

// Compact auto-hide bottom navigation
export function BottomNavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isPartner, setIsPartner] = useState(false);
  const [isVisible, setIsVisible] = useState(true); // Always visible for debugging
  const lastScrollY = useRef(0);

  useEffect(() => {
    checkUserType();
  }, []);

  // Show when scrolling down offers list
  useEffect(() => {
    // Find the scrollable container (the offers list)
    const scrollContainer = document.querySelector('.overflow-y-auto');
    
    if (!scrollContainer) return;

    const handleScroll = () => {
      const currentScrollY = scrollContainer.scrollTop;
      
      // At top - hide
      if (currentScrollY < 50) {
        setIsVisible(false);
      }
      // Scrolling down - show
      else if (currentScrollY > lastScrollY.current) {
        setIsVisible(true);
      }
      // Scrolling up - hide
      else if (currentScrollY < lastScrollY.current) {
        setIsVisible(false);
      }
      
      lastScrollY.current = currentScrollY;
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  const checkUserType = async () => {
    const { user } = await getCurrentUser();
    if (user) {
      const partner = await getPartnerByUserId(user.id);
      setIsPartner(partner !== null && partner.status === 'APPROVED');
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const handleProfileClick = () => {
    if (isPartner) {
      navigate('/partner');
    } else {
      navigate('/profile');
    }
  };

  const navItems = [
    { icon: Home, label: 'Home', path: '/', onClick: () => navigate('/') },
    { icon: ShoppingBag, label: 'Orders', path: '/my-picks', onClick: () => navigate('/my-picks') },
    { icon: Bookmark, label: 'Saved', path: '/favorites', onClick: () => navigate('/favorites') },
    { icon: User, label: 'Profile', path: isPartner ? '/partner' : '/profile', onClick: handleProfileClick },
  ]; 

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 z-[9999] transition-all duration-500 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12 pointer-events-none'
      }`}
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)' }}
    >
      {/* Floating Navigation Icons - unified color/size */}
      <div className="flex items-center justify-center gap-4 px-4">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={index}
              onClick={item.onClick}
              style={{ transitionDelay: isVisible ? `${index * 50}ms` : '0ms' }}
              className={`flex items-center justify-center transition-all duration-200 pointer-events-auto rounded-full w-12 h-12 backdrop-blur-md hover:scale-105 active:scale-95 ${
                active 
                  ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-2xl shadow-orange-500/50' 
                  : 'bg-black/70 text-gray-300 hover:bg-black/80 shadow-xl border border-white/10'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={2.5} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
