import { Home, ShoppingBag, Bookmark, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { getCurrentUser, getPartnerByUserId } from '@/lib/api';

// Redesigned Bottom Navigation Bar
export function BottomNavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isPartner, setIsPartner] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    checkUserType();
  }, []);

  useEffect(() => {
    const scrollContainer = document.querySelector('.overflow-y-auto');
    
    if (!scrollContainer) return;

    const handleScroll = () => {
      const currentScrollY = scrollContainer.scrollTop;
      
      if (currentScrollY < 50) {
        setIsVisible(false);
      } else if (currentScrollY > lastScrollY.current) {
        setIsVisible(true);
      } else if (currentScrollY < lastScrollY.current) {
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
      style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-4 mb-3 px-4 py-3 bg-black/70 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-black/40">
        <div className="flex items-center justify-around gap-2">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <button
                key={index}
                onClick={item.onClick}
                className="relative flex flex-col items-center gap-1 transition-all duration-300 hover:scale-105 active:scale-95 min-w-[60px]"
              >
                <div className={`flex items-center justify-center transition-all duration-300 ${active ? 'scale-110' : ''}`}>
                  <Icon 
                    className={`w-[26px] h-[26px] ${active ? 'text-orange-500' : 'text-gray-400'}`}
                    strokeWidth={2}
                  />
                </div>

                {active && (
                  <div className="absolute -bottom-1 w-10 h-1 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full shadow-lg shadow-orange-500/50 animate-in slide-in-from-bottom-2" />
                )}

                {active && (
                  <span className="text-xs font-medium text-white animate-in fade-in-0 slide-in-from-bottom-1">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
