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
      <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-200 mb-4">
          <Clock className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-600 font-medium">No active reservations</p>
        <p className="text-sm text-gray-500 mt-1">Customers waiting for pickup will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with count */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></div>
        <h3 className="text-sm font-bold text-gray-900">Active Reservations</h3>
        <Badge className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
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
            className={`border-2 shadow-sm overflow-hidden transition-all hover:shadow-md ${
              expired
                ? 'border-red-300 bg-red-50/50'
                : isExpiringSoon
                ? 'border-orange-300 bg-orange-50/50'
                : 'border-blue-200 bg-white'
            }`}
          >
            <CardContent className="p-4">
              {/* Customer Info Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <User className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">
                      {reservation.customer?.name || reservation.customer?.email || 'Customer'}
                    </p>
                    <p className="text-xs text-gray-600 truncate">
                      {reservation.offer?.title}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-lg font-bold text-teal-600">
                    ₾{reservation.total_price.toFixed(2)}
                  </span>
                  <Badge
                    className={`text-xs px-2 py-1 rounded-md ${
                      expired
                        ? 'bg-red-500 text-white'
                        : isExpiringSoon
                        ? 'bg-orange-500 text-white'
                        : 'bg-blue-500 text-white'
                    }`}
                  >
                    <Clock className="w-3 h-3 mr-1 inline" />
                    {timeRemaining}
                  </Badge>
                </div>
              </div>

              {/* Details Row */}
              <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-gray-200">
                <div className="flex items-center gap-1.5 text-sm text-gray-700">
                  <Package className="w-4 h-4" />
                  <span className="font-semibold">Qty: {reservation.quantity}</span>
                </div>
                <div className="font-mono font-bold text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded">
                  {reservation.qr_code}
                </div>
              </div>

              {/* Action Buttons */}
              {expired ? (
                <div className="space-y-2">
                  {/* Expired warning */}
                  <div className="bg-red-100 border border-red-300 rounded-lg px-3 py-2">
                    <p className="text-sm text-red-700 font-semibold text-center">
                      ⚠️ Reservation Expired
                    </p>
                  </div>

                  {/* Primary: Mark as Picked Up */}
                  <Button
                    onClick={() => onMarkAsPickedUp(reservation)}
                    disabled={isProcessing}
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white h-10 rounded-lg font-semibold shadow-sm"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark as Picked Up
                      </>
                    )}
                  </Button>

                  {/* Secondary Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => onConfirmNoShow(reservation)}
                      disabled={isProcessing}
                      variant="outline"
                      className="h-10 rounded-lg bg-white hover:bg-red-50 text-red-600 border-red-300 hover:border-red-400 font-semibold"
                    >
                      {isProcessing ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 mr-1" />
                          No-Show
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => onForgiveCustomer(reservation)}
                      disabled={isProcessing}
                      variant="outline"
                      className="h-10 rounded-lg bg-white hover:bg-green-50 text-green-600 border-green-300 hover:border-green-400 font-semibold"
                    >
                      {isProcessing ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1" />
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
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white h-11 rounded-lg font-semibold shadow-sm hover:shadow-md transition-all"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
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

