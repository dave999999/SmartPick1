import { Badge } from '@/components/ui/badge';

interface HeaderImageProps {
  imageUrl: string | null;
  title: string;
  categoryName: string;
}

export default function HeaderImage({ imageUrl, title, categoryName }: HeaderImageProps) {
  return (
    <div className="relative w-full">
      {/* Header background section - transparent */}
      <div className="relative w-full h-40 overflow-hidden rounded-t-xl">
      </div>
      
      {/* Circular plate image - overlapping */}
      <div className="flex justify-center -mt-40 -mb-28">
        <div className="relative w-72 h-72 rounded-full bg-white p-3 shadow-2xl">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full rounded-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg'; }}
            />
          ) : (
            <div className="w-full h-full rounded-full bg-gradient-to-br from-mint-100 to-mint-200 flex items-center justify-center">
              <span className="text-4xl">🍽️</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
