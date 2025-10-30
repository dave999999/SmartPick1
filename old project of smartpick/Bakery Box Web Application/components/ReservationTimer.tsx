import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import styles from './ReservationTimer.module.css';

interface ReservationTimerProps {
  expiresAt: Date | string;
  onExpired?: () => void;
  className?: string;
}

export const ReservationTimer = ({ expiresAt, onExpired, className }: ReservationTimerProps) => {
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const expirationDate = new Date(expiresAt);
    return Math.max(0, expirationDate.getTime() - Date.now());
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      const expirationDate = new Date(expiresAt);
      const newTimeLeft = Math.max(0, expirationDate.getTime() - Date.now());
      
      setTimeLeft(newTimeLeft);

      if (newTimeLeft === 0 && onExpired) {
        onExpired();
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [expiresAt, onExpired]);

  const isExpired = timeLeft <= 0;
  const isWarning = !isExpired && timeLeft < 5 * 60 * 1000; // Less than 5 minutes

  const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
  const seconds = Math.floor((timeLeft / 1000) % 60);

  const timerClassName = [
    styles.timer,
    isExpired ? styles.expired : '',
    isWarning ? styles.warning : '',
    className || ''
  ].join(' ').trim();

  return (
    <div className={timerClassName}>
      <Clock size={16} />
      <span>
        {isExpired
          ? 'Expired'
          : `Time remaining: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`}
      </span>
    </div>
  );
};