import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getUserGrowthStats, getTopPartners, getCategoryStats } from '@/lib/api/admin-advanced';
import type { UserGrowthData, TopPartner, CategoryStats, RevenueTrend, ReservationFunnel, BusinessMetrics } from '@/lib/types/admin';
import { lazy, Suspense } from 'react';
import { TrendingUp, DollarSign, Package, Activity } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Defer heavy chart.js bundle until panel actually rendered
const LineChartLib = lazy(async () => {
  const mod = await import('react-chartjs-2');
  const chartCore = await import('chart.js');
  chartCore.Chart.register(
    chartCore.CategoryScale,
    chartCore.LinearScale,
    chartCore.PointElement,
    chartCore.LineElement,
    chartCore.BarElement,
    chartCore.Tooltip,
    chartCore.Legend
  );
  return { default: mod.Line };
});

const BarChartLib = lazy(async () => {
  const mod = await import('react-chartjs-2');
  return { default: mod.Bar };
});

export default function AdminAnalyticsPanel() {
  const [growth, setGrowth] = useState<UserGrowthData[]>([]);
  const [topPartners, setTopPartners] = useState<TopPartner[]>([]);
  const [category, setCategory] = useState<CategoryStats[]>([]);
  const [revenueTrends, setRevenueTrends] = useState<RevenueTrend[]>([]);
  const [funnel, setFunnel] = useState<ReservationFunnel[]>([]);
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [limit, setLimit] = useState('10');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [g, tp, cs, rt, fn, bm] = await Promise.all([
        getUserGrowthStats(),
        getTopPartners(parseInt(limit, 10) || 10),
        getCategoryStats(),
        supabase.rpc('get_revenue_trends').then(r => r.data || []),
        supabase.rpc('get_reservation_funnel').then(r => r.data || []),
        supabase.rpc('get_business_metrics').then(r => r.data?.[0] || null),
      ]);
      setGrowth(g);
      setTopPartners(tp);
      setCategory(cs);
      setRevenueTrends(rt);
      setFunnel(fn);
      setMetrics(bm);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  const growthChart = {
    labels: growth.map((d) => d.date),
    datasets: [
      {
        label: 'New Users',
        data: growth.map((d) => d.new_users),
        borderColor: '#00C896',
        backgroundColor: 'rgba(0, 200, 150, 0.2)'
      },
      {
        label: 'Cumulative Users',
        data: growth.map((d) => d.cumulative_users),
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.2)'
      }
    ],
  };

  // Revenue Trends Chart
  const revenueChart = {
    labels: revenueTrends.slice().reverse().map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Daily Revenue',
        data: revenueTrends.slice().reverse().map(d => d.revenue),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.3,
      },
      {
        label: 'Pickups',
        data: revenueTrends.slice().reverse().map(d => d.pickup_count),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.3,
        yAxisID: 'y1',
      }
    ]
  };

  const revenueOptions = {
    responsive: true,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: { legend: { position: 'bottom' as const } },
    scales: {
      y: { type: 'linear' as const, display: true, position: 'left' as const, title: { display: true, text: 'Revenue ($)' } },
      y1: { type: 'linear' as const, display: true, position: 'right' as const, title: { display: true, text: 'Pickups' }, grid: { drawOnChartArea: false } }
    }
  };

  // Reservation Funnel Chart
  const funnelChart = {
    labels: funnel.map(f => f.status),
    datasets: [
      {
        label: 'Count',
        data: funnel.map(f => f.count),
        backgroundColor: ['rgba(59, 130, 246, 0.7)', 'rgba(34, 197, 94, 0.7)', 'rgba(239, 68, 68, 0.7)'],
      }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Business Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">Avg Order Value</p>
                <p className="text-2xl font-bold">${metrics.avg_order_value}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">Conversion Rate</p>
                <p className="text-2xl font-bold">{metrics.conversion_rate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">Revenue/Pickup</p>
                <p className="text-2xl font-bold">${metrics.revenue_per_pickup}</p>
              </div>
              <Package className="h-8 w-8 text-purple-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">Active Now</p>
                <p className="text-2xl font-bold">{metrics.active_reservations}</p>
              </div>
              <Activity className="h-8 w-8 text-orange-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Revenue Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trends (Last 30 Days)</CardTitle>
          <CardDescription>Daily revenue and pickup count</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-gray-500">Loading…</div>
          ) : (
            <Suspense fallback={<div className='py-10 text-center text-gray-400'>Loading chart…</div>}>
              <LineChartLib data={revenueChart} options={revenueOptions} />
            </Suspense>
          )}
        </CardContent>
      </Card>

      {/* Reservation Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Reservation Funnel (Last 30 Days)</CardTitle>
          <CardDescription>Distribution by status</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-gray-500">Loading…</div>
          ) : (
            <Suspense fallback={<div className='py-10 text-center text-gray-400'>Loading chart…</div>}>
              <BarChartLib data={funnelChart} options={{ responsive: true, plugins: { legend: { display: false } } }} />
            </Suspense>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>User Growth</CardTitle>
            <CardDescription>Last 30 days signups</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-gray-500">Loading…</div>
          ) : (
            <Suspense fallback={<div className='py-10 text-center text-gray-400'>Loading chart…</div>}>
              <LineChartLib data={growthChart} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
            </Suspense>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Top Partners</CardTitle>
              <CardDescription>Best performers by pickups/revenue</CardDescription>
            </div>
            <Select value={limit} onValueChange={setLimit}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Top 5</SelectItem>
                <SelectItem value="10">Top 10</SelectItem>
                <SelectItem value="20">Top 20</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-10 text-center text-gray-500">Loading…</div>
            ) : (
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Partner</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Pickups</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topPartners.map((p) => (
                      <TableRow key={p.partner_id}>
                        <TableCell className="font-medium">{p.business_name}</TableCell>
                        <TableCell>{(p.total_revenue ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</TableCell>
                        <TableCell>{p.total_pickups ?? 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Performance</CardTitle>
            <CardDescription>Completed pickups and revenue by category</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-10 text-center text-gray-500">Loading…</div>
            ) : (
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Pickups</TableHead>
                      <TableHead>Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {category.map((c) => (
                      <TableRow key={c.category}>
                        <TableCell className="font-medium">{c.category}</TableCell>
                        <TableCell>{c.total_pickups ?? 0}</TableCell>
                        <TableCell>{(c.total_revenue ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


