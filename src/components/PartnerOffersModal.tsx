import { Offer } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { resolveOfferImageUrl } from '@/lib/api';
import { Star, Heart, MapPin, Clock, TrendingDown, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import FavoriteButton from '@/components/FavoriteButton';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

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
  const [sortBy, setSortBy] = useState<'savings' | 'ending-soon' | 'popular'>('savings');

  if (!offers || offers.length === 0) return null;

  // Calculate additional data for each offer
  const enrichedOffers = useMemo(() => {
    return offers.map(offer => {
      const savings = offer.original_price - offer.smart_price;
      const savingsPercent = Math.round((savings / offer.original_price) * 100);
      const isLowStock = offer.quantity_available <= 10;
      const isVeryLowStock = offer.quantity_available <= 5;
      
      return {
        ...offer,
        savings,
        savingsPercent,
        isLowStock,
        isVeryLowStock,
      };
    });
  }, [offers]);

  // Sort offers based on selected criteria
  const sortedOffers = useMemo(() => {
    const sorted = [...enrichedOffers];
    
    switch (sortBy) {
      case 'savings':
        return sorted.sort((a, b) => b.savingsPercent - a.savingsPercent);
      case 'ending-soon':
        return sorted.sort((a, b) => a.quantity_available - b.quantity_available);
      case 'popular':
        return sorted.sort((a, b) => b.quantity_available - a.quantity_available);
      default:
        return sorted;
    }
  }, [enrichedOffers, sortBy]);

  // Calculate total possible savings
  const totalSavings = enrichedOffers.reduce((sum, offer) => sum + offer.savings, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Enhanced Branded Header */}
        <DialogHeader className="px-6 pt-6 pb-5 bg-gradient-to-br from-mint-500 via-emerald-500 to-teal-600 text-white sticky top-0 z-10 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold mb-2 text-white">
                {partnerName}
              </DialogTitle>
              
              {partnerAddress && (
                <div className="flex items-center gap-1.5 text-white/90 mb-2">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <p className="text-sm line-clamp-1">{partnerAddress}</p>
                </div>
              )}
              
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {offers.length} Offers
                </Badge>
                
                {totalSavings > 0 && (
                  <Badge className="bg-amber-500/90 text-white border-amber-400 hover:bg-amber-500">
                    <TrendingDown className="w-3 h-3 mr-1" />
                    Save up to {totalSavings.toFixed(2)} GEL
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Sort Filters */}
          <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-hide pb-1">
            <Button
              variant={sortBy === 'savings' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('savings')}
              className={cn(
                'text-xs whitespace-nowrap',
                sortBy === 'savings'
                  ? 'bg-white text-mint-600 hover:bg-white/90'
                  : 'bg-white/20 text-white border-white/30 hover:bg-white/30'
              )}
            >
              Best Savings
            </Button>
            <Button
              variant={sortBy === 'ending-soon' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('ending-soon')}
              className={cn(
                'text-xs whitespace-nowrap',
                sortBy === 'ending-soon'
                  ? 'bg-white text-mint-600 hover:bg-white/90'
                  : 'bg-white/20 text-white border-white/30 hover:bg-white/30'
              )}
            >
              Ending Soon
            </Button>
            <Button
              variant={sortBy === 'popular' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('popular')}
              className={cn(
                'text-xs whitespace-nowrap',
                sortBy === 'popular'
                  ? 'bg-white text-mint-600 hover:bg-white/90'
                  : 'bg-white/20 text-white border-white/30 hover:bg-white/30'
              )}
            >
              Most Available
            </Button>
          </div>
        </DialogHeader>

        {/* Scrollable Offers Grid */}
        <div className="overflow-y-auto px-6 py-4 bg-gray-50" style={{ maxHeight: 'calc(90vh - 220px)' }}>
          <div className="grid grid-cols-2 gap-4">
            {sortedOffers.map((offer) => {
              const imageUrl = offer.images && offer.images.length > 0
                ? resolveOfferImageUrl(offer.images[0], offer.category)
                : '/placeholder.png';

              return (
                <div
                  key={offer.id}
                  onClick={() => {
                    onOfferClick(offer);
                    onOpenChange(false);
                  }}
                  className="cursor-pointer group relative"
                >
                  {/* Enhanced Food Image Card */}
                  <div className="relative w-full h-[160px] rounded-2xl overflow-hidden mb-2 bg-white shadow-md group-hover:shadow-xl transition-all duration-300 group-hover:scale-[1.02]">
                    {/* Image with overlay gradient */}
                    <img
                      src={imageUrl}
                      alt={offer.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg';
                      }}
                    />
                    
                    {/* Gradient overlay for better text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

                    {/* Top badges row */}
                    <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2">
                      {/* Savings Badge - Prominent */}
                      {offer.savingsPercent > 0 && (
                        <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white border-0 shadow-lg font-bold px-2 py-1 text-xs">
                          -{offer.savingsPercent}%
                        </Badge>
                      )}

                      {/* Star Rating - Top Right */}
                      <div className="bg-amber-400 rounded-lg px-2 py-1 flex items-center gap-0.5 shadow-md">
                        <Star className="w-3 h-3 fill-white text-white" />
                        <span className="text-[11px] font-bold text-white">4.6</span>
                      </div>
                    </div>

                    {/* Bottom row - Quantity urgency & favorite */}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                      {/* Quantity Badge with urgency colors */}
                      <Badge 
                        className={cn(
                          'shadow-md font-semibold text-xs',
                          offer.isVeryLowStock 
                            ? 'bg-red-500 text-white animate-pulse' 
                            : offer.isLowStock
                            ? 'bg-orange-500 text-white'
                            : 'bg-white/95 text-gray-900'
                        )}
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        {offer.quantity_available} left
                      </Badge>

                      {/* Favorite Heart */}
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white/95 backdrop-blur-sm rounded-full shadow-md hover:shadow-lg transition-all"
                      >
                        <FavoriteButton 
                          id={offer.id} 
                          type="offer"
                          variant="icon"
                          className="p-1.5"
                        />
                      </div>
                    </div>

                    {/* Hover overlay - "Reserve Now" */}
                    <div className="absolute inset-0 bg-gradient-to-t from-mint-600/95 to-mint-500/95 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <Button 
                        className="bg-white text-mint-600 hover:bg-white/90 font-bold shadow-lg transform scale-95 group-hover:scale-100 transition-transform"
                        size="sm"
                      >
                        Reserve Now
                      </Button>
                    </div>
                  </div>

                  {/* Enhanced Food Info */}
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-tight group-hover:text-mint-600 transition-colors">
                      {offer.title}
                    </h3>
                    
                    {/* Price row with better hierarchy */}
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-mint-600">
                        {offer.smart_price.toFixed(2)} ₾
                      </span>
                      {offer.original_price > offer.smart_price && (
                        <span className="text-xs text-gray-400 line-through font-medium">
                          {offer.original_price.toFixed(2)} ₾
                        </span>
                      )}
                    </div>

                    {/* Savings amount in GEL */}
                    {offer.savings > 0 && (
                      <p className="text-xs font-semibold text-green-600">
                        Save {offer.savings.toFixed(2)} GEL
                      </p>
                    )}
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


