import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Coins, CreditCard, Check, AlertCircle } from 'lucide-react';
import { purchasePoints } from '@/lib/smartpoints-api';
import { toast } from 'sonner';

interface BuyPointsModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  currentBalance: number;
  onSuccess: (newBalance: number) => void;
}

export function BuyPointsModal({
  open,
  onClose,
  userId,
  currentBalance,
  onSuccess,
}: BuyPointsModalProps) {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseComplete, setPurchaseComplete] = useState(false);

  const PACKAGE_AMOUNT = 100;
  const PACKAGE_PRICE = 1; // ₾1

  const handlePurchase = async () => {
    try {
      setIsPurchasing(true);

      // TODO: In production, integrate with Stripe Checkout here
      // For now, we'll do a direct purchase (mock payment)

      const result = await purchasePoints(userId, PACKAGE_AMOUNT);

      if (result.success && result.newBalance) {
        setPurchaseComplete(true);
        onSuccess(result.newBalance);

        // Auto-close after 2 seconds
        setTimeout(() => {
          setPurchaseComplete(false);
          onClose();
        }, 2000);
      } else {
        toast.error(result.error || 'Purchase failed. Please try again.');
      }
    } catch (error) {
      logger.error('Error purchasing points:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleClose = () => {
    if (!isPurchasing) {
      setPurchaseComplete(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Coins className="w-6 h-6 text-[#4CC9A8]" />
            Buy SmartPoints
          </DialogTitle>
          <DialogDescription>
            Get more points to continue reserving amazing deals!
          </DialogDescription>
        </DialogHeader>

        {purchaseComplete ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-green-600 mb-2">Purchase Complete!</h3>
            <p className="text-gray-600">
              {PACKAGE_AMOUNT} SmartPoints added to your account
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current Balance */}
            <div className="p-4 bg-gray-50 rounded-lg border">
              <p className="text-sm text-gray-600 mb-1">Current Balance</p>
              <p className="text-3xl font-bold text-gray-900">{currentBalance}</p>
              <p className="text-xs text-gray-500">SmartPoints</p>
            </div>

            {/* Package Offer */}
            <div className="relative p-6 bg-gradient-to-br from-[#EFFFF8] to-[#C9F9E9] rounded-xl border-2 border-[#4CC9A8]">
              <div className="absolute top-2 right-2">
                <span className="bg-[#4CC9A8] text-white text-xs font-bold px-2 py-1 rounded-full">
                  BEST VALUE
                </span>
              </div>

              <div className="text-center mb-4">
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <Coins className="w-8 h-8 text-[#4CC9A8]" />
                  <span className="text-5xl font-bold text-gray-900">{PACKAGE_AMOUNT}</span>
                  <span className="text-gray-600">points</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm text-gray-600">for only</span>
                  <span className="text-3xl font-bold text-[#4CC9A8]">₾{PACKAGE_PRICE}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <Check className="w-4 h-4 text-[#4CC9A8]" />
                  <span>20 reservations</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Check className="w-4 h-4 text-[#4CC9A8]" />
                  <span>Never expires</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Check className="w-4 h-4 text-[#4CC9A8]" />
                  <span>Instant delivery</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Check className="w-4 h-4 text-[#4CC9A8]" />
                  <span>Secure payment</span>
                </div>
              </div>
            </div>

            {/* After Purchase */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                <strong>After purchase:</strong> Your new balance will be{' '}
                <span className="font-bold text-[#4CC9A8]">
                  {currentBalance + PACKAGE_AMOUNT} SmartPoints
                </span>
              </p>
            </div>

            {/* Info Alert */}
            <Alert className="bg-gray-50 border-gray-200">
              <AlertCircle className="h-4 w-4 text-gray-600" />
              <AlertDescription className="text-gray-700">
                <p className="text-xs">
                  <strong>How it works:</strong>
                  <br />
                  • Each reservation costs 5 SmartPoints
                  <br />
                  • Points never expire
                  <br />
                  • Secure payment via Stripe
                </p>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {!purchaseComplete && (
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isPurchasing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePurchase}
              disabled={isPurchasing}
              className="flex-1 bg-[#4CC9A8] hover:bg-[#3db891] text-white font-bold text-lg py-6"
            >
              {isPurchasing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  Pay ₾{PACKAGE_PRICE} Now
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

