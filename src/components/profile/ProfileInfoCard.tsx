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
    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-xl">
      <div className="p-3">
        <div className="grid grid-cols-2 gap-x-2.5 gap-y-2.5">
          {/* Email */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold text-gray-600 dark:text-gray-400 leading-none mb-0.5">Email</p>
              <p className="text-[11px] text-gray-900 dark:text-gray-100 truncate leading-tight font-semibold">{user.email}</p>
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
              <Phone className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold text-gray-600 dark:text-gray-400 leading-none mb-0.5">Phone</p>
              {user.phone ? (
                <p className="text-[11px] text-gray-900 dark:text-gray-100 truncate leading-tight font-semibold">{user.phone}</p>
              ) : (
                <button
                  onClick={onAddPhone}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 leading-tight font-extrabold hover:underline"
                >
                  + Add 🔓
                </button>
              )}
            </div>
          </div>

          {/* Member since */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold text-gray-600 dark:text-gray-400 leading-none mb-0.5">Member</p>
              <p className="text-[11px] text-gray-900 dark:text-gray-100 truncate leading-tight font-semibold">
                {new Date(user.created_at || '').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold text-gray-600 dark:text-gray-400 leading-none mb-0.5">Status</p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-extrabold truncate leading-tight">All good! 🎉</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
