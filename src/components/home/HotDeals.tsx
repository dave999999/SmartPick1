import { useRef } from 'react';
import { Offer } from '@/lib/types';
import { resolveOfferImageUrl } from '@/lib/api';
import { Flame, MapPin } from 'lucide-react';

interface HotDealsProps {
  offers: Offer[];
  onOfferClick: (offer: Offer) => void;
}

export function HotDeals({ offers, onOfferClick }: HotDealsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get hot deals (first 8 offers)
  const hotDeals = offers.slice(0, 8);

  if (hotDeals.length === 0) return null;

  return (
    <div className="py-6">
      <div className="flex items-center gap-2 mb-4">
        <Flame className="w-6 h-6 text-orange-500" />
        <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#00C896] to-[#00E6A8] text-transparent bg-clip-text">
          Hot Deals Around You
        </h2>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {hotDeals.map((offer) => {
          return (
            <div
              key={offer.id}
              onClick={() => onOfferClick(offer)}
              className="flex-shrink-0 w-[140px] md:w-[180px] bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer snap-start"
            >
              {/* Image */}
              <div className="relative h-[100px] md:h-[120px] w-full overflow-hidden">
                {offer.images && offer.images.length > 0 ? (
                  <img
                    src={resolveOfferImageUrl(offer.images[0], offer.category, { width: 400, quality: 80 })}
                    alt={offer.title}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg'; }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#F9FFFB] to-[#EFFFF8] flex items-center justify-center">
                    <span className="text-4xl opacity-30">📦</span>
                  </div>
                )}
                <div className="absolute top-1.5 right-1.5 bg-[#00C896] text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                  {offer.category}
                </div>
              </div>

              {/* Content */}
              <div className="p-2.5 space-y-1.5">
                <h3 className="font-bold text-sm text-gray-900 line-clamp-1">
                  {offer.title}
                </h3>

                <div className="flex items-center gap-1 text-[11px] text-gray-600">
                  <MapPin className="w-3 h-3 text-[#00C896]" />
                  <span className="line-clamp-1">{offer.partner?.business_name}</span>
                </div>

                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold bg-gradient-to-r from-[#00C896] to-[#009B77] text-transparent bg-clip-text">
                    {offer.smart_price}₾
                  </span>
                  <span className="text-xs text-gray-400 line-through">
                    {offer.original_price}₾
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-medium text-[#00C896]">
                    {offer.quantity_available} left
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
