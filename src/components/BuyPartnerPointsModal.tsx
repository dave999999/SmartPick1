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
import { Coins, CreditCard, Check, AlertCircle, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface BuyPartnerPointsModalProps {
  open: boolean;
  onClose: () => void;
  partnerId: string;
  currentBalance: number;
  onSuccess: (newBalance: number) => void;
}

export function BuyPartnerPointsModal({
  open,
  onClose,
  partnerId,
  currentBalance,
  onSuccess,
}: BuyPartnerPointsModalProps) {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseComplete, setPurchaseComplete] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<number>(100);

  const PACKAGES = [
    { points: 100, price: 10, popular: false },
    { points: 500, price: 45, popular: true, savings: '10% off' },
    { points: 1000, price: 80, popular: false, savings: '20% off' },
  ];

  const handlePurchase = async () => {
    try {
      setIsPurchasing(true);

      // TODO: In production, integrate with Stripe Checkout here
      // For now, we'll do a direct purchase (mock payment)

      // Call database function to add partner points
      const { data, error } = await supabase.rpc('purchase_partner_points', {
        p_partner_id: partnerId,
        p_amount: selectedPackage
      });

      if (error) {
        console.error('Error purchasing partner points:', error);
        toast.error('Purchase failed. Please try again.');
        return;
      }

      if (data && data.success) {
        setPurchaseComplete(true);
        onSuccess(data.balance);

        // Auto-close after 2 seconds
        setTimeout(() => {
          setPurchaseComplete(false);
          onClose();
        }, 2000);
      } else {
        toast.error(data?.message || 'Purchase failed. Please try again.');
      }
    } catch (error) {
      console.error('Error purchasing partner points:', error);
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

  const selectedPackageInfo = PACKAGES.find(p => p.points === selectedPackage);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Coins className="w-6 h-6 text-[#4CC9A8]" />
            Buy Partner Points
          </DialogTitle>
          <DialogDescription>
            Purchase points to unlock additional offer slots and boost visibility!
          </DialogDescription>
        </DialogHeader>

        {purchaseComplete ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-green-600 mb-2">Purchase Complete!</h3>
            <p className="text-gray-600">
              {selectedPackage} Partner Points added to your account
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current Balance */}
            <div className="p-4 bg-gray-50 rounded-lg border">
              <p className="text-sm text-gray-600 mb-1">Current Balance</p>
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-[#4CC9A8]" />
                <span className="text-2xl font-bold text-gray-900">{currentBalance}</span>
                <span className="text-sm text-gray-500">Partner Points</span>
              </div>
            </div>

            {/* Package Selection */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">Select Package</p>
              <div className="grid gap-3">
                {PACKAGES.map((pkg) => (
                  <button
                    key={pkg.points}
                    onClick={() => setSelectedPackage(pkg.points)}
                    disabled={isPurchasing}
                    className={`
                      relative p-4 rounded-lg border-2 text-left transition-all
                      ${selectedPackage === pkg.points
                        ? 'border-[#4CC9A8] bg-[#4CC9A8]/5 ring-2 ring-[#4CC9A8]/20'
                        : 'border-gray-200 hover:border-[#4CC9A8]/50'
                      }
                      ${isPurchasing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {pkg.popular && (
                      <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-400 to-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                        Most Popular
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-[#4CC9A8]/10 flex items-center justify-center">
                          <Package className="w-6 h-6 text-[#4CC9A8]" />
                        </div>
                        <div>
                          <p className="font-bold text-lg text-gray-900">{pkg.points} Points</p>
                          {pkg.savings && (
                            <p className="text-xs text-green-600 font-semibold">{pkg.savings}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">₾{pkg.price}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* What You Can Do */}
            <Alert className="border-[#4CC9A8]/30 bg-[#4CC9A8]/5">
              <AlertCircle className="h-4 w-4 text-[#4CC9A8]" />
              <AlertDescription className="text-sm text-gray-700">
                <strong>What you can do with Partner Points:</strong>
                <ul className="mt-2 space-y-1 ml-4 list-disc">
                  <li>Purchase additional offer slots (30 points each)</li>
                  <li>Boost offer visibility in search results</li>
                  <li>Access premium partner features</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* After Purchase Balance */}
            {selectedPackageInfo && (
              <div className="p-3 bg-gradient-to-r from-[#4CC9A8]/10 to-blue-50 rounded-lg border border-[#4CC9A8]/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">New Balance</span>
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-[#4CC9A8]" />
                    <span className="text-xl font-bold text-gray-900">
                      {currentBalance + selectedPackage}
                    </span>
                    <span className="text-xs text-gray-500">points</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {!purchaseComplete && (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isPurchasing}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePurchase}
                disabled={isPurchasing}
                className="bg-[#4CC9A8] hover:bg-[#3db891]"
              >
                {isPurchasing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Purchase for ₾{selectedPackageInfo?.price}
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
