import React from 'react';
import { Home, Trophy, Wallet, Settings } from 'lucide-react';

interface TabsNavProps {
  activeTab: 'overview' | 'achievements' | 'wallet' | 'settings';
  onTabChange: (tab: 'overview' | 'achievements' | 'wallet' | 'settings') => void;
  unclaimedCount?: number;
}

/**
 * TabsNav - Icon-only navigation (ultra compact)
 * 
 * Features:
 * - Icons only (no text labels)
 * - 4 equal-width tabs
 * - Active state with gradient background
 * - Fits perfectly on all screen sizes
 */
export function TabsNav({ activeTab, onTabChange, unclaimedCount = 0 }: TabsNavProps) {
  const tabs = [
    { id: 'overview' as const, icon: Home, emoji: '🏠', label: 'Overview' },
    { id: 'achievements' as const, icon: Trophy, emoji: '🏆', label: 'Achievements' },
    { id: 'wallet' as const, icon: Wallet, emoji: '💼', label: 'Wallet' },
    { id: 'settings' as const, icon: Settings, emoji: '⚙️', label: 'Settings' }
  ];

  return (
    <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="grid grid-cols-4 gap-0">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                relative flex items-center justify-center py-3 transition-all duration-200
                ${isActive 
                  ? 'bg-emerald-50 dark:bg-emerald-900/30' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }
              `}
              title={tab.label}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 dark:bg-emerald-500" />
              )}
              
              {/* Icon/Emoji */}
              {isActive ? (
                <span className="text-[22px] leading-none animate-bounce">{tab.emoji}</span>
              ) : (
                <Icon className={`w-5 h-5 transition-all duration-200 ${
                  isActive 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:scale-110'
                }`} />
              )}
              
              {/* Unclaimed badge for achievements tab */}
              {tab.id === 'achievements' && unclaimedCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg ring-2 ring-white dark:ring-gray-800 animate-pulse">
                  {unclaimedCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
