import { useEffect, useState } from 'react';

type Props = {
  category: string;
  onSelect: (url: string) => void;
  onClose: () => void;
};

type LibraryResponse = {
  success: boolean;
  category: string;
  count: number;
  images: string[];
};

export default function ImageLibraryModal({ category, onSelect, onClose }: Props) {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/library?category=${encodeURIComponent(category.toUpperCase())}`);
        if (!res.ok) throw new Error(`Failed to fetch images (${res.status})`);
        const data: LibraryResponse = await res.json();
        if (!cancelled) setImages(Array.isArray(data.images) ? data.images : []);
      } catch (e) {
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
                <img src={img} className="h-24 w-full object-cover" loading="lazy" alt="library" />
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


