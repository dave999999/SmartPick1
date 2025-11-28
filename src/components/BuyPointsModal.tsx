import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Coins, Loader2, Sparkles, Shield } from 'lucide-react';
import { BOG_CONFIG } from '@/lib/payments/bog';
import { supabase } from '@/lib/supabase';
import { secureRequest } from '@/lib/secureRequest';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

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
  currentBalance: initialBalance,
  onSuccess,
}: BuyPointsModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [customGel, setCustomGel] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(initialBalance);

  // Fetch fresh balance when modal opens
  useEffect(() => {
    if (open && userId) {
      const fetchBalance = async () => {
        try {
          logger.log('BuyPointsModal: Fetching balance for user', userId);
          const { data, error } = await supabase
            .from('user_points')
            .select('balance')
            .eq('user_id', userId)
            .single();
          
          if (error) {
            logger.error('BuyPointsModal: Error fetching balance', error);
          } else if (data) {
            logger.log('BuyPointsModal: Balance fetched', data.balance);
            setCurrentBalance(data.balance || 0);
          }
        } catch (err) {
          logger.error('BuyPointsModal: Failed to fetch current balance', err);
        }
      };
      fetchBalance();
    }
  }, [open, userId]);

  const computedPoints = isCustom
    ? Math.floor(parseFloat(customGel || '0') * BOG_CONFIG.POINTS_PER_GEL)
    : selectedPackage !== null
      ? BOG_CONFIG.PACKAGES[selectedPackage].points
      : 0;

  const computedGel = isCustom
    ? parseFloat(customGel || '0')
    : selectedPackage !== null
      ? BOG_CONFIG.PACKAGES[selectedPackage].gel
      : 0;

  const isValid = computedGel >= BOG_CONFIG.MIN_GEL && computedGel <= BOG_CONFIG.MAX_GEL;

  const handlePackageSelect = (index: number) => {
    setSelectedPackage(index);
    setIsCustom(false);
    setCustomGel(BOG_CONFIG.PACKAGES[index].gel.toString());
  };

  const handleCustomAmountChange = (value: string) => {
    if (!/^\d*\.?\d{0,2}$/.test(value)) return;
    
    setCustomGel(value);
    setIsCustom(true);
    setSelectedPackage(null);
  };

  const handleContinueToPayment = async () => {
    if (!isValid || !userId) {
      toast.error('Please select a valid amount');
      return;
    }

    setIsLoading(true);

    try {
      logger.log('BuyPointsModal: Initiating payment', {
        points: computedPoints,
        gel: computedGel,
        userId,
      });

      const data = await secureRequest<any>({
        operation: 'createPaymentSession',
        execute: async () => {
          const { data, error } = await supabase.functions.invoke('bog-create-session', {
            body: {
              points: computedPoints,
              gel_amount: computedGel,
            },
          });
          if (error) {
            logger.error('BuyPointsModal: Payment session creation failed', error);
            if (error.message?.includes('CORS') || error.message?.includes('ERR_FAILED')) {
              throw new Error('Cannot connect to payment service. Please test on the production site (smartpick.ge) or check your network connection.');
            }
            throw new Error(error.message || 'Failed to create payment session');
          }
          if (data?.error) {
            logger.error('BuyPointsModal: API returned error', data);
            throw new Error(data.error + (data.details ? `\n\nDetails: ${data.details}` : ''));
          }
          if (!data || !data.redirectUrl) {
            logger.error('BuyPointsModal: Invalid response', data);
            throw new Error('Invalid response from payment service');
          }
          return data;
        }
      });

      logger.log('BuyPointsModal: Payment session created, redirecting', {
        redirectUrl: data.redirectUrl,
        orderId: data.orderId,
      });

      toast.info('Redirecting to secure payment page...');

      setTimeout(() => {
        window.location.href = data.redirectUrl;
      }, 500);

    } catch (error) {
      logger.error('BuyPointsModal: Error', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start payment. Please try again.');
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setSelectedPackage(null);
      setCustomGel('');
      setIsCustom(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[420px] p-0 gap-0 border-none shadow-2xl overflow-hidden">
        {/* Compact Header with gradient */}
        <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-5 pb-4 border-b border-orange-100">
          <DialogTitle className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-500" />
            Top Up SmartPoints ✨
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-600 mb-3">
            Use points to reserve great deals instantly
          </DialogDescription>
          
          {/* Compact Balance Badge */}
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-orange-200">
            <Coins className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-gray-600">Balance:</span>
            <span className="text-sm font-bold text-orange-600">{currentBalance.toLocaleString()}</span>
            <span className="text-xs text-gray-500">pts</span>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Compact Quick Select - 3 per row */}
          <div>
            <Label className="text-xs font-semibold text-gray-700 mb-2 block">Choose an amount or enter your own</Label>
            <div className="grid grid-cols-3 gap-2">
              {BOG_CONFIG.PACKAGES.map((pkg, idx) => {
                const selected = selectedPackage === idx && !isCustom;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePackageSelect(idx)}
                    className={`px-3 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                      selected 
                        ? 'bg-orange-500 text-white border-orange-500 shadow-md scale-105' 
                        : 'bg-white hover:bg-orange-50 border-gray-200 text-gray-700 hover:border-orange-300'
                    }`}
                  >
                    {pkg.gel} ₾
                  </button>
                );
              })}
            </div>
          </div>

          {/* Compact Custom Input */}
          <div>
            <Label htmlFor="gel" className="text-xs font-semibold text-gray-700 mb-2 block">Or enter custom amount</Label>
            <div className="relative">
              <Input
                id="gel"
                type="text"
                inputMode="decimal"
                placeholder="1-50"
                value={customGel}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                className="h-11 text-base font-semibold pr-12 rounded-xl border-2 focus:border-orange-400"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">GEL</span>
            </div>
            
            {/* Inline Points Preview */}
            {computedPoints > 0 && (
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-gray-600">You will receive:</span>
                <span className="font-bold text-orange-600 text-sm">{computedPoints.toLocaleString()} points</span>
              </div>
            )}
          </div>

          {/* Ultra Compact Summary */}
          {isValid && (selectedPackage !== null || (isCustom && customGel)) && (
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-xs border border-gray-200">
              <div className="flex justify-between text-gray-600">
                <span>Amount:</span>
                <span className="font-semibold text-gray-800">{computedGel.toFixed(2)} GEL</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Points:</span>
                <span className="font-semibold text-orange-600">+{computedPoints.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-gray-300">
                <span className="font-medium text-gray-700">New Balance:</span>
                <span className="font-bold text-orange-600">{(currentBalance + computedPoints).toLocaleString()} pts</span>
              </div>
            </div>
          )}

          {/* Compact Payment Button */}
          <div className="space-y-2">
            <Button 
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all" 
              disabled={!isValid || isLoading} 
              onClick={handleContinueToPayment}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Pay {computedGel > 0 ? computedGel.toFixed(2) : '0.00'} GEL</>
              )}
            </Button>
            
            {/* Friendly subtext */}
            <p className="text-xs text-center text-gray-500 flex items-center justify-center gap-1.5">
              <Shield className="w-3 h-3" />
              <span>Secure BOG payment • Your points appear instantly!</span>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

