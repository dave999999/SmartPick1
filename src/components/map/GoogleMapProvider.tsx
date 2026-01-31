/**
 * Google Maps Provider
 * 
 * Provides Google Maps API to React components via Context.
 * Handles loading, initialization, and safe access to Google Maps instance.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { loadGoogleMaps, isGoogleMapsLoaded } from '@/lib/maps/googleMapsLoader';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface GoogleMapsContextValue {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  google: any | null;
  googleMap: google.maps.Map | null;
  setGoogleMap: (map: google.maps.Map | null) => void;
}

const GoogleMapsContext = createContext<GoogleMapsContextValue>({
  isLoaded: false,
  isLoading: false,
  error: null,
  google: null,
  googleMap: null,
  setGoogleMap: () => {},
});

export function useGoogleMaps() {
  const context = useContext(GoogleMapsContext);
  if (!context) {
    throw new Error('useGoogleMaps must be used within GoogleMapProvider');
  }
  return context;
}

interface GoogleMapProviderProps {
  children: ReactNode;
  apiKey?: string;
  libraries?: string[];
}

export function GoogleMapProvider({ 
  children, 
  apiKey,
  libraries = ['places', 'geometry', 'marker']
}: GoogleMapProviderProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleInstance, setGoogleInstance] = useState<any>(null);
  const [googleMap, setGoogleMap] = useState<google.maps.Map | null>(null);

  useEffect(() => {
    logger.debug('🎯 GoogleMapProvider RENDER');
    
    // FIRST: Check if Google Maps exists in window (regardless of loader state)
    if (typeof window !== 'undefined' && window.google?.maps?.Map) {
      logger.debug('✅ GoogleMapProvider - Found existing window.google.maps.Map, using it immediately');
      setIsLoaded(true);
      setGoogleInstance(window.google);
      setIsLoading(false);
      return;
    }
    
    // Check if already loaded via loader
    if (isGoogleMapsLoaded()) {
      logger.debug('✅ GoogleMapProvider - Loaded via loader');
      setIsLoaded(true);
      setGoogleInstance(window.google);
      return;
    }
    
    logger.debug('🎯 GoogleMapProvider: Starting fresh load...');

    // Get API key from prop or environment
    const key = apiKey || 
                import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
                import.meta.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    logger.debug('🗺️ GoogleMapProvider - API Key Check:', {
      hasApiKeyProp: !!apiKey,
      hasEnvKey: !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
      keyLength: key?.length,
      keyPrefix: key?.substring(0, 20)
    });

    if (!key) {
      const errorMsg = 'Google Maps API key not found';
      setError(errorMsg);
      logger.error(errorMsg);
      toast.error('Map configuration missing');
      return;
    }

    // Load Google Maps
    setIsLoading(true);
    loadGoogleMaps({ 
      apiKey: key, 
      libraries,
      language: 'en',
      region: 'GE'
    })
      .then((google) => {
        setGoogleInstance(google);
        setIsLoaded(true);
        setIsLoading(false);
        logger.log('Google Maps loaded successfully');
      })
      .catch((err) => {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load Google Maps';
        setError(errorMsg);
        setIsLoading(false);
        logger.error('Failed to load Google Maps:', err);
        toast.error('Failed to load map');
      });
  }, [apiKey, libraries]);

  return (
    <GoogleMapsContext.Provider
      value={{
        isLoaded,
        isLoading,
        error,
        google: googleInstance,
        googleMap,
        setGoogleMap,
      }}
    >
      {children}
    </GoogleMapsContext.Provider>
  );
}
