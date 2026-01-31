import { logger } from '@/lib/logger';
/**
 * Google Maps JavaScript API Loader
 * 
 * Handles safe loading of Google Maps API in Next.js/React with SSR support.
 * Provides singleton pattern to prevent multiple script injections.
 */

// Extend Window interface to include google
declare global {
  interface Window {
    google: any;
    __googleMapsCallback?: () => void;
  }
}

// Global state for tracking loading
let googleMapsPromise: Promise<any> | null = null;
let isLoaded = false;

export interface GoogleMapsLoaderOptions {
  apiKey: string;
  libraries?: string[];
  language?: string;
  region?: string;
}

/**
 * Load Google Maps JavaScript API
 * 
 * @param options - Configuration options
 * @returns Promise that resolves to the global google object
 */
export async function loadGoogleMaps(
  options: GoogleMapsLoaderOptions
): Promise<any> {
  // Check if already loaded
  if (isLoaded && typeof window !== 'undefined' && window.google?.maps?.Map) {
    logger.debug('✅ Google Maps already loaded, returning existing instance');
    return window.google;
  }

  // Check if window.google exists but isLoaded is false (e.g., after remount)
  if (typeof window !== 'undefined' && window.google?.maps) {
    // With `loading=async`, Google can expose `google.maps` before constructors exist.
    // Only treat it as loaded when `google.maps.Map` is actually available.
    if (window.google?.maps?.Map) {
      logger.debug('✅ Google Maps found in window, updating state');
      isLoaded = true;
      return window.google;
    }
  }

  // Return existing promise if already loading
  if (googleMapsPromise) {
    logger.debug('⏳ Google Maps already loading, returning existing promise');
    return googleMapsPromise;
  }

  // SSR check
  if (typeof window === 'undefined') {
    throw new Error('Google Maps can only be loaded in the browser');
  }

  // Create new loading promise
  googleMapsPromise = new Promise((resolve, reject) => {
    // Check if already loaded by another script
    if (window.google?.maps?.Map) {
      isLoaded = true;
      resolve(window.google);
      return;
    }

    // Create script element
    const script = document.createElement('script');
    
    // Build URL with parameters
    const params = new URLSearchParams({
      key: options.apiKey,
      libraries: (options.libraries || ['places', 'geometry']).join(','),
      callback: '__googleMapsCallback',
      loading: 'async',
    });

    if (options.language) {
      params.set('language', options.language);
    }
    if (options.region) {
      params.set('region', options.region);
    }

    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    
    logger.debug('🗺️ Loading Google Maps with URL:', script.src);

    // Define callback
    (window as any).__googleMapsCallback = () => {
      // NOTE: With `loading=async`, the callback can fire before legacy constructors
      // like google.maps.Map are present. Ensure the 'maps' library is fully imported.
      void (async () => {
        try {
          if (!window.google?.maps?.Map && typeof window.google?.maps?.importLibrary === 'function') {
            await window.google.maps.importLibrary('maps');
          }

          // Fallback: small poll to allow constructors to appear.
          const start = Date.now();
          while (!window.google?.maps?.Map && Date.now() - start < 2000) {
            await new Promise(r => setTimeout(r, 50));
          }

          if (!window.google?.maps?.Map) {
            throw new Error('Google Maps loaded but google.maps.Map is not available');
          }

          logger.debug('✅ Google Maps loaded successfully (Map constructor ready)');
          clearTimeout(timeout);
          isLoaded = true;
          resolve(window.google);
        } catch (e) {
          logger.error('❌ Google Maps callback fired but Map constructor unavailable:', e);
          googleMapsPromise = null;
          reject(e instanceof Error ? e : new Error('Google Maps initialization failed'));
        } finally {
          delete (window as any).__googleMapsCallback;
        }
      })();
    };

    // Error handler
    script.onerror = (error) => {
      logger.error('❌ Google Maps script failed to load:', error);
      googleMapsPromise = null;
      reject(new Error('Failed to load Google Maps script'));
    };
    
    // Timeout handler (in case callback never fires)
    const timeout = setTimeout(() => {
      if (!isLoaded) {
        logger.error('❌ Google Maps loading timed out after 10 seconds');
        googleMapsPromise = null;
        reject(new Error('Google Maps loading timed out'));
      }
    }, 10000);

    // Inject script
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

/**
 * Check if Google Maps is already loaded
 */
export function isGoogleMapsLoaded(): boolean {
  return isLoaded && typeof window !== 'undefined' && !!window.google?.maps?.Map;
}

/**
 * Get loaded Google Maps instance (or null if not loaded)
 */
export function getGoogleMaps(): any {
  if (typeof window === 'undefined') return null;
  return window.google || null;
}

/**
 * Reset loader state (mainly for testing)
 */
export function resetGoogleMapsLoader(): void {
  googleMapsPromise = null;
  isLoaded = false;
}
