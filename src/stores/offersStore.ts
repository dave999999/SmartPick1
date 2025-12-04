/**
 * Offers Store - Centralized offers state management
 * Caches offers data and prevents duplicate API calls
 */
import { create } from 'zustand';
import type { Offer } from '@/lib/types';

interface OffersState {
  offers: Offer[];
  selectedOffer: Offer | null;
  isLoading: boolean;
  lastFetch: number | null;
  cacheTimeout: number; // milliseconds
  
  // Actions
  setOffers: (offers: Offer[]) => void;
  addOffer: (offer: Offer) => void;
  updateOffer: (offerId: string, updates: Partial<Offer>) => void;
  removeOffer: (offerId: string) => void;
  setSelectedOffer: (offer: Offer | null) => void;
  setLoading: (loading: boolean) => void;
  clearOffers: () => void;
  shouldRefetch: () => boolean;
}

export const useOffersStore = create<OffersState>((set, get) => ({
  offers: [],
  selectedOffer: null,
  isLoading: false,
  lastFetch: null,
  cacheTimeout: 60000, // 60 seconds cache

  setOffers: (offers) =>
    set({ offers, lastFetch: Date.now(), isLoading: false }),

  addOffer: (offer) =>
    set((state) => ({ offers: [...state.offers, offer] })),

  updateOffer: (offerId, updates) =>
    set((state) => ({
      offers: state.offers.map((offer) =>
        offer.id === offerId ? { ...offer, ...updates } : offer
      ),
    })),

  removeOffer: (offerId) =>
    set((state) => ({
      offers: state.offers.filter((offer) => offer.id !== offerId),
    })),

  setSelectedOffer: (offer) => set({ selectedOffer: offer }),

  setLoading: (loading) => set({ isLoading: loading }),

  clearOffers: () =>
    set({ offers: [], selectedOffer: null, lastFetch: null }),

  shouldRefetch: () => {
    const { lastFetch, cacheTimeout } = get();
    if (!lastFetch) return true;
    return Date.now() - lastFetch > cacheTimeout;
  },
}));
