import { useState, useEffect } from 'react';

export interface CountdownTime {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
  formatted: string;
}

/**
 * useCountdown - Real-time countdown timer hook
 * Updates every second until target date is reached
 * 
 * @param targetDate - ISO date string or Date object
 * @returns CountdownTime object with hours, minutes, seconds, and status
 */
export function useCountdown(targetDate: string | Date | null): CountdownTime {
  const [timeLeft, setTimeLeft] = useState<CountdownTime>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalSeconds: 0,
    isExpired: true,
    formatted: '0:00:00'
  });

  useEffect(() => {
    if (!targetDate) {
      setTimeLeft({
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalSeconds: 0,
        isExpired: true,
        formatted: '0:00:00'
      });
      return;
    }

    const calculateTimeLeft = (): CountdownTime => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const distance = target - now;

      if (distance <= 0) {
        return {
          hours: 0,
          minutes: 0,
          seconds: 0,
          totalSeconds: 0,
          isExpired: true,
          formatted: '0:00:00'
        };
      }

      const hours = Math.floor(distance / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      const totalSeconds = Math.floor(distance / 1000);

      return {
        hours,
        minutes,
        seconds,
        totalSeconds,
        isExpired: false,
        formatted: `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      };
    };

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const interval = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);

      // Clear interval if expired
      if (newTimeLeft.isExpired) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}
