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

interface DashboardHomeProps {}

export function DashboardHome({}: DashboardHomeProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // KPI Data (TODO: Fetch from API)
  const kpis = [
    {
      title: 'GMV (Today)',
      value: '₾12,450',
      change: +15.2,
      trend: 'up' as const,
      icon: <DollarSign className="h-4 w-4" />,
      description: 'Total reservation value'
    },
    {
      title: 'Revenue (Today)',
      value: '₾1,867',
      change: +12.8,
      trend: 'up' as const,
      icon: <DollarSign className="h-4 w-4" />,
      description: '15% commission on pickups'
    },
    {
      title: 'Active Users',
      value: '2,453',
      change: -2.3,
      trend: 'down' as const,
      icon: <Users className="h-4 w-4" />,
      description: 'Users active in last 7 days'
    },
    {
      title: 'Pickup Rate',
      value: '87.5%',
      change: +3.1,
      trend: 'up' as const,
      icon: <CheckCircle className="h-4 w-4" />,
      description: 'Successful pickups vs reservations'
    },
  ];

  // Quick Stats (TODO: Fetch from API)
  const quickStats = [
    { label: 'New Users Today', value: 47, color: 'text-green-600' },
    { label: 'Active Partners', value: 123, color: 'text-blue-600' },
    { label: 'Pending Tickets', value: 3, color: 'text-orange-600' },
    { label: 'Expiring Soon', value: 12, color: 'text-red-600' },
  ];

  // Activity Feed (TODO: Fetch from real-time subscription)
  const activities = [
    {
      id: 1,
      type: 'signup',
      user: 'Giorgi B.',
      action: 'signed up',
      time: '2 minutes ago',
      color: 'text-green-600',
      icon: <Users className="h-4 w-4" />
    },
    {
      id: 2,
      type: 'reservation',
      user: 'Ana K.',
      action: 'reserved bread from Bakery Fresh',
      time: '5 minutes ago',
      color: 'text-blue-600',
      icon: <ShoppingCart className="h-4 w-4" />
    },
    {
      id: 3,
      type: 'pickup',
      user: 'Levan M.',
      action: 'picked up order #4523',
      time: '8 minutes ago',
      color: 'text-teal-600',
      icon: <CheckCircle className="h-4 w-4" />
    },
    {
      id: 4,
      type: 'partner',
      user: 'Café Central',
      action: 'posted new offer: Croissants',
      time: '12 minutes ago',
      color: 'text-purple-600',
      icon: <ShoppingCart className="h-4 w-4" />
    },
    {
      id: 5,
      type: 'dispute',
      user: 'Nino T.',
      action: 'opened support ticket #SP4567',
      time: '15 minutes ago',
      color: 'text-orange-600',
      icon: <AlertCircle className="h-4 w-4" />
    },
  ];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // TODO: Fetch real data from API
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

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
