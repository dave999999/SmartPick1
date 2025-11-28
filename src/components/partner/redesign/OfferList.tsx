/**
 * OfferList - Compact list of partner offers with actions
 * Reuses existing offer card logic with tighter spacing
 */

import { Offer } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Play, Pause, Edit, Trash2, RefreshCw, Plus, TrendingUp, BarChart3 } from 'lucide-react';

interface OfferListProps {
  offers: Offer[];
  showMetrics: boolean;
  onEditOffer: (offer: Offer) => void;
  onToggleOffer: (offerId: string, currentStatus: string) => void;
  onDeleteOffer: (offerId: string) => void;
  onRefreshQuantity: (offerId: string) => void;
  onCloneOffer: (offer: Offer) => void;
  processingIds: Set<string>;
}

export function OfferList({
  offers,
  showMetrics,
  onEditOffer,
  onToggleOffer,
  onDeleteOffer,
  onRefreshQuantity,
  onCloneOffer,
  processingIds
}: OfferListProps) {
  if (offers.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-600 font-medium">No offers found</p>
        <p className="text-xs text-gray-500 mt-1">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {offers.map((offer) => {
        const isProcessing = processingIds.has(offer.id);
        const isLowStock = offer.quantity_available <= 5 && offer.quantity_available > 0;
        const discountPercent = Math.round(((offer.original_price - offer.smart_price) / offer.original_price) * 100);
        
        // Mock metrics
        const soldCount = offer.quantity_total - offer.quantity_available;
        const conversionRate = offer.quantity_total > 0 ? Math.round((soldCount / offer.quantity_total) * 100) : 0;

        const getStatusColor = (status: string) => {
          switch (status) {
            case 'ACTIVE': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'PAUSED': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'EXPIRED': return 'bg-gray-100 text-gray-600 border-gray-200';
            default: return 'bg-gray-100 text-gray-600 border-gray-200';
          }
        };

        return (
          <Card
            key={offer.id}
            className={`border bg-white hover:shadow-sm transition-all ${
              isProcessing ? 'opacity-60 pointer-events-none' : ''
            }`}
          >
            <CardContent className="p-3">
              {/* Header with Image and Info */}
              <div className="flex gap-2.5 mb-2.5">
                {/* Image */}
                <div className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                  <img
                    src={offer.images[0] || '/placeholder-food.jpg'}
                    alt={offer.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1.5 mb-1">
                    <h3 className="font-semibold text-sm text-gray-900 line-clamp-1">{offer.title}</h3>
                    <Badge className={`text-[10px] px-2 py-0.5 ${getStatusColor(offer.status)}`}>
                      {offer.status}
                    </Badge>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1.5 mb-1.5">
                    <span className="text-lg font-bold text-emerald-600">₾{offer.smart_price.toFixed(2)}</span>
                    {discountPercent > 0 && (
                      <span className="text-xs text-gray-500 line-through">₾{offer.original_price.toFixed(2)}</span>
                    )}
                  </div>

                  {/* Stock and Discount */}
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded-md">
                      <Package className="w-3 h-3" />
                      <span className={isLowStock ? 'text-orange-600 font-bold' : 'font-medium'}>
                        {offer.quantity_available}/{offer.quantity_total}
                      </span>
                    </div>
                    {discountPercent > 0 && (
                      <Badge className="bg-rose-50 text-rose-700 text-[10px] px-1.5 py-0.5 border border-rose-200">
                        -{discountPercent}% OFF
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Metrics (conditional) */}
              {showMetrics && (
                <div className="flex items-center gap-2 mb-2.5 text-xs">
                  <div className="flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                    <span className="font-bold text-emerald-700">{conversionRate}%</span>
                  </div>
                  <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                    <BarChart3 className="w-3 h-3 text-blue-600" />
                    <span className="font-bold text-blue-700">{soldCount} sold</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-1.5 pt-2.5 border-t border-gray-100">
                {/* Toggle */}
                <button
                  onClick={() => onToggleOffer(offer.id, offer.status)}
                  disabled={isProcessing}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    offer.status === 'ACTIVE'
                      ? 'bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {offer.status === 'ACTIVE' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {offer.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                </button>

                {/* Refresh */}
                <button
                  onClick={() => onRefreshQuantity(offer.id)}
                  disabled={isProcessing}
                  className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-all border border-blue-200"
                  title="Refresh quantity"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>

                {/* Edit */}
                <button
                  onClick={() => onEditOffer(offer)}
                  disabled={isProcessing}
                  className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 transition-all border border-teal-200"
                  title="Edit offer"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>

                {/* Clone */}
                <button
                  onClick={() => onCloneOffer(offer)}
                  disabled={isProcessing}
                  className="p-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 transition-all border border-green-200"
                  title="Clone offer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>

                {/* Delete */}
                <button
                  onClick={() => onDeleteOffer(offer.id)}
                  disabled={isProcessing}
                  className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 transition-all border border-red-200"
                  title="Delete offer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
