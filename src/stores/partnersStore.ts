/**
 * Partners Store - Centralized partner state management
 * Used for partner dashboard and admin panel
 */
import { create } from 'zustand';
import type { Partner, PartnerPoints } from '@/lib/types';

interface PartnersState {
  currentPartner: Partner | null;
  partnerPoints: PartnerPoints | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setCurrentPartner: (partner: Partner | null) => void;
  setPartnerPoints: (points: PartnerPoints | null) => void;
  updatePartnerPoints: (updates: Partial<PartnerPoints>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearPartner: () => void;
}

export const usePartnersStore = create<PartnersState>((set) => ({
  currentPartner: null,
  partnerPoints: null,
  isLoading: false,
  error: null,

  setCurrentPartner: (partner) =>
    set({ currentPartner: partner, isLoading: false, error: null }),

  setPartnerPoints: (points) => set({ partnerPoints: points }),

  updatePartnerPoints: (updates) =>
    set((state) => ({
      partnerPoints: state.partnerPoints
        ? { ...state.partnerPoints, ...updates }
        : null,
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error, isLoading: false }),

  clearPartner: () =>
    set({ currentPartner: null, partnerPoints: null, isLoading: false, error: null }),
}));
