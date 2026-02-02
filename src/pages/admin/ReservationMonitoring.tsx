/**
 * Reservation Monitoring Page ★ COMPLETED
 * Real-time monitoring with countdown timers and emergency controls
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
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
import {
  ShoppingCart,
  Filter,
  MoreVertical,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Eye,
  Play,
  Ban,
} from 'lucide-react';
import {
  useReservations,
  useReservationStats,
  useExtendReservation,
  useForceCompleteReservation,
  useCancelReservation,
  ReservationFilters,
} from '@/hooks/admin/useReservations';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { PermissionGuard } from '@/components/admin/PermissionGuard';

export default function ReservationMonitoring() {
  const [filters, setFilters] = useState<ReservationFilters>({
    page: 1,
    limit: 50,
    // No default status filter - show all reservations
  });
  const [currentTime, setCurrentTime] = useState(new Date());

  const { data, isLoading, refetch } = useReservations(filters);
  const { data: stats } = useReservationStats();
  const extendReservation = useExtendReservation();
  const forceComplete = useForceCompleteReservation();
  const cancelReservation = useCancelReservation();

  // Update current time every second for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Dialog states
  const [extendDialog, setExtendDialog] = useState<{
    open: boolean;
    reservationId?: string;
    minutes: number;
    reason: string;
  }>({ open: false, minutes: 30, reason: '' });
  const [completeDialog, setCompleteDialog] = useState<{
    open: boolean;
    reservationId?: string;
    notes: string;
  }>({ open: false, notes: '' });
  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean;
    reservationId?: string;
    reason: string;
    refund: boolean;
  }>({ open: false, reason: '', refund: true });

  const handleExtend = () => {
    if (!extendDialog.reservationId || !extendDialog.reason.trim()) return;
    extendReservation.mutate(
      {
        reservationId: extendDialog.reservationId,
        additionalMinutes: extendDialog.minutes,
        reason: extendDialog.reason,
      },
      {
        onSuccess: () => setExtendDialog({ open: false, minutes: 30, reason: '' }),
      }
    );
  };

  const handleComplete = () => {
    if (!completeDialog.reservationId) return;
    forceComplete.mutate(
      {
        reservationId: completeDialog.reservationId,
        notes: completeDialog.notes || undefined,
      },
      {
        onSuccess: () => setCompleteDialog({ open: false, notes: '' }),
      }
    );
  };

  const handleCancel = () => {
    if (!cancelDialog.reservationId || !cancelDialog.reason.trim()) return;
    cancelReservation.mutate(
      {
        reservationId: cancelDialog.reservationId,
        reason: cancelDialog.reason,
        refundPoints: cancelDialog.refund,
      },
      {
        onSuccess: () => setCancelDialog({ open: false, reason: '', refund: true }),
      }
    );
  };

  const getCountdownBadge = (expiresAt: string) => {
    const now = currentTime;
    const expiry = new Date(expiresAt);
    const minutesLeft = differenceInMinutes(expiry, now);

    if (minutesLeft < 0) {
      return (
        <Badge variant="destructive" className="font-mono">
          <AlertTriangle className="h-3 w-3 mr-1" />
          EXPIRED
        </Badge>
      );
    } else if (minutesLeft < 15) {
      const secondsLeft = Math.max(
        0,
        Math.floor((expiry.getTime() - now.getTime()) / 1000)
      );
      const mins = Math.floor(secondsLeft / 60);
      const secs = secondsLeft % 60;
      return (
        <Badge variant="destructive" className="font-mono animate-pulse">
          <Clock className="h-3 w-3 mr-1" />
          {mins}:{secs.toString().padStart(2, '0')}
        </Badge>
      );
    } else if (minutesLeft < 60) {
      return (
        <Badge className="font-mono bg-orange-100 text-orange-700 border-orange-200">
          <Clock className="h-3 w-3 mr-1" />
          {minutesLeft}m left
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="font-mono text-gray-600">
          <Clock className="h-3 w-3 mr-1" />
          {Math.floor(minutesLeft / 60)}h {minutesLeft % 60}m
        </Badge>
      );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            <Play className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="text-gray-500">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelled
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            Reservation Monitoring
          </h1>
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
            <ShoppingCart className="h-6 w-6" />
            Reservation Monitoring
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              ✓ LIVE
            </Badge>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {data?.total || 0} reservations • Auto-refresh: 30s
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Now
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Active Now</div>
            <div className="text-2xl font-bold text-green-600 mt-1">
              {data?.reservations.filter((r) => r.status === 'active').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="text-sm text-red-700">Critical (&lt;15m)</div>
            <div className="text-2xl font-bold text-red-600 mt-1">
              {data?.reservations.filter((r) => {
                if (r.status !== 'active') return false;
                const minutesLeft = differenceInMinutes(
                  new Date(r.expires_at),
                  currentTime
                );
                return minutesLeft < 15 && minutesLeft >= 0;
              }).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Warning (&lt;1h)</div>
            <div className="text-2xl font-bold text-orange-600 mt-1">
              {data?.reservations.filter((r) => {
                if (r.status !== 'active') return false;
                const minutesLeft = differenceInMinutes(
                  new Date(r.expires_at),
                  currentTime
                );
                return minutesLeft < 60 && minutesLeft >= 15;
              }).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Completed Today</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">
              {stats?.completed_today || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Expired</div>
            <div className="text-2xl font-bold text-gray-500 mt-1">
              {data?.reservations.filter((r) => r.status === 'expired').length || 0}
            </div>
          </CardContent>
        </Card>
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
            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filters.urgency === 'critical' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() =>
                  setFilters({
                    ...filters,
                    urgency: filters.urgency === 'critical' ? undefined : 'critical',
                    page: 1,
                  })
                }
              >
                Critical Only
              </Button>
              <Button
                variant={filters.urgency === 'warning' ? 'default' : 'outline'}
                size="sm"
                onClick={() =>
                  setFilters({
                    ...filters,
                    urgency: filters.urgency === 'warning' ? undefined : 'warning',
                    page: 1,
                  })
                }
              >
                Warning
              </Button>
            </div>

            {/* Status Filter */}
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  status: value === 'all' ? undefined : (value as any),
                  page: 1,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>

            {/* Search */}
            <Input
              placeholder="Search by code..."
              value={filters.search || ''}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value || undefined, page: 1 })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Reservations Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Offer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Time Left</TableHead>
              <TableHead>Points</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.reservations.map((reservation) => {
              const minutesLeft = differenceInMinutes(
                new Date(reservation.expires_at),
                currentTime
              );
              const isCritical =
                reservation.status === 'active' && minutesLeft < 15 && minutesLeft >= 0;

              return (
                <TableRow
                  key={reservation.id}
                  className={cn(
                    'hover:bg-gray-50',
                    isCritical && 'bg-red-50 border-l-4 border-l-red-500'
                  )}
                >
                  {/* Code */}
                  <TableCell>
                    <div className="font-mono text-sm font-medium">
                      {reservation.reservation_code}
                    </div>
                  </TableCell>

                  {/* User */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={reservation.user?.avatar_url} />
                        <AvatarFallback className="bg-blue-100 text-blue-700">
                          {reservation.user?.name[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {reservation.user?.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {reservation.user?.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Offer */}
                  <TableCell>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {reservation.offer?.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {reservation.partner?.business_name}
                      </div>
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell>{getStatusBadge(reservation.status)}</TableCell>

                  {/* Time Left */}
                  <TableCell>
                    {reservation.status === 'active'
                      ? getCountdownBadge(reservation.expires_at)
                      : '-'}
                  </TableCell>

                  {/* Points */}
                  <TableCell>
                    <span className="font-medium">{reservation.points_spent}</span>
                  </TableCell>

                  {/* Created */}
                  <TableCell className="text-sm text-gray-500">
                    {format(new Date(reservation.created_at), 'MMM d, h:mm a')}
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <PermissionGuard permission="reservations:view_details">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>

                          {/* Active Reservation Actions */}
                          {reservation.status === 'active' && (
                            <>
                              <PermissionGuard permission="reservations:extend_time">
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    setExtendDialog({
                                      open: true,
                                      reservationId: reservation.id,
                                      minutes: 30,
                                      reason: '',
                                    })
                                  }
                                >
                                  <Clock className="h-4 w-4 mr-2" />
                                  Extend Time
                                </DropdownMenuItem>
                              </PermissionGuard>
                              <PermissionGuard permission="reservations:force_complete">
                                <DropdownMenuItem
                                  onClick={() =>
                                    setCompleteDialog({
                                      open: true,
                                      reservationId: reservation.id,
                                      notes: '',
                                    })
                                  }
                                  className="text-green-600"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Force Complete
                                </DropdownMenuItem>
                              </PermissionGuard>
                              <PermissionGuard permission="reservations:cancel">
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    setCancelDialog({
                                      open: true,
                                      reservationId: reservation.id,
                                      reason: '',
                                      refund: true,
                                    })
                                  }
                                  className="text-red-600"
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Cancel Reservation
                                </DropdownMenuItem>
                              </PermissionGuard>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </PermissionGuard>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Empty State */}
        {data?.reservations.length === 0 && (
          <div className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No reservations found</p>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
          </div>
        )}

        {/* Pagination */}
        {data && data.total > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
            <div className="text-sm text-gray-500">
              Showing {(filters.page! - 1) * filters.limit! + 1} to{' '}
              {Math.min(filters.page! * filters.limit!, data.total)} of {data.total}{' '}
              reservations
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

      {/* Extend Dialog */}
      <Dialog
        open={extendDialog.open}
        onOpenChange={(open) => setExtendDialog({ ...extendDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Reservation Time</DialogTitle>
            <DialogDescription>
              Add additional time to this reservation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="extend-minutes">Additional Minutes</Label>
              <Input
                id="extend-minutes"
                type="number"
                min="5"
                max="240"
                value={extendDialog.minutes}
                onChange={(e) =>
                  setExtendDialog({
                    ...extendDialog,
                    minutes: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="extend-reason">Reason for Extension</Label>
              <Textarea
                id="extend-reason"
                value={extendDialog.reason}
                onChange={(e) =>
                  setExtendDialog({ ...extendDialog, reason: e.target.value })
                }
                placeholder="Explain why time is being extended..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExtendDialog({ open: false, minutes: 30, reason: '' })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExtend}
              disabled={
                !extendDialog.reason.trim() ||
                extendDialog.minutes < 5 ||
                extendReservation.isPending
              }
            >
              <Clock className="h-4 w-4 mr-2" />
              Extend Time
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Force Complete Dialog */}
      <Dialog
        open={completeDialog.open}
        onOpenChange={(open) => setCompleteDialog({ ...completeDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Force Complete Reservation</DialogTitle>
            <DialogDescription>
              Manually mark this reservation as completed. This action bypasses normal
              flow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="complete-notes">Notes (Optional)</Label>
              <Textarea
                id="complete-notes"
                value={completeDialog.notes}
                onChange={(e) =>
                  setCompleteDialog({ ...completeDialog, notes: e.target.value })
                }
                placeholder="Add any relevant notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCompleteDialog({ open: false, notes: '' })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleComplete}
              disabled={forceComplete.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Force Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog
        open={cancelDialog.open}
        onOpenChange={(open) => setCancelDialog({ ...cancelDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Reservation</DialogTitle>
            <DialogDescription>
              Cancel this reservation and optionally refund points to the user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="cancel-reason">Cancellation Reason</Label>
              <Textarea
                id="cancel-reason"
                value={cancelDialog.reason}
                onChange={(e) =>
                  setCancelDialog({ ...cancelDialog, reason: e.target.value })
                }
                placeholder="Explain why this reservation is being cancelled..."
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="refund-points"
                checked={cancelDialog.refund}
                onCheckedChange={(checked) =>
                  setCancelDialog({ ...cancelDialog, refund: checked })
                }
              />
              <Label htmlFor="refund-points" className="cursor-pointer">
                Refund points to user
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setCancelDialog({ open: false, reason: '', refund: true })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={handleCancel}
              disabled={!cancelDialog.reason.trim() || cancelReservation.isPending}
              variant="destructive"
            >
              <Ban className="h-4 w-4 mr-2" />
              Cancel Reservation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
