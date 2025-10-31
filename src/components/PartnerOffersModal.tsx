import { Offer, Partner } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { resolveOfferImageUrl } from '@/lib/api';
import { Clock, MapPin } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PartnerOffersModalProps {
  partner: Partner | null;
  offers: Offer[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOfferClick: (offer: Offer) => void;
}

export default function PartnerOffersModal({
  partner,
  offers,
  open,
  onOpenChange,
  onOfferClick,
}: PartnerOffersModalProps) {
  if (!partner) return null;

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    return `${minutes}m left`;
  };

  const partnerOffers = offers.filter(offer =>
    offer.partner_id === partner.id &&
    offer.status === 'ACTIVE' &&
    new Date(offer.expires_at) > new Date()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            {partner.business_name}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 text-base">
            <MapPin className="w-4 h-4" />
            {partner.address}, {partner.city}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {partnerOffers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No active offers available from this restaurant</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {partnerOffers.map((offer) => {
                  const pickupTimes = {
                    start: offer.pickup_window?.start || offer.pickup_start,
                    end: offer.pickup_window?.end || offer.pickup_end,
                  };

                  const expiringSoon = new Date(offer.expires_at).getTime() - new Date().getTime() < 2 * 60 * 60 * 1000;

                  return (
                    <Card
                      key={offer.id}
                      className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-mint-500"
                      onClick={() => {
                        onOfferClick(offer);
                        onOpenChange(false);
                      }}
                    >
                      {offer.images && offer.images.length > 0 && (
                        <div className="relative h-40 w-full overflow-hidden rounded-t-lg">
                          <img
                            src={resolveOfferImageUrl(offer.images[0])}
                            alt={offer.title}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg'; }}
                          />
                          <Badge className="absolute top-2 right-2 bg-mint-600 hover:bg-mint-700">
                            {offer.category}
                          </Badge>
                          {expiringSoon && (
                            <Badge className="absolute top-2 left-2 bg-orange-500 hover:bg-orange-600 animate-pulse">
                              Ending Soon!
                            </Badge>
                          )}
                        </div>
                      )}
                      <CardHeader>
                        <CardTitle className="text-lg">{offer.title}</CardTitle>
                        <CardDescription className="text-sm line-clamp-2">
                          {offer.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-2xl font-bold text-mint-600">
                                {offer.smart_price} GEL
                              </span>
                              <span className="text-sm text-gray-400 line-through ml-2">
                                {offer.original_price} GEL
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {offer.quantity_available} left
                            </Badge>
                          </div>
                          {pickupTimes.start && pickupTimes.end && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span>
                                {formatTime(pickupTimes.start)} - {formatTime(pickupTimes.end)}
                              </span>
                            </div>
                          )}
                          <div className={`text-xs font-medium ${expiringSoon ? 'text-orange-600' : 'text-coral-600'}`}>
                            {getTimeRemaining(offer.expires_at)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
