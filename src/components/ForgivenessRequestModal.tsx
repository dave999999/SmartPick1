/**
 * Forgiveness Request Modal
 * Allows users to request forgiveness from partner for missed pickup
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { UserPenalty, requestForgiveness } from '@/lib/api/penalty';
import { logger } from '@/lib/logger';

interface ForgivenessRequestModalProps {
  penalty: UserPenalty & {
    partners?: { business_name: string };
    reservations?: { offer_title: string; pickup_date: string };
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function ForgivenessRequestModal({ penalty, onClose, onSuccess }: ForgivenessRequestModalProps) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error('Please explain why you missed the pickup');
      return;
    }

    if (message.trim().length < 20) {
      toast.error('Please provide a more detailed explanation (at least 20 characters)');
      return;
    }

    setIsLoading(true);
    try {
      const result = await requestForgiveness(penalty.id, penalty.user_id, message.trim());

      if (result.success) {
        toast.success('Forgiveness request sent to partner');
        onSuccess();
      } else {
        toast.error(result.error || 'Failed to send forgiveness request');
      }
    } catch (error) {
      logger.error('Error requesting forgiveness:', error);
      toast.error('Failed to send request');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>🤝 Request Partner Forgiveness</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-600">Partner:</p>
                <p className="font-semibold">{penalty.partners?.business_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600">Missed Offer:</p>
                <p className="font-semibold">{penalty.reservations?.offer_title || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-600">Date:</p>
                <p className="font-semibold">
                  {penalty.created_at ? new Date(penalty.created_at).toLocaleString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="message">Explain why you missed the pickup:</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="I got stuck in traffic and couldn't make it on time. I apologize for the inconvenience and promise to be more careful in the future."
              rows={6}
              maxLength={500}
              className="mt-2"
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-gray-500">{message.length}/500 characters</p>
              {message.trim().length < 20 && message.length > 0 && (
                <p className="text-xs text-red-500">At least 20 characters required</p>
              )}
            </div>
          </div>

          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              ⚠️ The partner can choose to forgive this offense. If granted, your penalty will be removed
              immediately and it won't count toward future bans.
              <br />
              <br />
              ⏰ The partner has 24 hours to respond. If no response, the request will be automatically denied.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !message.trim() || message.trim().length < 20}
          >
            {isLoading ? 'Sending...' : 'Send Forgiveness Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
