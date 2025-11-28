import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Package, Play, Pause, Edit, Trash2, Plus, RefreshCw, Eye, EyeOff, Search, CheckSquare, Square, TrendingUp, BarChart3 } from 'lucide-react';
import { Offer } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOffers, setSelectedOffers] = useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showMetrics, setShowMetrics] = useState(false);

  // Helper functions
  const toggleSelectOffer = (offerId: string) => {
    const newSelected = new Set(selectedOffers);
    if (newSelected.has(offerId)) {
      newSelected.delete(offerId);
    } else {
      newSelected.add(offerId);
    }
    setSelectedOffers(newSelected);
  };

  const selectAllOffers = (offersList: Offer[]) => {
    const newSelected = new Set(selectedOffers);
    offersList.forEach(offer => newSelected.add(offer.id));
    setSelectedOffers(newSelected);
  };

  const deselectAll = () => {
    setSelectedOffers(new Set());
  };

  const handleBulkPause = () => {
    selectedOffers.forEach(offerId => {
      const offer = offers.find(o => o.id === offerId);
      if (offer && offer.status === 'ACTIVE') {
        onToggleOffer(offerId, 'ACTIVE');
      }
    });
    deselectAll();
  };

  const handleBulkResume = () => {
    selectedOffers.forEach(offerId => {
      const offer = offers.find(o => o.id === offerId);
      if (offer && offer.status === 'PAUSED') {
        onToggleOffer(offerId, 'PAUSED');
      }
    });
    deselectAll();
  };

  const getOfferDisplayStatus = (offer: Offer): 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'SOLD_OUT' => {
    if (offer.quantity_available === 0) return 'SOLD_OUT';
    if (offer.expires_at && new Date(offer.expires_at) < new Date()) return 'EXPIRED';
    if (offer.status === 'PAUSED') return 'PAUSED';
    return 'ACTIVE';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-500';
      case 'PAUSED':
        return 'bg-orange-500';
      case 'SOLD_OUT':
        return 'bg-red-500';
      case 'EXPIRED':
        return 'bg-gray-500';
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

  // Filter offers by search query
  const filteredOffers = offers.filter(offer => 
    offer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    offer.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeOffers = filteredOffers.filter(o => getOfferDisplayStatus(o) === 'ACTIVE');
  const pausedOffers = filteredOffers.filter(o => getOfferDisplayStatus(o) === 'PAUSED');
  const inactiveOffers = filteredOffers.filter(o => {
    const status = getOfferDisplayStatus(o);
    return status === 'EXPIRED' || status === 'SOLD_OUT';
  });

  const renderOfferCard = (offer: Offer) => {
    const status = getOfferDisplayStatus(offer);
    const isProcessing = processingIds.has(offer.id);
    const isLowStock = offer.quantity_available <= 5 && offer.quantity_available > 0;
    const discountPercent = Math.round(((offer.original_price - offer.smart_price) / offer.original_price) * 100);
    const isSelected = selectedOffers.has(offer.id);
    
    // Mock performance metrics (would come from analytics in production)
    const soldCount = offer.quantity_total - offer.quantity_available;
    const conversionRate = offer.quantity_total > 0 ? Math.round((soldCount / offer.quantity_total) * 100) : 0;

    return (
      <Card
        key={offer.id}
        className={`border-2 bg-white shadow-sm hover:shadow-md transition-all duration-200 group ${
          isProcessing ? 'opacity-60 pointer-events-none' : ''
        } ${isSelected ? 'border-teal-500 ring-2 ring-teal-100' : 'border-gray-200'}`}
      >
        <CardContent className="p-3 sm:p-4">
          {/* Selection Checkbox */}
          <div className="flex items-start justify-between mb-2 sm:mb-3">
            <button
              onClick={() => toggleSelectOffer(offer.id)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isSelected ? (
                <CheckSquare className="w-5 h-5 text-teal-600" />
              ) : (
                <Square className="w-5 h-5 text-gray-400" />
              )}
            </button>
            {showMetrics && (
              <div className="hidden sm:flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1 bg-emerald-100 px-2.5 py-1 rounded-lg">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-bold text-emerald-700">{conversionRate}%</span>
                </div>
                <div className="flex items-center gap-1 bg-blue-100 px-2.5 py-1 rounded-lg">
                  <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-bold text-blue-700">{soldCount} sold</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Top Section: Image + Info */}
          <div className="flex gap-2 sm:gap-4 mb-3 sm:mb-4">
            {/* Image */}
            <div className="relative flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-lg sm:rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
              <img
                src={offer.images[0] || '/placeholder-food.jpg'}
                alt={offer.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
              {status !== 'ACTIVE' && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <EyeOff className="w-7 h-7 text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-1 sm:gap-2 mb-1.5 sm:mb-2">
                <h3 className="font-bold text-gray-900 text-sm sm:text-base line-clamp-2">{offer.title}</h3>
                <Badge className={`${getStatusColor(status)} text-white text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-md sm:rounded-lg shrink-0 font-semibold`}>
                  {status}
                </Badge>
              </div>

              {/* Price and Stock */}
              <div className="flex items-baseline gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                <span className="text-lg sm:text-2xl font-bold text-teal-600">₾{offer.smart_price.toFixed(2)}</span>
                {discountPercent > 0 && (
                  <span className="text-xs sm:text-sm text-gray-500 line-through">₾{offer.original_price.toFixed(2)}</span>
                )}
              </div>

              <div className="flex items-center gap-1.5 sm:gap-3 text-xs sm:text-sm text-gray-700">
                <div className="flex items-center gap-1 sm:gap-1.5 bg-gray-100 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg">
                  <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className={isLowStock ? 'text-orange-600 font-bold' : 'font-semibold'}>
                    {offer.quantity_available}/{offer.quantity_total}
                  </span>
                </div>
                {discountPercent > 0 && (
                  <Badge className="bg-rose-100 text-rose-700 text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg border border-rose-200 font-semibold">
                    -{discountPercent}% OFF
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Actions Row */}
          <div className="flex gap-1.5 sm:gap-2 pt-3 sm:pt-4 border-t border-gray-200">
            {/* Toggle Active/Pause */}
            <button
              onClick={() => onToggleOffer(offer.id, offer.status)}
              disabled={isProcessing || status === 'EXPIRED' || status === 'SOLD_OUT'}
              className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-all text-xs sm:text-sm ${
                status === 'ACTIVE'
                  ? 'bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-200'
                  : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border border-emerald-200'
              } ${(status === 'EXPIRED' || status === 'SOLD_OUT') ? 'opacity-50 cursor-not-allowed' : ''} font-semibold`}
            >
              {status === 'ACTIVE' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span className="text-sm">{status === 'ACTIVE' ? 'Pause' : 'Resume'}</span>
            </button>

            {/* Refresh Quantity */}
            <button
              onClick={() => onRefreshQuantity(offer.id)}
              disabled={isProcessing}
              className="p-1.5 sm:p-2.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 transition-all border border-blue-200"
              title="Refresh quantity"
            >
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Edit */}
            <button
              onClick={() => onEditOffer(offer)}
              disabled={isProcessing}
              className="p-1.5 sm:p-2.5 rounded-lg bg-teal-100 hover:bg-teal-200 text-teal-700 transition-all border border-teal-200"
              title="Edit offer"
            >
              <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Clone */}
            <button
              onClick={() => onCloneOffer(offer)}
              disabled={isProcessing}
              className="p-1.5 sm:p-2.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition-all border border-green-200"
              title="Clone offer"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Delete */}
            <button
              onClick={() => setDeleteConfirmId(offer.id)}
              disabled={isProcessing}
              className="p-1.5 sm:p-2.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition-all border border-red-200"
              title="Delete offer"
            >
              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (offers.length === 0) {
    return (
      <div className="text-center py-16 px-6 bg-gradient-to-br from-emerald-50/50 via-teal-50/30 to-white rounded-2xl border border-emerald-100 shadow-sm">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 mb-6 animate-pulse">
          <Package className="w-12 h-12 text-emerald-600" strokeWidth={2} />
        </div>
        <h3 className="text-gray-900 text-xl font-bold mb-2">No offers yet</h3>
        <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">Create your first offer to start attracting customers and growing your business</p>
        
        {/* Tips */}
        <div className="mt-8 grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
          <div className="p-4 bg-white rounded-xl border border-emerald-100 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-3">
              <span className="text-xl">📸</span>
            </div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Use Great Photos</p>
            <p className="text-xs text-gray-600">High-quality images attract more customers</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-emerald-100 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-3">
              <span className="text-xl">💰</span>
            </div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Price Competitively</p>
            <p className="text-xs text-gray-600">Offer 30-50% discount for best results</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-emerald-100 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-3">
              <span className="text-xl">⏰</span>
            </div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Post Regularly</p>
            <p className="text-xs text-gray-600">Daily offers increase your visibility</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Bulk Actions Toolbar */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search offers by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-12 rounded-xl bg-white border-2 border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 text-gray-900 placeholder:text-gray-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* Bulk Actions Bar */}
        {selectedOffers.size > 0 && (
          <div className="flex items-center gap-2 p-3 bg-teal-50 border-2 border-teal-200 rounded-xl">
            <span className="text-sm font-semibold text-teal-800">
              {selectedOffers.size} selected
            </span>
            <div className="flex gap-2 ml-auto">
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkPause}
                className="bg-white hover:bg-orange-50 border-orange-200 text-orange-700"
              >
                <Pause className="w-3.5 h-3.5 mr-1.5" />
                Pause All
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkResume}
                className="bg-white hover:bg-emerald-50 border-emerald-200 text-emerald-700"
              >
                <Play className="w-3.5 h-3.5 mr-1.5" />
                Resume All
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={deselectAll}
                className="text-gray-600 hover:text-gray-900"
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Metrics Toggle */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {filteredOffers.length} of {offers.length} offers
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowMetrics(!showMetrics)}
            className="text-xs text-gray-600 hover:text-teal-600"
          >
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
            {showMetrics ? 'Hide' : 'Show'} Metrics
          </Button>
        </div>
      </div>

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
            <button
              onClick={() => selectAllOffers(activeOffers)}
              className="ml-auto text-xs text-teal-600 hover:text-teal-700 font-medium"
            >
              Select All
            </button>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Offer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this offer. This action cannot be undone.
              <br /><br />
              <strong className="text-gray-900">Tip:</strong> Consider pausing the offer instead to keep it for later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmId) {
                  onDeleteOffer(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
