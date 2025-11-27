import React from 'react';
import { Card } from '@/components/ui/card';
import { Sparkles, TrendingUp } from 'lucide-react';

interface JourneyCardProps {
  stats: {
    totalReservations: number;
    currentStreak: number;
  };
}

/**
 * JourneyCard - Encouraging journey progress message
 * 
 * Shows warm, personalized encouragement based on user's stats:
 * - New users: "You're off to a great start! 🌱"
 * - Active users: "You're on fire! Keep it up! 🔥"
 * - Super users: "Wow! You're a SmartPick superstar! ⭐"
 * 
 * Soft gradient background, sparkle icon, motivational copy
 */
export function JourneyCard({ stats }: JourneyCardProps) {
  const getMessage = () => {
    if (stats.totalReservations === 0) {
      return {
        title: "Welcome to SmartPick! 🌱",
        subtitle: "Your first reservation is just a tap away",
        emoji: "🎉"
      };
    }
    
    if (stats.totalReservations < 5) {
      return {
        title: "You're off to a great start! 🌱",
        subtitle: `${stats.totalReservations} ${stats.totalReservations === 1 ? 'reservation' : 'reservations'} and counting`,
        emoji: "💚"
      };
    }
    
    if (stats.currentStreak >= 7) {
      return {
        title: "Wow! You're on fire! 🔥",
        subtitle: `${stats.currentStreak}-day streak — that's incredible!`,
        emoji: "⚡"
      };
    }
    
    if (stats.totalReservations >= 20) {
      return {
        title: "You're a SmartPick superstar! ⭐",
        subtitle: `${stats.totalReservations} reservations — amazing work!`,
        emoji: "👏"
      };
    }
    
    return {
      title: "Keep up the great work! 💪",
      subtitle: `You're making a real difference`,
      emoji: "🌟"
    };
  };

  const message = getMessage();

  return (
    <Card className="relative overflow-hidden border-gray-200 dark:border-gray-700 shadow-sm bg-gradient-to-br from-emerald-50/80 via-teal-50/80 to-cyan-50/80 dark:from-emerald-900/20 dark:via-teal-900/20 dark:to-cyan-900/20">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-300/20 to-teal-300/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-gradient-to-br from-cyan-300/20 to-blue-300/20 rounded-full blur-2xl" />

      <div className="relative p-3 flex items-start gap-2.5">
        {/* Icon */}
        <div className="w-8 h-8 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-sm">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
        </div>

        {/* Content */}
        <div className="flex-1 pt-0">
          <h3 className="text-[13px] font-bold text-gray-900 dark:text-gray-100 mb-0.5 leading-tight">
            {message.title}
          </h3>
          <p className="text-[11px] text-gray-700 dark:text-gray-300 leading-snug">
            {message.subtitle}
          </p>
        </div>

        {/* Emoji badge */}
        <div className="text-[20px] leading-none flex-shrink-0">
          {message.emoji}
        </div>
      </div>

      {/* Subtle progress indicator */}
      {stats.totalReservations > 0 && (
        <div className="px-3 pb-3">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-600 dark:text-gray-400">
            <TrendingUp className="w-3 h-3" />
            <span>You're in the top {stats.totalReservations >= 20 ? '10' : '25'}% of users</span>
          </div>
        </div>
      )}
    </Card>
  );
}
