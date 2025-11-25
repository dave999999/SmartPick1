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
      
      {/* Circular plate image with NEON CYAN GLOW */}
      <div className="flex justify-center -mt-40 -mb-28">
        <div className="relative w-64 h-64 rounded-full p-[3px] animate-subtle-pulse"
          style={{
            background: 'linear-gradient(135deg, #00F6FF 0%, #16FFE5 100%)',
            boxShadow: '0 0 14px rgba(0, 246, 255, 0.6), 0 0 28px rgba(0, 246, 255, 0.4), 0 0 42px rgba(0, 246, 255, 0.2)'
          }}
        >
          {/* Dark radial background ring */}
          <div className="w-full h-full rounded-full p-2 relative"
            style={{
              background: 'radial-gradient(circle at center, #0A0F16 0%, #020408 100%)'
            }}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-full rounded-full object-cover relative z-10"
                style={{
                  boxShadow: 'inset 0 0 20px rgba(0, 246, 255, 0.2)'
                }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg'; }}
              />
            ) : (
              <div className="w-full h-full rounded-full flex items-center justify-center relative z-10"
                style={{
                  background: 'radial-gradient(circle at center, #141923 0%, #05070C 100%)',
                  boxShadow: 'inset 0 0 20px rgba(0, 246, 255, 0.2)'
                }}
              >
                <span className="text-4xl">🍽️</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
