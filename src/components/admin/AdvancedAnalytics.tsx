import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { TrendingUp, Users, DollarSign, Percent } from 'lucide-react';

interface AnalyticsData {
  dau: number;
  wau: number;
  mau: number;
  stickiness: number;
  totalRevenue: number;
  arpu: number;
  signupToReservation: number;
  day7Retention: number;
}

export function AdvancedAnalytics() {
  const [data, setData] = useState<AnalyticsData>({
    dau: 0,
    wau: 0,
    mau: 0,
    stickiness: 0,
    totalRevenue: 0,
    arpu: 0,
    signupToReservation: 0,
    day7Retention: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Fetch counts and data using created_at instead of last_sign_in_at
      const [
        totalUsersRes,
        newUsersSevenDaysRes,
        newUsersThirtyDaysRes,
        completedRes,
        totalReservationsRes,
        dauReservationsRes,
        wauReservationsRes
      ] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
        supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
        supabase.from('reservations').select('total_price').eq('status', 'PICKED_UP'),
        supabase.from('reservations').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
        supabase.from('reservations').select('user_id', { count: 'exact', head: true }).gte('created_at', oneDayAgo),
        supabase.from('reservations').select('user_id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo)
      ]);

      const totalUsers = totalUsersRes.count || 1;
      
      // Use reservation activity as proxy for active users
      const dau = dauReservationsRes.count || 0;
      const wau = wauReservationsRes.count || 0;
      const mau = newUsersThirtyDaysRes.count || 0;
      const stickiness = mau > 0 ? (dau / mau) * 100 : 0;

      // Calculate revenue metrics
      const reservations = completedRes.data || [];
      const totalRevenue = reservations.reduce((sum: number, r: any) => sum + (r.total_price || 0), 0);
      const arpu = totalRevenue / totalUsers;

      // Conversion rate: reservations in last 7 days / total users
      const recentReservations = totalReservationsRes.count || 0;
      const signupToReservation = totalUsers > 0 ? (recentReservations / totalUsers) * 100 : 0;

      // Retention: users who signed up in last 7 days / total users
      const newUsers = newUsersSevenDaysRes.count || 0;
      const day7Retention = totalUsers > 0 ? (newUsers / totalUsers) * 100 : 0;

      setData({
        dau,
        wau,
        mau,
        stickiness,
        totalRevenue,
        arpu,
        signupToReservation,
        day7Retention
      });
    } catch (error) {
      console.error('Error fetching analytics:', error instanceof Error ? error.message : String(error));
      // Set to 0 on error instead of leaving undefined
      setData({
        dau: 0,
        wau: 0,
        mau: 0,
        stickiness: 0,
        totalRevenue: 0,
        arpu: 0,
        signupToReservation: 0,
        day7Retention: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const MetricCard = ({ 
    title, 
    value, 
    suffix = '', 
    icon: Icon, 
    color,
    description 
  }: { 
    title: string; 
    value: number; 
    suffix?: string;
    icon: any; 
    color: string;
    description: string;
  }) => (
    <Card className="border-gray-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3 px-3">
        <CardTitle className="text-xs font-medium text-gray-600">{title}</CardTitle>
        <Icon className={`h-3.5 w-3.5 ${color}`} />
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {loading ? (
          <div className="text-xl font-bold text-gray-400 animate-pulse">--</div>
        ) : (
          <div className="text-xl font-bold">
            {typeof value === 'number' ? (suffix === '%' || suffix === ' ₾' ? value.toFixed(1) : Math.round(value)) : value}{suffix}
          </div>
        )}
        <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight">📊 Engagement & Revenue Metrics</h2>
        <p className="text-xs text-muted-foreground">Real-time performance indicators</p>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase text-gray-600 tracking-wide">User Engagement</h3>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <MetricCard 
            title="DAU" 
            value={data.dau} 
            icon={Users} 
            color="text-blue-600"
            description="Daily Active Users"
          />
          <MetricCard 
            title="WAU" 
            value={data.wau} 
            icon={Users} 
            color="text-green-600"
            description="Weekly Active Users"
          />
          <MetricCard 
            title="MAU" 
            value={data.mau} 
            icon={Users} 
            color="text-purple-600"
            description="Monthly Active Users"
          />
          <MetricCard 
            title="Stickiness" 
            value={data.stickiness} 
            suffix="%"
            icon={Percent} 
            color="text-orange-600"
            description="DAU/MAU ratio (target: 20%)"
          />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase text-gray-600 tracking-wide">Revenue & Conversion</h3>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <MetricCard 
            title="Total Revenue" 
            value={data.totalRevenue} 
            suffix=" ₾"
            icon={DollarSign} 
            color="text-emerald-600"
            description="All-time revenue"
          />
          <MetricCard 
            title="ARPU" 
            value={data.arpu} 
            suffix=" ₾"
            icon={DollarSign} 
            color="text-teal-600"
            description="Avg Revenue Per User"
          />
          <MetricCard 
            title="Conversion" 
            value={data.signupToReservation} 
            suffix="%"
            icon={TrendingUp} 
            color="text-indigo-600"
            description="Signup → Reservation"
          />
          <MetricCard 
            title="Retention" 
            value={data.day7Retention} 
            suffix="%"
            icon={Users} 
            color="text-pink-600"
            description="7-day active rate"
          />
        </div>
      </div>
    </div>
  );
}
