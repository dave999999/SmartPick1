import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, Loader2, ImageIcon, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface ImagePickerProps {
  category: string;
  onSelect: (imageUrl: string | File) => void;
  allowUpload?: boolean;
  selectedImage?: string | null;
}

interface LibraryResponse {
  success: boolean;
  category: string;
  count: number;
  images: string[];
}

export default function ImagePicker({
  category,
  onSelect,
  allowUpload = false,
  selectedImage = null,
}: ImagePickerProps) {
  const [libraryImages, setLibraryImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(selectedImage);
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [customPreview, setCustomPreview] = useState<string | null>(null);

  // Fetch library images when category changes
  useEffect(() => {
    const fetchLibraryImages = async () => {
      if (!category) {
        setLibraryImages([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/library?category=${category.toUpperCase()}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch images: ${response.statusText}`);
        }

        const data: LibraryResponse = await response.json();

        if (data.success && data.images) {
          setLibraryImages(data.images);
        } else {
          setLibraryImages([]);
        }
      } catch (err) {
        logger.error('Error fetching library images:', err);
        setError('Failed to load image library. Please try again.');
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
    setCustomFile(null);
    setCustomPreview(null);
    onSelect(imageUrl);
  };

  // Handle custom file upload
  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload JPG, PNG, WEBP, or SVG.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB.');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      setCustomPreview(preview);
      setCustomFile(file);
      setSelected(null); // Deselect library image
      onSelect(file); // Pass file object to parent
      toast.success('Custom image selected');
    };
    reader.readAsDataURL(file);
  };

  // Clear custom upload
  const clearCustomUpload = () => {
    setCustomFile(null);
    setCustomPreview(null);
    setSelected(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Choose Product Image</h3>
          <p className="text-sm text-gray-500">
            Select from our library or upload your own {allowUpload && '(if approved)'}
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
              <p className="text-sm text-red-700">Please refresh or try a different category.</p>
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
              {allowUpload ? 'Upload your own image below' : 'Please contact admin to add images'}
            </p>
          </div>
        </Card>
      )}

      {/* Custom Upload Section */}
      {allowUpload && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Upload Custom Photo</h4>

          {!customPreview ? (
            <div className="border-2 border-dashed border-[#DFF5ED] rounded-xl p-6 text-center hover:border-[#00C896] transition-colors">
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-3">
                Click to upload your own image
              </p>
              <Input
                id="custom-upload"
                type="file"
                accept="image/*"
                onChange={handleCustomUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('custom-upload')?.click()}
                className="border-[#00C896] text-[#00C896] hover:bg-[#F0FDF9]"
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose File
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                JPG, PNG, WEBP or SVG (max 5MB)
              </p>
            </div>
          ) : (
            <Card className="p-4 border-2 border-[#00C896] bg-[#F0FDF9]">
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={customPreview}
                    alt="Custom upload preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {customFile?.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {customFile && (customFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearCustomUpload}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

