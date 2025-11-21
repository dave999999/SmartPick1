import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Package, Clock } from 'lucide-react';
import { Offer, Reservation } from '@/lib/types';

interface PartnerAnalyticsProps {
  offers: Offer[];
  allReservations: Reservation[];
  revenue: number;
}

export default function PartnerAnalytics({ offers, allReservations, revenue }: PartnerAnalyticsProps) {
  // Calculate metrics
  const totalReservations = allReservations.length;
  const completedReservations = allReservations.filter(r => r.status === 'PICKED_UP').length;
  const cancelledReservations = allReservations.filter(r => r.status === 'CANCELLED').length;
  const completionRate = totalReservations > 0 ? Math.round((completedReservations / totalReservations) * 100) : 0;
  const averageOrderValue = completedReservations > 0 ? (revenue / completedReservations) : 0;

  // Top selling items
  const offerSalesMap: Record<string, { title: string; count: number; revenue: number }> = {};
  allReservations.forEach(res => {
    if (res.status === 'PICKED_UP') {
      const key = res.offer_id;
      if (!offerSalesMap[key]) {
        offerSalesMap[key] = {
          title: res.offer?.title || 'Unknown Offer',
          count: 0,
          revenue: 0,
        };
      }
      offerSalesMap[key].count += res.quantity;
      offerSalesMap[key].revenue += res.total_price;
    }
  });
  const topItems = Object.values(offerSalesMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Peak hours
  const hourlyOrders: Record<number, number> = {};
  allReservations.forEach(res => {
    if (res.status === 'PICKED_UP') {
      const hour = new Date(res.created_at).getHours();
      hourlyOrders[hour] = (hourlyOrders[hour] || 0) + 1;
    }
  });
  const peakHours = Object.entries(hourlyOrders)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([hour, count]) => ({ hour: parseInt(hour), count }));

  // 7-day revenue trend
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  }).reverse();

  const dailyRevenue: Record<string, number> = {};
  allReservations.forEach(res => {
    if (res.status === 'PICKED_UP') {
      const day = res.created_at.split('T')[0];
      if (last7Days.includes(day)) {
        dailyRevenue[day] = (dailyRevenue[day] || 0) + res.total_price;
      }
    }
  });

  const maxRevenue = Math.max(...Object.values(dailyRevenue), 1);
  const revenueValues = last7Days.map(day => dailyRevenue[day] || 0);
  const avgRevenue = revenueValues.reduce((a, b) => a + b, 0) / 7;
  const todayRevenue = revenueValues[revenueValues.length - 1] || 0;
  const yesterdayRevenue = revenueValues[revenueValues.length - 2] || 0;
  const revenueTrend = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Key Metrics - Compact */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Completion Rate */}
        <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Success</span>
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{completionRate}%</p>
            <p className="text-xs text-gray-600 mt-1">{completedReservations}/{totalReservations} completed</p>
          </CardContent>
        </Card>

        {/* Average Order */}
        <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Avg Order</span>
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">₾{averageOrderValue.toFixed(2)}</p>
            <p className="text-xs text-gray-600 mt-1">Per reservation</p>
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Trend</span>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                revenueTrend >= 0 ? 'bg-emerald-100' : 'bg-red-100'
              }`}>
                {revenueTrend >= 0 ? <TrendingUp className="w-5 h-5 text-emerald-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />}
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{revenueTrend >= 0 ? '+' : ''}{revenueTrend.toFixed(1)}%</p>
            <p className="text-xs text-gray-600 mt-1">vs yesterday</p>
          </CardContent>
        </Card>

        {/* Cancelled */}
        <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Cancelled</span>
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <span className="text-orange-600 text-lg font-bold">✕</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{cancelledReservations}</p>
            <p className="text-xs text-gray-600 mt-1">{totalReservations > 0 ? Math.round((cancelledReservations/totalReservations)*100) : 0}% of total</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart - Minimal */}
      <Card className="border border-gray-200 shadow-sm bg-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-gray-900">7-Day Revenue</h3>
              <p className="text-sm text-gray-600 mt-1">Daily average: ₾{avgRevenue.toFixed(2)}</p>
            </div>
          </div>

          <div className="space-y-3">
            {last7Days.map((day, index) => {
              const dayRevenue = dailyRevenue[day] || 0;
              const barWidth = maxRevenue > 0 ? (dayRevenue / maxRevenue) * 100 : 0;
              const dayName = new Date(day).toLocaleDateString('en-US', { weekday: 'short' });
              const isToday = index === last7Days.length - 1;

              return (
                <div key={day} className="flex items-center gap-3">
                  <div className={`w-10 text-xs font-medium ${isToday ? 'text-teal-600' : 'text-gray-500'}`}>
                    {dayName}
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-7 overflow-hidden">
                    <div
                      className={`h-full flex items-center justify-end pr-3 transition-all duration-500 ${
                        isToday
                          ? 'bg-gradient-to-r from-teal-400 to-teal-500'
                          : 'bg-gradient-to-r from-gray-300 to-gray-400'
                      }`}
                      style={{ width: `${Math.max(barWidth, 2)}%` }}
                    >
                      {dayRevenue > 0 && (
                        <span className={`text-xs font-semibold ${isToday ? 'text-white' : 'text-gray-700'}`}>
                          ₾{dayRevenue.toFixed(0)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Items - Compact */}
        <Card className="border border-gray-200 shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-teal-100">
                <Package className="w-5 h-5 text-teal-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Top Selling</h3>
            </div>

            {topItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400">No sales yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {topItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-teal-50/50 to-transparent rounded-lg hover:from-teal-50 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm truncate">{item.title}</p>
                        <p className="text-xs text-gray-500">{item.count} sold</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="font-bold text-teal-600 text-sm">₾{item.revenue.toFixed(0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Peak Hours - Compact */}
        <Card className="border border-gray-200 shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-orange-100">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Peak Hours</h3>
            </div>

            {peakHours.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400">No pickup data</p>
              </div>
            ) : (
              <div className="space-y-3">
                {peakHours.map((peak, index) => {
                  const timeStr = `${peak.hour.toString().padStart(2, '0')}:00`;
                  const maxOrders = peakHours[0].count;
                  const barWidth = (peak.count / maxOrders) * 100;

                  return (
                    <div key={index} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{timeStr}</span>
                        <span className="text-xs text-gray-500">{peak.count} orders</span>
                      </div>
                      <div className="bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-orange-400 to-orange-500 h-full transition-all duration-500 rounded-full"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
