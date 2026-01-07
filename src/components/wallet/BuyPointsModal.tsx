import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Shield, Lock, AlertCircle, Wallet, Layers, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BOG_CONFIG } from '@/lib/payments/bog';
import { supabase } from '@/lib/supabase';
import { secureRequest } from '@/lib/secureRequest';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { useI18n } from '@/lib/i18n';

interface BuyPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  userId: string;
  mode?: 'user' | 'partner';
  partnerPoints?: {
    balance: number;
    offer_slots: number;
  } | null;
  onPurchaseSlot?: () => void;
}

export function BuyPointsModal({
  isOpen,
  onClose,
  currentBalance: initialBalance,
  userId,
  mode = 'user',
  partnerPoints,
  onPurchaseSlot,
}: BuyPointsModalProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'points' | 'slots'>('points');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPurchasingSlot, setIsPurchasingSlot] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(initialBalance);
  const [error, setError] = useState<string>('');

  const isPartner = mode === 'partner';
  
  // Define preset amounts based on mode
  const presetAmounts = isPartner 
    ? [10, 25, 50, 100] 
    : [1, 2, 5, 10, 25, 50];
  
  const minAmount = 0.5;
  const maxAmount = 100;

  // Fetch fresh balance when modal opens
  useEffect(() => {
    if (isOpen && userId) {
      const fetchBalance = async () => {
        try {
          logger.log('BuyPointsModal: Fetching balance for user', userId, 'mode:', mode);
          
          // CRITICAL: Use mode prop to determine table
          // When mode="user", always use user_points (even if user has partner profile)
          // When mode="partner", use partner_points
          const tableName = mode === 'partner' ? 'partner_points' : 'user_points';
          logger.log('BuyPointsModal: Using table', tableName, 'based on mode:', mode);
          
          const { data, error } = await supabase
            .from(tableName)
            .select('balance')
            .eq('user_id', userId)
            .maybeSingle();
          
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

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('points');
      setSelectedAmount(null);
      setCustomAmount('');
      setError('');
      setIsPurchasingSlot(false);
    }
  }, [isOpen]);

  // Strict validation and sanitization
  const amount = customAmount ? parseFloat(customAmount) : selectedAmount || 0;
  const points = Math.floor(amount * BOG_CONFIG.POINTS_PER_GEL);
  
  // Validate amount with strict rules
  useEffect(() => {
    if (amount === 0 || !customAmount) {
      setError('');
    } else if (isNaN(amount)) {
      setError('გთხოვთ შეიყვანოთ ვალიდური რიცხვი');
    } else if (amount < minAmount) {
      setError(`მინიმალური თანხა არის ${minAmount} ₾`);
    } else if (amount > maxAmount) {
      setError(`მაქსიმალური თანხა არის ${maxAmount} ₾`);
    } else {
      setError('');
    }
  }, [amount, customAmount, minAmount, maxAmount]);

  // Strict validation: must be a valid number within range
  const isValid = !isNaN(amount) && amount >= minAmount && amount <= maxAmount;

  const handlePresetSelect = (value: number) => {
    setSelectedAmount(value);
    setCustomAmount(value.toString());
    setError('');
  };

  const handleCustomChange = (value: string) => {
    // Strip any non-numeric characters except decimal point
    const sanitized = value.replace(/[^\d.]/g, '');
    
    // Prevent multiple decimal points
    const parts = sanitized.split('.');
    if (parts.length > 2) return;
    
    // Allow only 2 decimal places
    if (parts.length === 2 && parts[1].length > 2) return;
    
    // Prevent values starting with multiple zeros
    if (sanitized.startsWith('00')) return;
    
    // Parse and validate range
    const numValue = parseFloat(sanitized);
    if (sanitized && (numValue > maxAmount)) return;
    
    setCustomAmount(sanitized);
    setSelectedAmount(null);
  };

  const handlePayment = async () => {
    // Triple validation before payment
    if (!userId) {
      toast.error('მომხმარებლის ID არ არის ნაპოვნი');
      return;
    }

    if (!isValid) {
      toast.error('გთხოვთ აირჩიოთ სწორი თანხა');
      return;
    }

    // Final security check: ensure amount is a valid number in range
    const finalAmount = parseFloat(amount.toFixed(2));
    if (isNaN(finalAmount) || finalAmount < minAmount || finalAmount > maxAmount) {
      toast.error('არასწორი თანხა');
      setError(`თანხა უნდა იყოს ${minAmount}-დან ${maxAmount} ₾-მდე`);
      return;
    }

    setIsLoading(true);

    try {
      logger.log('BuyPointsModal: Initiating payment', {
        points,
        gel: finalAmount,
        userId,
        mode,
      });

      const data = await secureRequest<any>({
        operation: 'createPaymentSession',
        execute: async () => {
          const { data, error } = await supabase.functions.invoke('bog-create-session', {
            body: {
              points,
              gel_amount: finalAmount,
            },
          });
          if (error) {
            logger.error('BuyPointsModal: Payment session creation failed', error);
            if (error.message?.includes('CORS') || error.message?.includes('ERR_FAILED')) {
              throw new Error('გადახდის სერვისთან დაკავშირება ვერ მოხერხდა. გთხოვთ სცადოთ smartpick.ge-ზე ან შეამოწმოთ ინტერნეტ კავშირი.');
            }
            throw new Error(error.message || 'გადახდის სესიის შექმნა ვერ მოხერხდა');
          }
          if (data?.error) {
            logger.error('BuyPointsModal: API returned error', data);
            throw new Error(data.error + (data.details ? `\n\nდეტალები: ${data.details}` : ''));
          }
          if (!data || !data.redirectUrl) {
            logger.error('BuyPointsModal: Invalid response', data);
            throw new Error('გადახდის სერვისიდან არასწორი პასუხი');
          }
          return data;
        }
      });

      logger.log('BuyPointsModal: Payment session created, redirecting', {
        redirectUrl: data.redirectUrl,
        orderId: data.orderId,
      });

      toast.info('გადამისამართება უსაფრთხო გადახდის გვერდზე...');

      setTimeout(() => {
        window.location.href = data.redirectUrl;
      }, 500);

    } catch (error) {
      logger.error('BuyPointsModal: Error', error);
      toast.error(error instanceof Error ? error.message : 'გადახდა ვერ დაიწყო. გთხოვთ სცადოთ თავიდან.');
      setIsLoading(false);
    }
  };

  const handlePurchaseSlot = async () => {
    if (onPurchaseSlot) {
      setIsPurchasingSlot(true);
      try {
        await onPurchaseSlot();
        toast.success('სლოტი წარმატებით შეძენილია!');
        onClose();
      } catch (error) {
        toast.error('სლოტის შეძენა ვერ მოხერხდა');
      } finally {
        setIsPurchasingSlot(false);
      }
    }
  };

  const calculateSlotCost = (slots: number): number => {
    // Cost for NEXT slot: 11th=100, 12th=200, 13th=300
    return (slots - 9) * 100;
  };

  const slotCost = partnerPoints ? calculateSlotCost(partnerPoints.offer_slots) : 0;
  const hasInsufficientBalance = partnerPoints ? partnerPoints.balance < slotCost : false;

  const handleClose = () => {
    if (!isLoading && !isPurchasingSlot) {
      onClose();
    }
  };

  const ModalWrapper = Dialog; // Always use Dialog for centered Apple-style modal
  const ContentWrapper = DialogContent;

  return (
    <ModalWrapper open={isOpen} onOpenChange={handleClose}>
      <ContentWrapper className="max-w-[420px] p-0 gap-0 bg-white/95 backdrop-blur-xl border-none shadow-[0_20px_60px_rgba(0,0,0,0.3)] overflow-hidden max-h-[85vh] overflow-y-auto rounded-[24px]">
        <DialogTitle className="sr-only">
          {isPartner ? 'SmartPoints პარტნიორებისთვის' : 'SmartPoints-ის შეძენა'}
        </DialogTitle>
        
        {/* Apple-Style Header with Glassmorphism */}
        <div className="relative px-5 pt-5 pb-4 bg-gradient-to-br from-[#FF8A00]/10 to-[#FFB84D]/10">
          <div className="absolute inset-0 bg-white/40 backdrop-blur-md"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF8A00] to-[#FFB84D] flex items-center justify-center shadow-lg">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {isPartner ? 'SmartPoints' : 'ქულების შეძენა'}
                </h2>
                {isPartner && (
                  <p className="text-xs text-gray-600">
                    პარტნიორებისთვის
                  </p>
                )}

              </div>
            </div>
          </div>
        </div>

        {/* Tabs - Apple Style */}
        {isPartner && partnerPoints && (
          <div className="px-5 py-3">
            <div className="flex gap-1 p-0.5 bg-gray-100/80 backdrop-blur-sm rounded-[14px]">
              <button
                onClick={() => setActiveTab('points')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-[12px] font-semibold text-sm transition-all duration-200 ${
                  activeTab === 'points'
                    ? 'bg-white text-[#FF8A00] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Wallet className="w-4 h-4" />
                ქულები
              </button>
              <button
                onClick={() => setActiveTab('slots')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-[12px] font-semibold text-sm transition-all duration-200 ${
                  activeTab === 'slots'
                    ? 'bg-white text-[#FF8A00] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Layers className="w-4 h-4" />
                სლოტები
              </button>
            </div>
          </div>
        )}

        {/* Points Tab Content */}
        {activeTab === 'points' && (
          <>
            {/* Apple-Style Balance Card with Glassmorphism */}
            <div className="mx-5 mb-4 bg-gradient-to-br from-[#FF8A00]/5 to-[#FFB84D]/5 backdrop-blur-sm rounded-[18px] p-4 border border-[#FF8A00]/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">
                    {isPartner ? 'ხელმისაწვდომი' : 'მიმდინარე'}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold bg-gradient-to-r from-[#FF8A00] to-[#FFB84D] bg-clip-text text-transparent">
                      {currentBalance.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600 font-medium">
                      ქულა
                    </p>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF8A00] to-[#FFB84D] flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Amount Selection - Apple Style */}
            <div className="px-5 pb-5">
          <p className="text-sm font-semibold text-gray-900 mb-3">
            აირჩიე თანხა
          </p>
          
          {/* Preset Buttons - Apple Style */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {presetAmounts.map((value) => (
              <motion.button
                key={value}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePresetSelect(value)}
                className={`h-11 rounded-[14px] font-semibold text-base transition-all duration-200 ${
                  selectedAmount === value
                    ? 'bg-gradient-to-r from-[#FF8A00] to-[#FFB84D] text-white shadow-lg'
                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-[#FF8A00]/30 hover:shadow-sm'
                }`}
              >
                {value} ₾
              </motion.button>
            ))}
          </div>

          {/* Custom Amount Input */}
          <div className="mb-4">
            <label className="text-sm font-semibold text-gray-900 mb-2 block">
              საკუთარი თანხა (0.5–100 ₾)
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.5–100"
                value={customAmount}
                onChange={(e) => handleCustomChange(e.target.value)}
                maxLength={6}
                autoComplete="off"
                spellCheck={false}
                className={`w-full h-12 pl-4 pr-16 text-base font-semibold rounded-[14px] border-2 transition-colors focus:outline-none focus:ring-0 ${
                  error 
                    ? 'border-red-400 focus:border-red-500' 
                    : 'border-gray-200 focus:border-[#FF8A00]'
                }`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
                GEL
              </span>
            </div>
            
            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="mt-2 flex items-center gap-1.5 text-red-600 text-sm"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Primary CTA */}
          <motion.button
            type="button"
            whileTap={{ scale: isValid && !isLoading ? 0.98 : 1 }}
            onClick={handlePayment}
            disabled={!isValid || isLoading}
            className={`w-full h-14 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 transition-all ${
              isValid && !isLoading
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>მუშავდება...</span>
              </>
            ) : (
              <span>
                {isPartner ? 'ბალანსის შევსება' : 'გადახდა'} · {amount > 0 ? amount.toFixed(2) : '0.00'} ₾
              </span>
            )}
          </motion.button>

              {/* Trust Footer */}
              <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-500">
                <Lock className="w-3.5 h-3.5" />
                <span>გადახდა BOG-ის გადახდის უსაფრთხო სისტემით</span>
              </div>
            </div>
          </>
        )}

        {/* Slots Tab Content */}
        {activeTab === 'slots' && isPartner && partnerPoints && (
          <div className="px-6 pb-5">
            {/* Current Status */}
            <div className="mb-5 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl p-4 border border-teal-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    ხელმისაწვდომი ბალანსი
                  </p>
                  <p className="text-2xl font-bold text-teal-600">
                    {partnerPoints.balance}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    მიმდინარე სლოტები
                  </p>
                  <p className="text-2xl font-bold text-teal-600">
                    {partnerPoints.offer_slots}
                  </p>
                </div>
              </div>
            </div>

            {/* Next Slot Cost */}
            <div className="mb-5 bg-white rounded-2xl p-4 border-2 border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    შემდეგი სლოტის ღირებულება
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    ფასი იზრდება თითოეული სლოტით
                  </p>
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {slotCost}
                  <span className="text-sm font-semibold text-gray-600 ml-1">ქულა</span>
                </div>
              </div>
            </div>

            {/* Insufficient Balance Warning */}
            {hasInsufficientBalance && (
              <div className="mb-5 bg-orange-50 rounded-2xl p-4 border border-orange-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-orange-900 mb-1">
                      არასაკმარისი ბალანსი
                    </p>
                    <p className="text-xs text-orange-800">
                      თქვენ გჭირდებათ მეტი ქულა ამ სლოტის შესაძენად
                    </p>
                    <button
                      onClick={() => setActiveTab('points')}
                      className="mt-3 px-4 py-2 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-colors"
                    >
                      ქულების შეძენა
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Purchase Button */}
            <motion.button
              type="button"
              whileTap={{ scale: !hasInsufficientBalance && !isPurchasingSlot ? 0.98 : 1 }}
              onClick={handlePurchaseSlot}
              disabled={hasInsufficientBalance || isPurchasingSlot}
              className={`w-full h-14 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 transition-all ${
                !hasInsufficientBalance && !isPurchasingSlot
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isPurchasingSlot ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>მუშავდება...</span>
                </>
              ) : (
                <span>სლოტის შეძენა · {slotCost} ქულა</span>
              )}
            </motion.button>

            {/* Info Footer */}
            <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-500">
              <Layers className="w-3.5 h-3.5" />
              <span>სლოტები საჭიროა ახალი შეთავაზების დასამატებლად</span>
            </div>
          </div>
        )}
      </ContentWrapper>
    </ModalWrapper>
  );
}
