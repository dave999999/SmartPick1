/**
 * Admin Dashboard Home Page
 * Overview page with KPIs, activity feed, and quick stats
 * 
 * Features:
 * - 4 main KPI cards (GMV, Revenue, Active Users, Pickup Rate)
 * - Real-time activity feed
 * - Quick stats row
 * - Revenue chart (7 days)
 * - User signups chart (30 days)
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ShoppingCart,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import { useQuery } from '@tanstack/react-query';

interface DashboardHomeProps {}

export function DashboardHome({}: DashboardHomeProps) {
  const [refreshing, setRefreshing] = useState(false);

  // Fetch real dashboard stats
  const { data: stats, isLoading: loading, refetch } = useQuery({
    queryKey: ['admin', 'dashboard-stats'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoISO = sevenDaysAgo.toISOString();

      // GMV and Revenue (Today)
      const { data: todayReservations } = await supabase
        .from('reservations')
        .select('total_price')
        .in('status', ['PICKED_UP', 'COMPLETED'])
        .gte('created_at', todayISO);

      const gmvToday = todayReservations?.reduce((sum, r) => sum + (r.total_price || 0), 0) || 0;
      const revenueToday = gmvToday * 0.15; // 15% commission

      // Active Users (Last 7 days)
      const { count: activeUsersCount } = await supabase
        .from('reservations')
        .select('customer_id', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgoISO);

      // Pickup Rate
      const { count: totalReservations } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true });

      const { count: pickedUpReservations } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .in('status', ['PICKED_UP', 'COMPLETED']);

      const pickupRate = totalReservations ? (pickedUpReservations! / totalReservations!) * 100 : 0;

      // Quick Stats
      const { count: newUsersToday } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayISO);

      const { count: activePartners } = await supabase
        .from('partners')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'APPROVED');

      const { count: pendingTickets } = await supabase
        .from('contact_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Expiring soon (next 6 hours)
      const sixHoursFromNow = new Date();
      sixHoursFromNow.setHours(sixHoursFromNow.getHours() + 6);
      const { count: expiringSoon } = await supabase
        .from('offers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ACTIVE')
        .lt('expires_at', sixHoursFromNow.toISOString())
        .gt('expires_at', new Date().toISOString());

      return {
        gmvToday,
        revenueToday,
        activeUsersCount: activeUsersCount || 0,
        pickupRate,
        newUsersToday: newUsersToday || 0,
        activePartners: activePartners || 0,
        pendingTickets: pendingTickets || 0,
        expiringSoon: expiringSoon || 0,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch recent activity
  const { data: activities = [] } = useQuery({
    queryKey: ['admin', 'recent-activity'],
    queryFn: async () => {
      const { data: recentReservations } = await supabase
        .from('reservations')
        .select(`
          id,
          created_at,
          status,
          users!reservations_customer_id_fkey(name),
          offers!inner(title),
          partners!inner(business_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      return recentReservations?.map(r => ({
        id: r.id,
        type: r.status === 'PICKED_UP' ? 'pickup' : 'reservation',
        user: r.users?.name || 'User',
        action: r.status === 'PICKED_UP' 
          ? `picked up ${r.offers?.title} from ${r.partners?.business_name}`
          : `reserved ${r.offers?.title} from ${r.partners?.business_name}`,
        time: formatTimeAgo(r.created_at),
        color: r.status === 'PICKED_UP' ? 'text-teal-600' : 'text-blue-600',
        icon: r.status === 'PICKED_UP' ? <CheckCircle className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />
      })) || [];
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const kpis = [
    {
      title: 'GMV (Today)',
      value: `₾${stats?.gmvToday.toFixed(2) || '0.00'}`,
      change: 0, // TODO: Calculate vs yesterday
      trend: 'up' as const,
      icon: <DollarSign className="h-4 w-4" />,
      description: 'Total reservation value'
    },
    {
      title: 'Revenue (Today)',
      value: `₾${stats?.revenueToday.toFixed(2) || '0.00'}`,
      change: 0,
      trend: 'up' as const,
      icon: <DollarSign className="h-4 w-4" />,
      description: '15% commission on pickups'
    },
    {
      title: 'Active Users',
      value: stats?.activeUsersCount.toString() || '0',
      change: 0,
      trend: 'up' as const,
      icon: <Users className="h-4 w-4" />,
      description: 'Users active in last 7 days'
    },
    {
      title: 'Pickup Rate',
      value: `${stats?.pickupRate.toFixed(1) || '0'}%`,
      change: 0,
      trend: stats?.pickupRate > 80 ? 'up' : 'down',
      icon: <CheckCircle className="h-4 w-4" />,
      description: 'Successful pickups vs reservations'
    },
  ];

  const quickStats = [
    { label: 'New Users Today', value: stats?.newUsersToday || 0, color: 'text-green-600' },
    { label: 'Active Partners', value: stats?.activePartners || 0, color: 'text-blue-600' },
    { label: 'Pending Tickets', value: stats?.pendingTickets || 0, color: 'text-orange-600' },
    { label: 'Expiring Soon', value: stats?.expiringSoon || 0, color: 'text-red-600' },
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Dashboard Overview</h1>
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
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time platform metrics and activity</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <Card key={kpi.title} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {kpi.title}
              </CardTitle>
              <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">
                {kpi.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
              <div className="flex items-center gap-2 mt-1">
                <div
                  className={cn(
                    'flex items-center text-xs font-medium',
                    kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {kpi.trend === 'up' ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {Math.abs(kpi.change)}%
                </div>
                <span className="text-xs text-gray-500">{kpi.description}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats Row */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {quickStats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className={cn("text-3xl font-bold", stat.color)}>
                  {stat.value}
                </div>
                <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activity Feed & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Live Activity Feed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={cn(
                    "mt-1 h-8 w-8 rounded-full flex items-center justify-center",
                    "bg-gray-100"
                  )}>
                    <span className={activity.color}>{activity.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.user}</span> {activity.action}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              className="w-full mt-4 text-sm"
              onClick={() => {/* TODO: View all activity */}}
            >
              View all activity
            </Button>
          </CardContent>
        </Card>

        {/* Charts Placeholder */}
        <div className="lg:col-span-2 space-y-6">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-md">
                <p className="text-sm text-gray-500">Chart placeholder - Revenue trend</p>
              </div>
            </CardContent>
          </Card>

          {/* User Signups Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">User Signups (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-md">
                <p className="text-sm text-gray-500">Chart placeholder - User growth</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
