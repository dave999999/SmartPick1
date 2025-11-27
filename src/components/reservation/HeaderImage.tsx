interface HeaderImageProps {
  imageUrl: string | null;
  title: string;
  categoryName: string;
}

export default function HeaderImage({ imageUrl, title }: HeaderImageProps) {
  return (
    <div className="relative w-full h-52 rounded-t-2xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Full-width rectangular product image */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg'; }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-7xl">🍽️</span>
        </div>
      )}
      {/* Soft shadow transition to content */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white/80 to-transparent" />
    </div>
  );
}
