import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserPlus, Eye, Calendar, Users } from 'lucide-react';
import { getNewUsers } from '@/lib/admin-api';
import type { User } from '@/lib/types';
import { toast } from 'sonner';

interface NewUsersProps {
  onStatsUpdate: () => void;
}

export function NewUsers({ onStatsUpdate }: NewUsersProps) {
  const [newUsers, setNewUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    loadNewUsers();
  }, []);

  const loadNewUsers = async () => {
    try {
      setLoading(true);
      const data = await getNewUsers();
      setNewUsers(data);
    } catch (error) {
      logger.error('Error loading new users:', error);
      toast.error('Failed to load new users');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setShowDetailsDialog(true);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-purple-100 text-purple-800">Admin</Badge>;
      case 'customer':
        return <Badge className="bg-blue-100 text-blue-800">Customer</Badge>;
      case 'partner':
        return <Badge className="bg-orange-100 text-orange-800">Partner</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'DISABLED':
        return <Badge className="bg-red-100 text-red-800">Disabled</Badge>;
      default:
        return <Badge variant="secondary">{status || 'Active'}</Badge>;
    }
  };

  const getDaysAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            New Users (Last 4 Days)
          </CardTitle>
          <CardDescription>
            Users who registered in the last 4 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {newUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No new users</h3>
              <p className="text-gray-500">No users have registered in the last 4 days.</p>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total New Users</p>
                        <p className="text-2xl font-bold text-blue-600">{newUsers.length}</p>
                      </div>
                      <UserPlus className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">New Customers</p>
                        <p className="text-2xl font-bold text-green-600">
                          {newUsers.filter(u => (u.role || '').toLowerCase() === 'customer').length}
                        </p>
                      </div>
                      <Users className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">New Partners</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {newUsers.filter(u => (u.role || '').toLowerCase() === 'partner').length}
                        </p>
                      </div>
                      <Calendar className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Users Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-medium">{user.name || 'N/A'}</div>
                            <Badge variant="outline" className="mt-1 text-xs">
                              {getDaysAgo(user.created_at)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>{getStatusBadge(user.status || 'ACTIVE')}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{new Date(user.created_at).toLocaleDateString()}</div>
                            <div className="text-gray-500">
                              {new Date(user.created_at).toLocaleTimeString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.last_login ? (
                            <div className="text-sm">
                              <div>{new Date(user.last_login).toLocaleDateString()}</div>
                              <div className="text-gray-500">
                                {new Date(user.last_login).toLocaleTimeString()}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-500 text-sm">Never</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(user)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Complete information about this user
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Name:</span> {selectedUser.name || 'Not provided'}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span> {selectedUser.email}
                    </div>
                    <div>
                      <span className="font-medium">Role:</span> {getRoleBadge(selectedUser.role)}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span> {getStatusBadge(selectedUser.status || 'ACTIVE')}
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Activity</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Registered:</span>
                      <div className="text-gray-600">
                        {new Date(selectedUser.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Last Login:</span>
                      <div className="text-gray-600">
                        {selectedUser.last_login 
                          ? new Date(selectedUser.last_login).toLocaleString()
                          : 'Never logged in'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 p-3 rounded">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-900">Registration Time</span>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  This user registered {getDaysAgo(selectedUser.created_at).toLowerCase()}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

