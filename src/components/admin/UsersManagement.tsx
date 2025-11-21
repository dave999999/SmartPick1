import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Edit, Trash2, UserCheck, UserX } from 'lucide-react';
import { getUsersPaged, updateUser, deleteUser, enableUser, disableUser } from '@/lib/admin-api';
import { getCurrentUser } from '@/lib/api';
import type { User } from '@/lib/types';
import { toast } from 'sonner';
import { checkServerRateLimit } from '@/lib/rateLimiter-server';
import { logger } from '@/lib/logger';

interface UsersManagementProps {
  onStatsUpdate: () => void;
}

export function UsersManagement({ onStatsUpdate }: UsersManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [debounceToken, setDebounceToken] = useState(0);

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debounceToken, statusFilter, roleFilter]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebounceToken(x => x + 1), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { items, count } = await getUsersPaged({
        page,
        pageSize,
        search: searchTerm,
        status: statusFilter,
        role: roleFilter,
      });
      setUsers(items);
      setFilteredUsers(items);
      setTotal(count);
    } catch (error) {
      logger.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const goPrev = () => setPage(p => Math.max(1, p - 1));
  const goNext = () => setPage(p => Math.min(totalPages, p + 1));

  const handleEdit = (user: User) => {
    setEditingUser({ ...user });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    try {
      await updateUser(editingUser.id, editingUser);
      toast.success('User updated successfully');
      setShowEditDialog(false);
      setEditingUser(null);
      loadUsers();
      onStatsUpdate();
    } catch (error) {
      logger.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const handleDelete = (user: User) => {
    setUserToDelete(user);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    try {
      // Rate limit check
      const { user } = await getCurrentUser();
      if (user?.id) {
        const rateLimitCheck = await checkServerRateLimit('admin_action', user.id);
        if (!rateLimitCheck.allowed) {
          toast.error('Too many admin actions. Please try again later.');
          return;
        }
      }

      await deleteUser(userToDelete.id);
      toast.success('User deleted successfully');
      setShowDeleteDialog(false);
      setUserToDelete(null);
      loadUsers();
      onStatsUpdate();
    } catch (error) {
      logger.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleEnable = async (user: User) => {
    try {
      // Rate limit check
      const { user: adminUser } = await getCurrentUser();
      if (adminUser?.id) {
        const rateLimitCheck = await checkServerRateLimit('admin_action', adminUser.id);
        if (!rateLimitCheck.allowed) {
          toast.error('Too many admin actions. Please try again later.');
          return;
        }
      }

      await enableUser(user.id);
      toast.success('User enabled successfully');
      loadUsers();
      onStatsUpdate();
    } catch (error) {
      logger.error('Error enabling user:', error);
      toast.error('Failed to enable user');
    }
  };

  const handleDisable = async (user: User) => {
    try {
      await disableUser(user.id);
      toast.success('User disabled successfully');
      loadUsers();
      onStatsUpdate();
    } catch (error) {
      logger.error('Error disabling user:', error);
      toast.error('Failed to disable user');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'DISABLED':
        return <Badge className="bg-red-100 text-red-800">Disabled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    // Normalize role to lowercase for consistent badge display
    const normalizedRole = role?.toLowerCase();

    switch (normalizedRole) {
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
          <CardTitle>Users Management</CardTitle>
          <CardDescription>Manage all users in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="DISABLED">Disabled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="partner">Partner</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.name || 'N/A'}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{getStatusBadge(user.status || 'ACTIVE')}</TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {user.status === 'DISABLED' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEnable(user)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDisable(user)}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              Page {page} of {totalPages} · {total} users
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={goPrev} disabled={page <= 1}>Prev</Button>
              <Button variant="outline" size="sm" onClick={goNext} disabled={page >= totalPages}>Next</Button>
            </div>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No users found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and settings
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={editingUser.name || ''}
                  onChange={(e) => setEditingUser({
                    ...editingUser,
                    name: e.target.value
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({
                    ...editingUser,
                    email: e.target.value
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(value) => setEditingUser({
                    ...editingUser,
                    role: value as 'ADMIN' | 'CUSTOMER' | 'PARTNER'
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CUSTOMER">Customer</SelectItem>
                    <SelectItem value="PARTNER">Partner</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={editingUser.status || 'ACTIVE'}
                  onValueChange={(value) => setEditingUser({
                    ...editingUser,
                    status: value as 'ACTIVE' | 'DISABLED'
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="DISABLED">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{userToDelete?.name || userToDelete?.email}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

