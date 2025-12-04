/**
 * Offers Card Demo Page
 * Showcases the new HeroOfferCard and OfferListCard components
 */

import { HeroOfferCard } from '@/components/offers/HeroOfferCard';
import { OfferListCard } from '@/components/offers/OfferListCard';
import { ChevronRight, Search, Mic } from 'lucide-react';
import { getAllCategories } from '@/lib/categories';
import { useState } from 'react';

export default function OffersCardDemo() {
  const allCategories = getAllCategories();
  const [selectedCategory, setSelectedCategory] = useState(allCategories[0].value);

  const handleOfferClick = (title: string) => {
    console.log('Clicked offer:', title);
  };

  const handleReserveClick = (title: string) => {
    console.log('Reserve clicked for:', title);
  };

  return (
    <div className="min-h-screen bg-[#F6F6F8] pb-20">
      {/* Search Bar & Categories */}
      <div className="bg-white px-4 pt-4 pb-3">
        {/* Search Bar */}
        <div className="relative flex items-center h-11 bg-[#F5F5F5] rounded-xl mb-3">
          <Search className="absolute left-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Enter a dish name e.g. Egusi soup"
            className="flex-1 px-10 text-sm bg-transparent outline-none placeholder:text-gray-400"
          />
          <button className="absolute right-3">
            <Mic className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {allCategories.map((category) => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category.value
                  ? 'bg-[#FF7A1A] text-white'
                  : 'bg-white text-gray-700 border border-gray-200'
              }`}
            >
              <span className="mr-1.5">{category.emoji}</span>
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Container */}
      <div className="max-w-[360px] mx-auto">
        {/* Category Grid */}
        <section className="px-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <OfferListCard
              title="Spicy Noodles"
              imageUrl="https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300&h=300&fit=crop"
              priceNow="₦1,500"
              onClick={() => handleOfferClick('Spicy Noodles')}
            />
            
            <OfferListCard
              title="Shrimp Pasta"
              imageUrl="https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=300&h=300&fit=crop"
              priceNow="₦1,800"
              onClick={() => handleOfferClick('Shrimp Pasta')}
            />
            
            <OfferListCard
              title="Vegetable Curry"
              imageUrl="https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300&h=300&fit=crop"
              priceNow="₦1,200"
              onClick={() => handleOfferClick('Vegetable Curry')}
            />
            
            <OfferListCard
              title="Mixed Salad"
              imageUrl="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop"
              priceNow="₦1,500"
              onClick={() => handleOfferClick('Mixed Salad')}
            />
            
            <OfferListCard
              title="Chicken Pasta Salad"
              imageUrl="https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=300&h=300&fit=crop"
              priceNow="₦1,500"
              onClick={() => handleOfferClick('Chicken Pasta Salad')}
            />
            
            <OfferListCard
              title="Beef Salad"
              imageUrl="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=300&fit=crop"
              priceNow="₦1,200"
              onClick={() => handleOfferClick('Beef Salad')}
            />
          </div>
        </section>

        {/* Another Hero Example - Different Style */}
        <section className="mt-6 px-4">
          <div className="mb-3">
            <h2 className="text-[18px] font-semibold text-[#111827]">
              Weekend Special
            </h2>
          </div>

          <HeroOfferCard
            title="Premium Seafood Platter"
            imageUrl="https://images.unsplash.com/photo-1559737558-2f5a2e1e2e96?w=400&h=400&fit=crop"
            priceNow="₦4,500"
            priceOld="₦6,000"
            discountLabel="25% off"
            ctaLabel="Reserve Now"
            onClick={() => handleOfferClick('Premium Seafood Platter')}
            onCtaClick={() => handleReserveClick('Premium Seafood Platter')}
          />
        </section>

        {/* Design Notes */}
        <section className="mt-8 px-4 pb-8">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-[#111827] mb-2">
              Design Notes
            </h3>
            <ul className="text-xs text-[#6B7280] space-y-1.5">
              <li>• Hero card: 20px radius, 12px padding, 124×124px image</li>
              <li>• List card: 16px radius, 120px width, square image top</li>
              <li>• Shadow: iOS-style soft depth (12–30px blur)</li>
              <li>• Orange accent: #FF7A1A (SmartPick brand)</li>
              <li>• All text centered in list cards for visual balance</li>
              <li>• Interactive states: scale + shadow transitions</li>
              <li>• Favorite icons with backdrop-blur for premium feel</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
