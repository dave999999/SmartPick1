import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { getUserGrowthStats, getTopPartners, getCategoryStats } from '@/lib/api/admin-advanced';
import type { 
  UserGrowthData, TopPartner, CategoryStats, RevenueTrend, ReservationFunnel, BusinessMetrics,
  PeakHour, DayOfWeekStat, MonthOverMonthGrowth, PartnerHealthScore, UserBehaviorStat,
  RevenueByCategoryTrend, TimeToPickupStats, CancellationStats, TopGrowingPartner, RevenueByLocation
} from '@/lib/types/admin';
import { lazy, Suspense } from 'react';
import { 
  TrendingUp, DollarSign, Package, Activity, Download, Calendar, 
  Clock, Users, MapPin, AlertCircle, Star, BarChart3, TrendingDown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Defer heavy chart.js bundle
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
    chartCore.Legend,
    chartCore.ArcElement
  );
  return { default: mod.Line };
});

const BarChartLib = lazy(async () => {
  const mod = await import('react-chartjs-2');
  return { default: mod.Bar };
});

const DoughnutChartLib = lazy(async () => {
  const mod = await import('react-chartjs-2');
  return { default: mod.Doughnut };
});

export default function AdminAnalyticsPanel() {
  // Original states
  const [growth, setGrowth] = useState<UserGrowthData[]>([]);
  const [topPartners, setTopPartners] = useState<TopPartner[]>([]);
  const [category, setCategory] = useState<CategoryStats[]>([]);
  const [revenueTrends, setRevenueTrends] = useState<RevenueTrend[]>([]);
  const [funnel, setFunnel] = useState<ReservationFunnel[]>([]);
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  
  // New advanced analytics states
  const [peakHours, setPeakHours] = useState<PeakHour[]>([]);
  const [dayOfWeekStats, setDayOfWeekStats] = useState<DayOfWeekStat[]>([]);
  const [momGrowth, setMomGrowth] = useState<MonthOverMonthGrowth[]>([]);
  const [partnerHealth, setPartnerHealth] = useState<PartnerHealthScore[]>([]);
  const [userBehavior, setUserBehavior] = useState<UserBehaviorStat[]>([]);
  const [categoryTrends, setCategoryTrends] = useState<RevenueByCategoryTrend[]>([]);
  const [timeToPickup, setTimeToPickup] = useState<TimeToPickupStats | null>(null);
  const [cancellationStats, setCancellationStats] = useState<CancellationStats | null>(null);
  const [growingPartners, setGrowingPartners] = useState<TopGrowingPartner[]>([]);
  const [locationRevenue, setLocationRevenue] = useState<RevenueByLocation[]>([]);
  
  const [limit, setLimit] = useState('10');
  const [dateRange, setDateRange] = useState('30');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const load = async () => {
    setLoading(true);
    try {
      const [
        g, tp, cs, rt, fn, bm,
        ph, dw, mom, phs, ub, ct, ttp, cst, gp, lr
      ] = await Promise.all([
        // Original
        getUserGrowthStats(),
        getTopPartners(parseInt(limit, 10) || 10),
        getCategoryStats(),
        supabase.rpc('get_revenue_trends').then(r => r.data || []),
        supabase.rpc('get_reservation_funnel').then(r => r.data || []),
        supabase.rpc('get_business_metrics').then(r => r.data?.[0] || null),
        // New
        supabase.rpc('get_peak_hours').then(r => r.data || []),
        supabase.rpc('get_day_of_week_stats').then(r => r.data || []),
        supabase.rpc('get_month_over_month_growth').then(r => r.data || []),
        supabase.rpc('get_partner_health_scores').then(r => r.data || []),
        supabase.rpc('get_user_behavior_stats').then(r => r.data || []),
        supabase.rpc('get_revenue_by_category_trends').then(r => r.data || []),
        supabase.rpc('get_time_to_pickup_stats').then(r => r.data?.[0] || null),
        supabase.rpc('get_cancellation_stats').then(r => r.data?.[0] || null),
        supabase.rpc('get_top_growing_partners').then(r => r.data || []),
        supabase.rpc('get_revenue_by_location').then(r => r.data || []),
      ]);
      
      setGrowth(g);
      setTopPartners(tp);
      setCategory(cs);
      setRevenueTrends(rt);
      setFunnel(fn);
      setMetrics(bm);
      setPeakHours(ph);
      setDayOfWeekStats(dw);
      setMomGrowth(mom);
      setPartnerHealth(phs);
      setUserBehavior(ub);
      setCategoryTrends(ct);
      setTimeToPickup(ttp);
      setCancellationStats(cst);
      setGrowingPartners(gp);
      setLocationRevenue(lr);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [limit, dateRange]);

  // Chart data preparations
  const growthChart = {
    labels: growth.map((d) => d.date),
    datasets: [
      {
        label: 'New Users',
        data: growth.map((d) => d.new_users),
        borderColor: '#00C896',
        backgroundColor: 'rgba(0, 200, 150, 0.2)',
        tension: 0.3,
      },
      {
        label: 'Cumulative Users',
        data: growth.map((d) => d.cumulative_users),
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.2)',
        tension: 0.3,
      }
    ],
  };

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

  const funnelChart = {
    labels: funnel.map(f => f.status),
    datasets: [{
      label: 'Reservations',
      data: funnel.map(f => f.count),
      backgroundColor: ['rgba(59, 130, 246, 0.7)', 'rgba(34, 197, 94, 0.7)', 'rgba(239, 68, 68, 0.7)'],
    }]
  };

  const peakHoursChart = {
    labels: peakHours.map(h => `${h.hour}:00`),
    datasets: [{
      label: 'Reservations by Hour',
      data: peakHours.map(h => h.reservation_count),
      backgroundColor: 'rgba(147, 51, 234, 0.7)',
      borderColor: 'rgb(147, 51, 234)',
      borderWidth: 1,
    }]
  };

  const dayOfWeekChart = {
    labels: dayOfWeekStats.map(d => d.day_name.trim()),
    datasets: [
      {
        label: 'Revenue',
        data: dayOfWeekStats.map(d => d.revenue),
        backgroundColor: 'rgba(34, 197, 94, 0.7)',
        yAxisID: 'y',
      },
      {
        label: 'Orders',
        data: dayOfWeekStats.map(d => d.reservation_count),
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        yAxisID: 'y1',
      }
    ]
  };

  const dayOfWeekOptions = {
    responsive: true,
    plugins: { legend: { position: 'bottom' as const } },
    scales: {
      y: { type: 'linear' as const, display: true, position: 'left' as const, title: { display: true, text: 'Revenue ($)' } },
      y1: { type: 'linear' as const, display: true, position: 'right' as const, title: { display: true, text: 'Orders' }, grid: { drawOnChartArea: false } }
    }
  };

  const exportData = () => {
    const data = {
      businessMetrics: metrics,
      revenueTrends,
      funnel,
      userGrowth: growth,
      topPartners,
      categoryStats: category,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-export-${new Date().toISOString()}.json`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={exportData} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Business Metrics Cards with Trends */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">Avg Order Value</p>
                <p className="text-2xl font-bold">${metrics.avg_order_value}</p>
                {momGrowth.find(m => m.metric_name === 'Revenue') && (
                  <p className="text-xs text-green-600 flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {momGrowth.find(m => m.metric_name === 'Revenue')?.growth_rate}% MoM
                  </p>
                )}
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">Conversion Rate</p>
                <p className="text-2xl font-bold">{metrics.conversion_rate}%</p>
                {momGrowth.find(m => m.metric_name === 'Pickups') && (
                  <p className="text-xs text-green-600 flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {momGrowth.find(m => m.metric_name === 'Pickups')?.growth_rate}% MoM
                  </p>
                )}
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">Revenue/Pickup</p>
                <p className="text-2xl font-bold">${metrics.revenue_per_pickup}</p>
              </div>
              <Package className="h-8 w-8 text-purple-500" />
            </div>
          </Card>
          <Card className="p-4 hover:shadow-md transition-shadow">
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

      {/* Tabbed Analytics */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="partners">Partners</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          {/* Month over Month Growth */}
          {momGrowth.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Month-over-Month Growth</CardTitle>
                <CardDescription>Current vs previous month comparison</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {momGrowth.map(m => (
                    <div key={m.metric_name} className="p-4 border rounded-lg">
                      <p className="text-sm text-gray-500">{m.metric_name}</p>
                      <div className="flex items-baseline gap-2 mt-2">
                        <p className="text-2xl font-bold">{m.current_month.toLocaleString()}</p>
                        <p className="text-sm text-gray-400">from {m.previous_month.toLocaleString()}</p>
                      </div>
                      <p className={`text-sm mt-1 flex items-center ${m.growth_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {m.growth_rate >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                        {Math.abs(m.growth_rate)}% {m.growth_rate >= 0 ? 'increase' : 'decrease'}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Reservation Funnel</CardTitle>
                <CardDescription>Status distribution (Last 30 Days)</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="py-10 text-center text-gray-500">Loading…</div>
                ) : (
                  <>
                    <Suspense fallback={<div className='py-10 text-center text-gray-400'>Loading chart…</div>}>
                      <BarChartLib data={funnelChart} options={{ responsive: true, plugins: { legend: { display: false } } }} />
                    </Suspense>
                    <div className="mt-4 space-y-2">
                      {funnel.map(f => (
                        <div key={f.status} className="flex items-center justify-between text-sm">
                          <span className="font-medium">{f.status}</span>
                          <div className="flex items-center gap-4">
                            <span>{f.count} orders</span>
                            <span className="text-green-600">${f.revenue.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Cancellation Stats */}
            {cancellationStats && (
              <Card>
                <CardHeader>
                  <CardTitle>Cancellation Analysis</CardTitle>
                  <CardDescription>Understanding drop-offs</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-600">Total Cancelled</p>
                        <p className="text-2xl font-bold text-red-600">{cancellationStats.total_cancelled}</p>
                      </div>
                      <AlertCircle className="h-8 w-8 text-red-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 border rounded-lg">
                        <p className="text-xs text-gray-500">Cancellation Rate</p>
                        <p className="text-xl font-bold">{cancellationStats.cancellation_rate}%</p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-xs text-gray-500">Revenue Loss</p>
                        <p className="text-xl font-bold text-red-600">${cancellationStats.cancelled_revenue_loss}</p>
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Avg Time Before Cancellation</p>
                      <p className="text-lg font-semibold">{cancellationStats.avg_time_before_cancellation_hours.toFixed(1)} hours</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* REVENUE TAB */}
        <TabsContent value="revenue" className="space-y-6">
          {/* Day of Week Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Performance by Day of Week</CardTitle>
              <CardDescription>Revenue and order patterns</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-10 text-center text-gray-500">Loading…</div>
              ) : (
                <Suspense fallback={<div className='py-10 text-center text-gray-400'>Loading chart…</div>}>
                  <BarChartLib data={dayOfWeekChart} options={dayOfWeekOptions} />
                </Suspense>
              )}
            </CardContent>
          </Card>

          {/* Peak Hours */}
          <Card>
            <CardHeader>
              <CardTitle>Peak Hours Analysis</CardTitle>
              <CardDescription>Hourly reservation patterns (Last 30 Days)</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-10 text-center text-gray-500">Loading…</div>
              ) : (
                <Suspense fallback={<div className='py-10 text-center text-gray-400'>Loading chart…</div>}>
                  <BarChartLib data={peakHoursChart} options={{ responsive: true, plugins: { legend: { display: false } } }} />
                </Suspense>
              )}
            </CardContent>
          </Card>

          {/* Category Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Category Performance</CardTitle>
                <CardDescription>Revenue by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Pickups</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Avg Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {category.map((c) => (
                        <TableRow key={c.category}>
                          <TableCell className="font-medium">{c.category}</TableCell>
                          <TableCell>{c.total_pickups ?? 0}</TableCell>
                          <TableCell>{(c.total_revenue ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</TableCell>
                          <TableCell>{(c.avg_price ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Revenue by Location */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Location</CardTitle>
                <CardDescription>Geographic distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {locationRevenue.slice(0, 5).map((loc) => (
                    <div key={loc.location} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-medium">{loc.location}</p>
                          <p className="text-xs text-gray-500">{loc.partner_count} partners</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">${loc.total_revenue.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{loc.total_pickups} pickups</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* USERS TAB */}
        <TabsContent value="users" className="space-y-6">
          {/* User Growth */}
          <Card>
            <CardHeader>
              <CardTitle>User Growth</CardTitle>
              <CardDescription>New users and cumulative growth</CardDescription>
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

          {/* User Behavior Stats */}
          {userBehavior.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>User Behavior Insights</CardTitle>
                <CardDescription>Understanding customer patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {userBehavior.map(stat => (
                    <div key={stat.metric_name} className="p-4 border rounded-lg hover:bg-gray-50">
                      <p className="text-xs text-gray-500">{stat.metric_name}</p>
                      <p className="text-2xl font-bold mt-1">
                        {stat.metric_name.includes('%') ? `${stat.value}%` : stat.value.toFixed(1)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* PARTNERS TAB */}
        <TabsContent value="partners" className="space-y-6">
          {/* Top Growing Partners */}
          {growingPartners.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Growing Partners</CardTitle>
                <CardDescription>Biggest month-over-month growth</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Partner</TableHead>
                        <TableHead>Current Month</TableHead>
                        <TableHead>Previous Month</TableHead>
                        <TableHead>Growth</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {growingPartners.map((p) => (
                        <TableRow key={p.partner_id}>
                          <TableCell className="font-medium">{p.business_name}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-semibold">${p.current_month_revenue.toLocaleString()}</p>
                              <p className="text-xs text-gray-500">{p.current_month_pickups} pickups</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p>${p.previous_month_revenue.toLocaleString()}</p>
                              <p className="text-xs text-gray-500">{p.previous_month_pickups} pickups</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`flex items-center font-bold ${p.growth_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {p.growth_rate >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                              {Math.abs(p.growth_rate)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Partner Health Scores */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>Partner Health Dashboard</CardTitle>
                <CardDescription>Performance scoring and insights</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Partner</TableHead>
                      <TableHead>Health Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Completion Rate</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partnerHealth.slice(0, 15).map((p) => (
                      <TableRow key={p.partner_id}>
                        <TableCell className="font-medium">{p.business_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${
                                  p.health_score >= 80 ? 'bg-green-500' :
                                  p.health_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${p.health_score}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold">{p.health_score}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            p.status === 'Excellent' ? 'bg-green-100 text-green-800' :
                            p.status === 'Good' ? 'bg-blue-100 text-blue-800' :
                            p.status === 'Needs Attention' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {p.status}
                          </span>
                        </TableCell>
                        <TableCell>{p.completion_rate}%</TableCell>
                        <TableCell>${p.revenue_30d.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            <span>{p.avg_rating.toFixed(1)}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Top Partners by Revenue */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>Top Partners</CardTitle>
                <CardDescription>Best performers by revenue</CardDescription>
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
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Partner</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Pickups</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topPartners.map((p, idx) => (
                      <TableRow key={p.partner_id}>
                        <TableCell className="font-bold">{idx + 1}</TableCell>
                        <TableCell className="font-medium">{p.business_name}</TableCell>
                        <TableCell className="text-green-600 font-semibold">
                          {(p.total_revenue ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                        </TableCell>
                        <TableCell>{p.total_pickups ?? 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OPERATIONS TAB */}
        <TabsContent value="operations" className="space-y-6">
          {/* Time to Pickup Stats */}
          {timeToPickup && (
            <Card>
              <CardHeader>
                <CardTitle>Pickup Time Analysis</CardTitle>
                <CardDescription>How fast are orders completed?</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-5 w-5 text-blue-500" />
                      <p className="text-xs text-gray-500">Average</p>
                    </div>
                    <p className="text-2xl font-bold">{timeToPickup.avg_hours_to_pickup.toFixed(1)}h</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="h-5 w-5 text-purple-500" />
                      <p className="text-xs text-gray-500">Median</p>
                    </div>
                    <p className="text-2xl font-bold">{timeToPickup.median_hours_to_pickup.toFixed(1)}h</p>
                  </div>
                  <div className="p-4 border rounded-lg bg-green-50">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      <p className="text-xs text-gray-500">Fastest</p>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{timeToPickup.fastest_pickup_hours.toFixed(1)}h</p>
                  </div>
                  <div className="p-4 border rounded-lg bg-red-50">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="h-5 w-5 text-red-500" />
                      <p className="text-xs text-gray-500">Slowest</p>
                    </div>
                    <p className="text-2xl font-bold text-red-600">{timeToPickup.slowest_pickup_hours.toFixed(1)}h</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Combined Operational Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current funnel (moved here) */}
            <Card>
              <CardHeader>
                <CardTitle>Current Status Overview</CardTitle>
                <CardDescription>Real-time reservation states</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {funnel.map(f => (
                    <div key={f.status} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className={`font-medium ${
                        f.status === 'ACTIVE' ? 'text-blue-600' :
                        f.status === 'PICKED_UP' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {f.status}
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="font-bold">{f.count}</span>
                        <span className="text-sm text-gray-500">${f.revenue.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Cancellation card (moved here) */}
            {cancellationStats && (
              <Card>
                <CardHeader>
                  <CardTitle>Cancellation Details</CardTitle>
                  <CardDescription>Impact and patterns</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-red-50 rounded-lg">
                        <p className="text-xs text-gray-600">Total Cancelled</p>
                        <p className="text-2xl font-bold text-red-600">{cancellationStats.total_cancelled}</p>
                      </div>
                      <div className="p-3 bg-red-50 rounded-lg">
                        <p className="text-xs text-gray-600">Rate</p>
                        <p className="text-2xl font-bold text-red-600">{cancellationStats.cancellation_rate}%</p>
                      </div>
                    </div>
                    <div className="p-4 border-2 border-red-200 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Potential Revenue Loss</p>
                      <p className="text-3xl font-bold text-red-600">${cancellationStats.cancelled_revenue_loss.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Avg Time to Cancellation</p>
                      <p className="text-lg font-semibold">{cancellationStats.avg_time_before_cancellation_hours.toFixed(1)} hours</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
