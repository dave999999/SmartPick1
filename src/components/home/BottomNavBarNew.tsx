/**
 * REFACTORED: Premium Dark Bottom Navigation
 * Floating glass nav bar with glow effects
 */

import { Home, ShoppingBag, Bookmark, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getCurrentUser, getPartnerByUserId } from '@/lib/api';

export function BottomNavBarNew() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isPartner, setIsPartner] = useState(false);

  useEffect(() => {
    checkUserType();
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
      className="fixed left-0 right-0 z-[9999]"
      style={{ 
        bottom: 'env(safe-area-inset-bottom)',
        height: '50px',
      }}
    >
      <div className="h-full flex items-center justify-center px-3">
        <div className="
          px-6 py-2
          backdrop-blur-[16px]
          rounded-3xl
          border border-sp-border-soft
          w-full max-w-md
        "
          style={{
            background: 'rgba(5, 10, 18, 0.85)',
            boxShadow: '0 -2px 16px rgba(0, 246, 255, 0.15), 0 4px 24px rgba(0, 0, 0, 0.7)',
          }}
        >
          <div className="flex items-center justify-around gap-4">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <button
                  key={index}
                  onClick={item.onClick}
                  className="
                    relative flex items-center justify-center
                    transition-all duration-200 
                    hover:scale-110 active:scale-95 
                    w-10 h-10
                  "
                >
                  <div className={`
                    relative flex items-center justify-center
                    transition-all duration-200 
                    ${active ? 'scale-110' : ''}
                  `}>
                    <Icon 
                      className={`
                        w-6 h-6
                        ${active ? 'text-sp-accent-orange' : 'text-sp-text-muted'}
                        transition-colors duration-200
                      `}
                      strokeWidth={2.5}
                    />
                    
                    {/* Glow ring for active */}
                    {active && (
                      <div className="
                        absolute inset-0 
                        rounded-full 
                        bg-sp-accent-orange 
                        opacity-20 
                        blur-md 
                        scale-150
                        animate-pulse
                      " />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
