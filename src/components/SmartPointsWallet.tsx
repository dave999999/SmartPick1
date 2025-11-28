import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, Plus, TrendingUp, TrendingDown, Clock, Sparkles, Rocket, Info, Zap } from 'lucide-react';
import { getUserPoints, getPointTransactions, formatTransactionReason, formatPointsChange, subscribeToUserPoints } from '@/lib/smartpoints-api';
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

  // Real-time subscription to database changes
  useEffect(() => {
    const channel = subscribeToUserPoints(userId, (newBalance) => {
      logger.log('Real-time update: New balance from Supabase:', newBalance);
      setPoints(prev => prev ? { ...prev, balance: newBalance } : null);
      // Reload transactions to show latest activity
      getPointTransactions(userId, 5).then(setTransactions);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

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
      <div className="bg-white dark:bg-gray-900 pb-6">
        {/* Ultra-Compact Header - NO SCROLLING */}
        <div className="bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2.5 border-b border-emerald-100 dark:border-emerald-800">
          <h1 className="text-[15px] font-bold text-gray-900 dark:text-gray-100 leading-tight mb-0.5">
            Your SmartPoints Wallet 🎉
          </h1>
          <p className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">
            Your points power your reservations
          </p>
        </div>

        <div className="px-4 pt-3 space-y-2.5">
          {/* Compact Balance Card - Centered & Minimal */}
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-3 text-center">
              <div className="text-[40px] font-black text-emerald-600 dark:text-emerald-400 leading-none mb-1">
                {balance}
              </div>
              <p className="text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-2">
                SmartPoints
              </p>
              <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded-lg px-3 py-1.5">
                <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                  You can reserve {Math.floor(balance / 5)} units right now
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Main CTA Button - ONE BUTTON ONLY */}
          <Button
            onClick={() => setShowBuyModal(true)}
            className="w-full h-11 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-[13px] rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add SmartPoints
          </Button>

          {/* Compact Info Card - About SmartPoints */}
          <Card className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <CardContent className="p-2.5">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-[12px] font-bold text-gray-900 dark:text-gray-100 mb-0.5">
                    What are SmartPoints?
                  </h3>
                  <p className="text-[10px] text-gray-700 dark:text-gray-300 leading-snug">
                    Points secure your discounts. You pay at pickup — points just reserve! 🔒
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tiny Recent Activity Section */}
          <div>
            <h2 className="text-[12px] font-bold text-gray-900 dark:text-gray-100 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
              Recent Activity
            </h2>

            {transactions.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center border border-gray-200 dark:border-gray-700">
                <p className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                  None yet — your reservations will appear here 👋
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {transactions.slice(0, 3).map((transaction) => (
                  <div
                    key={transaction.id}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        transaction.change > 0
                          ? 'bg-emerald-100 dark:bg-emerald-900/30'
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        {transaction.change > 0 ? (
                          <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-gray-900 dark:text-gray-100 truncate">
                          {formatTransactionReason(transaction.reason)}
                        </p>
                        <p className="text-[9px] text-gray-600 dark:text-gray-400 font-medium">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className={`text-[13px] font-black ${
                        transaction.change > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {formatPointsChange(transaction.change)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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

