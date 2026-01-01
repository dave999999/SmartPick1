import { logger } from '@/lib/logger';
/**
 * Nearby Offers Sheet
 * Shows new offers added within last hour near user's location
 */

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, Clock, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

interface Offer {
  id: string;
  title: string;
  original_price: number;
  discounted_price: number;
  partner: {
    name: string;
    latitude: number;
    longitude: number;
  };
  created_at: string;
  distance?: number;
}

interface NearbyOffersSheetProps {
  isOpen: boolean;
  onClose: () => void;
  userLocation: [number, number] | null;
  offerIds?: string[];
}

export function NearbyOffersSheet({
  isOpen,
  onClose,
  userLocation,
  offerIds
}: NearbyOffersSheetProps) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxDistance, setMaxDistance] = useState(5); // 1km, 3km, 5km
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      loadNearbyOffers();
    }
  }, [isOpen, offerIds, maxDistance]);

  const loadNearbyOffers = async () => {
    try {
      setLoading(true);

      // Get offers from last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      let query = supabase
        .from('offers')
        .select(`
          id,
          title,
          original_price,
          discounted_price,
          created_at,
          partner:partners(
            name,
            latitude,
            longitude
          )
        `)
        .eq('status', 'AVAILABLE')
        .gte('created_at', oneHourAgo)
        .order('created_at', { ascending: false });

      // Filter by specific offer IDs if provided
      if (offerIds && offerIds.length > 0) {
        query = query.in('id', offerIds);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculate distance if user location provided
      const offersWithDistance = data?.map(offer => ({
        ...offer,
        distance: userLocation && offer.partner?.latitude
          ? calculateDistance(
              userLocation[0],
              userLocation[1],
              offer.partner.latitude,
              offer.partner.longitude
            )
          : undefined
      }));

      // Filter by selected max distance and sort
      const nearbyOffers = offersWithDistance
        ?.filter(o => !o.distance || o.distance <= maxDistance)
        ?.sort((a, b) => (a.distance || 0) - (b.distance || 0));

      setOffers(nearbyOffers || []);
    } catch (error) {
      logger.error('Failed to load nearby offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getTimeSince = (created: string): string => {
    const minutes = Math.floor((Date.now() - new Date(created).getTime()) / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  const viewOffer = (offerId: string) => {
    onClose();
    navigate(`/?offerId=${offerId}`);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <MapPin className="text-[#34C759]" size={24} />
            ახლო შეთავაზებები
          </SheetTitle>
          <p className="text-sm text-gray-600">
            ახალი შეთავაზებები • დამატებულია ბოლო საათში
          </p>
          
          {/* Distance filter buttons */}
          <div className="flex gap-2 mt-3">
            {[1, 3, 5].map(km => (
              <button
                key={km}
                onClick={() => setMaxDistance(km)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  maxDistance === km
                    ? 'bg-[#34C759] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {km}კმ
              </button>
            ))}
          </div>
        </SheetHeader>

        <div className="overflow-y-auto h-[calc(100%-80px)] space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF8A00]" />
            </div>
          ) : offers.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="mx-auto mb-3 text-gray-400" size={48} />
              <p className="text-gray-600">ახლო არ არის ახალი შეთავაზებები</p>
              <p className="text-sm text-gray-400 mt-1">მოგვიანებით შეამოწმეთ!</p>
            </div>
          ) : (
            offers.map(offer => (
              <Card
                key={offer.id}
                className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => viewOffer(offer.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-[17px] mb-1">{offer.title}</h3>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <MapPin size={14} />
                      {offer.partner?.name}
                      {offer.distance && (
                        <span className="text-[#34C759] font-medium">
                          • {offer.distance.toFixed(1)}km
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-[#FF8A00] font-bold text-lg">
                      ₾{offer.discounted_price}
                    </div>
                    <div className="text-gray-400 line-through text-sm">
                      ₾{offer.original_price}
                    </div>
                    <div className="text-[#34C759] text-xs font-semibold">
                      {Math.round((1 - offer.discounted_price / offer.original_price) * 100)}% OFF
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mt-3 pt-3 border-t">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {getTimeSince(offer.created_at)}
                  </span>
                  <span className="text-[#FF8A00] font-medium">NEW</span>
                </div>
              </Card>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
