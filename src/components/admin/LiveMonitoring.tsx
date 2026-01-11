import { logger } from '@/lib/logger';
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
      const now = new Date().toISOString();

      // OPTIMIZED: Use efficient count queries with head: true (no data transfer)
      const [usersCount, partnersCount, offersCount, reservationsCount, onlineStats, revenueResult] = await Promise.all([
        // Total counts (head queries - minimal bandwidth)
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('partners').select('*', { count: 'exact', head: true }),
        
        // Only non-expired ACTIVE offers (filtered at database level)
        supabase.from('offers').select('*', { count: 'exact', head: true })
          .eq('status', 'ACTIVE')
          .gt('expires_at', now),
        
        // Today's reservations (filtered at database level)
        supabase.from('reservations').select('*', { count: 'exact', head: true })
          .gte('created_at', today),
        
        // EFFICIENT: Single RPC call for all online stats (one database query)
        supabase.rpc('get_online_stats'),
        
        // Revenue calculation (minimal data transfer - only one column)
        supabase.from('reservations')
          .select('smart_price')
          .gte('created_at', today)
          .eq('status', 'COMPLETED')
      ]);

      // Extract counts
      const totalUsers = usersCount.count || 0;
      const totalPartners = partnersCount.count || 0;
      const activeOffers = offersCount.count || 0;
      const todayReservations = reservationsCount.count || 0;

      // Online stats from optimized RPC function
      const onlineData = onlineStats.data?.[0] || { total_online: 0, web_online: 0, ios_online: 0, android_online: 0 };
      const activeUsers = Number(onlineData.total_online) || 0;

      // Calculate today's revenue (client-side aggregation on minimal data)
      const todayRevenue = (revenueResult.data || []).reduce((sum: number, r: any) => sum + (r.smart_price || 0), 0);

      // Pending partners (would need additional RPC for efficiency)
      const activePartners = 0; // TODO: Add get_partner_stats() RPC
      const pendingPartners = 0; // TODO: Add get_partner_stats() RPC

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
      logger.error('Error fetching live stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only poll when tab is active AND window is visible
    if (!isActive || document.hidden) {
      logger.debug('⏸️ [LiveMonitoring] Paused - tab not active or window hidden');
      return;
    }

    logger.debug('▶️ [LiveMonitoring] Starting polling - admin is viewing this tab');
    fetchLiveStats();
    
    // Increased to 120 seconds / 2 minutes (50% reduction from 60s)
    const interval = setInterval(() => {
      // Double-check visibility before each poll
      if (!document.hidden && isActive) {
        logger.debug('🔄 [LiveMonitoring] Polling update');
        fetchLiveStats();
      } else {
        logger.debug('⏭️ [LiveMonitoring] Skipping poll - not visible');
      }
    }, 120000);
    
    // Listen for visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logger.debug('👁️ [LiveMonitoring] Tab hidden - pausing polls');
      } else if (isActive) {
        logger.debug('👁️ [LiveMonitoring] Tab visible - resuming polls');
        fetchLiveStats(); // Immediate refresh when tab becomes visible
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      logger.debug('🛑 [LiveMonitoring] Cleanup - stopping polling');
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
        <StatCard title="Online Users (Web/iOS/Android)" value={stats.activeUsers} icon={Users} color="text-green-600" />
        <StatCard title="Total Partners" value={stats.totalPartners} icon={Building2} color="text-purple-600" />
        <StatCard title="Online Partners" value={stats.activePartners} icon={Building2} color="text-teal-600" />
        <StatCard title="Live Offers (Non-Expired)" value={stats.activeOffers} icon={Package} color="text-indigo-600" />
        <StatCard title="Today's Reservations" value={stats.todayReservations} icon={TrendingUp} color="text-orange-600" />
        <StatCard title="Pending Partners" value={stats.pendingPartners} icon={AlertTriangle} color="text-yellow-600" />
        <StatCard title="Today's Revenue" value={`₾${stats.todayRevenue.toFixed(2)}`} icon={DollarSign} color="text-emerald-600" />
      </div>

      <div className="text-xs text-gray-500 text-center mt-2">
        {isActive ? '✅ Live - Auto-refreshes every 2 minutes' : '⏸️ Paused - Switch to this tab to resume'}
        <br />
        <span className="text-amber-600">⚠️ Online user counts require realtime presence tracking (not yet implemented)</span>
      </div>
    </div>
  );
}
