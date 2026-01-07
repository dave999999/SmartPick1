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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900">Financial Dashboard</h2>
        <p className="text-gray-600 mt-2">Platform revenue from point purchases (last 30 days)</p>
        <div className="mt-3 p-3 bg-teal-50 rounded-lg border border-teal-200">
          <p className="text-sm text-teal-900 font-medium">💰 Currency: Georgian Lari (₾) • Conversion Rate: 100 points = 1 ₾</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium text-gray-600">Total Revenue (₾)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">₾{revenueStats?.total_revenue.toFixed(2) || '0.00'}</div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-2"><TrendingUp className="w-3 h-3" />Georgian Lari</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium text-gray-600">Total Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{revenueStats?.total_point_purchases || 0}</div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-2"><ShoppingCart className="w-3 h-3" />Transactions</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium text-gray-600">Points Sold</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{revenueStats?.total_points_sold.toLocaleString() || 0}</div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-2"><DollarSign className="w-3 h-3" />100 pts = ₾1</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium text-gray-600">Avg Purchase (₾)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">₾{revenueStats?.average_purchase_value.toFixed(2) || '0.00'}</div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-2"><DollarSign className="w-3 h-3" />Per transaction</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-purple-300" onClick={() => setShowBuyerModal(true)}>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-2">
              Unique Buyers
              <Eye className="w-4 h-4 text-teal-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{revenueStats?.unique_buyers || 0}</div>
            <div className="flex items-center gap-1 text-xs text-teal-600 mt-2 font-medium"><Users className="w-3 h-3" />Click to view details</div>
          </CardContent>
        </Card>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" className="border-gray-300 hover:border-teal-500 hover:text-teal-600" onClick={handleExportReport}><Download className="w-4 h-4 mr-2" />Export Report (CSV)</Button>
        <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => setShowBuyerModal(true)}><Eye className="w-4 h-4 mr-2" />View All Buyers</Button>
      </div>

      {/* Daily Revenue Chart */}
      {dailyRevenue.length > 0 && (
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">Daily Revenue Trend (Last 30 Days)</CardTitle>
            <CardDescription>Revenue in Georgian Lari (₾) from point purchases • 100 points = ₾1</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-5 gap-4 py-3 text-xs font-semibold text-gray-700 border-b-2 border-gray-200 bg-gray-50 rounded-t-lg px-2">
                <div>Date</div>
                <div className="text-right">Purchases</div>
                <div className="text-right">Points Sold</div>
                <div className="text-right">Revenue (₾)</div>
                <div className="text-right">Unique Buyers</div>
              </div>
              {dailyRevenue.map((day: DailyRevenueSummary) => (
                <div key={day.revenue_date} className="grid grid-cols-5 gap-4 py-3 text-sm hover:bg-teal-50 rounded px-2 border-b border-gray-100">
                  <div className="text-gray-700">{new Date(day.revenue_date).toLocaleDateString('ka-GE')}</div>
                  <div className="text-right font-medium text-gray-900">{day.purchase_count}</div>
                  <div className="text-right text-gray-700">{day.total_points_sold.toLocaleString()}</div>
                  <div className="text-right font-bold text-emerald-600">₾{day.total_revenue_gel.toFixed(2)}</div>
                  <div className="text-right text-gray-700">{day.unique_buyers}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Buyer Purchase Modal */}
      <BuyerPurchaseModal isOpen={showBuyerModal} onClose={() => setShowBuyerModal(false)} />

      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Platform Revenue Model</CardTitle>
          <CardDescription>How SmartPick.ge generates revenue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2"></div>
              <div>
                <p className="font-semibold text-gray-900">Point Purchases (Platform Revenue)</p>
                <p className="text-sm text-gray-600">Users buy points from the platform. This is YOUR revenue source.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
              <div>
                <p className="font-semibold text-gray-900">Reservations (Partner Revenue)</p>
                <p className="text-sm text-gray-600">Users spend points at partners. Partners receive payment directly from customers. Platform does NOT take commission.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2"></div>
              <div>
                <p className="font-semibold text-gray-900">No Partner Payouts</p>
                <p className="text-sm text-gray-600">Platform does not handle partner payouts. Users pay partners directly via reservations.</p>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t-2 border-gray-200">
            <p className="text-sm font-semibold text-gray-900">Revenue Calculation:</p>
            <p className="text-sm text-gray-700 mt-2 font-mono bg-gray-50 p-3 rounded border border-gray-200">Total Revenue (₾) = SUM(point_transactions WHERE reason = 'POINTS_PURCHASED') ÷ 100</p>
            <div className="mt-3 p-3 bg-teal-50 rounded-lg border border-teal-200">
              <p className="text-sm text-teal-900 font-medium">💡 Conversion Rate: <span className="font-bold">100 points = 1 ₾ (Georgian Lari)</span></p>
              <p className="text-xs text-teal-700 mt-1">All financial calculations use this fixed conversion rate.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
