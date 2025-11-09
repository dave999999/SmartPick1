import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Users, Store, Package, Clock, UserCheck, AlertTriangle, Shield } from 'lucide-react';
import { getDashboardStats, testAdminConnection, getAllPartners, getAllUsers } from '@/lib/admin-api';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionCard } from '@/components/layout/SectionCard';
import { PartnersManagement } from '@/components/admin/PartnersManagement';
import { UsersManagement } from '@/components/admin/UsersManagement';
import { OffersManagement } from '@/components/admin/OffersManagement';
import { PendingPartners } from '@/components/admin/PendingPartners';
import { NewUsers } from '@/components/admin/NewUsers';
import { BannedUsers } from '@/components/admin/BannedUsers';
import OfferModerationPanel from '@/components/admin/OfferModerationPanel';
import FinancialDashboardPanel from '@/components/admin/FinancialDashboardPanel';
import { getAdminDashboardStatsRpc } from '@/lib/api/admin-advanced';
import AuditLogs from '@/components/admin/AuditLogs';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface DashboardStats {
  totalPartners: number;
  totalUsers: number;
  totalOffers: number;
  pendingPartners: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      console.log('AdminDashboard: Starting admin access check...');
      
      // Test connection first
      const connectionTest = await testAdminConnection();
      console.log('AdminDashboard: Connection test result:', connectionTest);
      setConnectionStatus(connectionTest.connected ? 'Connected' : 'Failed');
      
      if (!connectionTest.connected) {
        console.error('AdminDashboard: Connection failed:', connectionTest.error);
        toast.error(`Database connection failed: ${connectionTest.error}`);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to access admin dashboard');
        navigate('/');
        return;
      }
      
      console.log('AdminDashboard: User authenticated:', user.email);
      
      // Check if user is admin - check for both uppercase and lowercase
      const { data: profile, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      console.log('AdminDashboard: User profile check:', { profile, error });

      if (error) {
        console.error('Error fetching user profile:', error);
        toast.error('Unable to verify admin privileges');
        navigate('/');
        return;
      }

      // Verify admin role (case-insensitive)
      if (!profile || profile.role?.toUpperCase() !== 'ADMIN') {
        console.error('AdminDashboard: Unauthorized access attempt by user:', user.email);
        toast.error('Unauthorized: Admin access required');
        navigate('/');
        return;
      }

      // User is authenticated and authorized, load stats
      await loadStats();
    } catch (error) {
      console.error('Error checking admin access:', error);
      toast.error('Failed to verify admin access');
      navigate('/');
    }
  };

  const loadStats = async () => {
    try {
      console.log('AdminDashboard: Loading dashboard stats...');
      
      // Prefer unified RPC for stats; gracefully fallback to legacy counts
      let rpcStats: any = null;
      try {
        rpcStats = await getAdminDashboardStatsRpc();
      } catch (e) {
        console.warn('AdminDashboard: RPC stats unavailable, falling back:', e);
      }

      // Load legacy datasets in parallel (used for fallback and toasts)
      const [dashboardStats, partnersData, usersData] = await Promise.all([
        getDashboardStats().catch(() => ({ totalPartners: 0, totalUsers: 0, totalOffers: 0, pendingPartners: 0 })),
        getAllPartners().catch(() => []),
        getAllUsers().catch(() => [])
      ]);
      
      console.log('AdminDashboard: Data loaded:', {
        stats: rpcStats || dashboardStats,
        partnersCount: partnersData.length,
        usersCount: usersData.length
      });
      
      // Map to local type
      if (rpcStats) {
        setStats({
          totalPartners: rpcStats.total_users ? rpcStats.total_partners : dashboardStats.totalPartners,
          totalUsers: rpcStats.total_users ?? dashboardStats.totalUsers,
          totalOffers: rpcStats.active_offers ?? dashboardStats.totalOffers,
          pendingPartners: dashboardStats.pendingPartners,
        });
      } else {
        setStats(dashboardStats);
      }
      
      // Show detailed success message
      toast.success(`Dashboard loaded successfully! Found ${partnersData.length} partners and ${usersData.length} users`);
      
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleRefreshData = async () => {
    setLoading(true);
    await loadStats();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
          {connectionStatus && (
            <p className="mt-2 text-sm text-gray-500">Connection: {connectionStatus}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={<span className="flex items-center gap-2"><Shield className="w-6 h-6 text-blue-600" /> Admin Dashboard</span>}
        subtitle={<span className="text-gray-600">Manage partners, users, and offers</span>}
        right={
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">Admin</Badge>
            <Button variant="outline" className="h-10" onClick={handleRefreshData}>Refresh</Button>
            <Button variant="outline" className="h-10" onClick={() => navigate('/')}>Home</Button>
            <Button variant="outline" className="h-10" onClick={handleSignOut}>Sign Out</Button>
          </div>
        }
      />

      <div className="pt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Mobile: Horizontal scroll tabs */}
          <div className="overflow-x-auto md:overflow-visible -mx-4 px-4">
            <TabsList className="inline-flex md:grid w-auto md:w-full min-w-max md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12 gap-1">
              <TabsTrigger value="overview" className="whitespace-nowrap">Overview</TabsTrigger>
              <TabsTrigger value="partners" className="whitespace-nowrap">Partners</TabsTrigger>
              <TabsTrigger value="pending" className="whitespace-nowrap">
                Pending
                {stats && stats.pendingPartners > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                    {stats.pendingPartners}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="users" className="whitespace-nowrap">Users</TabsTrigger>
              <TabsTrigger value="new-users" className="whitespace-nowrap">New Users</TabsTrigger>
              <TabsTrigger value="banned" className="whitespace-nowrap">Banned</TabsTrigger>
              <TabsTrigger value="offers" className="whitespace-nowrap">Offers</TabsTrigger>
              <TabsTrigger value="moderation" className="whitespace-nowrap">Moderation</TabsTrigger>
              <TabsTrigger value="financial" className="whitespace-nowrap">Finance</TabsTrigger>
              <TabsTrigger value="analytics" className="whitespace-nowrap">Analytics</TabsTrigger>
              <TabsTrigger value="health" className="whitespace-nowrap">Health</TabsTrigger>
              <TabsTrigger value="audit" className="whitespace-nowrap">Audit</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6">
            <SectionCard
              title="System Status"
              description="Connection and counts"
              accent="blue"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><strong>DB Connection:</strong> {connectionStatus}</div>
                <div><strong>Partners Found:</strong> {stats?.totalPartners || 0}</div>
                <div><strong>Users Found:</strong> {stats?.totalUsers || 0}</div>
                <div><strong>Offers Found:</strong> {stats?.totalOffers || 0}</div>
              </div>
              <p className="text-xs text-blue-600 mt-3">If counts show 0, check console logs or apply RLS fix SQL.</p>
            </SectionCard>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <SectionCard accent="green" title="Total Partners" description="Active business partners">
                <div className="text-3xl font-black">{stats?.totalPartners || 0}</div>
              </SectionCard>
              <SectionCard accent="green" title="Total Users" description="Registered customers">
                <div className="text-3xl font-black">{stats?.totalUsers || 0}</div>
              </SectionCard>
              <SectionCard accent="green" title="Active Offers" description="Available offers">
                <div className="text-3xl font-black">{stats?.totalOffers || 0}</div>
              </SectionCard>
              <SectionCard accent="orange" title="Pending Partners" description="Awaiting approval">
                <div className="text-3xl font-black text-orange-600">{stats?.pendingPartners || 0}</div>
              </SectionCard>
            </div>

            <SectionCard title="Quick Actions" description="Common administrative tasks" accent="none">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2 rounded-xl"
                  onClick={() => setActiveTab('pending')}
                >
                  <AlertTriangle className="h-6 w-6" />
                  Review Pending Partners
                  {stats && stats.pendingPartners > 0 && (
                    <Badge variant="destructive">{stats.pendingPartners} pending</Badge>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2 rounded-xl"
                  onClick={() => setActiveTab('new-users')}
                >
                  <UserCheck className="h-6 w-6" />
                  Check New Users
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2 rounded-xl"
                  onClick={() => setActiveTab('offers')}
                >
                  <Package className="h-6 w-6" />
                  Manage Offers
                </Button>
              </div>
            </SectionCard>
          </TabsContent>

          <TabsContent value="partners">
            <PartnersManagement onStatsUpdate={loadStats} />
          </TabsContent>

          <TabsContent value="pending">
            <PendingPartners onStatsUpdate={loadStats} />
          </TabsContent>

          <TabsContent value="users">
            <UsersManagement onStatsUpdate={loadStats} />
          </TabsContent>

          <TabsContent value="new-users">
            <NewUsers onStatsUpdate={loadStats} />
          </TabsContent>

          <TabsContent value="banned">
            <BannedUsers />
          </TabsContent>

          <TabsContent value="offers">
            <OffersManagement onStatsUpdate={loadStats} />
          </TabsContent>

          <TabsContent value="moderation">
            <OfferModerationPanel />
          </TabsContent>

          <TabsContent value="financial">
            <FinancialDashboardPanel />
          </TabsContent>

          <TabsContent value="analytics">
            <SectionCard title="Analytics & Insights" description="Platform-wide analytics and trends" accent="blue">
              <p className="text-gray-600">Feature coming soon: Analytics dashboard will show user growth charts, category performance, completion rates, and geographic distribution.</p>
            </SectionCard>
          </TabsContent>

          <TabsContent value="health">
            <SectionCard title="System Health" description="Monitor system performance and errors" accent="red">
              <p className="text-gray-600">Feature coming soon: System health monitoring will track errors, performance metrics, suspicious activity, and database health.</p>
            </SectionCard>
          </TabsContent>

          <TabsContent value="audit">
            <div className="max-w-7xl mx-auto">
              <AuditLogs />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}
