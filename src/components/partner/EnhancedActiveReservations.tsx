import { Reservation } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, User, CheckCircle, Package, XCircle } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
 

type ExtendedReservation = Reservation & { customer?: { name?: string; phone?: string } };

interface EnhancedActiveReservationsProps {
  reservations: ExtendedReservation[];
  onMarkAsPickedUp: (r: Reservation) => void;
  onMarkAsNoShow: (r: Reservation) => void;
  onMarkAsNoShowNoPenalty: (r: Reservation) => void;
  processingIds: Set<string>;
}

export default function EnhancedActiveReservations({
  reservations,
  onMarkAsPickedUp,
  onMarkAsNoShow,
  onMarkAsNoShowNoPenalty,
  processingIds,
}: EnhancedActiveReservationsProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 60) return `${minutes}m remaining`;

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m remaining`;
  };

  const isExpired = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    return expires.getTime() - now.getTime() <= 0;
  };

  if (reservations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Package className="w-5 h-5" />
            Active Reservations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No active reservations</p>
            <p className="text-sm mt-1">Customers waiting for pickup will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Package className="w-5 h-5" />
            Active Reservations
            <Badge className="ml-2 bg-coral-500">{reservations.length}</Badge>
          </CardTitle>
          <span className="text-xs sm:text-sm text-gray-500">
            Customers waiting for pickup
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {reservations.map((reservation) => {
          const isProcessing = processingIds.has(reservation.id);
          const timeRemaining = getTimeRemaining(reservation.expires_at);
          const isExpiringSoon = timeRemaining.includes('m remaining') && !timeRemaining.includes('h');

          return (
            <Card
              key={reservation.id}
              className={`${
                isExpiringSoon ? 'border-orange-300 bg-orange-50' : 'border-gray-200'
              }`}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="space-y-3">
                  {/* Customer Info */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="font-semibold text-sm sm:text-base truncate">
                          {reservation.customer?.name || 'Customer'}
                        </span>
                      </div>
                      {/* Do not show customer phone to partners for privacy */}
                    </div>

                    {/* Time Badge */}
                    <Badge
                      className={`text-xs px-2 py-1 ${
                        isExpiringSoon
                          ? 'bg-orange-500 text-white'
                          : 'bg-blue-500 text-white'
                      }`}
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      {timeRemaining}
                    </Badge>
                  </div>

                  {/* Offer Details */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{reservation.offer?.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                          <span>Qty: {reservation.quantity}</span>
                          <span className="font-semibold text-green-600">
                            {reservation.total_price} ₾
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Pickup Window */}
                    <div className="flex items-center gap-2 text-xs text-gray-600 pt-2 border-t">
                      <Clock className="w-3 h-3" />
                      <span>
                        Pickup: {formatTime(reservation.offer?.pickup_start || reservation.created_at)} -{' '}
                        {formatTime(reservation.expires_at)}
                      </span>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="bg-blue-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-600 mb-1">QR Code</p>
                    <p className="font-mono font-bold text-sm">{reservation.qr_code}</p>
                  </div>

                  {/* Action Buttons */}
                  {isExpired(reservation.expires_at) ? (
                    // Show three buttons for expired reservations
                    <div className="space-y-2">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-2">
                        <p className="text-xs text-red-700 font-medium text-center">
                          ⚠️ This reservation has expired
                        </p>
                      </div>
                      {/* Picked Up button */}
                      <Button
                        onClick={() => onMarkAsPickedUp(reservation)}
                        disabled={isProcessing}
                        className="w-full bg-green-600 hover:bg-green-700 h-11"
                      >
                        {isProcessing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Picked Up
                          </>
                        )}
                      </Button>
                      {/* No-Show buttons */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Button
                          onClick={() => onMarkAsNoShow(reservation)}
                          disabled={isProcessing}
                          variant="destructive"
                          className="w-full h-11"
                        >
                          {isProcessing ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Processing...
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 mr-2" />
                              No-Show (Penalty)
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => onMarkAsNoShowNoPenalty(reservation)}
                          disabled={isProcessing}
                          variant="outline"
                          className="w-full h-11 border-orange-400 text-orange-700 hover:bg-orange-50"
                        >
                          {isProcessing ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-700 mr-2"></div>
                              Processing...
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 mr-2" />
                              No-Show (No Penalty)
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Single button for active reservations
                    <Button
                      onClick={() => onMarkAsPickedUp(reservation)}
                      disabled={isProcessing}
                      className="w-full bg-green-600 hover:bg-green-700 h-11 sm:h-12"
                    >
                      {isProcessing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          ✅ Mark as Picked Up
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
}

