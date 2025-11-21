import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Coins, Loader2, Check, Sparkles, Shield } from 'lucide-react';
import { BOG_CONFIG } from '@/lib/payments/bog';
import { supabase } from '@/lib/supabase';
import { secureRequest } from '@/lib/secureRequest';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface BuyPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  userId: string;
  mode?: 'user' | 'partner';
}

export function BuyPointsModal({
  isOpen,
  onClose,
  currentBalance: initialBalance,
  userId,
  mode: _mode = 'user', // Reserved for future partner/user distinction
}: BuyPointsModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [customGel, setCustomGel] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(initialBalance);

  // Fetch fresh balance when modal opens
  useEffect(() => {
    if (isOpen && userId) {
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
  }, [isOpen, userId]);

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
    // Auto-fill custom amount with selected package value
    setCustomGel(BOG_CONFIG.PACKAGES[index].gel.toString());
  };

  const handleCustomAmountChange = (value: string) => {
    // Only allow numbers and one decimal point
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

      // Show loading message
      toast.info('Redirecting to secure payment page...');

      // Redirect to BOG payment page
      // Use a small delay to ensure toast is visible
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
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Coins className="w-5 h-5 text-orange-500" /> Buy SmartPoints
          </DialogTitle>
          <DialogDescription className="text-sm">
            1 GEL = {BOG_CONFIG.POINTS_PER_GEL} points • Min {BOG_CONFIG.MIN_GEL} / Max {BOG_CONFIG.MAX_GEL} GEL
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Balance */}
          <Card className="p-3 flex items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">Balance</p>
              <p className="text-2xl font-extrabold text-orange-600 leading-tight">{currentBalance.toLocaleString()}</p>
              <p className="text-[10px] text-gray-500">SmartPoints</p>
            </div>
            <Sparkles className="w-10 h-10 text-orange-400" />
          </Card>

          {/* Quick amounts */}
            <div>
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">Quick Select</Label>
              <div className="flex flex-wrap gap-2">
                {BOG_CONFIG.PACKAGES.map((pkg, idx) => {
                  const selected = selectedPackage === idx && !isCustom;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handlePackageSelect(idx)}
                      className={`px-3 py-2 rounded-md text-sm font-semibold border flex items-center gap-1 transition ${selected ? 'bg-orange-500 text-white border-orange-500' : 'bg-white hover:bg-orange-50 border-gray-300 text-gray-700'}`}
                    >
                      {pkg.gel} GEL
                      {selected && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

          {/* Custom amount */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="gel" className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">Custom Amount (GEL)</Label>
                <Input
                  id="gel"
                  inputMode="decimal"
                  placeholder="Enter GEL"
                  value={customGel}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  className="h-11 text-base font-semibold"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">You Receive</Label>
                <div className="h-11 px-3 border-2 rounded-md bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 flex items-center justify-between">
                  <p className="text-base font-bold text-orange-600">
                    {computedPoints > 0 ? computedPoints.toLocaleString() : '0'}
                  </p>
                  <p className="text-xs text-gray-500 font-medium">points</p>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 flex items-center gap-1"><Shield className="w-3 h-3" /> Secure BOG payment • Exact conversion auto-calculated</p>
          </div>

          {/* Summary - with min-height to prevent layout shifts */}
          <div className="min-h-[100px]">
            {isValid && (selectedPackage !== null || (isCustom && customGel)) && (
              <Card className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Amount</span><span className="font-semibold">{computedGel.toFixed(2)} GEL</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Points</span><span className="font-semibold text-orange-600">+{computedPoints.toLocaleString()}</span></div>
                  <div className="flex justify-between pt-2 border-t border-gray-300"><span className="text-gray-600 font-medium">New Balance</span><span className="font-bold text-orange-600 text-lg">{(currentBalance + computedPoints).toLocaleString()} pts</span></div>
                </div>
              </Card>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" disabled={isLoading} onClick={handleClose}>Cancel</Button>
            <Button className="flex-1 bg-orange-500 hover:bg-orange-600" disabled={!isValid || isLoading} onClick={handleContinueToPayment}>
              {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : <>Pay {computedGel.toFixed(2)} GEL</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
