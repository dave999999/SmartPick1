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
    <div className="bg-white pt-6">
      {Object.values(groupedOffers).map(({ partner, offers: partnerOffers }) => (
        <div key={partner.id} className="mb-8">
          {/* Restaurant Header */}
          <div className="px-4 pb-3 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-0.5">{partner.business_name}</h2>
              <p className="text-sm text-gray-500">
                {partner.address || 'Breakfast, lunch, and...'}
              </p>
            </div>
            <button className="text-sm text-gray-700 hover:text-gray-900 mt-1">
              See more
            </button>
          </div>

          {/* Horizontal Scrolling Food Cards */}
          <div className="flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-hide snap-x snap-mandatory">
            {partnerOffers.slice(0, 6).map((offer) => {
              const imageUrl = offer.images && offer.images.length > 0
                ? resolveOfferImageUrl(offer.images[0], offer.category)
                : '/placeholder.png';

              return (
                <div
                  key={offer.id}
                  onClick={() => onOfferClick(offer)}
                  className="flex-shrink-0 w-[160px] cursor-pointer snap-start"
                >
                  {/* Food Image Card with Rating Badge */}
                  <div className="relative w-full h-[160px] rounded-2xl overflow-hidden mb-2 bg-gray-100">
                    <img
                      src={imageUrl}
                      alt={offer.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg';
                      }}
                    />

                    {/* Star Rating Badge - Top Right */}
                    <div className="absolute top-2 right-2 bg-amber-500 rounded-lg px-2 py-1 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-white text-white" />
                      <span className="text-xs font-bold text-white">4.6</span>
                    </div>

                    {/* Heart Icon - Bottom Right */}
                    <button className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm rounded-full p-2 hover:bg-white transition-colors">
                      <Heart className="w-4 h-4 text-gray-700" />
                    </button>
                  </div>

                  {/* Food Title and Price */}
                  <h3 className="text-sm font-bold text-gray-900 mb-1 line-clamp-2 leading-tight">
                    {offer.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-gray-900">
                      ${offer.smart_price}
                    </span>
                    {offer.original_price > offer.smart_price && (
                      <span className="text-xs text-gray-400 line-through">
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
