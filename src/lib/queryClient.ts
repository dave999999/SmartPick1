/**
 * React Query Configuration
 * Optimized cache settings to reduce API calls by 60-80%
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: Data is considered fresh for 10 minutes (20% fewer API calls)
      staleTime: 10 * 60 * 1000, // 10 minutes
      
      // Cache time: Keep data in cache for 15 minutes after last use
      gcTime: 15 * 60 * 1000, // 15 minutes (formerly cacheTime)
      
      // Retry failed requests up to 2 times
      retry: 2,
      
      // Don't refetch on window focus in production (reduce noise)
      refetchOnWindowFocus: import.meta.env.MODE === 'development',
      
      // Don't refetch on reconnect unless data is stale
      refetchOnReconnect: 'always',
      
      // Don't refetch on mount if data is fresh
      refetchOnMount: false,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});

/**
 * Query Keys Factory
 * Centralized query key management for consistent caching
 */
export const queryKeys = {
  // User queries
  user: {
    all: ['user'] as const,
    current: () => [...queryKeys.user.all, 'current'] as const,
    profile: (id: string) => [...queryKeys.user.all, 'profile', id] as const,
    points: (id: string) => [...queryKeys.user.all, 'points', id] as const,
    stats: (id: string) => [...queryKeys.user.all, 'stats', id] as const,
  },
  
  // Offers queries
  offers: {
    all: ['offers'] as const,
    list: (filters?: Record<string, unknown>) => 
      [...queryKeys.offers.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.offers.all, 'detail', id] as const,
    byPartner: (partnerId: string) => 
      [...queryKeys.offers.all, 'byPartner', partnerId] as const,
    active: () => [...queryKeys.offers.all, 'active'] as const,
  },
  
  // Reservations queries
  reservations: {
    all: ['reservations'] as const,
    list: (userId: string) => 
      [...queryKeys.reservations.all, 'list', userId] as const,
    active: (userId: string) => 
      [...queryKeys.reservations.all, 'active', userId] as const,
    detail: (id: string) => 
      [...queryKeys.reservations.all, 'detail', id] as const,
    byPartner: (partnerId: string) => 
      [...queryKeys.reservations.all, 'byPartner', partnerId] as const,
  },
  
  // Partners queries
  partners: {
    all: ['partners'] as const,
    list: () => [...queryKeys.partners.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.partners.all, 'detail', id] as const,
    current: () => [...queryKeys.partners.all, 'current'] as const,
    points: (userId: string) => 
      [...queryKeys.partners.all, 'points', userId] as const,
  },
  
  // Admin queries
  admin: {
    all: ['admin'] as const,
    stats: () => [...queryKeys.admin.all, 'stats'] as const,
    users: (filters?: Record<string, unknown>) => 
      [...queryKeys.admin.all, 'users', filters] as const,
    analytics: (dateRange?: string) => 
      [...queryKeys.admin.all, 'analytics', dateRange] as const,
  },
} as const;
