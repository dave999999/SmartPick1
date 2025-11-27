import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Heart, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { getPendingForgivenessRequests, type UserPenalty } from '@/lib/api/penalty';
import { PartnerForgivenessDecisionModal } from '@/components/PartnerForgivenessDecisionModal';

interface PenaltyForgivenessTabProps {
  partnerId: string;
}

type PenaltyWithDetails = UserPenalty & {
  users?: { name: string; email: string; reliability_score: number };
  reservations?: { offer_title: string; pickup_date: string; price: number };
};

export default function PenaltyForgivenessTab({ partnerId }: PenaltyForgivenessTabProps) {
  const [requests, setRequests] = useState<PenaltyWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPenalty, setSelectedPenalty] = useState<PenaltyWithDetails | null>(null);
  const [showDecisionModal, setShowDecisionModal] = useState(false);

  const loadRequests = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const pendingRequests = await getPendingForgivenessRequests(partnerId);
      setRequests(pendingRequests);
    } catch (err) {
      console.error('Error loading forgiveness requests:', err);
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [partnerId]);

  const handleDecision = (penalty: PenaltyWithDetails) => {
    setSelectedPenalty(penalty);
    setShowDecisionModal(true);
  };

  if (isLoading) {
    return (
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Heart className="w-5 h-5 text-purple-600" />
            Penalty Forgiveness Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-purple-700">Loading requests...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-gradient-to-br from-red-50 to-red-100/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Heart className="w-5 h-5 text-red-600" />
            Penalty Forgiveness Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-red-100 border-red-300">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Heart className="w-5 h-5 text-purple-600" />
            Penalty Forgiveness Requests
          </CardTitle>
          <CardDescription className="text-sm">
            Customer requests for penalty forgiveness will appear here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Heart className="w-12 h-12 text-purple-300 mx-auto mb-3" />
            <p className="text-sm text-purple-700 font-medium">No pending requests</p>
            <p className="text-xs text-purple-600 mt-1">
              When customers request penalty forgiveness, you'll see them here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getOffenseLabel = (offense: number) => {
    switch (offense) {
      case 1:
        return 'First Warning';
      case 2:
        return '1-Hour Ban';
      case 3:
        return '24-Hour Ban';
      default:
        return 'Permanent Ban';
    }
  };

  const getOffenseColor = (offense: number) => {
    switch (offense) {
      case 1:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 2:
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 3:
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-black text-white border-black';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    }
    if (hours < 24) {
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  };

  return (
    <>
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Heart className="w-5 h-5 text-purple-600" />
            Penalty Forgiveness Requests
            <Badge className="bg-purple-600 text-white ml-auto">{requests.length}</Badge>
          </CardTitle>
          <CardDescription className="text-sm">
            Review and respond to customer penalty forgiveness requests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {requests.map((request) => (
            <Card
              key={request.id}
              className="border-purple-300 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleDecision(request)}
            >
              <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-sm">{request.users?.name || 'Unknown User'}</p>
                    <p className="text-xs text-gray-600">{request.reservations?.offer_title || 'Unknown Offer'}</p>
                  </div>
                  <Badge className={getOffenseColor(request.offense_number)}>{getOffenseLabel(request.offense_number)}</Badge>
                </div>

                {/* Request Message */}
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                  <p className="text-xs text-gray-700 italic">"{request.forgiveness_request_message || 'No message provided'}"</p>
                </div>

                {/* Footer: Time and Stats */}
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Requested {formatTimeAgo(request.forgiveness_requested_at!)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Reliability: {request.users?.reliability_score || 0}%</span>
                  </div>
                </div>

                {/* Expiration Warning */}
                {request.forgiveness_expires_at && new Date(request.forgiveness_expires_at).getTime() - Date.now() < 6 * 60 * 60 * 1000 && (
                  <Alert className="bg-orange-50 border-orange-300">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-xs text-orange-800">
                      Request expires in{' '}
                      {Math.floor((new Date(request.forgiveness_expires_at).getTime() - Date.now()) / (1000 * 60 * 60))} hours
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Decision Modal */}
      {showDecisionModal && selectedPenalty && (
        <PartnerForgivenessDecisionModal
          penalty={selectedPenalty}
          partnerId={partnerId}
          onClose={() => {
            setShowDecisionModal(false);
            setSelectedPenalty(null);
          }}
          onSuccess={() => {
            setShowDecisionModal(false);
            setSelectedPenalty(null);
            loadRequests(); // Refresh the list
          }}
        />
      )}
    </>
  );
}
