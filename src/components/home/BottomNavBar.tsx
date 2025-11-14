import { Home, ShoppingBag, Bookmark, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { getCurrentUser, getPartnerByUserId } from '@/lib/api';

// Compact auto-hide bottom navigation
export function BottomNavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isPartner, setIsPartner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    checkUserType();
  }, []);

  // Auto-hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show navbar when scrolling up or at top
      if (currentScrollY < lastScrollY.current || currentScrollY < 50) {
        setIsVisible(true);
      } 
      // Hide navbar when scrolling down
      else if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsVisible(false);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const checkUserType = async () => {
    const { user } = await getCurrentUser();
    if (user) {
      const partner = await getPartnerByUserId(user.id);
      setIsPartner(partner !== null && partner.status === 'APPROVED');
    }
    setIsLoading(false);
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
      className={`fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 z-[70] transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      {/* Navigation Icons - Compact Version */}
      <div className="flex items-center justify-around px-2 py-1.5">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={index}
              onClick={item.onClick}
              className={`flex items-center justify-center flex-1 py-1.5 transition-colors ${
                active ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              {/* Icon with filled circle background when active - smaller */}
              <div
                className={`flex items-center justify-center transition-all ${
                  active
                    ? 'bg-gray-900 text-white rounded-full w-11 h-9 shadow-sm'
                    : 'w-5 h-5'
                }`}
              >
                <Icon 
                  className={active ? 'w-4 h-4' : 'w-5 h-5'} 
                  strokeWidth={2} 
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* iPhone home indicator bar - smaller */}
      <div className="h-1 bg-gray-900 rounded-full w-24 mx-auto mb-1 opacity-30" />
    </div>
  );
}
