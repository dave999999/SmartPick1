import React from 'react';

interface JourneyLineMiniProps {
  totalReservations: number;
}

/**
 * JourneyLineMini - Ultra-compact one-line encouragement
 * 
 * Single line of friendly text based on user progress.
 * NO cards, NO padding, just a simple encouraging message.
 */
export function JourneyLineMini({ totalReservations }: JourneyLineMiniProps) {
  const getMessage = () => {
    if (totalReservations === 0) {
      return "Ready to start your journey? 🚀";
    } else if (totalReservations < 5) {
      return "You're off to a strong start — keep going! 🚀";
    } else if (totalReservations < 15) {
      return "Great progress — you're on fire! 🔥";
    } else {
      return "Amazing! You're a SmartPick superstar! ⭐";
    }
  };

  return (
    <p className="text-[11px] text-gray-600 dark:text-gray-400 text-center leading-tight">
      {getMessage()}
    </p>
  );
}
