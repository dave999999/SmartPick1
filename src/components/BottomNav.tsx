/**
 * BottomNav - Fixed bottom navigation bar
 */

import { useState } from 'react';
import { Home, Heart, User, Menu } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MenuDrawer } from './MenuDrawer';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { 
      icon: Home, 
      label: 'Offers', 
      path: '/',
      isActive: location.pathname === '/'
    },
    { 
      icon: Heart, 
      label: 'Favorites', 
      path: '/favorites',
      isActive: location.pathname === '/favorites'
    },
    { 
      icon: User, 
      label: 'Profile', 
      path: '/profile',
      isActive: location.pathname === '/profile'
    },
    { 
      icon: Menu, 
      label: 'Menu', 
      action: () => setMenuOpen(true),
      isActive: false
    },
  ];

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg safe-area-bottom">
        <div className="flex items-center justify-around h-16 max-w-screen-xl mx-auto px-4">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = item.isActive;
            
            return (
              <button
                key={item.label}
                onClick={() => item.action ? item.action() : navigate(item.path!)}
                className={`
                  flex flex-col items-center justify-center gap-1 
                  min-w-[60px] h-full
                  transition-colors duration-200
                  ${isActive ? 'text-[#FF8A00]' : 'text-gray-600 hover:text-gray-900'}
                `}
              >
                <Icon 
                  className={`w-6 h-6 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`}
                />
                <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
