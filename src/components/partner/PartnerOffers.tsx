import { Card, CardContent } from '@/components/ui/card';
import { Package, Play, Pause, Edit, Trash2, Plus, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Offer } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

interface PartnerOffersProps {
  offers: Offer[];
  onToggleOffer: (offerId: string, currentStatus: string) => void;
  onEditOffer: (offer: Offer) => void;
  onDeleteOffer: (offerId: string) => void;
  onRefreshQuantity: (offerId: string) => void;
  onCloneOffer: (offer: Offer) => void;
  processingIds: Set<string>;
}

export default function PartnerOffers({
  offers,
  onToggleOffer,
  onEditOffer,
  onDeleteOffer,
  onRefreshQuantity,
  onCloneOffer,
  processingIds,
}: PartnerOffersProps) {

  const getOfferDisplayStatus = (offer: Offer): 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'SOLD_OUT' => {
    if (offer.quantity_available === 0) return 'SOLD_OUT';
    if (offer.expires_at && new Date(offer.expires_at) < new Date()) return 'EXPIRED';
    if (offer.status === 'PAUSED') return 'PAUSED';
    return 'ACTIVE';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'from-emerald-500 to-emerald-600';
      case 'PAUSED':
        return 'from-orange-500 to-orange-600';
      case 'SOLD_OUT':
        return 'from-red-500 to-red-600';
      case 'EXPIRED':
        return 'from-gray-500 to-gray-600';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'from-emerald-50 to-emerald-100/50';
      case 'PAUSED':
        return 'from-orange-50 to-orange-100/50';
      case 'SOLD_OUT':
        return 'from-red-50 to-red-100/50';
      case 'EXPIRED':
        return 'from-gray-50 to-gray-100/50';
      default:
        return 'from-gray-50 to-gray-100/50';
    }
  };

  const activeOffers = offers.filter(o => getOfferDisplayStatus(o) === 'ACTIVE');
  const pausedOffers = offers.filter(o => getOfferDisplayStatus(o) === 'PAUSED');
  const inactiveOffers = offers.filter(o => {
    const status = getOfferDisplayStatus(o);
    return status === 'EXPIRED' || status === 'SOLD_OUT';
  });

  const renderOfferCard = (offer: Offer) => {
    const status = getOfferDisplayStatus(offer);
    const isProcessing = processingIds.has(offer.id);
    const isLowStock = offer.quantity_available <= 5 && offer.quantity_available > 0;
    const discountPercent = Math.round(((offer.original_price - offer.smart_price) / offer.original_price) * 100);

    return (
      <Card
        key={offer.id}
        className={`border-none bg-gradient-to-br ${getStatusBgColor(status)} shadow-sm hover:shadow-lg transition-all duration-300 group ${
          isProcessing ? 'opacity-60 pointer-events-none' : ''
        }`}
      >
        <CardContent className="p-4">
          {/* Top Section: Image + Info */}
          <div className="flex gap-3 mb-3">
            {/* Image */}
            <div className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-gray-100">
              <img
                src={offer.images[0] || '/placeholder-food.jpg'}
                alt={offer.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              {status !== 'ACTIVE' && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <EyeOff className="w-6 h-6 text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-gray-900 text-sm line-clamp-2">{offer.title}</h3>
                <Badge className={`bg-gradient-to-r ${getStatusColor(status)} text-white text-xs px-2 py-0.5 rounded-full shrink-0`}>
                  {status}
                </Badge>
              </div>

              {/* Price and Stock */}
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-xl font-bold text-teal-600">₾{offer.smart_price.toFixed(2)}</span>
                {discountPercent > 0 && (
                  <span className="text-xs text-gray-400 line-through">₾{offer.original_price.toFixed(2)}</span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" />
                  <span className={isLowStock ? 'text-orange-600 font-semibold' : ''}>
                    {offer.quantity_available}/{offer.quantity_total}
                  </span>
                </div>
                {discountPercent > 0 && (
                  <Badge className="bg-rose-100 text-rose-700 text-xs px-2 py-0.5 rounded-full border border-rose-200">
                    -{discountPercent}%
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Actions Row */}
          <div className="flex gap-2 pt-3 border-t border-gray-200/50">
            {/* Toggle Active/Pause */}
            <button
              onClick={() => onToggleOffer(offer.id, offer.status)}
              disabled={isProcessing || status === 'EXPIRED' || status === 'SOLD_OUT'}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-all duration-300 ${
                status === 'ACTIVE'
                  ? 'bg-orange-100 hover:bg-orange-200 text-orange-700'
                  : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'
              } ${(status === 'EXPIRED' || status === 'SOLD_OUT') ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {status === 'ACTIVE' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span className="text-xs font-semibold">{status === 'ACTIVE' ? 'Pause' : 'Resume'}</span>
            </button>

            {/* Refresh Quantity */}
            <button
              onClick={() => onRefreshQuantity(offer.id)}
              disabled={isProcessing}
              className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 transition-all duration-300 hover:scale-110"
              title="Refresh quantity"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Edit */}
            <button
              onClick={() => onEditOffer(offer)}
              disabled={isProcessing}
              className="p-2 rounded-lg bg-teal-100 hover:bg-teal-200 text-teal-700 transition-all duration-300 hover:scale-110"
              title="Edit offer"
            >
              <Edit className="w-4 h-4" />
            </button>

            {/* Clone */}
            <button
              onClick={() => onCloneOffer(offer)}
              disabled={isProcessing}
              className="p-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition-all duration-300 hover:scale-110"
              title="Clone offer"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Delete */}
            <button
              onClick={() => onDeleteOffer(offer.id)}
              disabled={isProcessing}
              className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition-all duration-300 hover:scale-110"
              title="Delete offer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (offers.length === 0) {
    return (
      <div className="text-center py-16">
        <Package className="w-20 h-20 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg mb-2">No offers yet</p>
        <p className="text-sm text-gray-400">Create your first offer to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-none bg-gradient-to-br from-emerald-50 to-emerald-100/50 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                <Eye className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs font-semibold text-emerald-700 uppercase">Active</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{activeOffers.length}</p>
          </CardContent>
        </Card>

        <Card className="border-none bg-gradient-to-br from-orange-50 to-orange-100/50 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <Pause className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs font-semibold text-orange-700 uppercase">Paused</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{pausedOffers.length}</p>
          </CardContent>
        </Card>

        <Card className="border-none bg-gradient-to-br from-gray-50 to-gray-100/50 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center">
                <EyeOff className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-700 uppercase">Ended</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{inactiveOffers.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Offers */}
      {activeOffers.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Active Now</h3>
            <span className="text-xs text-gray-500">({activeOffers.length})</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {activeOffers.map(renderOfferCard)}
          </div>
        </div>
      )}

      {/* Paused Offers */}
      {pausedOffers.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Paused</h3>
            <span className="text-xs text-gray-500">({pausedOffers.length})</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {pausedOffers.map(renderOfferCard)}
          </div>
        </div>
      )}

      {/* Inactive Offers (Expired/Sold Out) */}
      {inactiveOffers.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-gray-400"></div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Ended</h3>
            <span className="text-xs text-gray-500">({inactiveOffers.length})</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {inactiveOffers.map(renderOfferCard)}
          </div>
        </div>
      )}
    </div>
  );
}
