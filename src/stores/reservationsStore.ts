/**
 * Reservations Store - Centralized reservations state management
 * Manages active and historical reservations with optimistic updates
 */
import { create } from 'zustand';
import type { Reservation } from '@/lib/types';

interface ReservationsState {
  reservations: Reservation[];
  activeReservation: Reservation | null;
  isLoading: boolean;
  lastFetch: number | null;
  
  // Actions
  setReservations: (reservations: Reservation[]) => void;
  addReservation: (reservation: Reservation) => void;
  updateReservation: (reservationId: string, updates: Partial<Reservation>) => void;
  removeReservation: (reservationId: string) => void;
  setActiveReservation: (reservation: Reservation | null) => void;
  setLoading: (loading: boolean) => void;
  clearReservations: () => void;
  
  // Computed getters
  getActiveReservations: () => Reservation[];
  getReservationById: (id: string) => Reservation | undefined;
}

export const useReservationsStore = create<ReservationsState>((set, get) => ({
  reservations: [],
  activeReservation: null,
  isLoading: false,
  lastFetch: null,

  setReservations: (reservations) => {
    const active = reservations.find((r) => r.status === 'ACTIVE') || null;
    set({ reservations, activeReservation: active, lastFetch: Date.now(), isLoading: false });
  },

  addReservation: (reservation) =>
    set((state) => {
      const newReservations = [...state.reservations, reservation];
      const active = reservation.status === 'ACTIVE' ? reservation : state.activeReservation;
      return { reservations: newReservations, activeReservation: active };
    }),

  updateReservation: (reservationId, updates) =>
    set((state) => {
      const newReservations = state.reservations.map((reservation) =>
        reservation.id === reservationId ? { ...reservation, ...updates } : reservation
      );
      const active = newReservations.find((r) => r.status === 'ACTIVE') || null;
      return { reservations: newReservations, activeReservation: active };
    }),

  removeReservation: (reservationId) =>
    set((state) => {
      const newReservations = state.reservations.filter((r) => r.id !== reservationId);
      const active = newReservations.find((r) => r.status === 'ACTIVE') || null;
      return { reservations: newReservations, activeReservation: active };
    }),

  setActiveReservation: (reservation) => set({ activeReservation: reservation }),

  setLoading: (loading) => set({ isLoading: loading }),

  clearReservations: () =>
    set({ reservations: [], activeReservation: null, lastFetch: null }),

  getActiveReservations: () =>
    get().reservations.filter((r) => r.status === 'ACTIVE'),

  getReservationById: (id) =>
    get().reservations.find((r) => r.id === id),
}));
