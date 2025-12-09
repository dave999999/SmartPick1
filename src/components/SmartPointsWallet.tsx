import { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Coins, Plus, TrendingUp, TrendingDown, Clock, Info, Sparkles } from 'lucide-react';
import { getUserPoints, getPointTransactions, formatTransactionReason, formatPointsChange } from '@/lib/smartpoints-api';
import type { UserPoints, PointTransaction } from '@/lib/smartpoints-api';
import { BuyPointsModal } from './BuyPointsModal';
import { toast } from 'sonner';
import { onPointsChange } from '@/lib/pointsEventBus';
import { logger } from '@/lib/logger';
import { useI18n } from '@/lib/i18n';

interface SmartPointsWalletProps {
  userId: string;
  compact?: boolean;
}

export interface SmartPointsWalletRef {
  refresh: (reason?: string) => Promise<void>;
}

export const SmartPointsWallet = forwardRef<SmartPointsWalletRef, SmartPointsWalletProps>(
  function SmartPointsWallet({ userId, compact = false }, ref) {
  const { t } = useI18n();
  const [points, setPoints] = useState<UserPoints | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuyModal, setShowBuyModal] = useState(false);

  const loadData = useCallback(async (reason?: string) => {
    try {
      setLoading(true);
      const [pointsData, transactionsData] = await Promise.all([
        getUserPoints(userId),
        getPointTransactions(userId, 5)
      ]);

      setPoints(pointsData);
      setTransactions(transactionsData);
      if (reason) {
        logger.log(`💰 Wallet refreshed: ${reason}`);
      }
    } catch (error) {
      logger.error('Error loading wallet data:', error);
      toast.error('Failed to load SmartPoints data');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Expose refresh method to parent components via ref
  useImperativeHandle(ref, () => ({
    refresh: async (reason?: string) => {
      await loadData(reason || 'Parent triggered');
    },
  }), [loadData]);

  // Initial load on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Smart Hybrid: Strategic polling as backup to event-driven updates
  // Expanded view: 2min polling (reduces from 1,440/day to 720/day)
  // Collapsed view: 5min polling (reduces from 2,880/day to 576/day)
  // Combined with event-driven updates = 80% query reduction
  useEffect(() => {
    // Don't poll if tab is hidden
    if (document.hidden) return;
    
    // Strategic intervals: Longer for collapsed, shorter for expanded
    const pollInterval = compact ? 300000 : 120000; // 5min : 2min
    
    const interval = setInterval(async () => {
      try {
        const updatedPoints = await getUserPoints(userId);
        if (updatedPoints && updatedPoints.balance !== points?.balance) {
          logger.log(`💰 Polling update (${compact ? 'collapsed' : 'expanded'}): New balance ${updatedPoints.balance}`);
          setPoints(updatedPoints);
          // Reload transactions to show latest activity
          const txs = await getPointTransactions(userId, 5);
          setTransactions(txs);
        }
      } catch (error) {
        // Silently fail - don't spam console during polling
        logger.error('Failed to poll points:', error);
      }
    }, pollInterval);

    return () => clearInterval(interval);
  }, [userId, points?.balance, compact]);

  // Event bus listener for local app events
  useEffect(() => {
    const unsubscribe = onPointsChange((newBalance, changedUserId) => {
      // Only update if this is the current user
      if (changedUserId === userId) {
        logger.log('Event bus update: New balance:', newBalance);
        setPoints(prev => prev ? { ...prev, balance: newBalance } : null);
        // Reload transactions to show latest activity
        getPointTransactions(userId, 5).then(setTransactions);
      }
    });

    return unsubscribe;
  }, [userId]);

  // Auto-refresh when tab becomes visible (replaces polling when hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        logger.log('📱 Tab visible: Refreshing SmartPoints data immediately');
        loadData('Tab visible');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadData]);

  // Event-driven refresh listener (NEW: Smart Hybrid approach)
  // Responds to user actions: reservation creation, pickup confirmation, achievement claims
  useEffect(() => {
    const handleRefreshEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ reason: string }>;
      const reason = customEvent.detail?.reason || 'Custom event';
      logger.log(`🎯 Event-driven refresh: ${reason}`);
      loadData(reason);
    };

    window.addEventListener('smartpointsRefresh', handleRefreshEvent);
    return () => {
      window.removeEventListener('smartpointsRefresh', handleRefreshEvent);
    };
  }, [loadData]);

  const handlePurchaseSuccess = (newBalance: number) => {
    setPoints(prev => prev ? { ...prev, balance: newBalance } : null);
    loadData(); // Reload to get latest transaction
    toast.success(`✅ Purchase complete! You now have ${newBalance} SmartPoints`);
  };

  if (loading) {
    return (
      <Card className={compact ? '' : 'shadow-lg'}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4CC9A8]"></div>
        </CardContent>
      </Card>
    );
  }

  const balance = points?.balance ?? 0;
  const isLowBalance = balance < 10;

  if (compact) {
    return (
      <>
        <div className="flex items-center gap-2 bg-gradient-to-r from-[#EFFFF8] to-[#C9F9E9] px-4 py-2 rounded-lg border border-[#4CC9A8]/30">
          <Coins className="w-5 h-5 text-[#4CC9A8]" />
          <div className="flex-1">
            <p className="text-xs text-gray-600">SmartPoints</p>
            <p className="text-xl font-bold text-gray-900">{balance}</p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowBuyModal(true)}
            className="bg-[#4CC9A8] hover:bg-[#3db891]"
          >
            <Plus className="w-4 h-4 mr-1" />
            Buy
          </Button>
        </div>

        <BuyPointsModal
          open={showBuyModal}
          onClose={() => setShowBuyModal(false)}
          userId={userId}
          currentBalance={balance}
          onSuccess={handlePurchaseSuccess}
        />
      </>
    );
  }

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-b from-[#F8F9FB] to-white pb-4"
      >
        {/* Apple-Style Header - Compact */}
        <div className="px-3 pt-3 pb-2">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF8A00] to-[#FFB84D] flex items-center justify-center shadow-sm">
              <Coins size={18} strokeWidth={2.5} className="text-white" />
            </div>
            <div>
              <h1 className="text-[18px] font-semibold text-[#1A1A1A] leading-tight">
                SmartPoints Wallet
              </h1>
              <p className="text-[11px] text-[#6F6F6F] leading-tight">
                Your digital currency for reservations
              </p>
            </div>
          </div>
        </div>

        <div className="px-3 space-y-3">
          {/* Hero Balance Card - Compact */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-[#FF8A00] to-[#FFB84D] rounded-[14px] shadow-[0_3px_12px_rgba(255,138,0,0.2)] border-0 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-3xl" />
              <CardContent className="p-4 text-center relative">
                <p className="text-[11px] font-medium text-white/80 mb-1">
                  {t('wallet.currentBalance')}
                </p>
                <div className="text-[40px] font-bold text-white leading-none mb-1 tracking-tight">
                  {balance.toLocaleString()}
                </div>
                <p className="text-[12px] font-semibold text-white/90 mb-2.5">
                  SmartPoints
                </p>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5">
                  <p className="text-[11px] font-medium text-white">
                    <Sparkles size={11} className="inline mr-1" />
                    {t('wallet.canReserveItems').replace('{count}', Math.floor(balance / 5).toString())}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Add Points Button - Compact */}
          <Button
            onClick={() => setShowBuyModal(true)}
            className="w-full h-[42px] bg-gradient-to-r from-[#FF8A00] to-[#FFB84D] hover:shadow-[0_6px_20px_rgba(255,138,0,0.3)] text-white font-semibold text-[13px] rounded-[12px] shadow-[0_2px_6px_rgba(255,138,0,0.2)] transition-all"
          >
            <Plus size={17} strokeWidth={2.5} className="mr-1.5" />
            {t('wallet.addPoints')}
          </Button>

          {/* Info Card - Compact */}
          <Card className="bg-[#007AFF]/5 rounded-[11px] border border-[#007AFF]/20 shadow-none">
            <CardContent className="p-2.5">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Info size={13} strokeWidth={2} className="text-[#007AFF]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[12px] font-semibold text-[#1A1A1A] mb-0.5">
                    {t('wallet.howItWorks')}
                  </h3>
                  <p className="text-[10px] text-[#6F6F6F] leading-relaxed">
                    {t('wallet.howItWorksDesc')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity - Compact */}
          <div>
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <Clock size={15} strokeWidth={2} className="text-[#6F6F6F]" />
              <h2 className="text-[14px] font-semibold text-[#1A1A1A]">
                {t('wallet.recentActivity')}
              </h2>
            </div>

            {transactions.length === 0 ? (
              <Card className="bg-white rounded-[11px] shadow-[0_2px_6px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.06)]">
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#F8F9FB] flex items-center justify-center mx-auto mb-2">
                    <Clock size={20} strokeWidth={1.5} className="text-[#6F6F6F]" />
                  </div>
                  <p className="text-[12px] font-medium text-[#6F6F6F]">
                    {t('wallet.noTransactions')}
                  </p>
                  <p className="text-[10px] text-[#8E8E93] mt-0.5">
                    {t('wallet.activityWillAppear')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white rounded-[11px] overflow-hidden shadow-[0_2px_6px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.06)]">
                <CardContent className="p-0">
                  {transactions.slice(0, 5).map((transaction, index) => (
                    <motion.div
                      key={transaction.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center gap-2 px-3 py-2.5 ${
                        index !== transactions.length - 1 && index !== 4 ? 'border-b border-[rgba(0,0,0,0.06)]' : ''
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        transaction.change > 0
                          ? 'bg-[#34C759]/10'
                          : 'bg-[#FF3B30]/10'
                      }`}>
                        {transaction.change > 0 ? (
                          <TrendingUp size={14} strokeWidth={2} className="text-[#34C759]" />
                        ) : (
                          <TrendingDown size={14} strokeWidth={2} className="text-[#FF3B30]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-[#1A1A1A] truncate">
                          {formatTransactionReason(transaction.reason)}
                        </p>
                        <p className="text-[10px] text-[#6F6F6F] mt-0.5">
                          {new Date(transaction.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-[13px] font-semibold ${
                          transaction.change > 0 ? 'text-[#34C759]' : 'text-[#1A1A1A]'
                        }`}>
                          {formatPointsChange(transaction.change)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </motion.div>

      <BuyPointsModal
        open={showBuyModal}
        onClose={() => setShowBuyModal(false)}
        userId={userId}
        currentBalance={balance}
        onSuccess={handlePurchaseSuccess}
      />
    </>
  );
});

