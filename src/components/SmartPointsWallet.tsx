import { useState, useEffect, useCallback } from 'react';
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

interface SmartPointsWalletProps {
  userId: string;
  compact?: boolean;
}

export function SmartPointsWallet({ userId, compact = false }: SmartPointsWalletProps) {
  const [points, setPoints] = useState<UserPoints | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuyModal, setShowBuyModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [pointsData, transactionsData] = await Promise.all([
        getUserPoints(userId),
        getPointTransactions(userId, 5)
      ]);

      setPoints(pointsData);
      setTransactions(transactionsData);
    } catch (error) {
      logger.error('Error loading wallet data:', error);
      toast.error('Failed to load SmartPoints data');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial load on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Polling for balance updates (replaces realtime to stay under channel limits)
  // Poll every 30 seconds for updates - more scalable than realtime subscriptions
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const updatedPoints = await getUserPoints(userId);
        if (updatedPoints && updatedPoints.balance !== points?.balance) {
          logger.log('Polling update: New balance detected:', updatedPoints.balance);
          setPoints(updatedPoints);
          // Reload transactions to show latest activity
          const txs = await getPointTransactions(userId, 5);
          setTransactions(txs);
        }
      } catch (error) {
        logger.error('Failed to poll points:', error);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [userId, points?.balance]);

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

  // Auto-refresh when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        logger.log('Tab visible: Refreshing SmartPoints data');
        loadData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
        className="min-h-screen bg-gradient-to-b from-[#F8F9FB] to-white pb-24"
      >
        {/* Apple-Style Header */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF8A00] to-[#FFB84D] flex items-center justify-center shadow-sm">
              <Coins size={20} strokeWidth={2.5} className="text-white" />
            </div>
            <div>
              <h1 className="text-[22px] font-semibold text-[#1A1A1A] leading-tight">
                SmartPoints Wallet
              </h1>
              <p className="text-[13px] text-[#6F6F6F] leading-tight">
                Your digital currency for reservations
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 space-y-4">
          {/* Hero Balance Card - Apple Wallet Style */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-[#FF8A00] to-[#FFB84D] rounded-[18px] shadow-[0_4px_16px_rgba(255,138,0,0.2)] border-0 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
              <CardContent className="p-6 text-center relative">
                <p className="text-[13px] font-medium text-white/80 mb-2">
                  Current Balance
                </p>
                <div className="text-[56px] font-bold text-white leading-none mb-1 tracking-tight">
                  {balance.toLocaleString()}
                </div>
                <p className="text-[15px] font-semibold text-white/90 mb-4">
                  SmartPoints
                </p>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2.5">
                  <p className="text-[13px] font-medium text-white">
                    <Sparkles size={14} className="inline mr-1.5" />
                    You can reserve up to {Math.floor(balance / 5)} items
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Add Points Button - Apple CTA Style */}
          <Button
            onClick={() => setShowBuyModal(true)}
            className="w-full h-[52px] bg-gradient-to-r from-[#FF8A00] to-[#FFB84D] hover:shadow-[0_8px_24px_rgba(255,138,0,0.3)] text-white font-semibold text-[15px] rounded-[14px] shadow-[0_2px_8px_rgba(255,138,0,0.2)] transition-all"
          >
            <Plus size={20} strokeWidth={2.5} className="mr-2" />
            Add SmartPoints
          </Button>

          {/* Info Card - Apple Notice Style */}
          <Card className="bg-[#007AFF]/5 rounded-[14px] border border-[#007AFF]/20 shadow-none">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
                  <Info size={16} strokeWidth={2} className="text-[#007AFF]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-[#1A1A1A] mb-1">
                    How SmartPoints Work
                  </h3>
                  <p className="text-[13px] text-[#6F6F6F] leading-relaxed">
                    Points reserve your spot — you only pay cash at pickup. Think of them as your booking currency.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity - Apple List Style */}
          <div>
            <div className="flex items-center gap-2 mb-3 px-1">
              <Clock size={18} strokeWidth={2} className="text-[#6F6F6F]" />
              <h2 className="text-[17px] font-semibold text-[#1A1A1A]">
                Recent Activity
              </h2>
            </div>

            {transactions.length === 0 ? (
              <Card className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.06)]">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#F8F9FB] flex items-center justify-center mx-auto mb-3">
                    <Clock size={28} strokeWidth={1.5} className="text-[#6F6F6F]" />
                  </div>
                  <p className="text-[15px] font-medium text-[#6F6F6F]">
                    No transactions yet
                  </p>
                  <p className="text-[13px] text-[#8E8E93] mt-1">
                    Your activity will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white rounded-[18px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.06)]">
                <CardContent className="p-0">
                  {transactions.slice(0, 5).map((transaction, index) => (
                    <motion.div
                      key={transaction.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center gap-3 px-5 py-4 ${
                        index !== transactions.length - 1 && index !== 4 ? 'border-b border-[rgba(0,0,0,0.06)]' : ''
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        transaction.change > 0
                          ? 'bg-[#34C759]/10'
                          : 'bg-[#FF3B30]/10'
                      }`}>
                        {transaction.change > 0 ? (
                          <TrendingUp size={20} strokeWidth={2} className="text-[#34C759]" />
                        ) : (
                          <TrendingDown size={20} strokeWidth={2} className="text-[#FF3B30]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-medium text-[#1A1A1A] truncate">
                          {formatTransactionReason(transaction.reason)}
                        </p>
                        <p className="text-[13px] text-[#6F6F6F] mt-0.5">
                          {new Date(transaction.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-[17px] font-semibold ${
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
}

