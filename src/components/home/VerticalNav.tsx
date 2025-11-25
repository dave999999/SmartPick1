/**
 * Floating Vertical Navigation Bar
 * Neon-styled circular icons matching SmartPick map pin aesthetic
 * Positioned left side, vertically centered
 */

import { Home, ShoppingBag, Bookmark, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getCurrentUser, getPartnerByUserId } from '@/lib/api';

export function VerticalNav() {
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
      className="fixed z-[9999] flex flex-col gap-4"
      style={{
        left: '16px',
        top: '50%',
        transform: 'translateY(-50%)',
      }}
    >
      {navItems.map((item, index) => {
        const Icon = item.icon;
        const active = isActive(item.path);

        return (
          <button
            key={index}
            onClick={item.onClick}
            className="relative transition-all duration-300 group"
            style={{
              width: '52px',
              height: '52px',
            }}
            aria-label={item.label}
          >
            {/* Outer glow layer */}
            <div 
              className="absolute inset-0 rounded-full transition-all duration-300"
              style={{
                background: active 
                  ? 'radial-gradient(circle, rgba(255, 138, 0, 0.25) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(0, 246, 255, 0.15) 0%, transparent 70%)',
                filter: active 
                  ? 'blur(12px) brightness(1.6)'
                  : 'blur(8px)',
                transform: active ? 'scale(1.3)' : 'scale(1.1)',
              }}
            />

            {/* Neon ring border */}
            <div 
              className="absolute inset-0 rounded-full transition-all duration-300"
              style={{
                border: active 
                  ? '2px solid #FF8A00'
                  : '1.5px solid #00F6FF',
                boxShadow: active
                  ? '0 0 16px rgba(255, 138, 0, 0.6), 0 0 32px rgba(255, 138, 0, 0.3), inset 0 0 12px rgba(255, 138, 0, 0.2)'
                  : '0 0 10px rgba(0, 246, 255, 0.4), 0 0 20px rgba(0, 246, 255, 0.2), inset 0 0 8px rgba(0, 246, 255, 0.15)',
                transform: active ? 'scale(1.06)' : 'scale(1)',
              }}
            />

            {/* Icon */}
            <div 
              className="absolute inset-0 flex items-center justify-center transition-all duration-300"
              style={{
                transform: active ? 'scale(1.06)' : 'scale(1)',
              }}
            >
              <Icon 
                className="transition-all duration-300"
                style={{
                  width: '24px',
                  height: '24px',
                  color: active ? '#FF8A00' : '#00F6FF',
                  filter: active 
                    ? 'drop-shadow(0 0 6px rgba(255, 138, 0, 0.8))'
                    : 'drop-shadow(0 0 4px rgba(0, 246, 255, 0.6))',
                  strokeWidth: 2,
                }}
              />
            </div>

            {/* Hover/tap pulse animation */}
            <div 
              className="absolute inset-0 rounded-full transition-opacity duration-400 opacity-0 group-hover:opacity-100 group-active:opacity-100"
              style={{
                background: active
                  ? 'radial-gradient(circle, rgba(255, 138, 0, 0.3) 0%, transparent 60%)'
                  : 'radial-gradient(circle, rgba(0, 246, 255, 0.25) 0%, transparent 60%)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          </button>
        );
      })}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.15);
          }
        }

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
