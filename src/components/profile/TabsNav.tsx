import React from 'react';
import { Home, Trophy, Wallet, Settings } from 'lucide-react';

interface TabsNavProps {
  activeTab: 'overview' | 'achievements' | 'wallet' | 'settings';
  onTabChange: (tab: 'overview' | 'achievements' | 'wallet' | 'settings') => void;
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
export function TabsNav({ activeTab, onTabChange }: TabsNavProps) {
  const tabs = [
    { id: 'overview' as const, icon: Home, emoji: '🏠', label: 'Overview' },
    { id: 'achievements' as const, icon: Trophy, emoji: '🏆', label: 'Achievements' },
    { id: 'wallet' as const, icon: Wallet, emoji: '💼', label: 'Wallet' },
    { id: 'settings' as const, icon: Settings, emoji: '⚙️', label: 'Settings' }
  ];

  return (
    <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="grid grid-cols-4 gap-0">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center justify-center py-3 transition-all duration-200
                ${isActive 
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-b-2 border-emerald-500' 
                  : 'border-b-2 border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }
              `}
              title={tab.label}
            >
              {isActive ? (
                <span className="text-[22px] leading-none">{tab.emoji}</span>
              ) : (
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
