import { useState, useEffect } from 'react';

const FAVORITES_KEY = 'smartpick-favorites';

export interface FavoriteItem {
  id: string;
  type: 'offer' | 'partner';
  addedAt: string;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = () => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const saveFavorites = (newFavorites: FavoriteItem[]) => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
      setFavorites(newFavorites);
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  };

  const isFavorite = (id: string, type: 'offer' | 'partner' = 'offer'): boolean => {
    return favorites.some(fav => fav.id === id && fav.type === type);
  };

  const addFavorite = (id: string, type: 'offer' | 'partner' = 'offer') => {
    if (!isFavorite(id, type)) {
      const newFavorite: FavoriteItem = {
        id,
        type,
        addedAt: new Date().toISOString(),
      };
      saveFavorites([...favorites, newFavorite]);
    }
  };

  const removeFavorite = (id: string, type: 'offer' | 'partner' = 'offer') => {
    const newFavorites = favorites.filter(fav => !(fav.id === id && fav.type === type));
    saveFavorites(newFavorites);
  };

  const toggleFavorite = (id: string, type: 'offer' | 'partner' = 'offer') => {
    if (isFavorite(id, type)) {
      removeFavorite(id, type);
      return false;
    } else {
      addFavorite(id, type);
      return true;
    }
  };

  const getFavoritesByType = (type: 'offer' | 'partner') => {
    return favorites.filter(fav => fav.type === type);
  };

  const clearFavorites = () => {
    saveFavorites([]);
  };

  return {
    favorites,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    getFavoritesByType,
    clearFavorites,
  };
}
