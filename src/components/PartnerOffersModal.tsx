import { Offer } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { resolveOfferImageUrl } from '@/lib/api';
import { Star, Heart } from 'lucide-react';

interface PartnerOffersModalProps {
  partnerName: string;
  partnerAddress?: string;
  offers: Offer[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOfferClick: (offer: Offer) => void;
}

export default function PartnerOffersModal({
  partnerName,
  partnerAddress,
  offers,
  open,
  onOpenChange,
  onOfferClick,
}: PartnerOffersModalProps) {
  if (!offers || offers.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] p-0 gap-0 overflow-hidden">
        {/* Partner Header */}
        <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
          <DialogTitle className="text-xl font-bold">{partnerName}</DialogTitle>
          <p className="text-sm text-gray-300 mt-1">
            {partnerAddress || 'View all available offers'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {offers.length} offer{offers.length > 1 ? 's' : ''} available
          </p>
        </DialogHeader>

        {/* Scrollable Offers Grid */}
        <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: 'calc(85vh - 150px)' }}>
          <div className="grid grid-cols-2 gap-3">
            {offers.map((offer) => {
              const imageUrl = offer.images && offer.images.length > 0
                ? resolveOfferImageUrl(offer.images[0], offer.category)
                : '/placeholder.png';

              return (
                <div
                  key={offer.id}
                  onClick={() => {
                    onOfferClick(offer);
                    onOpenChange(false); // Close this modal before opening reservation
                  }}
                  className="cursor-pointer group"
                >
                  {/* Food Image Card */}
                  <div className="relative w-full h-[140px] rounded-2xl overflow-hidden mb-2 bg-gray-100 shadow-sm group-hover:shadow-md transition-shadow">
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
                  <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2 leading-tight">
                    {offer.title}
                  </h3>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-bold text-gray-900">
                      ${offer.smart_price}
                    </span>
                    {offer.original_price > offer.smart_price && (
                      <span className="text-xs text-gray-400 line-through">
                        ${offer.original_price}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {offer.quantity_available} left
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


