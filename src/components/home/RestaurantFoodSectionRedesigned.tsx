import type { Offer } from '@/lib/types';
import { OfferCardRedesigned } from './OfferCardRedesigned';

interface RestaurantFoodSectionRedesignedProps {
  offers: Offer[];
  onOfferClick: (offer: Offer) => void;
  userLocation?: [number, number] | null;
}

export function RestaurantFoodSectionRedesigned({ offers, onOfferClick, userLocation }: RestaurantFoodSectionRedesignedProps) {
  const isNewOffer = (offer: Offer): boolean => {
    const createdAt = new Date(offer.created_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 2;
  };

  if (offers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">No offers available at the moment.</p>
      </div>
    );
  }

  const newOffers = offers.filter(isNewOffer);

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-[#0a0a0a] to-[#1a1a1a]">
      <div className="px-4 pt-4 pb-24 space-y-6">
        {/* Just Added Section - Horizontal Scroll */}
        {newOffers.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white">Just Added 🔥</h2>
              <span className="text-sm text-gray-400">{newOffers.length} new</span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide -mx-4 px-4">
              {newOffers.map((offer) => (
                <div key={offer.id} className="snap-start flex-shrink-0">
                  <OfferCardRedesigned
                    offer={offer}
                    onClick={onOfferClick}
                    userLocation={userLocation}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Offers Section - Responsive Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white">All Offers</h2>
            <span className="text-sm text-gray-400">{offers.length} total</span>
          </div>
          
          {/* Responsive Grid - Optimized for 360px and larger screens */}
          <div className="
            grid gap-4
            grid-cols-2
            sm:grid-cols-3
            md:grid-cols-4
            lg:grid-cols-5
          ">
            {offers.map((offer) => (
              <OfferCardRedesigned
                key={offer.id}
                offer={offer}
                onClick={onOfferClick}
                userLocation={userLocation}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Hide scrollbar */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
