import { useState, useEffect, useRef } from 'react';
import { Offer } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { resolveOfferImageUrl } from '@/lib/api';
import { DEFAULT_24H_OFFER_DURATION_HOURS } from '@/lib/constants';

interface RecentOffersSliderProps {
  offers: Offer[];
  onOfferClick: (offer: Offer) => void;
  title?: string;
}

export default function RecentOffersSlider({ offers, onOfferClick, title = "Recently Added Offers" }: RecentOffersSliderProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lazy load when component becomes visible
  useEffect(() => {
    if (containerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsVisible(true);
              observerRef.current?.disconnect();
            }
          });
        },
        { rootMargin: '50px' }
      );

      observerRef.current.observe(containerRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  // Sort offers by created_at (most recent first) and take top 10
  const recentOffers = [...offers]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeRemaining = (expiresAt?: string) => {
    const target = expiresAt || new Date(Date.now() + DEFAULT_24H_OFFER_DURATION_HOURS * 60 * 60 * 1000).toISOString();
    const now = new Date();
    const expires = new Date(target);
    const diff = expires.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (diff <= 0) return 'Expired';
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const isExpiringSoon = (expiresAt?: string) => {
    const target = expiresAt || new Date(Date.now() + DEFAULT_24H_OFFER_DURATION_HOURS * 60 * 60 * 1000).toISOString();
    const diff = new Date(target).getTime() - new Date().getTime();
    return diff > 0 && diff < 60 * 60 * 1000; // Less than 1 hour
  };

  const getPickupTimes = (offer: Offer) => {
    if (offer.pickup_window?.start && offer.pickup_window?.end) {
      return {
        start: offer.pickup_window.start,
        end: offer.pickup_window.end,
      };
    }
    return {
      start: offer.pickup_start || '',
      end: offer.pickup_end || '',
    };
  };

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollButtons);
      window.addEventListener('resize', checkScrollButtons);
      return () => {
        container.removeEventListener('scroll', checkScrollButtons);
        window.removeEventListener('resize', checkScrollButtons);
      };
    }
  }, [recentOffers]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320; // Width of one card + gap
      const newScrollLeft = direction === 'left'
        ? scrollContainerRef.current.scrollLeft - scrollAmount
        : scrollContainerRef.current.scrollLeft + scrollAmount;

      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth',
      });
    }
  };

  if (recentOffers.length === 0) return null;

  return (
    <div ref={containerRef} className="w-full bg-gray-900 border-t border-gray-800 rounded-b-3xl shadow-2xl py-8 px-4 md:px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#00C896] via-[#00e6a8] to-[#00ffbb] text-transparent bg-clip-text">{title}</h2>
          <p className="text-sm md:text-base text-gray-400 mt-1.5 font-medium">Fresh picks just added to SmartPick</p>
        </div>

        {/* Desktop Navigation Arrows */}
        <div className="hidden md:flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full border-[#E8F9F4] hover:border-[#00C896] hover:bg-[#F9FFFB] disabled:opacity-50"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full border-[#E8F9F4] hover:border-[#00C896] hover:bg-[#F9FFFB] disabled:opacity-50"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Scrollable Offers Container */}
      {isVisible ? (
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth pb-2"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {recentOffers.map((offer) => {
          const pickupTimes = getPickupTimes(offer);
          const expiry = (offer as any)?.expires_at || (offer as any)?.auto_expire_in || new Date(Date.now() + DEFAULT_24H_OFFER_DURATION_HOURS*60*60*1000).toISOString();
          const expiringSoon = isExpiringSoon(expiry);

          return (
            <Card
              key={offer.id}
              className="flex-shrink-0 w-[280px] md:w-[300px] cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-[1.02] rounded-2xl border-[#E8F9F4] snap-start"
              onClick={() => onOfferClick(offer)}
            >
              {/* Image */}
              {offer.images && offer.images.length > 0 ? (
                <div className="relative h-40 w-full overflow-hidden rounded-t-2xl">
                  <img
                    src={resolveOfferImageUrl(offer.images[0], offer.category, { width: 400, quality: 80 })}
                    alt={offer.title}
                    loading="lazy"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg'; }}
                    className="w-full h-full object-cover"
                  />
                  {expiringSoon && (
                    <Badge className="absolute top-2 left-2 bg-orange-500 hover:bg-orange-600 animate-pulse shadow-lg">
                      ⏰ Ending Soon!
                    </Badge>
                  )}
                  <Badge className="absolute top-2 right-2 bg-gradient-to-r from-[#00C896] to-[#009B77] text-white shadow-lg">
                    {offer.category}
                  </Badge>
                </div>
              ) : (
                <div className="relative h-40 w-full bg-gradient-to-br from-[#F9FFFB] to-[#EFFFF8] flex items-center justify-center rounded-t-2xl">
                  <span className="text-6xl opacity-30">📦</span>
                  {expiringSoon && (
                    <Badge className="absolute top-2 left-2 bg-orange-500 hover:bg-orange-600 animate-pulse shadow-lg">
                      ⏰ Ending Soon!
                    </Badge>
                  )}
                </div>
              )}

              <CardContent className="p-4">
                <div className="space-y-2">
                  {/* Title */}
                  <h3 className="font-bold text-base text-gray-900 line-clamp-1">
                    {offer.title}
                  </h3>

                  {/* Partner Name */}
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <MapPin className="w-3 h-3 text-[#00C896]" />
                    <span className="line-clamp-1">{offer.partner?.business_name}</span>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold bg-gradient-to-r from-[#00C896] to-[#009B77] text-transparent bg-clip-text">
                      {offer.smart_price} ₾
                    </span>
                    <span className="text-sm text-gray-400 line-through">
                      {offer.original_price} ₾
                    </span>
                  </div>

                  {/* Pickup Time */}
                  {pickupTimes.start && pickupTimes.end && (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <Clock className="w-3 h-3 text-[#00C896]" />
                      <span>
                        {formatTime(pickupTimes.start)} - {formatTime(pickupTimes.end)}
                      </span>
                    </div>
                  )}

                  {/* Time Remaining & Quantity */}
                  <div className="flex items-center justify-between pt-1">
                    <span className={`text-xs font-medium ${
                      expiringSoon ? 'text-orange-600' : 'text-[#00C896]'
                    }`}>
                      {getTimeRemaining(expiry)}
                    </span>
                    <Badge variant="outline" className="text-xs border-[#E8F9F4]">
                      {offer.quantity_available} left
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {/* Loading skeleton */}
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-shrink-0 w-[280px] md:w-[300px] animate-pulse">
              <div className="h-40 bg-gray-200 rounded-t-2xl"></div>
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom scrollbar styles */}
      <style jsx>{`
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


