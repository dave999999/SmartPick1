import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Package, DollarSign, Clock, Star, ShoppingBag } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Offer, Reservation } from '@/lib/types';

interface PartnerAnalyticsProps {
  offers: Offer[];
  allReservations: Reservation[]; // Include all reservations (not just active)
  revenue: number;
}

export default function PartnerAnalytics({ offers, allReservations, revenue }: PartnerAnalyticsProps) {
  const { t } = useI18n();

  // Calculate analytics metrics
  const totalOffers = offers.length;
  const activeOffers = offers.filter(o => o.status === 'ACTIVE').length;
  const totalReservations = allReservations.length;
  const completedReservations = allReservations.filter(r => r.status === 'PICKED_UP').length;
  const cancelledReservations = allReservations.filter(r => r.status === 'CANCELLED').length;
  const completionRate = totalReservations > 0 ? Math.round((completedReservations / totalReservations) * 100) : 0;
  const averageOrderValue = completedReservations > 0 ? (revenue / completedReservations).toFixed(2) : '0.00';

  // Most popular items (top 5)
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

  // Peak hours analysis (group by hour)
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

  // Recent 7 days revenue trend
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

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="w-4 h-4" />
              {t('Total Offers')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOffers}</div>
            <p className="text-xs text-muted-foreground mt-1">{activeOffers} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              {t('Total Orders')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReservations}</div>
            <p className="text-xs text-muted-foreground mt-1">{completedReservations} completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              {t('Total Revenue')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₾{revenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Avg: ₾{averageOrderValue}/order</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Star className="w-4 h-4" />
              {t('Completion Rate')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">{cancelledReservations} cancelled</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend (Last 7 Days) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {t('Revenue Trend (Last 7 Days)')}
          </CardTitle>
          <CardDescription>{t('Daily revenue over the past week')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {last7Days.map(day => {
              const dayRevenue = dailyRevenue[day] || 0;
              const barWidth = maxRevenue > 0 ? (dayRevenue / maxRevenue) * 100 : 0;
              const dayName = new Date(day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              
              return (
                <div key={day} className="flex items-center gap-3">
                  <div className="w-24 text-sm text-muted-foreground">{dayName}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#00C896] to-[#009B77] h-full flex items-center justify-end pr-2 transition-all duration-300"
                      style={{ width: `${barWidth}%` }}
                    >
                      {dayRevenue > 0 && (
                        <span className="text-white text-xs font-semibold">₾{dayRevenue.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              {t('Top Selling Items')}
            </CardTitle>
            <CardDescription>{t('Most popular offers by quantity sold')}</CardDescription>
          </CardHeader>
          <CardContent>
            {topItems.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t('No sales data yet')}</p>
            ) : (
              <div className="space-y-3">
                {topItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-[#F9FFFB] to-[#EFFFF8] rounded-lg border border-[#DFF5ED]">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-[#00C896] to-[#009B77] text-white rounded-full flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.count} units sold</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#00C896]">₾{item.revenue.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Peak Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {t('Peak Hours')}
            </CardTitle>
            <CardDescription>{t('Busiest times for pickups')}</CardDescription>
          </CardHeader>
          <CardContent>
            {peakHours.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t('No pickup data yet')}</p>
            ) : (
              <div className="space-y-3">
                {peakHours.map((peak, index) => {
                  const timeStr = `${peak.hour.toString().padStart(2, '0')}:00 - ${((peak.hour + 1) % 24).toString().padStart(2, '0')}:00`;
                  const maxOrders = peakHours[0].count;
                  const barWidth = (peak.count / maxOrders) * 100;
                  
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{timeStr}</span>
                        <span className="text-muted-foreground">{peak.count} orders</span>
                      </div>
                      <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-300"
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

