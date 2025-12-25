import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getPartnerImages } from '@/lib/api/media';

type Props = {
  open: boolean;
  category: string;
  onSelect: (url: string) => void;
  onClose: () => void;
  partnerId?: string; // Optional: if provided, shows partner's gallery images
};

type LibraryResponse = {
  success?: boolean;
  category?: string;
  count?: number;
  images: string[];
};

// Simple cache to reduce repeated fetches while the modal stays open
const cache = new Map<string, string[]>();

export default function ImageLibraryModal({ open, category, onSelect, onClose, partnerId }: Props) {
  const [images, setImages] = useState<string[]>([]);
  const [partnerGalleryImages, setPartnerGalleryImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load partner's gallery images
  useEffect(() => {
    if (!open || !partnerId) return;

    const loadPartnerGallery = async () => {
      try {
        const { images: galleryImages } = await getPartnerImages(partnerId);
        // Remove cache-busting timestamp for cleaner URLs
        const cleanUrls = galleryImages.map(url => url.split('?')[0]);
        setPartnerGalleryImages(cleanUrls);
      } catch (error) {
        console.error('Failed to load partner gallery:', error);
      }
    };

    loadPartnerGallery();
  }, [open, partnerId]);

  useEffect(() => {
    if (!open) {
      return;
    }

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
  }, [category, open]);

  if (!open) {
    return null;
  }

  return (
    <Dialog
      open={open}
      modal={true}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent 
        className="sm:max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl p-0 z-[10001]" 
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-lg font-semibold text-gray-900">Choose an image</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="py-10 text-center text-sm text-gray-500">Loading images…</div>
        )}

        {error && !loading && (
          <div className="mx-4 mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        {!loading && !error && (
          <>
            {/* Partner's Gallery Images Section */}
            {partnerGalleryImages.length > 0 && (
              <div className="px-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span>📸</span>
                  <span>თქვენი ატვირთული სურათები</span>
                  <span className="text-xs font-normal text-gray-500">({partnerGalleryImages.length})</span>
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 mb-6">
                  {partnerGalleryImages.map((img) => (
                    <button
                      key={img}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(img);
                        onClose();
                      }}
                      className="flex flex-col overflow-hidden rounded-xl border-2 border-[#00C896] transition hover:border-[#00A876] hover:shadow-md"
                    >
                      <img
                        src={img}
                        className="h-24 w-full object-cover"
                        loading="lazy"
                        alt="Gallery image"
                      />
                      <div className="p-1.5 bg-emerald-50 text-center">
                        <span className="text-[10px] font-medium text-emerald-700">
                          თქვენი სურათი
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Default Library Images */}
            {images.length > 0 && (
              <div className="px-4 pb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span>🖼️</span>
                  <span>სტანდარტული სურათები</span>
                  <span className="text-xs font-normal text-gray-500">({images.length})</span>
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {images.map((img) => {
              const filename = img.split('/').pop()?.replace(/\.(webp|jpg|png)$/i, '') || '';
              
              return (
                <button
                  key={img}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(img);
                    onClose();
                  }}
                  className="flex flex-col overflow-hidden rounded-xl border-2 transition hover:border-[#00C896] hover:shadow-md"
                >
                  <img
                    src={img}
                    className="h-24 w-full object-cover"
                    loading="lazy"
                    alt={filename}
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
                  <div className="p-1.5 bg-gray-50 text-center">
                    <span className="text-[10px] font-medium text-gray-700 line-clamp-2 leading-tight">
                      {filename}
                    </span>
                  </div>
                </button>
              );
            })}
            {images.length === 0 && partnerGalleryImages.length === 0 && (
              <div className="col-span-full py-10 text-center text-sm text-gray-500">No images available.</div>
            )}
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}


