import { Star, ChevronRight, Heart } from 'lucide-react';
import { Offer } from '@/lib/types';
import { resolveOfferImageUrl } from '@/lib/api';

interface RestaurantFoodSectionProps {
  offers: Offer[];
  onOfferClick: (offer: Offer) => void;
}

export function RestaurantFoodSection({ offers, onOfferClick }: RestaurantFoodSectionProps) {
  // Group offers by partner
  const groupedOffers: Record<string, { partner: any; offers: Offer[] }> = {};

  offers.forEach(offer => {
    if (offer.partner) {
      const partnerId = offer.partner.id;
      if (!groupedOffers[partnerId]) {
        groupedOffers[partnerId] = {
          partner: offer.partner,
          offers: []
        };
      }
      groupedOffers[partnerId].offers.push(offer);
    }
  });

  return (
    <div className="bg-white pt-5 px-4">
      {Object.values(groupedOffers).map(({ partner, offers: partnerOffers }) => (
        <div key={partner.id} className="mb-6">
          {/* Restaurant Header */}
          <div className="pb-4 flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-[20px] font-bold text-gray-900 leading-tight mb-1">
                {partner.business_name}
              </h2>
              <p className="text-[13px] text-gray-500 leading-tight">
                {partner.address || 'Breakfast, lunch, and...'}
              </p>
            </div>
            <button className="text-[13px] text-gray-600 hover:text-gray-900 font-medium ml-4 mt-0.5 whitespace-nowrap">
              See more
            </button>
          </div>

          {/* Horizontal Scrolling Food Cards */}
          <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
            {partnerOffers.slice(0, 6).map((offer) => {
              const imageUrl = offer.images && offer.images.length > 0
                ? resolveOfferImageUrl(offer.images[0], offer.category)
                : '/placeholder.png';

              return (
                <div
                  key={offer.id}
                  onClick={() => onOfferClick(offer)}
                  className="flex-shrink-0 w-[156px] cursor-pointer snap-start"
                >
                  {/* Food Image Card with Rating Badge */}
                  <div className="relative w-full h-[156px] rounded-[16px] overflow-hidden mb-2.5 bg-gray-100 shadow-sm">
                    <img
                      src={imageUrl}
                      alt={offer.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg';
                      }}
                    />

                    {/* Star Rating Badge - Top Right */}
                    <div className="absolute top-2 right-2 bg-amber-400 rounded-lg px-2 py-1 flex items-center gap-0.5 shadow-sm">
                      <Star className="w-3 h-3 fill-white text-white" />
                      <span className="text-[11px] font-bold text-white">4.6</span>
                    </div>

                    {/* Heart Icon - Bottom Right */}
                    <button 
                      className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-sm rounded-full p-1.5 hover:bg-white transition-all shadow-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Heart className="w-3.5 h-3.5 text-gray-700" />
                    </button>
                  </div>

                  {/* Food Title and Price */}
                  <h3 className="text-[13px] font-semibold text-gray-900 mb-1 line-clamp-2 leading-[1.3]">
                    {offer.title}
                  </h3>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[15px] font-bold text-gray-900">
                      ${offer.smart_price}
                    </span>
                    {offer.original_price > offer.smart_price && (
                      <span className="text-[11px] text-gray-400 line-through">
                        ${offer.original_price}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
