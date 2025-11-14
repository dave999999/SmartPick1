import { useEffect, useState } from 'react';

type Props = {
  category: string;
  onSelect: (url: string) => void;
  onClose: () => void;
};

type LibraryResponse = {
  success?: boolean;
  category?: string;
  count?: number;
  images: string[];
};

// Simple cache to reduce repeated fetches while the modal stays open
const cache = new Map<string, string[]>();

export default function ImageLibraryModal({ category, onSelect, onClose }: Props) {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadManifest = async (cat: string): Promise<string[] | null> => {
      try {
        const r = await fetch(`/library/${cat}/manifest.json`);
        if (!r.ok) return null;
        const m = await r.json();
        const list: string[] = Array.isArray(m.images) ? m.images : typeof m.images === 'string' ? [m.images] : [];
        if (!list.length) return null;
        return list.map((img) => `/library/${cat}/${img}`);
      } catch {
        return null;
      }
    };

    (async () => {
      const normalized = category?.trim()?.toUpperCase() || '';
      if (!normalized) {
        setImages([]);
        setLoading(false);
        return;
      }

      if (cache.has(normalized)) {
        setImages(cache.get(normalized)!);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // 1) Try uppercase manifest (dev mode: public/ is served directly by Vite)
        console.log('[ImageLibraryModal] Attempting uppercase manifest:', normalized);
        const upper = await loadManifest(normalized);
        if (upper) {
          console.log('[ImageLibraryModal] ✓ Uppercase manifest loaded:', upper.length, 'images');
          cache.set(normalized, upper);
          if (!cancelled) setImages(upper);
          return;
        }
        console.log('[ImageLibraryModal] ✗ Uppercase manifest not found');

        // 2) Lowercase manifest
        const lowerKey = normalized.toLowerCase();
        if (lowerKey !== normalized) {
          console.log('[ImageLibraryModal] Attempting lowercase manifest:', lowerKey);
          const lower = await loadManifest(lowerKey);
          if (lower) {
            console.log('[ImageLibraryModal] ✓ Lowercase manifest loaded:', lower.length, 'images');
            cache.set(normalized, lower);
            if (!cancelled) setImages(lower);
            return;
          }
          console.log('[ImageLibraryModal] ✗ Lowercase manifest not found');
        }

        // 3) Alias FASTFOOD -> FAST_FOOD style
        const known = ['BAKERY','RESTAURANT','CAFE','GROCERY','ALCOHOL','FAST_FOOD'];
        const alias = known.find((k) => k.replace('_','') === normalized.replace('_',''));
        if (alias && alias !== normalized) {
          console.log('[ImageLibraryModal] Attempting alias manifest:', alias);
          const aliased = await loadManifest(alias);
          if (aliased) {
            console.log('[ImageLibraryModal] ✓ Alias manifest loaded:', aliased.length, 'images');
            cache.set(normalized, aliased);
            if (!cancelled) setImages(aliased);
            return;
          }
          console.log('[ImageLibraryModal] ✗ Alias manifest not found');
        }

        // 4) Try API route (production only - Vercel serverless function)
        console.log('[ImageLibraryModal] Attempting API route:', `/api/library?category=${normalized}`);
        const res = await fetch(`/api/library?category=${encodeURIComponent(normalized)}`);
        if (res.ok) {
          const data: LibraryResponse = await res.json();
          console.log('[ImageLibraryModal] API response:', data);
          if (Array.isArray(data.images) && data.images.length) {
            console.log('[ImageLibraryModal] ✓ API route loaded:', data.images.length, 'images');
            cache.set(normalized, data.images);
            if (!cancelled) setImages(data.images);
            return;
          }
        } else {
          console.log('[ImageLibraryModal] ✗ API route failed:', res.status, res.statusText);
        }

        // Nothing found
        console.error('[ImageLibraryModal] All loading strategies failed for category:', normalized);
        if (!cancelled) {
          setImages([]);
          setError('Could not load images. Please try again.');
        }
      } catch (err) {
        console.error('[ImageLibraryModal] Exception during image loading:', err);
        if (!cancelled) setError('Could not load images. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [category]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-[92%] max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Choose an image</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-gray-100">
            ✕
          </button>
        </div>

        {loading && (
          <div className="py-10 text-center text-sm text-gray-500">Loading images…</div>
        )}

        {error && !loading && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {images.map((img) => (
              <button
                key={img}
                onClick={() => {
                  onSelect(img);
                  onClose();
                }}
                className="overflow-hidden rounded-xl border-2 transition hover:border-[#00C896]"
              >
                <img
                  src={img}
                  className="h-24 w-full object-cover"
                  loading="lazy"
                  alt="library"
                  onError={(e) => {
                    const el = e.currentTarget as HTMLImageElement;
                    if (el.dataset.swapAttempt === '1') return;
                    if (el.src.endsWith('.jpg')) {
                      el.src = el.src.replace(/\.jpg$/, '.webp');
                      el.dataset.swapAttempt = '1';
                    } else if (el.src.endsWith('.webp')) {
                      el.src = el.src.replace(/\.webp$/, '.jpg');
                      el.dataset.swapAttempt = '1';
                    }
                  }}
                />
              </button>
            ))}
            {images.length === 0 && (
              <div className="col-span-full py-10 text-center text-sm text-gray-500">No images for this category.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


