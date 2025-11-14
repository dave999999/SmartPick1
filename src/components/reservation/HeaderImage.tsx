import { Badge } from '@/components/ui/badge';

interface HeaderImageProps {
  imageUrl: string | null;
  title: string;
  categoryName: string;
}

export default function HeaderImage({ imageUrl, title, categoryName }: HeaderImageProps) {
  return (
    <div className="relative w-full h-36 overflow-hidden rounded-t-xl">
      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg'; }}
          />
          {/* Bottom gradient overlay - stronger for title on image */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          
          {/* Product title on image - bottom left */}
          <div className="absolute bottom-3 left-3 right-16">
            <h2 className="text-xl font-bold text-white drop-shadow-lg leading-tight">
              {title}
            </h2>
          </div>
        </>
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-mint-100 to-mint-200 flex items-center justify-center">
          <span className="text-4xl">🍽️</span>
        </div>
      )}
      
      {/* Category badge - top right */}
      <Badge 
        variant="secondary" 
        className="absolute top-2.5 right-2.5 bg-mint-500 hover:bg-mint-600 text-white text-xs px-2.5 py-0.5 shadow-lg font-medium"
      >
        {categoryName}
      </Badge>
    </div>
  );
}
