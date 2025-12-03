/**
 * FloatingBottomNav - Ultra-Compact Apple-Grade Navigation
 * 
 * DESIGN PRINCIPLES:
 * - Apple Human Interface Guidelines
 * - SF Symbols icon weight (medium stroke)
 * - Minimal height, maximum touch targets
 * - Subtle floating effect
 * - Premium micro-interactions
 * 
 * SPECIFICATIONS:
 * - Bar Height: 56px
 * - Center Button: 50px diameter
 * - Icon Size: 20px (SF Symbol medium)
 * - Label Size: 11px (SF Caption)
 * - Bottom Gap: 8px
 * - Corner Radius: 20px
 * - Shadow: Soft floating sheet
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
      {/* Main Navigation Container - Ultra Compact Apple Style */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        {/* 8px bottom gap (Apple standard) */}
        <div className="pb-2 relative">
          {/* Floating Sheet - 54px height */}
          <div 
            className="
              relative mx-3 mb-0
              bg-white/95 dark:bg-sp-surface1/95
              rounded-[20px]
              shadow-[0_-2px_16px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)]
              dark:shadow-[0_-2px_16px_rgba(0,0,0,0.3)]
              border border-[#E5E5E5]/50 dark:border-sp-border-soft
              pointer-events-auto
              backdrop-blur-xl backdrop-saturate-150
            "
            style={{
              height: '54px',
            }}
          >
            {/* Navigation Items Grid */}
            <div className="flex items-center justify-between h-full px-2">
              
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
              <div className="w-[56px]" />

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

            {/* Floating Center Button - Apple Style 50px */}
            <div className="absolute left-1/2 -translate-x-1/2 -top-[14px]">
              <button
                onClick={onSearchClick}
                className="
                  relative
                  w-[50px] h-[50px]
                  rounded-full
                  bg-gradient-to-br from-[#FF7A00] to-[#E56B00]
                  shadow-[0_2px_8px_rgba(255,122,0,0.2),0_4px_12px_rgba(255,122,0,0.15)]
                  hover:shadow-[0_4px_12px_rgba(255,122,0,0.3),0_6px_16px_rgba(255,122,0,0.2)]
                  active:scale-[1.15]
                  transition-all duration-150 ease-out
                  flex items-center justify-center
                  group
                  will-change-transform
                "
                aria-label="Discover Deals"
                style={{
                  animation: 'float 3s ease-in-out infinite',
                }}
              >
                {/* Glow Ring */}
                <div className="
                  absolute inset-0 rounded-full
                  bg-gradient-to-br from-[#FF7A00] to-[#E56B00]
                  opacity-0 blur-xl
                  group-hover:opacity-40 group-active:opacity-60
                  transition-opacity duration-200
                " />
                
                {/* Icon */}
                <div className="relative z-10 scale-95">
                  <SearchIcon />
                </div>
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
        flex flex-col items-center justify-center gap-0.5
        min-w-[52px] h-full py-1.5
        transition-all duration-150 ease-out
        group
        ${isActive ? 'scale-105' : 'scale-100 hover:scale-102'}
      `}
      aria-label={label}
    >
      {/* Icon - SF Symbol Medium Weight */}
      <div className={`
        transition-all duration-150
        ${isActive ? 'text-[#FF7A00]' : 'text-[#666666]'}
        group-hover:text-[#FF7A00]
      `}>
        <div className="w-5 h-5 flex items-center justify-center">
          {icon}
        </div>
      </div>
      
      {/* Label - SF Caption */}
      <span className={`
        text-[11px] font-medium leading-none tracking-tight
        transition-all duration-150
        ${isActive ? 'text-[#FF7A00]' : 'text-[#999999]'}
        group-hover:text-[#FF7A00]
      `}>
        {label}
      </span>
    </button>
  );
}

// ============================================
// MINIMALISTIC SVG ICONS
// ============================================

function HomeIcon() {
  return (
    <svg
      width="20"
      height="20"
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
      width="20"
      height="20"
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
      width="24"
      height="24"
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
      width="20"
      height="20"
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
      width="20"
      height="20"
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
