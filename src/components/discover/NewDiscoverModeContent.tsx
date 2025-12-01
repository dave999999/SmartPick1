import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, Star, MapPin, Clock, Sparkles } from 'lucide-react';
import { EnrichedOffer } from '@/lib/offerFilters';
import { OfferCard } from './OfferCard';

interface NewDiscoverModeContentProps {
  offers: EnrichedOffer[];
  user: any;
  userLocation: [number, number] | null;
  onOfferClick: (offer: EnrichedOffer, index: number) => void;
  onMapHighlight?: (offerId: string | null) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All', emoji: '⭐' },
  { id: 'restaurant', label: 'Dining', emoji: '🍽️' },
  { id: 'bakery', label: 'Bakery', emoji: '🥐' },
  { id: 'cafe', label: 'Café', emoji: '☕' },
  { id: 'grocery', label: 'Grocery', emoji: '🛒' },
  { id: 'other', label: 'Other', emoji: '🎁' },
];

export function NewDiscoverModeContent({
  offers,
  user,
  userLocation,
  onOfferClick,
  onMapHighlight,
}: NewDiscoverModeContentProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'recommended' | 'distance' | 'price' | 'expiring'>('recommended');

  // Filter and sort offers
  const filteredOffers = useMemo(() => {
    let filtered = [...offers];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        o.title.toLowerCase().includes(query) ||
        o.description?.toLowerCase().includes(query) ||
        o.partner?.business_name?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(o => o.category === selectedCategory);
    }

    // Sort
    switch (sortBy) {
      case 'distance':
        filtered.sort((a, b) => (a.distance || 999) - (b.distance || 999));
        break;
      case 'price':
        filtered.sort((a, b) => a.smart_price - b.smart_price);
        break;
      case 'expiring':
        filtered.sort((a, b) => {
          const aEnd = new Date(a.pickup_end || a.pickup_window?.end || '').getTime();
          const bEnd = new Date(b.pickup_end || b.pickup_window?.end || '').getTime();
          return aEnd - bEnd;
        });
        break;
      case 'recommended':
      default:
        // Keep as is - assume already sorted by recommendation
        break;
    }

    return filtered;
  }, [offers, searchQuery, selectedCategory, sortBy]);

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-orange-50 to-white">
      {/* NEW HEADER with gradient background */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-6 text-white">
        <h1 className="text-2xl font-bold mb-1">🔥 Discover Deals</h1>
        <p className="text-orange-100 text-sm">Fresh picks near you, updated daily</p>
      </div>

      {/* SEARCH BAR - New design */}
      <div className="px-4 py-3 bg-white shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search deals, places, items..."
            className="w-full pl-10 pr-4 py-3 border-2 border-orange-200 rounded-xl focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>
      </div>

      {/* SORT PILLS - New horizontal layout */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setSortBy('recommended')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              sortBy === 'recommended'
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Star className="w-4 h-4" />
            Recommended
          </button>
          <button
            onClick={() => setSortBy('distance')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              sortBy === 'distance'
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Nearest
          </button>
          <button
            onClick={() => setSortBy('price')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              sortBy === 'price'
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            💸 Cheapest
          </button>
          <button
            onClick={() => setSortBy('expiring')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              sortBy === 'expiring'
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            Expiring Soon
          </button>
        </div>
      </div>

      {/* CATEGORY CHIPS - New design */}
      <div className="px-4 py-3 bg-white">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg scale-105'
                  : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
              }`}
            >
              <span className="text-base">{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* RESULTS COUNT */}
      <div className="px-4 py-2 bg-gradient-to-b from-white to-orange-50">
        <p className="text-sm text-gray-600">
          <span className="font-bold text-orange-600">{filteredOffers.length}</span> deals found
        </p>
      </div>

      {/* OFFERS GRID - New 2-column layout */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {filteredOffers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No deals found</h3>
            <p className="text-gray-500 text-sm">Try adjusting your filters or search</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-4">
            {filteredOffers.map((offer, index) => (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                <OfferCard
                  offer={offer}
                  onClick={() => onOfferClick(offer, index)}
                  onInView={() => onMapHighlight?.(offer.id)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
