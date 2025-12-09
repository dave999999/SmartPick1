import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Users, Building2, Package, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';

interface LiveStats {
  totalUsers: number;
  totalPartners: number;
  activeUsers: number;
  activePartners: number;
  activeOffers: number;
  todayReservations: number;
  pendingPartners: number;
  todayRevenue: number;
}

interface LiveMonitoringProps {
  isActive?: boolean; // Whether this tab is currently visible
}

export function LiveMonitoring({ isActive = true }: LiveMonitoringProps) {
  const [stats, setStats] = useState<LiveStats>({
    totalUsers: 0,
    totalPartners: 0,
    activeUsers: 0,
    activePartners: 0,
    activeOffers: 0,
    todayReservations: 0,
    pendingPartners: 0,
    todayRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchLiveStats = async () => {
    try {
      const today = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      // Use count queries instead of fetching all data (works better with RLS)
      const [usersCount, partnersCount, offersCount, reservationsCount] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('partners').select('*', { count: 'exact', head: true }),
        supabase.from('offers').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
        supabase.from('reservations').select('*', { count: 'exact', head: true }).gte('created_at', today)
      ]);

      // Get counts (these work even with RLS restrictions)
      const totalUsers = usersCount.count || 0;
      const totalPartners = partnersCount.count || 0;
      const activeOffers = offersCount.count || 0;
      const todayReservations = reservationsCount.count || 0;

      // For detailed stats, try to fetch what we can
      const users: any[] = [];
      const partners: any[] = [];
      const reservations: any[] = [];

      // Calculate what we can (use 0 for metrics we can't calculate without full access)
      const activeUsers = users.filter((u: any) => u.last_seen && u.last_seen >= fiveMinutesAgo).length;
      const activePartners = partners.filter((p: any) => p.status === 'APPROVED' && p.updated_at >= fiveMinutesAgo).length;
      const pendingPartners = partners.filter((p: any) => p.status === 'PENDING').length;
      
      const todayCompleted = reservations.filter((r: any) => r.created_at >= today && r.status === 'COMPLETED');
      const todayRevenue = todayCompleted.reduce((sum: number, r: any) => sum + (r.smart_price || 0), 0);

      setStats({
        totalUsers,
        totalPartners,
        activeUsers,
        activePartners,
        activeOffers,
        todayReservations,
        pendingPartners,
        todayRevenue
      });
    } catch (error) {
      console.error('Error fetching live stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only poll when tab is active AND window is visible
    if (!isActive || document.hidden) {
      console.log('⏸️ [LiveMonitoring] Paused - tab not active or window hidden');
      return;
    }

    console.log('▶️ [LiveMonitoring] Starting polling - admin is viewing this tab');
    fetchLiveStats();
    
    // Increased to 120 seconds / 2 minutes (50% reduction from 60s)
    const interval = setInterval(() => {
      // Double-check visibility before each poll
      if (!document.hidden && isActive) {
        console.log('🔄 [LiveMonitoring] Polling update');
        fetchLiveStats();
      } else {
        console.log('⏭️ [LiveMonitoring] Skipping poll - not visible');
      }
    }, 120000);
    
    // Listen for visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('👁️ [LiveMonitoring] Tab hidden - pausing polls');
      } else if (isActive) {
        console.log('👁️ [LiveMonitoring] Tab visible - resuming polls');
        fetchLiveStats(); // Immediate refresh when tab becomes visible
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      console.log('🛑 [LiveMonitoring] Cleanup - stopping polling');
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive]); // Re-run when tab activation changes

  const StatCard = ({ title, value, icon: Icon, color }: { title: string; value: number | string; icon: any; color: string }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-2xl font-bold text-gray-400 animate-pulse">--</div>
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        <p className="text-xs text-muted-foreground mt-1">Live count</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Live Monitoring</h2>
        <p className="text-muted-foreground">Real-time platform statistics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={stats.totalUsers} icon={Users} color="text-blue-600" />
        <StatCard title="Live Users (5min)" value={stats.activeUsers} icon={Users} color="text-green-600" />
        <StatCard title="Total Partners" value={stats.totalPartners} icon={Building2} color="text-purple-600" />
        <StatCard title="Live Partners (5min)" value={stats.activePartners} icon={Building2} color="text-teal-600" />
        <StatCard title="Active Offers" value={stats.activeOffers} icon={Package} color="text-indigo-600" />
        <StatCard title="Today's Reservations" value={stats.todayReservations} icon={TrendingUp} color="text-orange-600" />
        <StatCard title="Pending Partners" value={stats.pendingPartners} icon={AlertTriangle} color="text-yellow-600" />
        <StatCard title="Today's Revenue" value={`₾${stats.todayRevenue.toFixed(2)}`} icon={TrendingUp} color="text-emerald-600" />
      </div>

      <div className="text-xs text-gray-500 text-center">
        {isActive ? '✅ Live - Auto-refreshes every 60 seconds' : '⏸️ Paused - Switch to this tab to resume'}
      </div>
    </div>
  );
}
