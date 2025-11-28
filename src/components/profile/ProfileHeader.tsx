import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import type { User } from '@/lib/types';

interface ProfileHeaderProps {
  user: User;
  onEdit: () => void;
}

/**
 * ProfileHeader - Warm, compact, friendly header
 * 
 * Features:
 * - Large avatar with soft glow
 * - Friendly greeting: "Hi Dave 👋"
 * - Subtext: "Your SmartPick journey so far"
 * - User badge (Partner/Customer)
 * - Edit button
 * - Soft gradient background
 */
export function ProfileHeader({ user, onEdit }: ProfileHeaderProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getUserBadge = (role: string) => {
    if (role?.toLowerCase() === 'partner') return '🌟 Partner';
    if (role?.toLowerCase() === 'admin') return '👑 Admin';
    return '💚 Member';
  };

  const firstName = user.name?.split(' ')[0] || 'Friend';

  return (
    <div className="relative bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      {/* Subtle top gradient accent only */}
      <div className="absolute top-0 left-0 right-0 h-full bg-gradient-to-br from-emerald-50/40 via-transparent to-teal-50/30 dark:from-emerald-900/10 dark:to-teal-900/10" />
      
      <div className="relative flex items-center gap-3">
        {/* Avatar with solid green ring */}
        <div className="relative">
          <Avatar className="w-11 h-11 border-3 border-emerald-500 dark:border-emerald-400 shadow-md shadow-emerald-500/30">
            <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm font-bold">
              {getInitials(user.name || 'User')}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 dark:bg-emerald-400 rounded-full border-2 border-white dark:border-gray-800 shadow-sm" />
        </div>

        {/* Clear greeting */}
        <div className="flex-1 min-w-0">
          <h1 className="text-[16px] font-extrabold text-gray-900 dark:text-gray-100 leading-none mb-1">
            Hi {firstName}! 👋
          </h1>
          <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-none font-semibold">
            Your SmartPick journey ✨
          </p>
        </div>

        {/* Badge & Edit */}
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/50 rounded-full border border-emerald-300 dark:border-emerald-700">
            <span className="text-[10px] font-extrabold text-emerald-800 dark:text-emerald-400">
              {getUserBadge(user.role || '')}
            </span>
          </div>
          <Button
            onClick={onEdit}
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-110 transition-all duration-200 active:scale-95"
          >
            <Edit className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" />
          </Button>
        </div>
      </div>
    </div>
  );
}
