import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Download, TrendingUp, Users, ShoppingCart, Eye } from 'lucide-react';
import { getPlatformRevenueStats, exportFinancialReport, getDailyRevenueSummary } from '@/lib/api/admin-advanced';
import type { RevenueStats, DailyRevenueSummary } from '@/lib/types/admin';
import { BuyerPurchaseModal } from './BuyerPurchaseModal';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export default function FinancialDashboardPanel() {
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenueSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuyerModal, setShowBuyerModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      const [stats, daily] = await Promise.all([
        getPlatformRevenueStats(startDate.toISOString(), endDate.toISOString()),
        getDailyRevenueSummary(30),
      ]);
      
      setRevenueStats(stats);
      setDailyRevenue(daily);
    } catch (error) {
      logger.error('Error loading financial data:', error);
      toast.error('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const csv = await exportFinancialReport(startDate.toISOString(), endDate.toISOString());
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Report exported successfully');
    } catch (error) {
      logger.error('Error exporting report:', error);
      toast.error('Failed to export report');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00C896]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Financial Dashboard</h2>
        <p className="text-gray-600 mt-1">Platform revenue from point purchases (last 30 days) - Currency: GEL (Georgian Lari)</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue (GEL)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#00C896]">₾{revenueStats?.total_revenue.toFixed(2) || '0.00'}</div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1"><TrendingUp className="w-3 h-3" />Georgian Lari</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{revenueStats?.total_point_purchases || 0}</div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1"><ShoppingCart className="w-3 h-3" />Transactions</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Points Sold</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{revenueStats?.total_points_sold.toLocaleString() || 0}</div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1"><DollarSign className="w-3 h-3" />100 pts = ₾1</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Purchase (GEL)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₾{revenueStats?.average_purchase_value.toFixed(2) || '0.00'}</div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1"><DollarSign className="w-3 h-3" />Per transaction</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" onClick={() => setShowBuyerModal(true)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              Unique Buyers
              <Eye className="w-4 h-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{revenueStats?.unique_buyers || 0}</div>
            <div className="flex items-center gap-1 text-xs text-primary mt-1 font-medium"><Users className="w-3 h-3" />Click to view details</div>
          </CardContent>
        </Card>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={handleExportReport}><Download className="w-4 h-4 mr-2" />Export Report (CSV)</Button>
        <Button onClick={() => setShowBuyerModal(true)}><Eye className="w-4 h-4 mr-2" />View All Buyers</Button>
      </div>

      {/* Daily Revenue Chart */}
      {dailyRevenue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Revenue Trend (Last 30 Days)</CardTitle>
            <CardDescription>Revenue in GEL from point purchases</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-5 gap-4 py-2 text-xs font-semibold text-gray-600 border-b">
                <div>Date</div>
                <div className="text-right">Purchases</div>
                <div className="text-right">Points Sold</div>
                <div className="text-right">Revenue (GEL)</div>
                <div className="text-right">Unique Buyers</div>
              </div>
              {dailyRevenue.map((day: DailyRevenueSummary) => (
                <div key={day.revenue_date} className="grid grid-cols-5 gap-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                  <div>{new Date(day.revenue_date).toLocaleDateString('ka-GE')}</div>
                  <div className="text-right font-medium">{day.purchase_count}</div>
                  <div className="text-right">{day.total_points_sold.toLocaleString()}</div>
                  <div className="text-right font-bold text-green-600">₾{day.total_revenue_gel.toFixed(2)}</div>
                  <div className="text-right">{day.unique_buyers}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Buyer Purchase Modal */}
      <BuyerPurchaseModal isOpen={showBuyerModal} onClose={() => setShowBuyerModal(false)} />

      <Card>
        <CardHeader>
          <CardTitle>Platform Revenue Model</CardTitle>
          <CardDescription>How SmartPick.ge generates revenue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
              <div>
                <p className="font-semibold">Point Purchases (Platform Revenue)</p>
                <p className="text-sm text-gray-600">Users buy points from the platform. This is YOUR revenue source.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
              <div>
                <p className="font-semibold">Reservations (Partner Revenue)</p>
                <p className="text-sm text-gray-600">Users spend points at partners. Partners receive payment directly from customers. Platform does NOT take commission.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2"></div>
              <div>
                <p className="font-semibold">No Partner Payouts</p>
                <p className="text-sm text-gray-600">Platform does not handle partner payouts. Users pay partners directly via reservations.</p>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t">
            <p className="text-sm font-medium text-gray-700">Revenue Calculation:</p>
            <p className="text-sm text-gray-600 mt-1">Total Revenue = SUM(point_transactions WHERE reason = 'POINTS_PURCHASED')</p>
            <p className="text-xs text-gray-500 mt-2">* Assumes 1 point = 1 GEL. If different, update migration to track actual money amounts.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
