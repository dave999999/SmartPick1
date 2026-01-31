/**
 * PartnerSheet.tsx
 * Bottom sheet showing partner info and their offers when clicking a map pin
 */

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { MapPin, Clock, Star, Phone } from 'lucide-react';
import { Partner, Offer } from '@/lib/types';
import { getPartnerById } from '@/lib/api';
import { OfferListCard } from './offers/OfferListCard';
import { logger } from '@/lib/logger';

interface PartnerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  partnerId: string | null;
  onOfferSelect: (offer: Offer) => void;
}

export function PartnerSheet({ isOpen, onClose, partnerId, onOfferSelect }: PartnerSheetProps) {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadPartnerData = async () => {
      if (!partnerId) return;
      
      setLoading(true);
      try {
        const partnerData = await getPartnerById(partnerId);
        setPartner(partnerData);
        
        // Get partner's active offers from the offers array
        const { getPartnerOffers } = await import('@/lib/api');
        const partnerOffers = await getPartnerOffers(partnerId);
        setOffers(partnerOffers.filter(o => o.status === 'ACTIVE'));
      } catch (error) {
        logger.error('[PartnerSheet] Failed to load partner data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && partnerId) {
      loadPartnerData();
    }
  }, [isOpen, partnerId]);

  if (!partnerId) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose} modal={true}>
      <SheetContent 
        side="bottom" 
        className="h-[82vh] max-h-[720px] p-0 border-none bg-white rounded-t-[24px] overflow-hidden z-40"
        style={{
          left: '8px',
          right: '8px',
          bottom: '8px',
          width: 'calc(100% - 16px)',
          maxWidth: '100%',
        }}
        aria-hidden={undefined}
      >
        <SheetTitle className="sr-only">
          {partner?.business_name || 'Partner Details'}
        </SheetTitle>

        <div className="flex flex-col h-full">
          {/* iOS-style drag handle */}
          <div className="flex items-center justify-center py-3 bg-white">
            <div className="h-1.5 w-12 rounded-full bg-gray-300/80" />
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : partner ? (
            <>
              {/* Partner Header with Cover Image */}
              <div className="relative sticky top-0 z-20">
                {/* Cover Image */}
                <div className="w-full h-52 bg-gradient-to-br from-orange-400 to-orange-600 relative overflow-hidden">
                  {partner.cover_image_url || partner.images?.[0] ? (
                    <img 
                      src={partner.cover_image_url || partner.images?.[0]} 
                      alt={partner.business_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-6xl text-white opacity-50">🏪</div>
                    </div>
                  )}
                  {/* Overlay gradient for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                </div>

                {/* Partner Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <h2 className="text-2xl font-bold mb-1">{partner.business_name}</h2>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span className="line-clamp-1">{partner.address}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Partner Details */}
              <div className="px-4 py-3 bg-white/95 border-b border-gray-200">
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
                  {partner.phone && (
                    <a
                      href={`tel:${partner.phone}`}
                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 shadow-sm"
                    >
                      <Phone className="w-4 h-4" />
                      <span>{partner.phone}</span>
                    </a>
                  )}
                  {!partner.open_24h && partner.opening_time && partner.closing_time && (
                    <div className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 shadow-sm">
                      <Clock className="w-4 h-4" />
                      <span>{partner.opening_time} - {partner.closing_time}</span>
                    </div>
                  )}
                  {partner.open_24h && (
                    <div className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-green-600 font-medium">Open 24 Hours</span>
                    </div>
                  )}
                </div>
                {partner.description && (
                  <p className="mt-2 text-sm text-gray-700 line-clamp-2">{partner.description}</p>
                )}
              </div>

              {/* Offers Section */}
              <div className="px-4 py-4 bg-white">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Available Offers ({offers.length})
                </h3>
                
                {offers.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 pb-20">
                    {offers.map((offer) => (
                      <OfferListCard
                        key={offer.id}
                        title={offer.title}
                        imageUrl={offer.images?.[0] || '/images/Map.jpg'}
                        partnerName={partner.business_name}
                        partnerImageUrl={partner.cover_image_url || partner.images?.[0]}
                        priceNow={`₾${Math.round(offer.smart_price).toLocaleString()}`}
                        priceOld={offer.original_price ? `₾${Math.round(offer.original_price).toLocaleString()}` : undefined}
                        onClick={() => onOfferSelect(offer)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p>No active offers at the moment</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <p>Partner not found</p>
            </div>
          )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
