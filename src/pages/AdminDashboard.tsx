import { useState, useEffect, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Package, UserCheck, AlertTriangle, Shield, Settings, AlertCircle } from 'lucide-react';
import { getDashboardStats, testAdminConnection } from '@/lib/admin-api';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionCard } from '@/components/layout/SectionCard';
import { PartnersManagement } from '@/components/admin/PartnersManagement';
import { EnhancedUsersManagement } from '@/components/admin/EnhancedUsersManagement';
import { OffersManagement } from '@/components/admin/OffersManagement';
import PartnersVerification from '@/components/admin/PartnersVerification';
import { NewUsersPanel } from '@/components/admin/NewUsersPanel';
import { BannedUsersPanel } from '@/components/admin/BannedUsersPanel';
import { ModerationPanel } from '@/components/admin/ModerationPanel';
import { logger } from '@/lib/logger';
import FinancialDashboardPanel from '@/components/admin/FinancialDashboardPanel';
const AdvancedAnalyticsDashboard = lazy(() => import('@/components/admin/AdvancedAnalyticsDashboard'));
import { getAdminDashboardStatsRpc } from '@/lib/api/admin-advanced';
import AdminHealthPanel from '@/components/admin/AdminHealthPanel';
import AuditLogPanel from '@/components/admin/AuditLogPanel';
import SystemConfiguration from '@/components/admin/SystemConfiguration';
import { CommunicationPanel } from '@/components/admin/CommunicationPanel';
import { LiveMonitoring } from '@/components/admin/LiveMonitoring';
import { AlertManagement } from '@/components/admin/AlertManagement';
import ErrorMonitoring from '@/components/admin/ErrorMonitoring';
import { PerformanceMonitoringPanel } from '@/components/admin/PerformanceMonitoringPanel';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { FloatingBottomNav } from '@/components/FloatingBottomNav';

