import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Download, TrendingUp, Users, ShoppingCart } from 'lucide-react';
import { getPlatformRevenueStats, exportFinancialReport } from '@/lib/api/admin-advanced';
import type { RevenueStats } from '@/lib/types/admin';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export default function FinancialDashboardPanel() {
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const stats = await getPlatformRevenueStats(startDate.toISOString(), endDate.toISOString());
      setRevenueStats(stats);
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
        <p className="text-gray-600 mt-1">Platform revenue from point purchases (last 30 days)</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#00C896]">{revenueStats?.total_revenue.toFixed(2) || '0.00'}</div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1"><TrendingUp className="w-3 h-3" />From point purchases</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{revenueStats?.total_point_purchases || 0}</div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1"><ShoppingCart className="w-3 h-3" />Point purchase transactions</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Points Sold</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{revenueStats?.total_points_sold || 0}</div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1"><DollarSign className="w-3 h-3" />Total points purchased</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Purchase Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{revenueStats?.average_purchase_value.toFixed(0) || '0'}</div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1"><DollarSign className="w-3 h-3" />Points per purchase</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Unique Buyers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{revenueStats?.unique_buyers || 0}</div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1"><Users className="w-3 h-3" />Customers who bought points</div>
          </CardContent>
        </Card>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={handleExportReport}><Download className="w-4 h-4 mr-2" />Export Report (CSV)</Button>
      </div>
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
