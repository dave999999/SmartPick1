/**
 * 🎨 PARTNER DASHBOARD - REDESIGNED
 * Professional, compact, high-clarity layout
 * Mobile-first with perfect hierarchy
 */

import { useState } from 'react';
import { Offer, Partner } from '@/lib/types';
import { 
  Search,
  BarChart3
} from 'lucide-react';

// Components
import { StatusFilters } from './redesign/StatusFilters';
import { OfferList } from './redesign/OfferList';
import { StickyActions } from './redesign/StickyActions';

interface PartnerDashboardRedesignedProps {
  partner: Partner;
  offers: Offer[];
  pointBalance: number;
  onCreateOffer: () => void;
  onScanQR: () => void;
  onEditOffer: (offer: Offer) => void;
  onToggleOffer: (offerId: string, currentStatus: string) => void;
  onDeleteOffer: (offerId: string) => void;
  onRefreshQuantity: (offerId: string) => void;
  onCloneOffer: (offer: Offer) => void;
  processingIds: Set<string>;
}

export function PartnerDashboardRedesigned({
  partner,
  offers,
  pointBalance,
  onCreateOffer,
  onScanQR,
  onEditOffer,
  onToggleOffer,
  onDeleteOffer,
  onRefreshQuantity,
  onCloneOffer,
  processingIds
}: PartnerDashboardRedesignedProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'active' | 'paused' | 'ended' | 'all'>('all');
  const [showMetrics, setShowMetrics] = useState(false);

  // Filter offers
  const filteredOffers = offers.filter(offer => {
    const matchesSearch = offer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         offer.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || 
                         (selectedStatus === 'active' && offer.status === 'ACTIVE') ||
                         (selectedStatus === 'paused' && offer.status === 'PAUSED') ||
                         (selectedStatus === 'ended' && (offer.status === 'EXPIRED' || offer.quantity_available === 0));
    
    return matchesSearch && matchesStatus;
  });

  // Count by status
  const statusCounts = {
    active: offers.filter(o => o.status === 'ACTIVE').length,
    paused: offers.filter(o => o.status === 'PAUSED').length,
    ended: offers.filter(o => o.status === 'EXPIRED' || o.quantity_available === 0).length,
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Main Content */}
      <div className="px-4 pt-6 space-y-4">
        {/* Status Filters */}
        <StatusFilters
          selected={selectedStatus}
          onSelect={setSelectedStatus}
          counts={statusCounts}
        />

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search offers by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
          />
        </div>

        {/* Offer List Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 font-medium">
            {filteredOffers.length} of {offers.length} offers
          </p>
          <button
            onClick={() => setShowMetrics(!showMetrics)}
            className="flex items-center gap-1 text-xs text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            {showMetrics ? 'Hide' : 'Show'} Metrics
          </button>
        </div>

        {/* Offer List */}
        <OfferList
          offers={filteredOffers}
          showMetrics={showMetrics}
          onEditOffer={onEditOffer}
          onToggleOffer={onToggleOffer}
          onDeleteOffer={onDeleteOffer}
          onRefreshQuantity={onRefreshQuantity}
          onCloneOffer={onCloneOffer}
          processingIds={processingIds}
        />
      </div>

      {/* Sticky Bottom Actions */}
      <StickyActions
        onCreateOffer={onCreateOffer}
        onScanQR={onScanQR}
      />
    </div>
  );
}