interface DashboardStats {
  totalPartners: number;
  totalUsers: number;
  totalOffers: number;
  pendingPartners: number;
  reservationsToday?: number;
  revenueToday?: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
    loadMaintenanceMode();
  }, []);

  // Keyboard shortcuts for power users
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Number keys 1-9 for quick tab switching
      if (e.key >= '1' && e.key <= '9') {
        const tabs = ['overview', 'partners', 'pending', 'users', 'offers', 'moderation', 'financial', 'analytics', 'realtime'];
        const index = parseInt(e.key) - 1;
        if (tabs[index]) {
          setActiveTab(tabs[index]);
        }
      }

      // R for refresh
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
        handleRefreshData();
      }

      // H for home
      if (e.key === 'h' && !e.ctrlKey && !e.metaKey) {
        navigate('/');
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, []);

  const checkAdminAccess = async () => {
    try {
      logger.log('AdminDashboard: Starting admin access check...');
      
      // Test connection first
      const connectionTest = await testAdminConnection();
      logger.log('AdminDashboard: Connection test result:', connectionTest);
      setConnectionStatus(connectionTest.connected ? 'Connected' : 'Failed');
      
      if (!connectionTest.connected) {
        logger.error('AdminDashboard: Connection failed:', connectionTest.error);
        toast.error(`Database connection failed: ${connectionTest.error}`);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to access admin dashboard');
        navigate('/');
        return;
      }
      
      logger.log('AdminDashboard: User authenticated:', { userId: user.id });
      
      // Check if user is admin - check for both uppercase and lowercase
      const { data: profile, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      logger.log('AdminDashboard: User profile check:', { profile, error });

      if (error) {
        logger.error('Error fetching user profile:', error);
        toast.error('Unable to verify admin privileges');
        navigate('/');
        return;
      }

      // Verify admin role (case-insensitive)
      if (!profile || profile.role?.toUpperCase() !== 'ADMIN') {
        logger.error('AdminDashboard: Unauthorized access attempt:', { userId: user.id });
        toast.error('Unauthorized: Admin access required');
        navigate('/');
        return;
      }

      // User is authenticated and authorized, load stats
      await loadStats();
    } catch (error) {
      logger.error('Error checking admin access:', error);
      toast.error('Failed to verify admin access');
      navigate('/');
    }
  };

  const loadStats = async () => {
    try {
      logger.log('AdminDashboard: Loading dashboard stats...');
      
      // Prefer unified RPC for stats; gracefully fallback to legacy counts
      let rpcStats: any = null;
      try {
        rpcStats = await getAdminDashboardStatsRpc();
      } catch (e) {
        logger.warn('AdminDashboard: RPC stats unavailable, falling back:', e);
      }

      // Load legacy datasets in parallel (used for fallback)
      const [dashboardStats] = await Promise.all([
        getDashboardStats().catch(() => ({ totalPartners: 0, totalUsers: 0, totalOffers: 0, pendingPartners: 0 }))
      ]);
      
      logger.log('AdminDashboard: Data loaded:', {
        stats: rpcStats || dashboardStats
      });
      
      // Map to local type
      if (rpcStats) {
        setStats({
          totalPartners: rpcStats.total_partners ?? dashboardStats.totalPartners,
          totalUsers: rpcStats.total_users ?? dashboardStats.totalUsers,
          totalOffers: rpcStats.active_offers ?? dashboardStats.totalOffers,
          pendingPartners: dashboardStats.pendingPartners,
          reservationsToday: rpcStats.reservations_today ?? 0,
          revenueToday: rpcStats.revenue_today ?? 0,
        });
      } else {
        setStats(dashboardStats);
      }
      
      // Show success message with accurate counts from RPC (excludes admins)
      const partnersCount = rpcStats?.total_partners ?? dashboardStats.totalPartners;
      const customersCount = rpcStats?.total_users ?? dashboardStats.totalUsers;
      toast.success(`Dashboard loaded successfully! Found ${partnersCount} partners and ${customersCount} customers`);
      
    } catch (error) {
      logger.error('Error loading dashboard stats:', error);
      toast.error(`Failed to load dashboard statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Set default stats to prevent UI errors
      setStats({
        totalPartners: 0,
        totalUsers: 0,
        totalOffers: 0,
        pendingPartners: 0
      });
    } finally {
      setLoading(false);
    }
  };



  const handleRefreshData = async () => {
    setLoading(true);
    await loadStats();
  };

  const loadMaintenanceMode = async () => {
    try {
      const { data: setting, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .single();

      if (error) throw error;
      setMaintenanceMode(setting?.value?.enabled === true);
    } catch (error) {
      logger.error('Error loading maintenance mode:', error instanceof Error ? error.message : String(error));
      setMaintenanceMode(false);
    }
  };

  const handleMaintenanceToggle = async (checked: boolean) => {
    try {
      logger.debug('Attempting to update maintenance mode to:', checked);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Use the SECURITY DEFINER function instead of direct UPDATE
      // This bypasses RLS and ensures admin users can update settings
      const { data, error } = await supabase
        .rpc('update_system_setting', {
          setting_key: 'maintenance_mode',
          setting_value: { enabled: checked },
          admin_user_id: user.id
        });

      logger.debug('Update result:', { data, error });

      if (error) {
        logger.error('Update error details:', error);
        throw error;
      }

      setMaintenanceMode(checked);
      if (checked) {
        toast.success('✅ Maintenance mode enabled - Takes effect immediately!');
      } else {
        toast.success('✅ Maintenance mode disabled - Site is now live!');
      }
    } catch (error) {
      logger.error('Error updating maintenance mode:', error instanceof Error ? error.message : String(error));
      logger.error('Full error object:', error);
      toast.error(`Failed to update maintenance mode: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Revert the toggle on error
      setMaintenanceMode(!checked);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Signed out successfully');
      // Force a full page reload to clear all auth state
      window.location.href = '/';
    } catch (error) {
      logger.error('Sign out error:', error instanceof Error ? error.message : String(error));
      toast.error('Error signing out');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <Shield className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-20 w-20 border-2 border-blue-200 border-t-blue-600"></div>
            </div>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mt-8">Loading Admin Dashboard</h2>
          <p className="mt-2 text-sm text-gray-600">Verifying credentials and loading data...</p>
          {connectionStatus && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-full shadow-sm border border-gray-200">
              <div className={`w-2 h-2 rounded-full ${connectionStatus === 'Connected' ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`}></div>
              <span className="text-xs text-gray-600">{connectionStatus}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Professional Header */}
      <header className="bg-slate-800/95 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50 shadow-xl">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Left: Title & Live Stats */}
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
              </div>
              
              {/* Live Stats Chips */}
              <div className="hidden md:flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-lg text-xs shadow-lg backdrop-blur-sm">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm"></div>
                  <span className="font-bold text-emerald-300">{stats?.totalPartners || 0}</span>
                  <span className="text-emerald-200 font-medium">Partners</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-lg text-xs shadow-lg backdrop-blur-sm">
                  <span className="font-bold text-blue-300">{stats?.totalUsers || 0}</span>
                  <span className="text-blue-200 font-medium">Users</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500/20 to-violet-500/20 border border-purple-500/30 rounded-lg text-xs shadow-lg backdrop-blur-sm">
                  <span className="font-bold text-purple-300">{stats?.totalOffers || 0}</span>
                  <span className="text-purple-200 font-medium">Offers</span>
                </div>
                {stats && stats.pendingPartners > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30 rounded-lg text-xs shadow-lg backdrop-blur-sm">
                    <AlertTriangle className="w-3.5 h-3.5 text-orange-300" />
                    <span className="font-bold text-orange-300">{stats.pendingPartners}</span>
                    <span className="text-orange-200 font-medium">Pending</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              {/* Maintenance Mode Toggle */}
              <div className="flex items-center gap-3 px-4 py-2 bg-slate-700/50 rounded-xl border border-slate-600 shadow-lg backdrop-blur-sm">
                <Label htmlFor="maintenance-toggle" className="text-xs font-semibold text-gray-200 cursor-pointer">
                  Maintenance
                </Label>
                <Switch
                  id="maintenance-toggle"
                  checked={maintenanceMode}
                  onCheckedChange={handleMaintenanceToggle}
                  className="data-[state=checked]:bg-orange-500"
                />
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 px-4 text-xs font-semibold bg-slate-700/50 border-slate-600 text-gray-200 hover:bg-slate-600"
                onClick={() => navigate('/')}
              >
                Home
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 px-4 text-xs font-semibold bg-slate-700/50 border-slate-600 text-gray-200 hover:bg-red-600 hover:text-white hover:border-red-500"
                onClick={handleSignOut}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 lg:px-6 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          {/* Modern Navigation */}
          <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-700/50 p-1.5 shadow-xl">
            <TabsList className="flex flex-wrap justify-start gap-1 h-auto bg-transparent p-0">
              {/* Core Management */}
              <div className="flex items-center gap-1">
                <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md text-xs font-semibold px-4 py-2 rounded-lg transition-all hover:bg-slate-700/50 text-gray-300">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="partners" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-md text-xs font-semibold px-4 py-2 rounded-lg transition-all hover:bg-slate-700/50 text-gray-300">
                  Partners
                </TabsTrigger>
                <TabsTrigger value="pending" className="relative data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-600 data-[state=active]:text-white data-[state=active]:shadow-md text-xs font-semibold px-4 py-2 rounded-lg transition-all hover:bg-slate-700/50 text-gray-300">
                  Pending
                  {stats && stats.pendingPartners > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
                      {stats.pendingPartners}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="users" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-md text-xs font-semibold px-4 py-2 rounded-lg transition-all hover:bg-slate-700/50 text-gray-300">
                  Users
                </TabsTrigger>
                <TabsTrigger value="offers" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md text-xs font-semibold px-4 py-2 rounded-lg transition-all hover:bg-slate-700/50 text-gray-300">
                  Offers
                </TabsTrigger>
              </div>

              {/* Analytics & Monitoring */}
              <div className="hidden lg:flex items-center gap-1 ml-1 pl-3 border-l-2 border-slate-600">
                <TabsTrigger value="analytics" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md text-xs font-semibold px-4 py-2 rounded-lg transition-all hover:bg-slate-700/50 text-gray-300">
                  📊 Analytics
                </TabsTrigger>
                <TabsTrigger value="moderation" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-white data-[state=active]:shadow-md text-xs font-medium px-3 py-1.5 rounded transition-all">
                  ⚖️ Moderation
                </TabsTrigger>
                <TabsTrigger value="financial" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md text-xs font-medium px-3 py-1.5 rounded transition-all">
                  💰 Financial
                </TabsTrigger>
              </div>

              {/* System Operations */}
              <div className="hidden lg:flex items-center gap-0.5 ml-0.5 pl-2 border-l border-gray-300">
                <TabsTrigger value="live" className="data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-md text-xs font-medium px-3 py-1.5 rounded transition-all">
                  🔴 Live
                </TabsTrigger>
                <TabsTrigger value="health" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white data-[state=active]:shadow-md text-xs font-medium px-3 py-1.5 rounded transition-all">
                  ❤️ Health
                </TabsTrigger>
                <TabsTrigger value="performance" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md text-xs font-medium px-3 py-1.5 rounded transition-all">
                  ⚡ Performance
                </TabsTrigger>
                <TabsTrigger value="announce" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md text-xs font-medium px-3 py-1.5 rounded transition-all">
                  📢 Announce
                </TabsTrigger>
                <TabsTrigger value="alerts" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-md text-xs font-medium px-3 py-1.5 rounded transition-all">
                  🔔 Alerts
                </TabsTrigger>
              </div>

              {/* System Admin */}
              <div className="hidden lg:flex items-center gap-0.5 ml-0.5 pl-2 border-l border-gray-300">
                <TabsTrigger value="audit" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white data-[state=active]:shadow-md text-xs font-medium px-3 py-1.5 rounded transition-all">
                  📋 Audit
                </TabsTrigger>
                <TabsTrigger value="errors" className="data-[state=active]:bg-red-700 data-[state=active]:text-white data-[state=active]:shadow-md text-xs font-medium px-2.5 py-1.5 rounded transition-all">
                  <AlertCircle className="h-3.5 w-3.5" />
                </TabsTrigger>
                <TabsTrigger value="config" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white data-[state=active]:shadow-md text-xs font-medium px-2.5 py-1.5 rounded transition-all">
                  <Settings className="h-3.5 w-3.5" />
                </TabsTrigger>
              </div>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-4">
            {/* System Status Bar */}
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-700/50 px-5 py-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${connectionStatus === 'Connected' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className="text-gray-400 font-medium">DB:</span>
                    <span className="font-bold text-gray-200">{connectionStatus}</span>
                  </div>
                  <div className="h-4 w-px bg-gray-300"></div>
                  <div className="text-gray-500 font-medium">
                    ⏱ {new Date().toLocaleTimeString()}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs px-3 font-semibold bg-slate-700/50 border-slate-600 text-gray-300 hover:bg-slate-600"
                  onClick={handleRefreshData}
                  disabled={loading}
                >
                  🔄 Refresh
                </Button>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Partners Card */}
              <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4 hover:shadow-xl hover:bg-slate-800/80 transition-all duration-300 cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg shadow-md">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 font-semibold border border-emerald-500/30">Active</Badge>
                </div>
                <div className="text-3xl font-bold text-gray-100">{stats?.totalPartners || 0}</div>
                <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mt-1">Partners</div>
              </div>

              {/* Users Card */}
              <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4 hover:shadow-xl hover:bg-slate-800/80 transition-all duration-300 cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg shadow-md">
                    <UserCheck className="w-5 h-5 text-white" />
                  </div>
                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 text-[10px] px-2 py-0.5 font-semibold border border-blue-500/30">Users</Badge>
                </div>
                <div className="text-3xl font-bold text-gray-100">{stats?.totalUsers || 0}</div>
                <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mt-1">Customers</div>
              </div>

              {/* Offers Card */}
              <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4 hover:shadow-xl hover:bg-slate-800/80 transition-all duration-300 cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg shadow-md">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 text-[10px] px-2 py-0.5 font-semibold border border-purple-500/30">Live</Badge>
                </div>
                <div className="text-3xl font-bold text-gray-100">{stats?.totalOffers || 0}</div>
                <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mt-1">Offers</div>
              </div>

              {/* Pending Card */}
              <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4 hover:shadow-xl hover:bg-slate-800/80 transition-all duration-300 cursor-pointer" onClick={() => setActiveTab('pending')}>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg shadow-md">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  {stats && stats.pendingPartners > 0 && (
                    <Badge variant="destructive" className="text-[10px] px-2 py-0.5 font-semibold shadow-sm">!</Badge>
                  )}
                </div>
                <div className="text-3xl font-bold text-gray-100">{stats?.pendingPartners || 0}</div>
                <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mt-1">Pending</div>
              </div>
            </div>

            {/* Today's Activity */}
            {typeof stats?.reservationsToday === 'number' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4 hover:shadow-lg hover:bg-slate-800/80 transition-all duration-200">
                  <div className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wide">📅 Reservations Today</div>
                  <div className="text-3xl font-bold text-blue-400">{stats?.reservationsToday ?? 0}</div>
                </div>
                <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4 hover:shadow-lg hover:bg-slate-800/80 transition-all duration-200">
                  <div className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wide">💵 Revenue Today</div>
                  <div className="text-3xl font-bold text-emerald-400">
                    {(stats?.revenueToday ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-3 bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4 shadow-lg">
                <h3 className="text-sm font-bold text-gray-200 mb-3 uppercase tracking-wide">⚡ Quick Actions</h3>
                <div className="grid grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  className="h-20 flex flex-col gap-2 bg-slate-700/50 border-slate-600 hover:bg-orange-500/20 hover:border-orange-500/50 transition-all hover:shadow-lg"
                  onClick={() => setActiveTab('pending')}
                >
                  <AlertTriangle className="h-5 w-5 text-orange-400" />
                  <span className="text-xs font-semibold text-gray-300">Pending</span>
                  {stats && stats.pendingPartners > 0 && (
                    <Badge variant="destructive" className="h-4 px-1.5 text-[10px] font-bold">{stats.pendingPartners}</Badge>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col gap-2 bg-slate-700/50 border-slate-600 hover:bg-blue-500/20 hover:border-blue-500/50 transition-all hover:shadow-lg"
                  onClick={() => setActiveTab('users')}
                >
                  <UserCheck className="h-5 w-5 text-blue-400" />
                  <span className="text-xs font-semibold text-gray-300">Users</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-16 flex flex-col gap-1 hover:bg-purple-50 hover:border-purple-400 transition-all"
                  onClick={() => setActiveTab('offers')}
                >
                  <Package className="h-4 w-4 text-purple-600" />
                  <span className="text-[11px] font-medium">Offers</span>
                </Button>
                </div>
              </div>

              {/* Keyboard Shortcuts */}
              <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4 shadow-lg">
                <h3 className="text-sm font-bold text-gray-200 mb-3 uppercase tracking-wide">⌨️ Shortcuts</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-medium">Tabs</span>
                    <kbd className="px-2 py-1 bg-slate-700/50 border border-slate-600 rounded-md text-gray-300 font-mono text-[11px] shadow-sm">1-9</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-medium">Refresh</span>
                    <kbd className="px-2 py-1 bg-slate-700/50 border border-slate-600 rounded-md text-gray-300 font-mono text-[11px] shadow-sm">R</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-medium">Home</span>
                    <kbd className="px-2 py-1 bg-slate-700/50 border border-slate-600 rounded-md text-gray-300 font-mono text-[11px] shadow-sm">H</kbd>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="partners" className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <PartnersManagement onStatsUpdate={loadStats} />
            </div>
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <PartnersVerification onStatsUpdate={loadStats} isActive={activeTab === 'pending'} />
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <EnhancedUsersManagement onStatsUpdate={loadStats} />
            </div>
          </TabsContent>

          <TabsContent value="new-users" className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <NewUsersPanel onStatsUpdate={loadStats} />
            </div>
          </TabsContent>

          <TabsContent value="banned" className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <BannedUsersPanel onStatsUpdate={loadStats} />
            </div>
          </TabsContent>

          <TabsContent value="offers" className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <OffersManagement onStatsUpdate={loadStats} />
            </div>
          </TabsContent>

          <TabsContent value="moderation" className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <ModerationPanel onStatsUpdate={loadStats} />
            </div>
          </TabsContent>

          <TabsContent value="financial" className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <FinancialDashboardPanel />
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Suspense fallback={
              <div className="p-8 text-center bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
                <p className="text-sm text-gray-500 font-medium">Loading advanced analytics...</p>
              </div>
            }>
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <AdvancedAnalyticsDashboard />
              </div>
            </Suspense>
          </TabsContent>

          <TabsContent value="health" className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <AdminHealthPanel />
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <PerformanceMonitoringPanel isActive={activeTab === 'performance'} />
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <AuditLogPanel />
            </div>
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <SystemConfiguration />
            </div>
          </TabsContent>

          <TabsContent value="live" className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <LiveMonitoring isActive={activeTab === 'live'} />
            </div>
          </TabsContent>

          <TabsContent value="announce" className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <CommunicationPanel />
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <AlertManagement />
            </div>
          </TabsContent>

          <TabsContent value="errors" className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <ErrorMonitoring />
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <FloatingBottomNav />
    </div>
  );
}

