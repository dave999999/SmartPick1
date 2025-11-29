/**
 * FloatingBottomNav - Premium curved bottom navigation with floating center button
 * Design inspired by modern mobile apps (Revolut, Uber, Apple Wallet)
 * Features: cosmic orange theme, elevated center button, smooth animations
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MenuDrawer } from './MenuDrawer';

interface FloatingBottomNavProps {
  onSearchClick?: () => void;
}

export function FloatingBottomNav({ onSearchClick }: FloatingBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Main Navigation Container */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        {/* Safe area padding for iOS home indicator */}
        <div className="pb-safe relative">
          {/* Floating curved bar */}
          <div 
            className="
              relative mx-3 mb-2
              bg-white dark:bg-sp-surface1
              rounded-[24px]
              shadow-[0_8px_32px_rgba(0,0,0,0.1)]
              dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]
              border border-gray-100 dark:border-sp-border-soft
              pointer-events-auto
              backdrop-blur-xl
              bg-opacity-95 dark:bg-opacity-95
            "
            style={{
              height: '64px',
            }}
          >
            {/* Navigation Items Grid */}
            <div className="flex items-center justify-between h-full px-3">
              
              {/* Left Section - Home */}
              <NavButton
                onClick={() => navigate('/')}
                isActive={isActive('/')}
                icon={<HomeIcon />}
                label="Home"
                compact
              />

              {/* Favorites */}
              <NavButton
                onClick={() => navigate('/favorites')}
                isActive={isActive('/favorites')}
                icon={<HeartIcon />}
                label="Favorites"
                compact
              />

              {/* Center Space for Floating Button */}
              <div className="w-[68px]" />

              {/* Profile */}
              <NavButton
                onClick={() => navigate('/profile')}
                isActive={isActive('/profile')}
                icon={<UserIcon />}
                label="Profile"
                compact
              />

              {/* Right Section - Menu */}
              <NavButton
                onClick={() => setMenuOpen(true)}
                isActive={false}
                icon={<MenuIcon />}
                label="Menu"
                compact
              />
            </div>

            {/* Floating Center Button - Search Offers */}
            <div className="absolute left-1/2 -translate-x-1/2 -top-4">
              <button
                onClick={onSearchClick}
                className="
                  relative
                  w-[60px] h-[60px]
                  rounded-full
                  bg-gradient-to-br from-[#FF8A00] to-[#FF6B00]
                  shadow-[0_6px_20px_rgba(255,138,0,0.35)]
                  hover:shadow-[0_8px_24px_rgba(255,138,0,0.45)]
                  active:scale-95
                  transition-all duration-300
                  flex items-center justify-center
                  group
                  animate-float
                "
                aria-label="Search Offers"
              >
                {/* Glow effect */}
                <div className="
                  absolute inset-0 rounded-full
                  bg-gradient-to-br from-[#FF8A00] to-[#FF6B00]
                  opacity-40 blur-xl
                  group-hover:opacity-60
                  transition-opacity duration-300
                " />
                
                {/* Icon */}
                <SearchIcon />
              </button>
            </div>
          </div>
        </div>
      </div>

      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-3px);
          }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        /* iOS safe area support */
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
      `}</style>
    </>
  );
}

// Navigation Button Component
interface NavButtonProps {
  onClick: () => void;
  isActive: boolean;
  icon: React.ReactNode;
  label: string;
  compact?: boolean;
}

function NavButton({ onClick, isActive, icon, label }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center
        min-w-[56px] h-full
        transition-all duration-300 ease-out
        group
        ${isActive ? 'scale-105' : 'scale-100 hover:scale-105'}
      `}
      aria-label={label}
    >
      {/* Icon Container */}
      <div className={`
        transition-all duration-300
        ${isActive ? 'text-[#FF8A00] dark:text-[#FF8A00]' : 'text-gray-500 dark:text-sp-text-muted'}
        group-hover:text-[#FF8A00]
      `}>
        {icon}
      </div>

      {/* Label */}
      <span className={`
        mt-1 text-[10px] font-medium tracking-wide
        transition-all duration-300
        ${isActive 
          ? 'text-[#FF8A00] dark:text-[#FF8A00] font-semibold scale-100 opacity-100' 
          : 'text-gray-600 dark:text-sp-text-muted scale-95 opacity-80'
        }
        group-hover:text-[#FF8A00] group-hover:scale-100 group-hover:opacity-100
      `}>
        {label}
      </span>

      {/* Active indicator dot */}
      {isActive && (
        <div className="
          mt-0.5 w-1 h-1 rounded-full 
          bg-[#FF8A00]
          animate-pulse
        " />
      )}
    </button>
  );
}

// ============================================
// MINIMALISTIC SVG ICONS
// ============================================

function HomeIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="white"
      className="relative z-10 drop-shadow-lg"
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
      <path d="M4 17v2" />
      <path d="M5 18H3" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
