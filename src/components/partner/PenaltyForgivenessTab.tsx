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
  users?: { id: string; name: string; email: string; reliability_score: number };
  reservations?: { pickup_date: string; total_price: number; offer?: { title: string } };
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
      <Card className="border-purple-200 bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-purple-600" />
            <CardTitle className="text-base">Forgiveness Requests</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <RefreshCw className="w-6 h-6 text-purple-400 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-600">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-600" />
            <CardTitle className="text-base">Forgiveness Requests</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-sm text-red-700">{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card className="border-purple-200 bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-purple-600" />
              <CardTitle className="text-base">Forgiveness Requests</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Heart className="w-10 h-10 text-purple-200 mx-auto mb-2" />
            <p className="text-sm text-gray-600">No pending requests</p>
            <p className="text-xs text-gray-500 mt-1">
              Customer forgiveness requests will appear here
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
      <Card className="border-purple-200 bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-purple-600" />
              <CardTitle className="text-base">Forgiveness Requests</CardTitle>
            </div>
            <Badge className="bg-purple-600 text-white text-xs">{requests.length}</Badge>
          </div>
          <CardDescription className="text-xs mt-1">
            Review customer requests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {requests.map((request) => (
            <div
              key={request.id}
              className="border border-purple-200 rounded-lg p-3 bg-purple-50/30 hover:bg-purple-50 transition-colors cursor-pointer"
              onClick={() => handleDecision(request)}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{request.users?.name || 'Unknown User'}</p>
                  <p className="text-xs text-gray-600 truncate">{request.reservations?.offer?.title || 'Unknown Offer'}</p>
                </div>
                <Badge className={`text-[10px] px-2 py-0.5 ${getOffenseColor(request.offense_number)}`}>
                  {getOffenseLabel(request.offense_number)}
                </Badge>
              </div>

              {/* Request Message */}
              <div className="bg-white rounded-md p-2 mb-2 border border-purple-100">
                <p className="text-xs text-gray-700 italic line-clamp-2">"{request.forgiveness_request_message || 'No message provided'}"</p>
              </div>

              {/* Footer: Time and Stats */}
              <div className="flex items-center justify-between text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatTimeAgo(request.forgiveness_requested_at!)}</span>
                </div>
                <span className="text-purple-700 font-medium">Score: {request.users?.reliability_score || 0}%</span>
              </div>

              {/* Expiration Warning */}
              {request.forgiveness_expires_at && new Date(request.forgiveness_expires_at).getTime() - Date.now() < 6 * 60 * 60 * 1000 && (
                <div className="mt-2 flex items-center gap-1 text-xs text-orange-700 bg-orange-50 rounded px-2 py-1 border border-orange-200">
                  <AlertCircle className="h-3 w-3" />
                  <span>
                    Expires in {Math.floor((new Date(request.forgiveness_expires_at).getTime() - Date.now()) / (1000 * 60 * 60))}h
                  </span>
                </div>
              )}
            </div>
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
