/**
 * Offers Card Demo Page
 * Showcases the new HeroOfferCard and OfferListCard components
 */

'use client';

import { HeroOfferCard } from '@/components/offers/HeroOfferCard';
import { OfferListCard } from '@/components/offers/OfferListCard';
import { ChevronRight } from 'lucide-react';

export default function OffersCardDemoPage() {
  const handleOfferClick = (title: string) => {
    console.log('Clicked offer:', title);
  };

  const handleReserveClick = (title: string) => {
    console.log('Reserve clicked for:', title);
  };

  return (
    <div className="min-h-screen bg-[#F6F6F8] pb-20">
      {/* Header */}
      <div className="bg-white px-4 pt-safe pt-6 pb-4 border-b border-[#E5E7EB]">
        <h1 className="text-2xl font-bold text-[#111827]">
          Offers Card Demo
        </h1>
        <p className="text-sm text-[#6B7280] mt-1">
          New premium card design for SmartPick
        </p>
      </div>

      {/* Content Container */}
      <div className="max-w-[360px] mx-auto">
        {/* Today's Special Offer Section */}
        <section className="mt-5 px-4">
          <div className="mb-3">
            <h2 className="text-[18px] font-semibold text-[#111827]">
              Today's Special Offer
            </h2>
          </div>

          <HeroOfferCard
            title="Yummies Special Burger"
            imageUrl="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop"
            priceNow="₦1,800"
            priceOld="₦2,000"
            discountLabel="10% off"
            ctaLabel="Reserve Now"
            onClick={() => handleOfferClick('Yummies Special Burger')}
            onCtaClick={() => handleReserveClick('Yummies Special Burger')}
          />
        </section>

        {/* Popular Now Section */}
        <section className="mt-6">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="text-[18px] font-semibold text-[#111827]">
              Popular Now
            </h2>
            <button className="flex items-center gap-1 text-[13px] font-medium text-[#FF7A1A]">
              SEE FULL MENU
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Horizontal Scroll Container */}
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-3 px-4 pb-2">
              <OfferListCard
                title="Beef Salad"
                imageUrl="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop"
                priceNow="₦1,200"
                priceOld="₦1,500"
                onClick={() => handleOfferClick('Beef Salad')}
              />
              
              <OfferListCard
                title="Spicy Noodles"
                imageUrl="https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300&h=300&fit=crop"
                priceNow="₦1,500"
                priceOld="₦2,000"
                isFavorite={true}
                onClick={() => handleOfferClick('Spicy Noodles')}
              />
              
              <OfferListCard
                title="Vegetable Spring Rolls"
                imageUrl="https://images.unsplash.com/photo-1529042410759-befb1204b468?w=300&h=300&fit=crop"
                priceNow="₦800"
                metaLine="5–10 min • 0.8 km"
                onClick={() => handleOfferClick('Vegetable Spring Rolls')}
              />
              
              <OfferListCard
                title="Grilled Chicken Wings"
                imageUrl="https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=300&h=300&fit=crop"
                priceNow="₦2,200"
                priceOld="₦2,800"
                metaLine="Ready now"
                onClick={() => handleOfferClick('Grilled Chicken Wings')}
              />
            </div>
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
