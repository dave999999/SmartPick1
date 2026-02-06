/**
 * User Management Page
 * List, filter, and manage all users
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  Ban,
  CheckCircle,
  Coins,
  Eye,
  Trash2,
  RefreshCw,
  Download,
  AlertCircle,
} from 'lucide-react';
import {
  useUsers,
  useBanUser,
  useUnbanUser,
  useAdjustPoints,
  useUser,
  useUserReservations,
  useUserPointTransactions,
} from '@/hooks/admin/useUsers';
import { UserFilters } from '@/hooks/admin/useUsers';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { PermissionGuard } from '@/components/admin/PermissionGuard';

export default function UserManagement() {
  const [filters, setFilters] = useState<UserFilters>({
    page: 1,
    limit: 50,
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  const [pointsDialog, setPointsDialog] = useState<{
    open: boolean;
    user?: any;
    amount: number;
    reason: string;
  }>({ open: false, amount: 0, reason: '' });
  const [detailsDialog, setDetailsDialog] = useState<{
    open: boolean;
    user?: any;
  }>({ open: false });

  const { data, isLoading, refetch } = useUsers(filters);
  const banUser = useBanUser();
  const unbanUser = useUnbanUser();
  const adjustPoints = useAdjustPoints();
  const selectedUserId = detailsDialog.user?.id || null;
  const { data: selectedUser } = useUser(selectedUserId);
  const { data: selectedReservations } = useUserReservations(selectedUserId, 200);
  const { data: selectedTransactions } = useUserPointTransactions(selectedUserId, 200);

  const handleSearch = (search: string) => {
    setFilters({ ...filters, search, page: 1 });
  };

  const handleStatusFilter = (status: string) => {
    setFilters({
      ...filters,
      status: status === 'all' ? undefined : (status as any),
      page: 1,
    });
  };

  const handlePenaltyFilter = (hasPenalty: string) => {
    setFilters({
      ...filters,
      hasPenalty: hasPenalty === 'penalty' ? true : undefined,
      hasNoPenalty: hasPenalty === 'no-penalty' ? true : undefined,
      page: 1,
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRiskBadge = (user: any) => {
    const noShowRate = user.no_show_rate || 0;
    if (noShowRate > 30)
      return (
        <Badge variant="destructive" className="text-xs">
          High Risk
        </Badge>
      );
    if (noShowRate > 10)
      return (
        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
          Medium Risk
        </Badge>
      );
    return null;
  };

  const computeReservationMetrics = (reservations: any[] | undefined) => {
    const list = reservations || [];
    const total = list.length;
    const completed = list.filter((r) =>
      ['PICKED_UP', 'COMPLETED'].includes((r.status || '').toUpperCase())
    ).length;
    const active = list.filter((r) =>
      ['ACTIVE', 'RESERVED', 'READY_FOR_PICKUP', 'IN_PROGRESS'].includes(
        (r.status || '').toUpperCase()
      )
    ).length;
    const cancelled = list.filter((r) =>
      ['CANCELLED', 'EXPIRED', 'NO_SHOW'].includes((r.status || '').toUpperCase())
    ).length;
    return { total, completed, active, cancelled };
  };

  const computePenaltyMetrics = (user: any) => {
    const hasActivePenalty =
      user?.penalty_until && new Date(user.penalty_until) > new Date();
    return {
      penaltyCount: user?.penalty_count || 0,
      hasActivePenalty,
      penaltyUntil: user?.penalty_until || null,
    };
  };

  const computePointsMetrics = (transactions: any[] | undefined) => {
    const list = transactions || [];
    const earned = list
      .filter((t) => (t.change || 0) > 0)
      .reduce((sum, t) => sum + (t.change || 0), 0);
    const spent = list
      .filter((t) => (t.change || 0) < 0)
      .reduce((sum, t) => sum + Math.abs(t.change || 0), 0);
    return { earned, spent };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">View and manage all users</p>
        </div>
        <Card>
          <CardContent className="p-12">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6" />
            User Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {data?.total || 0} total users
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <PermissionGuard permission="users:export">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  className="pl-10"
                  value={filters.search || ''}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Status Filter */}
            <Select
              value={filters.status || 'all'}
              onValueChange={handleStatusFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="DISABLED">Disabled</SelectItem>
                <SelectItem value="BANNED">Banned</SelectItem>
              </SelectContent>
            </Select>

            {/* Penalty Filter */}
            <Select
              value={
                filters.hasPenalty
                  ? 'penalty'
                  : filters.hasNoPenalty
                  ? 'no-penalty'
                  : 'all'
              }
              onValueChange={handlePenaltyFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Penalties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Penalties</SelectItem>
                <SelectItem value="no-penalty">No Penalties</SelectItem>
                <SelectItem value="penalty">Has Penalties</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Points</TableHead>
              <TableHead className="text-right">Reservations</TableHead>
              <TableHead className="text-right">Penalties</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.users.map((user) => {
              const isBanned =
                user.is_banned === true ||
                user.status?.toUpperCase() === 'BANNED' ||
                (user.penalty_until && new Date(user.penalty_until) > new Date());

              return (
                <TableRow key={user.id} className="hover:bg-gray-50">
                  {/* User Info */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="bg-teal-100 text-teal-700 text-sm">
                          {getInitials(user.name || 'User')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          {user.name || 'No Name'}
                          {getRiskBadge(user)}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        {user.is_email_verified && (
                          <div className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                            <CheckCircle className="h-3 w-3" />
                            Verified
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Role */}
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {user.role}
                    </Badge>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    {isBanned ? (
                      <Badge variant="destructive" className="text-xs">
                        <Ban className="h-3 w-3 mr-1" />
                        Banned
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </TableCell>

                  {/* Points */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Coins className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium">{user.points_balance || 0}</span>
                    </div>
                  </TableCell>

                  {/* Reservations */}
                  <TableCell className="text-right font-medium">
                    {user.total_reservations || 0}
                  </TableCell>

                  {/* Penalties */}
                  <TableCell className="text-right">
                    {user.penalty_count > 0 ? (
                      <Badge variant="destructive" className="text-xs">
                        {user.penalty_count}
                      </Badge>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </TableCell>

                  {/* Joined Date */}
                  <TableCell className="text-sm text-gray-500">
                    {format(new Date(user.created_at), 'MMM d, yyyy')}
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
                        <PermissionGuard permission="users:view_details">
                          <DropdownMenuItem
                            onClick={() => setDetailsDialog({ open: true, user })}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                        </PermissionGuard>

                        <PermissionGuard permission="users:points_add">
                          <DropdownMenuItem
                            onClick={() =>
                              setPointsDialog({
                                open: true,
                                user,
                                amount: 0,
                                reason: '',
                              })
                            }
                          >
                            <Coins className="h-4 w-4 mr-2" />
                            Manage Points
                          </DropdownMenuItem>
                        </PermissionGuard>

                        <DropdownMenuSeparator />

                        {isBanned ? (
                          <PermissionGuard permission="users:unban">
                            <DropdownMenuItem
                              className="text-green-600"
                              onClick={() =>
                                unbanUser.mutate({
                                  userId: user.id,
                                  reason: 'Manual unban by admin',
                                })
                              }
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Unban User
                            </DropdownMenuItem>
                          </PermissionGuard>
                        ) : (
                          <PermissionGuard permission="users:ban">
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() =>
                                banUser.mutate({
                                  userId: user.id,
                                  reason: 'Violation of terms',
                                  duration: '24hour',
                                })
                              }
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Ban User
                            </DropdownMenuItem>
                          </PermissionGuard>
                        )}

                        <PermissionGuard permission="users:delete">
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete User (GDPR)
                          </DropdownMenuItem>
                        </PermissionGuard>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Empty State */}
        {data?.users.length === 0 && (
          <div className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No users found</p>
            <p className="text-sm text-gray-500 mt-1">
              Try adjusting your filters or search query
            </p>
          </div>
        )}

        {/* Pagination */}
        {data && data.total > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
            <div className="text-sm text-gray-500">
              Showing {(filters.page! - 1) * filters.limit! + 1} to{' '}
              {Math.min(filters.page! * filters.limit!, data.total)} of {data.total} users
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page === 1}
                onClick={() => setFilters({ ...filters, page: filters.page! - 1 })}
              >
                Previous
              </Button>
              <div className="text-sm text-gray-600">
                Page {filters.page} of {data.pages}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page === data.pages}
                onClick={() => setFilters({ ...filters, page: filters.page! + 1 })}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Manage Points Dialog */}
      <Dialog
        open={pointsDialog.open}
        onOpenChange={(open) =>
          setPointsDialog({ ...pointsDialog, open })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage User Points</DialogTitle>
            <DialogDescription>
              Grant or deduct points for {pointsDialog.user?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Current Balance</Label>
                <span className="text-2xl font-bold text-green-600">
                  {pointsDialog.user?.points_balance || 0} points
                </span>
              </div>
            </div>
            <div>
              <Label htmlFor="points-amount">
                Amount (use negative to deduct)
              </Label>
              <Input
                id="points-amount"
                type="number"
                placeholder="e.g., 100 or -50"
                value={pointsDialog.amount}
                onChange={(e) =>
                  setPointsDialog({
                    ...pointsDialog,
                    amount: parseInt(e.target.value) || 0,
                  })
                }
              />
              {pointsDialog.amount !== 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  New balance will be:{' '}
                  <span className="font-semibold">
                    {(pointsDialog.user?.points_balance || 0) + pointsDialog.amount}{' '}
                    points
                  </span>
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="points-reason">Reason</Label>
              <Textarea
                id="points-reason"
                placeholder="e.g., Customer compensation, Referral bonus"
                value={pointsDialog.reason}
                onChange={(e) =>
                  setPointsDialog({
                    ...pointsDialog,
                    reason: e.target.value,
                  })
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setPointsDialog({ open: false, amount: 0, reason: '' })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!pointsDialog.user || pointsDialog.amount === 0) return;
                adjustPoints.mutate(
                  {
                    userId: pointsDialog.user.id,
                    amount: pointsDialog.amount,
                    reason: pointsDialog.reason || 'Admin adjustment',
                  },
                  {
                    onSuccess: () => {
                      setPointsDialog({ open: false, amount: 0, reason: '' });
                    },
                  }
                );
              }}
              disabled={
                pointsDialog.amount === 0 || adjustPoints.isPending
              }
            >
              <Coins className="h-4 w-4 mr-2" />
              {adjustPoints.isPending
                ? 'Processing...'
                : pointsDialog.amount > 0
                ? 'Grant Points'
                : 'Deduct Points'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog
        open={detailsDialog.open}
        onOpenChange={(open) => setDetailsDialog({ ...detailsDialog, open })}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Full profile and account status
            </DialogDescription>
          </DialogHeader>
          {detailsDialog.user && (
            <div className="space-y-4 py-2">
              {(() => {
                const metrics = computeReservationMetrics(selectedReservations);
                const penalties = computePenaltyMetrics(selectedUser || detailsDialog.user);
                const points = computePointsMetrics(selectedTransactions);
                const userData = selectedUser || detailsDialog.user;

                return (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Name</Label>
                        <div className="text-sm text-gray-700">
                          {userData.name || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <Label>Email</Label>
                        <div className="text-sm text-gray-700">{userData.email}</div>
                      </div>
                      <div>
                        <Label>Role</Label>
                        <div className="text-sm text-gray-700">{userData.role}</div>
                      </div>
                      <div>
                        <Label>Status</Label>
                        <div className="text-sm text-gray-700">
                          {userData.status || 'ACTIVE'}
                        </div>
                      </div>
                      <div>
                        <Label>Points Balance</Label>
                        <div className="text-sm text-gray-700">
                          {userData.points_balance || 0}
                        </div>
                      </div>
                      <div>
                        <Label>Points Earned</Label>
                        <div className="text-sm text-gray-700">{points.earned}</div>
                      </div>
                      <div>
                        <Label>Points Spent</Label>
                        <div className="text-sm text-gray-700">{points.spent}</div>
                      </div>
                      <div>
                        <Label>Reservations (Total)</Label>
                        <div className="text-sm text-gray-700">{metrics.total}</div>
                      </div>
                      <div>
                        <Label>Reservations (Active)</Label>
                        <div className="text-sm text-gray-700">{metrics.active}</div>
                      </div>
                      <div>
                        <Label>Reservations (Completed)</Label>
                        <div className="text-sm text-gray-700">{metrics.completed}</div>
                      </div>
                      <div>
                        <Label>Reservations (Cancelled/Expired)</Label>
                        <div className="text-sm text-gray-700">{metrics.cancelled}</div>
                      </div>
                      <div>
                        <Label>Penalties</Label>
                        <div className="text-sm text-gray-700">{penalties.penaltyCount}</div>
                      </div>
                      <div>
                        <Label>Penalty Active</Label>
                        <div className="text-sm text-gray-700">
                          {penalties.hasActivePenalty ? 'Yes' : 'No'}
                        </div>
                      </div>
                      <div>
                        <Label>Penalty Until</Label>
                        <div className="text-sm text-gray-700">
                          {penalties.penaltyUntil
                            ? format(new Date(penalties.penaltyUntil), 'MMM d, yyyy')
                            : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <Label>Joined</Label>
                        <div className="text-sm text-gray-700">
                          {format(new Date(userData.created_at), 'MMM d, yyyy')}
                        </div>
                      </div>
                      <div>
                        <Label>Last Login</Label>
                        <div className="text-sm text-gray-700">
                          {userData.last_login
                            ? format(new Date(userData.last_login), 'MMM d, yyyy')
                            : 'Never'}
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialog({ open: false })}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
