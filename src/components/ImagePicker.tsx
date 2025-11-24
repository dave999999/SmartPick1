import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2, ImageIcon } from 'lucide-react';
import { logger } from '@/lib/logger';

interface ImagePickerProps {
  category: string;
  onSelect: (imageUrl: string) => void;
  selectedImage?: string | null;
}

interface LibraryResponse {
  success?: boolean;
  category?: string;
  count?: number;
  images: string[];
}

// Simple in-module cache to avoid refetching the same category repeatedly
const imageCache = new Map<string, string[]>();
const KNOWN_CATEGORIES = [
  'RESTAURANT',
  'FAST_FOOD',
  'BAKERY',
  'DESSERTS_SWEETS',
  'CAFE',
  'DRINKS_JUICE',
  'GROCERY',
  'MINI_MARKET',
  'MEAT_BUTCHER',
  'FISH_SEAFOOD',
  'ALCOHOL',
  'GEORGIAN_TRADITIONAL',
];

export default function ImagePicker({
  category,
  onSelect,
  selectedImage = null,
}: ImagePickerProps) {
  const [libraryImages, setLibraryImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(selectedImage);

  // Fetch library images when category changes
  useEffect(() => {
    const fetchLibraryImages = async () => {
      const raw = category?.trim();
      if (!raw) {
        setLibraryImages([]);
        setLoading(false);
        return;
      }

      const normalized = raw.toUpperCase();
      setLoading(true);
      setError(null);

      // Serve from cache if present
      if (imageCache.has(normalized)) {
        setLibraryImages(imageCache.get(normalized)!);
        setLoading(false);
        return;
      }

      try {
  // 1. Try API route (production)
  // Use encodeURIComponent for defense-in-depth and to support any non-ASCII in input
  const apiResp = await fetch(`/api/library?category=${encodeURIComponent(normalized)}`);
        if (apiResp.ok) {
          const data: LibraryResponse = await apiResp.json();
          if (Array.isArray(data.images) && data.images.length) {
            imageCache.set(normalized, data.images);
            setLibraryImages(data.images);
            setLoading(false);
            return;
          }
        } else {
          logger.warn(`API library fetch failed status=${apiResp.status} category=${normalized}`);
        }

        // Helper to load manifest for given category & casing
        const loadManifest = async (cat: string): Promise<string[] | null> => {
          try {
            const url = `/library/${cat}/manifest.json`;
            const resp = await fetch(url);
            if (!resp.ok) return null;
            const manifest = await resp.json();
            const images: string[] = Array.isArray(manifest.images)
              ? manifest.images
              : typeof manifest.images === 'string'
                ? [manifest.images]
                : [];
            if (!images.length) return null;
            return images.map(img => `/library/${cat}/${img}`);
          } catch (e) {
            logger.warn('Manifest load error', { e, cat });
            return null;
          }
        };

        // 2. Try uppercase manifest
        const upperImages = await loadManifest(normalized);
        if (upperImages) {
          imageCache.set(normalized, upperImages);
          setLibraryImages(upperImages);
          setLoading(false);
          return;
        }

        // 3. Try lowercase manifest (in case filesystem was added differently)
        const lower = normalized.toLowerCase();
        if (lower !== normalized) {
          const lowerImages = await loadManifest(lower);
          if (lowerImages) {
            imageCache.set(normalized, lowerImages);
            setLibraryImages(lowerImages);
            setLoading(false);
            return;
          }
        }

        // 4. Try known category aliasing (e.g. FASTFOOD -> FAST_FOOD)
        if (!KNOWN_CATEGORIES.includes(normalized)) {
          const alias = KNOWN_CATEGORIES.find(c => c.replace('_','') === normalized.replace('_',''));
          if (alias && alias !== normalized) {
            const aliasImages = await loadManifest(alias);
            if (aliasImages) {
              imageCache.set(normalized, aliasImages);
              setLibraryImages(aliasImages);
              setLoading(false);
              return;
            }
          }
        }

        // Nothing found
        logger.warn(`No images found after all fallbacks for category=${normalized}`);
        setLibraryImages([]);
      } catch (err) {
        logger.error('Unhandled image library fetch error:', err);
        setError('Could not load images. Please try again.');
        setLibraryImages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLibraryImages();
  }, [category]);

  // Handle image selection from library
  const handleLibrarySelect = (imageUrl: string) => {
    setSelected(imageUrl);
    onSelect(imageUrl);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Choose Product Image</h3>
          <p className="text-sm text-gray-500">
            Select from our image library
          </p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#00C896] animate-spin" />
          <span className="ml-3 text-gray-600">Loading images...</span>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card className="p-6 bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <ImageIcon className="w-6 h-6 text-red-500" />
            <div>
              <p className="font-medium text-red-900">{error}</p>
              <p className="text-sm text-red-700">Check your connection or category selection. If this persists, contact support.</p>
            </div>
          </div>
        </Card>
      )}

      {/* Library Images Grid */}
      {!loading && !error && libraryImages.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {libraryImages.map((imageUrl, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleLibrarySelect(imageUrl)}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all duration-200 hover:scale-105 hover:shadow-lg ${
                selected === imageUrl
                  ? 'border-[#00C896] ring-2 ring-[#00C896] ring-offset-2'
                  : 'border-gray-200 hover:border-[#00C896]'
              }`}
            >
              <img
                src={imageUrl}
                alt={`Library image ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  // Prevent infinite loop by marking attempted swap
                  if (target.dataset.swapAttempt === '1') return;
                  const src = target.src;
                  if (src.endsWith('.jpg')) {
                    target.src = src.replace(/\.jpg$/, '.webp');
                    target.dataset.swapAttempt = '1';
                  } else if (src.endsWith('.webp')) {
                    target.src = src.replace(/\.webp$/, '.jpg');
                    target.dataset.swapAttempt = '1';
                  }
                }}
              />
              {selected === imageUrl && (
                <div className="absolute inset-0 bg-[#00C896] bg-opacity-20 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-[#00C896] flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && libraryImages.length === 0 && (
        <Card className="p-8 bg-gray-50 border-gray-200">
          <div className="text-center">
            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No images available for {category}</p>
            <p className="text-sm text-gray-500 mt-1">
              Please contact admin to add images to the library
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

