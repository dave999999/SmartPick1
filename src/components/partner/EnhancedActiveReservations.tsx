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
  onConfirmNoShow: (r: Reservation) => void;
  onForgiveCustomer: (r: Reservation) => void;
  processingIds: Set<string>;
}

export default function EnhancedActiveReservations({
  reservations,
  onMarkAsPickedUp,
  onConfirmNoShow,
  onForgiveCustomer,
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
      <div className="text-center py-12">
        <Clock className="w-16 h-16 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">No active reservations</p>
        <p className="text-xs text-gray-400 mt-1">Customers waiting for pickup will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header with count */}
      <div className="flex items-center gap-2 px-1 mb-2">
        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
        <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Active Reservations</h3>
        <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs px-1.5 py-0.5 rounded-full">
          {reservations.length}
        </Badge>
      </div>

      {/* Reservation Cards */}
      {reservations.map((reservation) => {
        const isProcessing = processingIds.has(reservation.id);
        const timeRemaining = getTimeRemaining(reservation.expires_at);
        const isExpiringSoon = timeRemaining.includes('m remaining') && !timeRemaining.includes('h');
        const expired = isExpired(reservation.expires_at);

        return (
          <Card
            key={reservation.id}
            className={`border-none shadow-sm overflow-hidden ${
              expired
                ? 'bg-gradient-to-br from-red-50 to-red-100/50'
                : isExpiringSoon
                ? 'bg-gradient-to-br from-orange-50 to-orange-100/50'
                : 'bg-gradient-to-br from-blue-50 to-blue-100/50'
            }`}
          >
            <CardContent className="p-3">
              {/* Customer + Time + Price - Single Row */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-xs truncate">
                      {reservation.customer?.name || 'Customer'}
                    </p>
                    <p className="text-xs text-gray-600 truncate">
                      {reservation.offer?.title}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-bold text-teal-600">
                    ₾{reservation.total_price.toFixed(2)}
                  </span>
                  <Badge
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      expired
                        ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                        : isExpiringSoon
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                        : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                    }`}
                  >
                    <Clock className="w-3 h-3 mr-0.5" />
                    {timeRemaining}
                  </Badge>
                </div>
              </div>

              {/* Qty + QR Code - Compact Row */}
              <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-gray-200/50">
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Package className="w-3 h-3" />
                  <span>x{reservation.quantity}</span>
                </div>
                <div className="font-mono font-bold text-xs text-gray-900">
                  {reservation.qr_code}
                </div>
              </div>

              {/* Action Buttons - Compact */}
              {expired ? (
                <div className="space-y-1.5">
                  {/* Expired warning - compact */}
                  <div className="bg-red-100 border border-red-300 rounded-lg px-2 py-1">
                    <p className="text-xs text-red-700 font-medium text-center">
                      ⚠️ Expired
                    </p>
                  </div>

                  {/* Primary: Mark as Picked Up */}
                  <Button
                    onClick={() => onMarkAsPickedUp(reservation)}
                    disabled={isProcessing}
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white h-8 rounded-lg font-semibold text-xs shadow-sm"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        Picked Up
                      </>
                    )}
                  </Button>

                  {/* Secondary Actions */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button
                      onClick={() => onConfirmNoShow(reservation)}
                      disabled={isProcessing}
                      className="h-8 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 font-medium text-xs"
                    >
                      {isProcessing ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-700"></div>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 mr-0.5" />
                          No-Show
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => onForgiveCustomer(reservation)}
                      disabled={isProcessing}
                      className="h-8 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 border border-green-300 font-medium text-xs"
                    >
                      {isProcessing ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-700"></div>
                      ) : (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 mr-0.5" />
                          Forgive
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => onMarkAsPickedUp(reservation)}
                  disabled={isProcessing}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white h-9 rounded-lg font-semibold text-sm shadow-sm hover:shadow-md transition-all duration-300"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-1.5"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-1.5" />
                      Mark as Picked Up
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

