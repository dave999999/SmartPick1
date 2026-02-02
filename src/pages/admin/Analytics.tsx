/**
 * Analytics Module ★ NEW
 * Comprehensive analytics dashboard with growth, revenue, and behavioral metrics
 * 
 * Features:
 * - Growth metrics (DAU, WAU, MAU, signups)
 * - Reservation metrics (volume, pickup rate, trends)
 * - Revenue metrics (GMV, commission, AOV)
 * - Geo analytics (cities, heatmaps)
 * - Behavioral analytics (categories, peak times)
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart3,
  TrendingUp,
  Users,
  ShoppingCart,
  DollarSign,
  MapPin,
  Clock,
  RefreshCw,
  Download,
  Calendar,
  TrendingDown,
  Package,
} from 'lucide-react';
import {
  useGrowthMetrics,
  useReservationMetrics,
  useRevenueMetrics,
  useGeoMetrics,
  useBehavioralMetrics,
} from '@/hooks/admin/useAnalytics';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function Analytics() {
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  // Fetch all analytics data
  const { data: growthData, isLoading: loadingGrowth, refetch: refetchGrowth } = useGrowthMetrics();
  const { data: reservationData, isLoading: loadingReservations, refetch: refetchReservations } = useReservationMetrics();
  const { data: revenueData, isLoading: loadingRevenue, refetch: refetchRevenue } = useRevenueMetrics();
  const { data: geoData, isLoading: loadingGeo, refetch: refetchGeo } = useGeoMetrics();
  const { data: behavioralData, isLoading: loadingBehavioral, refetch: refetchBehavioral } = useBehavioralMetrics();

  const isLoading = loadingGrowth || loadingReservations || loadingRevenue || loadingGeo || loadingBehavioral;

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchGrowth(),
      refetchReservations(),
      refetchRevenue(),
      refetchGeo(),
      refetchBehavioral(),
    ]);
    setRefreshing(false);
  };

  const handleExport = () => {
    // TODO: Implement CSV export
    console.log('Export analytics data');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Analytics</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
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
          <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Comprehensive platform metrics and insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
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

      {/* Growth Metrics */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-teal-600" />
          Growth Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Daily Active Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{growthData?.dau.toLocaleString()}</div>
              <p className="text-xs text-gray-500 mt-1">Users active today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Weekly Active Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{growthData?.wau.toLocaleString()}</div>
              <p className="text-xs text-gray-500 mt-1">Users in last 7 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Monthly Active Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{growthData?.mau.toLocaleString()}</div>
              <p className="text-xs text-gray-500 mt-1">Users in last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                New Users (Month)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{growthData?.newUsersMonth.toLocaleString()}</div>
              <p className="text-xs text-gray-500 mt-1">Signups in last 30 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Signup Trend Chart */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">User Signups (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-2">
              {growthData?.signupTrend.map((day, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-teal-500 rounded-t-sm transition-all hover:bg-teal-600"
                    style={{
                      height: `${(day.count / Math.max(...growthData.signupTrend.map(d => d.count))) * 100}%`,
                      minHeight: day.count > 0 ? '4px' : '0',
                    }}
                  />
                  {idx % 5 === 0 && (
                    <span className="text-xs text-gray-500 mt-2">{day.date}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reservation Metrics */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-blue-600" />
          Reservation Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Reservations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {reservationData?.totalReservations.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pickup Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {reservationData?.pickupRate.toFixed(1)}%
              </div>
              <p className="text-xs text-gray-500 mt-1">Successful pickups</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Avg Time to Pickup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {reservationData?.avgTimeToPickup.toFixed(0)} min
              </div>
              <p className="text-xs text-gray-500 mt-1">From reservation to pickup</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                No-Shows
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {reservationData?.noShowCount.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">Total no-shows</p>
            </CardContent>
          </Card>
        </div>

        {/* Reservation Trend Chart */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Reservation Volume (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-2">
              {reservationData?.reservationTrend.map((day, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-blue-500 rounded-t-sm transition-all hover:bg-blue-600"
                    style={{
                      height: `${(day.count / Math.max(...reservationData.reservationTrend.map(d => d.count))) * 100}%`,
                      minHeight: day.count > 0 ? '4px' : '0',
                    }}
                  />
                  {idx % 5 === 0 && (
                    <span className="text-xs text-gray-500 mt-2">{day.date}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Metrics */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          Revenue Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total GMV
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                ₾{revenueData?.totalGMV.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-gray-500 mt-1">Gross Merchandise Value</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                ₾{revenueData?.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-gray-500 mt-1">15% commission</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Avg Order Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                ₾{revenueData?.avgOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-gray-500 mt-1">Per reservation</p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue by Partner Table */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Top Partners by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Business Name</TableHead>
                  <TableHead className="text-right">GMV</TableHead>
                  <TableHead className="text-right">Revenue (15%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueData?.revenueByPartner.map((partner, idx) => (
                  <TableRow key={partner.partner_id}>
                    <TableCell>#{idx + 1}</TableCell>
                    <TableCell className="font-medium">{partner.business_name}</TableCell>
                    <TableCell className="text-right">
                      ₾{partner.gmv.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-semibold">
                      ₾{partner.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Revenue by Category */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Revenue by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {revenueData?.revenueByCategory.map((cat) => (
                <div key={cat.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <Package className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium">{cat.category}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">
                      ₾{cat.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{
                          width: `${(cat.revenue / (revenueData?.revenueByCategory[0]?.revenue || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Geo Analytics */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-purple-600" />
          Geographic Analytics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Cities by GMV</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {geoData?.topCitiesByGMV.map((city, idx) => (
                  <div key={city.city} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      <span className="text-sm font-medium">{city.city}</span>
                    </div>
                    <span className="text-sm font-semibold text-purple-600">
                      ₾{city.gmv.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Partners by City</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {geoData?.partnersByCity.slice(0, 10).map((city) => (
                  <div key={city.city} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{city.city}</span>
                    <Badge variant="outline">{city.count} partners</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Behavioral Analytics */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-600" />
          Behavioral Analytics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {behavioralData?.topCategories.slice(0, 5).map((cat) => (
                  <div key={cat.category} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{cat.category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">{cat.count}</span>
                      <Badge variant="secondary">{cat.percentage.toFixed(1)}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Peak Reservation Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-end justify-between gap-1">
                {behavioralData?.peakReservationHours.map((hour) => (
                  <div key={hour.hour} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-orange-500 rounded-t-sm"
                      style={{
                        height: `${(hour.count / Math.max(...behavioralData.peakReservationHours.map(h => h.count))) * 100}%`,
                        minHeight: hour.count > 0 ? '2px' : '0',
                      }}
                    />
                    {hour.hour % 3 === 0 && (
                      <span className="text-xs text-gray-500 mt-1">{hour.hour}h</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Avg Reservations per User
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {behavioralData?.avgReservationsPerUser.toFixed(1)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Lifetime average</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Repeat User Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {behavioralData?.repeatUserRate.toFixed(1)}%
              </div>
              <p className="text-xs text-gray-500 mt-1">Users with >1 reservation</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
