/**
 * Partner Forgiveness Decision Modal
 * Allows partners to grant or deny forgiveness requests from customers
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { UserPenalty, partnerDecideForgiveness } from '@/lib/api/penalty';
import { logger } from '@/lib/logger';

interface PartnerForgivenessDecisionModalProps {
  penalty: UserPenalty & {
    users?: { id: string; name: string; email: string; reliability_score: number };
    reservations?: { pickup_date: string; total_price: number; offer?: { title: string } };
  };
  partnerId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function PartnerForgivenessDecisionModal({
  penalty,
  partnerId,
  onClose,
  onSuccess
}: PartnerForgivenessDecisionModalProps) {
  const [decision, setDecision] = useState<'granted' | 'denied' | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!decision) {
      toast.error('Please select a decision');
      return;
    }

    setIsLoading(true);
    try {
      const result = await partnerDecideForgiveness(
        penalty.id,
        partnerId,
        decision,
        message.trim() || undefined
      );

      if (result.success) {
        toast.success(`Forgiveness ${decision === 'granted' ? 'granted' : 'denied'} successfully`);
        onSuccess();
      } else {
        toast.error(result.error || 'Failed to process decision');
      }
    } catch (error) {
      logger.error('Error processing forgiveness decision:', error);
      toast.error('Failed to process decision');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📩 Forgiveness Request from Customer</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer info */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Customer</p>
                  <p className="font-semibold">{penalty.users?.name || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Missed Offer</p>
                  <p className="font-semibold">{penalty.reservations?.offer?.title || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Value</p>
                  <p className="font-semibold">{penalty.reservations?.total_price || 0} GEL</p>
                </div>
                <div>
                  <p className="text-gray-600">Date</p>
                  <p className="font-semibold">
                    {penalty.created_at ? new Date(penalty.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Their explanation */}
          <div>
            <Label>Customer's explanation:</Label>
            <Card className="mt-2">
              <CardContent className="p-4">
                <p className="text-gray-700 italic">
                  "{penalty.forgiveness_request_message || 'No message provided'}"
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Customer history */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Previous offense:</span>
                <span className="font-semibold text-red-600">#{penalty.offense_number - 1 || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Reliability score:</span>
                <span className={`font-semibold ${(penalty.users?.reliability_score || 100) >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                  {penalty.users?.reliability_score || 100}%
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Decision options */}
          <div className="space-y-3">
            <Label>Your Decision:</Label>

            <Card
              className={`cursor-pointer transition-all ${
                decision === 'granted' ? 'border-green-500 bg-green-50' : 'border-gray-200'
              }`}
              onClick={() => setDecision('granted')}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      decision === 'granted' ? 'border-green-500 bg-green-500' : 'border-gray-300'
                    }`}
                  >
                    {decision === 'granted' && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-700">✅ Grant Forgiveness</h4>
                    <ul className="text-sm text-gray-600 mt-2 space-y-1">
                      <li>• Customer's penalty is removed immediately</li>
                      <li>• Won't count toward future bans</li>
                      <li>• Shows goodwill and improves customer loyalty</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all ${
                decision === 'denied' ? 'border-red-500 bg-red-50' : 'border-gray-200'
              }`}
              onClick={() => setDecision('denied')}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      decision === 'denied' ? 'border-red-500 bg-red-500' : 'border-gray-300'
                    }`}
                  >
                    {decision === 'denied' && <X className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-red-700">❌ Deny Forgiveness</h4>
                    <ul className="text-sm text-gray-600 mt-2 space-y-1">
                      <li>• Customer receives penalty as scheduled</li>
                      <li>• Counts toward their offense history</li>
                      <li>• Enforces accountability for missed pickups</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Optional message */}
          {decision && (
            <div>
              <Label htmlFor="response-message">Optional message to customer:</Label>
              <Textarea
                id="response-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  decision === 'granted'
                    ? "No problem! We understand things happen. Please try to be on time next time."
                    : "We understand, but we cannot accept missed pickups. Please be more careful in the future."
                }
                rows={3}
                maxLength={300}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">{message.length}/300 characters</p>
            </div>
          )}

          <Alert>
            <Clock className="w-4 h-4" />
            <AlertDescription>
              ⏰ You have 24 hours to respond. If no response, the request will be automatically denied.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!decision || isLoading}
            variant={decision === 'granted' ? 'default' : 'destructive'}
          >
            {isLoading ? 'Processing...' : `Confirm ${decision === 'granted' ? 'Forgiveness' : 'Denial'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
