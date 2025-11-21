import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Heart, Check, X, Clock, User, MessageSquare, Calendar } from 'lucide-react';
import type { Reservation } from '@/lib/types';

interface ForgivenessRequestsProps {
  reservations: Reservation[];
  onApprove: (reservation: Reservation) => void;
  onDeny: (reservation: Reservation) => void;
  processingIds: Set<string>;
}

export default function ForgivenessRequests({
  reservations,
  onApprove,
  onDeny,
  processingIds,
}: ForgivenessRequestsProps) {
  const forgivenessRequests = reservations.filter(
    (r) => r.forgiveness_requested && !r.forgiveness_approved && !r.forgiveness_denied
  );

  if (forgivenessRequests.length === 0) {
    return (
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Heart className="w-5 h-5 text-blue-600" />
            Forgiveness Requests
          </CardTitle>
          <CardDescription className="text-sm">
            Customer requests for penalty forgiveness will appear here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Heart className="w-12 h-12 text-blue-300 mx-auto mb-3" />
            <p className="text-sm text-blue-700 font-medium">No pending requests</p>
            <p className="text-xs text-blue-600 mt-1">
              Customers can request forgiveness when they miss a pickup
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Heart className="w-5 h-5 text-blue-600" />
          Forgiveness Requests
          <Badge className="bg-blue-600 text-white ml-auto">
            {forgivenessRequests.length}
          </Badge>
        </CardTitle>
        <CardDescription className="text-sm">
          Review and respond to customer forgiveness requests
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {forgivenessRequests.map((reservation) => {
          const isProcessing = processingIds.has(reservation.id);
          const timeAgo = getTimeAgo(reservation.forgiveness_requested_at || '');

          return (
            <Card
              key={reservation.id}
              className="border-blue-300 bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <CardContent className="p-4 space-y-3">
                {/* Header: Customer Info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">
                        {reservation.customer?.name || 'Customer'}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        {reservation.offer?.title}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-xs">
                    Missed Pickup
                  </Badge>
                </div>

                {/* Request Details */}
                <div className="space-y-2 bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center gap-2 text-xs text-blue-700">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Requested {timeAgo}</span>
                  </div>
                  
                  {reservation.forgiveness_request_reason && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-blue-900 mb-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Customer's Reason:
                      </div>
                      <p className="text-xs text-blue-800 bg-white rounded px-2 py-1.5 border border-blue-200">
                        "{reservation.forgiveness_request_reason}"
                      </p>
                    </div>
                  )}

                  {!reservation.forgiveness_request_reason && (
                    <p className="text-xs text-blue-600 italic">
                      No reason provided
                    </p>
                  )}
                </div>

                {/* Reservation Info */}
                <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t border-gray-200">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      Reserved: {new Date(reservation.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="font-mono font-semibold text-gray-800">
                    QR: {reservation.qr_code}
                  </span>
                </div>

                {/* Action Buttons */}
                <Alert className="border-blue-300 bg-blue-50">
                  <Heart className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-xs text-blue-900">
                    Approving will remove their penalty and restore their account immediately.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button
                    onClick={() => onApprove(reservation)}
                    disabled={isProcessing}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold shadow-sm h-10"
                  >
                    {isProcessing ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-1.5" />
                        Approve & Forgive
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={() => onDeny(reservation)}
                    disabled={isProcessing}
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50 font-semibold h-10"
                  >
                    {isProcessing ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700"></div>
                    ) : (
                      <>
                        <X className="w-4 h-4 mr-1.5" />
                        Deny
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
}

function getTimeAgo(dateString: string): string {
  if (!dateString) return 'recently';
  
  const now = new Date();
  const date = new Date(dateString);
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}
