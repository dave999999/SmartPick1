/**
 * Revenue Module ★ NEW
 * Financial tracking, commission management, and partner payouts
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DollarSign, TrendingUp, Calendar, Download, RefreshCw } from 'lucide-react';
import {
  useRevenueOverview,
  usePartnerRevenue,
  useRevenueTrend,
  useRevenueByCategory,
} from '@/hooks/admin/useRevenue';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function Revenue() {
  const [refreshing, setRefreshing] = useState(false);

  const { data: overview, isLoading: loadingOverview, refetch: refetchOverview } = useRevenueOverview();
  const { data: partnerRevenue, isLoading: loadingPartners, refetch: refetchPartners } = usePartnerRevenue();
  const { data: trend, isLoading: loadingTrend, refetch: refetchTrend } = useRevenueTrend();
  const { data: categoryRevenue, isLoading: loadingCategories, refetch: refetchCategories } = useRevenueByCategory();

  const isLoading = loadingOverview || loadingPartners || loadingTrend || loadingCategories;

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchOverview(), refetchPartners(), refetchTrend(), refetchCategories()]);
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Revenue</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-32"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Revenue Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Financial tracking and commission management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total GMV
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              ₾{overview?.totalGMV.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500 mt-1">Gross Merchandise Value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Commission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              ₾{overview?.totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500 mt-1">15% commission earned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Avg Commission/Transaction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              ₾{overview?.avgCommissionPerTransaction.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500 mt-1">Per completed reservation</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue Trend (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between gap-2">
            {trend?.map((day, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-green-500 rounded-t-sm transition-all hover:bg-green-600"
                  style={{
                    height: `${(day.commission / Math.max(...trend.map(d => d.commission))) * 100}%`,
                    minHeight: day.commission > 0 ? '4px' : '0',
                  }}
                  title={`${day.date}: ₾${day.commission.toFixed(2)}`}
                />
                {idx % 5 === 0 && (
                  <span className="text-xs text-gray-500 mt-2">{day.date}</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Partner Revenue Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue by Partner</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Business Name</TableHead>
                <TableHead className="text-right">Reservations</TableHead>
                <TableHead className="text-right">Total GMV</TableHead>
                <TableHead className="text-right">Commission (15%)</TableHead>
                <TableHead className="text-right">Last Payout</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partnerRevenue?.map((partner, idx) => (
                <TableRow key={partner.partner_id}>
                  <TableCell>
                    <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{partner.business_name}</TableCell>
                  <TableCell className="text-right">{partner.reservationCount}</TableCell>
                  <TableCell className="text-right">
                    ₾{partner.totalGMV.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right text-green-600 font-semibold">
                    ₾{partner.totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right text-sm text-gray-500">
                    {partner.lastPayoutDate ? format(new Date(partner.lastPayoutDate), 'MMM dd, yyyy') : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={partner.pendingAmount > 0 ? "destructive" : "secondary"}>
                      {partner.pendingAmount > 0 ? 'Pending' : 'Paid'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Revenue by Category */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categoryRevenue?.map((cat) => (
              <div key={cat.category} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{cat.category}</span>
                    <span className="text-sm text-gray-600">
                      ₾{cat.commission.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{
                        width: `${(cat.commission / (categoryRevenue[0]?.commission || 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">{cat.count} transactions</span>
                    <span className="text-xs text-gray-500">
                      GMV: ₾{cat.gmv.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payout Management Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payout Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">
              Payout management requires the partner_payouts table.
            </p>
            <p className="text-xs mt-1">
              Run the database migration to enable this feature.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
