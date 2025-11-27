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
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Compact Avatar */}
        <div className="relative">
          <Avatar className="w-11 h-11 border-2 border-emerald-500 dark:border-emerald-400">
            <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm font-bold">
              {getInitials(user.name || 'User')}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 dark:bg-emerald-400 rounded-full border-2 border-white dark:border-gray-800" />
        </div>

        {/* Compact Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-[16px] font-bold text-gray-900 dark:text-gray-100 leading-none mb-0.5">
            Hi {firstName}! 👋
          </h1>
          <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-none">
            Your SmartPick journey
          </p>
        </div>

        {/* Badge & Edit */}
        <div className="flex items-center gap-2">
          <div className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-full">
            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
              {getUserBadge(user.role || '')}
            </span>
          </div>
          <Button
            onClick={onEdit}
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Edit className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
          </Button>
        </div>
      </div>
    </div>
  );
}
