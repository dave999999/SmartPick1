import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Phone, Calendar, CheckCircle, Plus } from 'lucide-react';
import type { User } from '@/lib/types';

interface ProfileInfoCardProps {
  user: User;
  onAddPhone?: () => void;
}

/**
 * ProfileInfoCard - Compact, friendly info display
 * 
 * Shows:
 * - Email
 * - Phone (or "Add phone" link)
 * - Member since date
 * - Status (All good!)
 * 
 * Ultra-compact, friendly icons, warm tone
 */
export function ProfileInfoCard({ user, onAddPhone }: ProfileInfoCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="p-3">
        <div className="grid grid-cols-2 gap-x-2.5 gap-y-2">
          {/* Email */}
          <div className="flex items-center gap-1.5 min-w-0">
            <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-medium text-gray-500 dark:text-gray-400 leading-none mb-0.5">Email</p>
              <p className="text-[11px] text-gray-900 dark:text-gray-100 truncate leading-tight">{user.email}</p>
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-center gap-1.5 min-w-0">
            <Phone className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-medium text-gray-500 dark:text-gray-400 leading-none mb-0.5">Phone</p>
              {user.phone ? (
                <p className="text-[11px] text-gray-900 dark:text-gray-100 truncate leading-tight">{user.phone}</p>
              ) : (
                <button
                  onClick={onAddPhone}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline leading-tight"
                >
                  + Add phone
                </button>
              )}
            </div>
          </div>

          {/* Member since */}
          <div className="flex items-center gap-1.5 min-w-0">
            <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-medium text-gray-500 dark:text-gray-400 leading-none mb-0.5">Member</p>
              <p className="text-[11px] text-gray-900 dark:text-gray-100 truncate leading-tight">
                {new Date(user.created_at || '').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-1.5 min-w-0">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-medium text-gray-500 dark:text-gray-400 leading-none mb-0.5">Status</p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium truncate leading-tight">All good 🎉</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
