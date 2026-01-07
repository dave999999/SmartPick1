import { useState, useEffect, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Package, UserCheck, AlertTriangle, Shield, Settings, AlertCircle, RefreshCw } from 'lucide-react';
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
          p_setting_key: 'maintenance_mode',
          p_setting_value: { enabled: checked },
          p_admin_user_id: user.id
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
    <div className="min-h-screen bg-gradient-to-b from-white via-[#F0FFF9] to-[#E0F9F0]">
      {/* Clean Professional Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Title & Status */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 shadow-sm">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Admin Control</h1>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'Connected' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    <span>{connectionStatus}</span>
                    <span className="text-gray-300">•</span>
                    <span>{new Date().toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Key Stats & Actions */}
            <div className="flex items-center gap-4">
              {/* Compact Stats */}
              <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-teal-600" />
                  <span className="text-sm font-semibold text-gray-900">{stats?.totalPartners || 0}</span>
                </div>
                <div className="w-px h-4 bg-gray-300"></div>
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-sm font-semibold text-gray-900">{stats?.totalUsers || 0}</span>
                </div>
                <div className="w-px h-4 bg-gray-300"></div>
                <div className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-sm font-semibold text-gray-900">{stats?.totalOffers || 0}</span>
                </div>
                {stats && stats.pendingPartners > 0 && (
                  <>
                    <div className="w-px h-4 bg-gray-300"></div>
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                      <span className="text-sm font-bold text-orange-600">{stats.pendingPartners}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Maintenance Toggle */}
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                <Label htmlFor="maintenance-toggle" className="text-xs font-medium text-gray-600 cursor-pointer">
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
                variant="ghost" 
                size="sm" 
                className="h-9 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                onClick={handleRefreshData}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 text-sm border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() => navigate('/')}
              >
                Home
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 text-sm border-gray-300 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                onClick={handleSignOut}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Clean, Professional Navigation */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <TabsList className="w-full justify-start gap-0 h-auto bg-transparent p-2">
              {/* Primary Actions */}
              <div className="flex items-center gap-1 pr-3 border-r border-gray-200">
                <TabsTrigger 
                  value="overview" 
                  className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 data-[state=active]:border-teal-200 data-[state=active]:shadow-none text-sm font-medium px-4 py-2 rounded-lg transition-all text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger 
                  value="partners" 
                  className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 data-[state=active]:border-teal-200 data-[state=active]:shadow-none text-sm font-medium px-4 py-2 rounded-lg transition-all text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  Partners
                </TabsTrigger>
                <TabsTrigger 
                  value="pending" 
                  className="relative data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 data-[state=active]:border-orange-200 data-[state=active]:shadow-none text-sm font-medium px-4 py-2 rounded-lg transition-all text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  Pending
                  {stats && stats.pendingPartners > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 bg-orange-500 text-white text-xs font-bold rounded">
                      {stats.pendingPartners}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="users" 
                  className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-200 data-[state=active]:shadow-none text-sm font-medium px-4 py-2 rounded-lg transition-all text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  Users
                </TabsTrigger>
                <TabsTrigger 
                  value="banned" 
                  className="data-[state=active]:bg-red-50 data-[state=active]:text-red-700 data-[state=active]:border-red-200 data-[state=active]:shadow-none text-sm font-medium px-4 py-2 rounded-lg transition-all text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  Banned
                </TabsTrigger>
                <TabsTrigger 
                  value="offers" 
                  className="data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:border-purple-200 data-[state=active]:shadow-none text-sm font-medium px-4 py-2 rounded-lg transition-all text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  Offers
                </TabsTrigger>
              </div>

              {/* Analytics */}
              <div className="flex items-center gap-1 px-3 border-r border-gray-200">
                <TabsTrigger 
                  value="analytics" 
                  className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none text-sm font-medium px-3 py-2 rounded-lg transition-all text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  Analytics
                </TabsTrigger>
                <TabsTrigger 
                  value="financial" 
                  className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-none text-sm font-medium px-3 py-2 rounded-lg transition-all text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  Financial
                </TabsTrigger>
              </div>

              {/* Monitoring */}
              <div className="flex items-center gap-1 px-3 border-r border-gray-200">
                <TabsTrigger 
                  value="live" 
                  className="data-[state=active]:bg-red-50 data-[state=active]:text-red-700 data-[state=active]:shadow-none text-sm font-medium px-3 py-2 rounded-lg transition-all text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  Live
                </TabsTrigger>
                <TabsTrigger 
                  value="health" 
                  className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 data-[state=active]:shadow-none text-sm font-medium px-3 py-2 rounded-lg transition-all text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  Health
                </TabsTrigger>
                <TabsTrigger 
                  value="performance" 
                  className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none text-sm font-medium px-3 py-2 rounded-lg transition-all text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  Performance
                </TabsTrigger>
              </div>

              {/* System */}
              <div className="flex items-center gap-1 px-3">
                <TabsTrigger 
                  value="audit" 
                  className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-none text-sm font-medium px-3 py-2 rounded-lg transition-all text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  Audit
                </TabsTrigger>
                <TabsTrigger 
                  value="config" 
                  className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-none text-sm font-medium px-3 py-2 rounded-lg transition-all text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  <Settings className="h-4 w-4" />
                </TabsTrigger>
              </div>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Partners Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-teal-50 rounded-lg">
                    <Package className="w-5 h-5 text-teal-600" />
                  </div>
                  <Badge variant="secondary" className="bg-teal-50 text-teal-700 text-xs px-2 py-0.5 font-medium border border-teal-200">Active</Badge>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{stats?.totalPartners || 0}</div>
                <div className="text-sm text-gray-500 font-medium">Active Partners</div>
              </div>

              {/* Users Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-blue-50 rounded-lg">
                    <UserCheck className="w-5 h-5 text-blue-600" />
                  </div>
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 font-medium border border-blue-200">Total</Badge>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{stats?.totalUsers || 0}</div>
                <div className="text-sm text-gray-500 font-medium">Registered Users</div>
              </div>

              {/* Offers Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-purple-50 rounded-lg">
                    <Package className="w-5 h-5 text-purple-600" />
                  </div>
                  <Badge variant="secondary" className="bg-purple-50 text-purple-700 text-xs px-2 py-0.5 font-medium border border-purple-200">Live</Badge>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{stats?.totalOffers || 0}</div>
                <div className="text-sm text-gray-500 font-medium">Active Offers</div>
              </div>

              {/* Pending Card */}
              <div 
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow duration-200 cursor-pointer" 
                onClick={() => setActiveTab('pending')}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-orange-50 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                  </div>
                  {stats && stats.pendingPartners > 0 && (
                    <Badge variant="destructive" className="text-xs px-2 py-0.5 font-medium">Action Required</Badge>
                  )}
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{stats?.pendingPartners || 0}</div>
                <div className="text-sm text-gray-500 font-medium">Pending Approval</div>
              </div>
            </div>

            {/* Today's Activity */}
            {typeof stats?.reservationsToday === 'number' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow duration-200">
                  <div className="text-sm text-gray-500 mb-2 font-medium">Reservations Today</div>
                  <div className="text-3xl font-bold text-blue-600">{stats?.reservationsToday ?? 0}</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow duration-200">
                  <div className="text-sm text-gray-500 mb-2 font-medium">Revenue Today</div>
                  <div className="text-3xl font-bold text-emerald-600">
                    {(stats?.revenueToday ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  variant="outline"
                  className="h-20 flex flex-col gap-2 justify-center border-gray-200 hover:border-teal-300 hover:bg-teal-50 transition-all"
                  onClick={() => setActiveTab('partners')}
                >
                  <Package className="h-5 w-5 text-teal-600" />
                  <span className="text-xs font-medium text-gray-700">Partners</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col gap-2 justify-center border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all"
                  onClick={() => setActiveTab('pending')}
                >
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <span className="text-xs font-medium text-gray-700">Pending</span>
                  {stats && stats.pendingPartners > 0 && (
                    <Badge variant="destructive" className="h-4 px-1.5 text-[10px] font-bold">{stats.pendingPartners}</Badge>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col gap-2 justify-center border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                  onClick={() => setActiveTab('users')}
                >
                  <UserCheck className="h-5 w-5 text-blue-600" />
                  <span className="text-xs font-medium text-gray-700">Users</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col gap-2 justify-center border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all"
                  onClick={() => setActiveTab('offers')}
                >
                  <Package className="h-5 w-5 text-purple-600" />
                  <span className="text-xs font-medium text-gray-700">Offers</span>
                </Button>
              </div>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Keyboard Shortcuts</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Switch Tabs</span>
                  <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-gray-700 font-mono text-xs shadow-sm">1-9</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Refresh Data</span>
                  <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-gray-700 font-mono text-xs shadow-sm">R</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Go Home</span>
                  <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-gray-700 font-mono text-xs shadow-sm">H</kbd>
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
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
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

