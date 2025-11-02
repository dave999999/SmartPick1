import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Users, Store, Package, Clock, UserCheck, AlertTriangle } from 'lucide-react';
import { getDashboardStats, testAdminConnection, getAllPartners, getAllUsers } from '@/lib/admin-api';
import { PartnersManagement } from '@/components/admin/PartnersManagement';
import { UsersManagement } from '@/components/admin/UsersManagement';
import { OffersManagement } from '@/components/admin/OffersManagement';
import { PendingPartners } from '@/components/admin/PendingPartners';
import { NewUsers } from '@/components/admin/NewUsers';
import { BannedUsers } from '@/components/admin/BannedUsers';
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
      
      // Load stats and test data access
      const [dashboardStats, partnersData, usersData] = await Promise.all([
        getDashboardStats(),
        getAllPartners(),
        getAllUsers()
      ]);
      
      console.log('AdminDashboard: Data loaded:', {
        stats: dashboardStats,
        partnersCount: partnersData.length,
        usersCount: usersData.length
      });
      
      setStats(dashboardStats);
      
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SmartPick Admin Dashboard</h1>
              <p className="text-gray-600">Manage partners, users, and offers</p>
              {connectionStatus && (
                <p className="text-xs text-gray-500">DB Status: {connectionStatus}</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Admin Panel
              </Badge>
              <Button variant="outline" className="h-11" onClick={handleRefreshData}>
                Refresh Data
              </Button>
              <Button variant="outline" className="h-11" onClick={() => navigate('/')}>
                Back to Home
              </Button>
              <Button variant="outline" className="h-11" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="partners">Partners</TabsTrigger>
            <TabsTrigger value="pending">
              Pending
              {stats && stats.pendingPartners > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                  {stats.pendingPartners}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="new-users">New Users</TabsTrigger>
            <TabsTrigger value="banned">Banned</TabsTrigger>
            <TabsTrigger value="offers">Offers</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Debug Info Card */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-900">Debug Information</CardTitle>
                <CardDescription className="text-blue-700">
                  Connection status and data counts for troubleshooting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <strong>DB Connection:</strong> {connectionStatus}
                  </div>
                  <div>
                    <strong>Partners Found:</strong> {stats?.totalPartners || 0}
                  </div>
                  <div>
                    <strong>Users Found:</strong> {stats?.totalUsers || 0}
                  </div>
                  <div>
                    <strong>Offers Found:</strong> {stats?.totalOffers || 0}
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  If counts show 0, check browser console for detailed error logs or run the RLS fix SQL script.
                </p>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Partners</CardTitle>
                  <Store className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalPartners || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Active business partners
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Registered customers
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Offers</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalOffers || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Available offers
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Partners</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{stats?.pendingPartners || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Awaiting approval
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col gap-2"
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
                  className="h-20 flex flex-col gap-2"
                  onClick={() => setActiveTab('new-users')}
                >
                  <UserCheck className="h-6 w-6" />
                  Check New Users
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col gap-2"
                  onClick={() => setActiveTab('offers')}
                >
                  <Package className="h-6 w-6" />
                  Manage Offers
                </Button>
              </CardContent>
            </Card>
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
        </Tabs>
      </div>
    </div>
  );
}