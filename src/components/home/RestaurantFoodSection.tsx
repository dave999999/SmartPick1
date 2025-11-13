import { Star, ChevronRight } from 'lucide-react';
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
    <div className="bg-white">
      {Object.values(groupedOffers).map(({ partner, offers: partnerOffers }) => (
        <div key={partner.id} className="mb-6">
          {/* Restaurant Header */}
          <div className="px-4 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{partner.business_name}</h2>
              <p className="text-sm text-gray-500">{partner.business_type || 'Restaurant'}</p>
            </div>
            <button className="flex items-center text-sm text-gray-600">
              See more
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          {/* Horizontal Scrolling Food Items */}
          <div className="flex gap-4 overflow-x-auto px-4 pb-4 scrollbar-hide">
            {partnerOffers.slice(0, 6).map((offer) => (
              <div
                key={offer.id}
                onClick={() => onOfferClick(offer)}
                className="flex-shrink-0 w-40 cursor-pointer"
              >
                {/* Food Image */}
                <div className="relative w-40 h-40 rounded-2xl overflow-hidden mb-2">
                  <img
                    src={offer.images && offer.images.length > 0
                      ? resolveOfferImageUrl(offer.images[0], offer.category)
                      : '/placeholder.png'}
                    alt={offer.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg'; }}
                  />

                  {/* Rating Badge */}
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs font-semibold text-gray-900">4.6</span>
                  </div>
                </div>

                {/* Food Info */}
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1 line-clamp-2">
                    {offer.title}
                  </h3>
                  <div className="flex items-center justify-between">
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
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
