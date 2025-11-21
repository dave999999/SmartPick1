interface HeaderImageProps {
  imageUrl: string | null;
  title: string;
  categoryName: string;
}

export default function HeaderImage({ imageUrl, title }: HeaderImageProps) {
  return (
    <div className="relative w-full">
      {/* Header background section - transparent */}
         <div className="relative w-full h-40 overflow-hidden rounded-t-xl">
      </div>
      
      {/* Circular plate image - overlapping */}
         <div className="flex justify-center -mt-40 -mb-28">
        <div className="relative w-64 h-64 rounded-full bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] p-2.5 shadow-2xl shadow-black/50 backdrop-blur-md border border-white/10">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full rounded-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg'; }}
            />
          ) : (
            <div className="w-full h-full rounded-full bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] flex items-center justify-center">
              <span className="text-4xl">🍽️</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
