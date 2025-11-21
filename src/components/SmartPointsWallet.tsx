import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, Plus, TrendingUp, TrendingDown, Clock } from 'lucide-react';
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
      <Card className="shadow-lg bg-gradient-to-br from-white to-[#F9FFFB] border-[#4CC9A8]/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-[#4CC9A8] to-[#3db891] rounded-xl">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">SmartPoints Wallet</CardTitle>
              <CardDescription>Your reward points balance</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Balance Display */}
          <div className="relative p-6 bg-gradient-to-br from-[#EFFFF8] to-[#C9F9E9] rounded-xl border-2 border-[#4CC9A8]/30">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Current Balance</p>
                <p className="text-5xl font-bold text-gray-900">{balance}</p>
                <p className="text-sm text-gray-500 mt-1">SmartPoints</p>
              </div>
              {isLowBalance && (
                <Badge variant="destructive" className="animate-pulse">
                  Low Balance
                </Badge>
              )}
            </div>

            {isLowBalance && (
              <div className="mt-4 text-sm text-orange-600 flex items-center gap-2">
                <span className="font-medium">⚠️ Running low! Buy more to continue reserving offers.</span>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white rounded-lg border">
              <p className="text-xs text-gray-600">Per Unit</p>
              <p className="text-lg font-bold text-gray-900">5 Points</p>
            </div>
            <div className="p-3 bg-white rounded-lg border">
              <p className="text-xs text-gray-600">Units Available</p>
              <p className="text-lg font-bold text-[#4CC9A8]">{Math.floor(balance / 5)}</p>
            </div>
          </div>

          {/* Recent Transactions */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recent Activity
            </h3>

            {transactions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No transactions yet</p>
            ) : (
              <div className="space-y-2">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border hover:border-[#4CC9A8]/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        transaction.change > 0
                          ? 'bg-green-50 text-green-600'
                          : 'bg-gray-50 text-gray-600'
                      }`}>
                        {transaction.change > 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatTransactionReason(transaction.reason)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        transaction.change > 0 ? 'text-green-600' : 'text-gray-900'
                      }`}>
                        {formatPointsChange(transaction.change)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {transaction.balance_after} total
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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

