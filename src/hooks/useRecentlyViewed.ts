import { useState, useEffect } from 'react';

const RECENTLY_VIEWED_KEY = 'smartpick-recently-viewed';
const MAX_RECENTLY_VIEWED = 20;

export interface RecentlyViewedItem {
  id: string;
  type: 'offer' | 'partner';
  viewedAt: string;
}

export function useRecentlyViewed() {
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedItem[]>([]);

  useEffect(() => {
    loadRecentlyViewed();
  }, []);

  const loadRecentlyViewed = () => {
    try {
      const stored = localStorage.getItem(RECENTLY_VIEWED_KEY);
      if (stored) {
        setRecentlyViewed(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading recently viewed:', error);
    }
  };

  const saveRecentlyViewed = (items: RecentlyViewedItem[]) => {
    try {
      localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(items));
      setRecentlyViewed(items);
    } catch (error) {
      console.error('Error saving recently viewed:', error);
    }
  };

  const addRecentlyViewed = (id: string, type: 'offer' | 'partner' = 'offer') => {
    // Remove if already exists (to update timestamp and move to top)
    const filtered = recentlyViewed.filter(item => !(item.id === id && item.type === type));

    // Add to beginning of array
    const newItem: RecentlyViewedItem = {
      id,
      type,
      viewedAt: new Date().toISOString(),
    };

    // Keep only the most recent MAX_RECENTLY_VIEWED items
    const updated = [newItem, ...filtered].slice(0, MAX_RECENTLY_VIEWED);
    saveRecentlyViewed(updated);
  };

  const getRecentlyViewedByType = (type: 'offer' | 'partner') => {
    return recentlyViewed.filter(item => item.type === type);
  };

  const clearRecentlyViewed = () => {
    saveRecentlyViewed([]);
  };

  return {
    recentlyViewed,
    addRecentlyViewed,
    getRecentlyViewedByType,
    clearRecentlyViewed,
  };
}
