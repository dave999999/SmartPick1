import { useState, useEffect } from 'react';

const intervals = [
  { label: 'year', seconds: 31536000 },
  { label: 'month', seconds: 2592000 },
  { label: 'week', seconds: 604800 },
  { label: 'day', seconds: 86400 },
  { label: 'hour', seconds: 3600 },
  { label: 'minute', seconds: 60 },
  { label: 'second', seconds: 1 }
];

const formatTimeAgo = (date: Date): string => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const now = new Date();

  if (seconds < 5) {
    return 'Just now';
  }

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      if (interval.label === 'day' && count === 1) {
        return 'Yesterday';
      }
      return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`;
    }
  }

  // Fallback for dates in the same year
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  // Fallback for older dates
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

export const useTimeAgo = (dateString: string | Date) => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const [timeAgo, setTimeAgo] = useState(() => formatTimeAgo(date));

  useEffect(() => {
    const update = () => {
      setTimeAgo(formatTimeAgo(date));
    };

    // Update every minute to keep the relative time fresh
    const intervalId = setInterval(update, 60000);

    // Initial update
    update();

    return () => clearInterval(intervalId);
  }, [dateString]);

  return timeAgo;
};