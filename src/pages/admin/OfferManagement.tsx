/**
 * Offer Management Page ★ COMPLETED
 * Real-time monitoring with emergency controls, flagging, and expiration tracking
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Package,
  Filter,
  MoreVertical,
  Pause,
  Play,
  Flag,
  Trash2,
  RefreshCw,
  AlertCircle,
  Clock,
  AlertTriangle,
  Eye,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import {
  useOffers,
  useOfferStats,
  usePauseOffer,
  useResumeOffer,
  useFlagOffer,
  useUnflagOffer,
  useDeleteOffer,
  usePauseAllOffers,
  useExtendOffer,
  OfferFilters,
} from '@/hooks/admin/useOffers';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, differenceInHours } from 'date-fns';
import { PermissionGuard } from '@/components/admin/PermissionGuard';

export default function OfferManagement() {
  const [filters, setFilters] = useState<OfferFilters>({
    page: 1,
    limit: 50,
  });

  const { data, isLoading, refetch } = useOffers(filters);
  const { data: stats } = useOfferStats();
  const pauseOffer = usePauseOffer();
  const resumeOffer = useResumeOffer();
  const flagOffer = useFlagOffer();
  const unflagOffer = useUnflagOffer();
  const deleteOffer = useDeleteOffer();
  const pauseAllOffers = usePauseAllOffers();
  const extendOffer = useExtendOffer();

  // Dialog states
  const [flagDialog, setFlagDialog] = useState<{
    open: boolean;
    offerId?: string;
    reason: string;
  }>({ open: false, reason: '' });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    offerId?: string;
  }>({ open: false });
  const [emergencyDialog, setEmergencyDialog] = useState(false);
  const [extendDialog, setExtendDialog] = useState<{
    open: boolean;
    offerId?: string;
    hours: number;
  }>({ open: false, hours: 24 });

  const handleFlag = () => {
    if (!flagDialog.offerId || !flagDialog.reason.trim()) return;
    flagOffer.mutate(
      { offerId: flagDialog.offerId, reason: flagDialog.reason },
      {
        onSuccess: () => setFlagDialog({ open: false, reason: '' }),
      }
    );
  };

  const handleDelete = () => {
    if (!deleteDialog.offerId) return;
    deleteOffer.mutate(
      { offerId: deleteDialog.offerId },
      {
        onSuccess: () => setDeleteDialog({ open: false }),
      }
    );
  };

  const handleEmergencyPause = () => {
    pauseAllOffers.mutate(
      {},
      {
        onSuccess: () => setEmergencyDialog(false),
      }
    );
  };

  const handleExtend = () => {
    if (!extendDialog.offerId) return;
    extendOffer.mutate(
      { offerId: extendDialog.offerId, additionalHours: extendDialog.hours },
      {
        onSuccess: () => setExtendDialog({ open: false, hours: 24 }),
      }
    );
  };

  const getStatusBadge = (offer: any) => {
    if (offer.flagged) {
      return (
        <Badge variant="destructive">
          <Flag className="h-3 w-3 mr-1" />
          Flagged
        </Badge>
      );
    }
    if (new Date(offer.expires_at) < new Date()) {
      return (
        <Badge variant="outline" className="text-gray-500">
          Expired
        </Badge>
      );
    }
    if (!offer.active) {
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-700">
          <Pause className="h-3 w-3 mr-1" />
          Paused
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-700">
        <Play className="h-3 w-3 mr-1" />
        Active
      </Badge>
    );
  };

  const getExpiryBadge = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const hoursLeft = differenceInHours(expiry, now);

    if (expiry < now) {
      return (
        <Badge variant="outline" className="text-gray-500">
          Expired
        </Badge>
      );
    } else if (hoursLeft < 24) {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {hoursLeft}h left
        </Badge>
      );
    } else if (hoursLeft < 72) {
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
          <Clock className="h-3 w-3 mr-1" />
          {Math.floor(hoursLeft / 24)}d left
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-gray-600">
        {formatDistanceToNow(expiry, { addSuffix: true })}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Package className="h-6 w-6" />
            Offer Management
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
            <Package className="h-6 w-6" />
            Offer Management
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              ✓ ACTIVE
            </Badge>
          </h1>
          <p className="text-sm text-gray-500 mt-1">{data?.total || 0} total offers</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <PermissionGuard permission="offers:emergency_pause">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setEmergencyDialog(true)}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Emergency Pause All
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Active Offers</div>
            <div className="text-2xl font-bold text-green-600 mt-1">
              {data?.offers.filter((o) => o.active && !o.flagged && new Date(o.expires_at) > new Date()).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Paused</div>
            <div className="text-2xl font-bold text-gray-600 mt-1">
              {data?.offers.filter((o) => !o.active).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Flagged</div>
            <div className="text-2xl font-bold text-red-600 mt-1">
              {data?.offers.filter((o) => o.flagged).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Expiring Soon</div>
            <div className="text-2xl font-bold text-orange-600 mt-1">
              {data?.offers.filter((o) => {
                const hoursLeft = differenceInHours(new Date(o.expires_at), new Date());
                return hoursLeft > 0 && hoursLeft < 24;
              }).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Expired</div>
            <div className="text-2xl font-bold text-gray-500 mt-1">
              {data?.offers.filter((o) => new Date(o.expires_at) < new Date()).length || 0}
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
                variant={filters.status === 'flagged' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() =>
                  setFilters({ ...filters, status: filters.status === 'flagged' ? undefined : 'flagged', page: 1 })
                }
              >
                Flagged Only
              </Button>
              <Button
                variant={filters.expiringWithin === 24 ? 'default' : 'outline'}
                size="sm"
                onClick={() =>
                  setFilters({
                    ...filters,
                    expiringWithin: filters.expiringWithin === 24 ? undefined : 24,
                    page: 1,
                  })
                }
              >
                Expiring Soon
              </Button>
            </div>

            {/* Status Filter */}
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) =>
                setFilters({ ...filters, status: value === 'all' ? undefined : (value as any), page: 1 })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>

            {/* Search */}
            <Input
              placeholder="Search by title..."
              value={filters.search || ''}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value || undefined, page: 1 })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Offers Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Offer</TableHead>
              <TableHead>Partner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Available</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Redeemed</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.offers.map((offer) => (
              <TableRow
                key={offer.id}
                className={cn(
                  'hover:bg-gray-50',
                  offer.flagged && 'bg-red-50'
                )}
              >
                {/* Offer */}
                <TableCell>
                  <div>
                    <div className="font-medium text-gray-900">{offer.title}</div>
                    <div className="text-sm text-gray-500">
                      <Badge variant="outline" className="text-xs mt-1">
                        {offer.category}
                      </Badge>
                    </div>
                  </div>
                </TableCell>

                {/* Partner */}
                <TableCell>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {offer.partner?.business_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      Trust: {offer.partner?.trust_score}
                    </div>
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell>{getStatusBadge(offer)}</TableCell>

                {/* Price */}
                <TableCell>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="font-medium">{offer.points_cost}</span>
                    <span className="text-xs text-gray-500">pts</span>
                  </div>
                </TableCell>

                {/* Available */}
                <TableCell>
                  <div className="text-center">
                    <span className="font-medium">{offer.quantity_available}</span>
                  </div>
                </TableCell>

                {/* Expires */}
                <TableCell>{getExpiryBadge(offer.expires_at)}</TableCell>

                {/* Redeemed */}
                <TableCell>
                  <div className="text-center">
                    <span className="font-medium text-blue-600">{offer.quantity_redeemed}</span>
                  </div>
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <PermissionGuard permission="offers:view_details">
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

                        {/* Pause/Resume */}
                        <PermissionGuard permission="offers:pause">
                          <DropdownMenuSeparator />
                          {offer.active ? (
                            <DropdownMenuItem
                              onClick={() => pauseOffer.mutate({ offerId: offer.id })}
                            >
                              <Pause className="h-4 w-4 mr-2" />
                              Pause Offer
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => resumeOffer.mutate({ offerId: offer.id })}
                              className="text-green-600"
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Resume Offer
                            </DropdownMenuItem>
                          )}
                        </PermissionGuard>

                        {/* Flag/Unflag */}
                        <PermissionGuard permission="offers:flag">
                          {offer.flagged ? (
                            <DropdownMenuItem
                              onClick={() => unflagOffer.mutate({ offerId: offer.id })}
                              className="text-green-600"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Remove Flag
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() =>
                                setFlagDialog({ open: true, offerId: offer.id, reason: '' })
                              }
                              className="text-orange-600"
                            >
                              <Flag className="h-4 w-4 mr-2" />
                              Flag Offer
                            </DropdownMenuItem>
                          )}
                        </PermissionGuard>

                        {/* Extend */}
                        <PermissionGuard permission="offers:extend">
                          <DropdownMenuItem
                            onClick={() =>
                              setExtendDialog({ open: true, offerId: offer.id, hours: 24 })
                            }
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            Extend Expiration
                          </DropdownMenuItem>
                        </PermissionGuard>

                        {/* Delete */}
                        <PermissionGuard permission="offers:delete">
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              setDeleteDialog({ open: true, offerId: offer.id })
                            }
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Offer
                          </DropdownMenuItem>
                        </PermissionGuard>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </PermissionGuard>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Empty State */}
        {data?.offers.length === 0 && (
          <div className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No offers found</p>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
          </div>
        )}

        {/* Pagination */}
        {data && data.total > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
            <div className="text-sm text-gray-500">
              Showing {(filters.page! - 1) * filters.limit! + 1} to{' '}
              {Math.min(filters.page! * filters.limit!, data.total)} of {data.total} offers
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

      {/* Flag Dialog */}
      <Dialog
        open={flagDialog.open}
        onOpenChange={(open) => setFlagDialog({ open, reason: '' })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag Offer</DialogTitle>
            <DialogDescription>
              This will mark the offer for review and notify the partner.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="flag-reason">Flag Reason</Label>
              <Textarea
                id="flag-reason"
                value={flagDialog.reason}
                onChange={(e) =>
                  setFlagDialog({ ...flagDialog, reason: e.target.value })
                }
                placeholder="Explain why this offer is being flagged..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFlagDialog({ open: false, reason: '' })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleFlag}
              disabled={!flagDialog.reason.trim() || flagOffer.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Flag className="h-4 w-4 mr-2" />
              Flag Offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Offer</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the offer. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialog({ open: false })}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Offer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Emergency Pause Dialog */}
      <AlertDialog open={emergencyDialog} onOpenChange={setEmergencyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Emergency: Pause All Offers
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately pause ALL active offers across the entire platform. Use
              only in emergencies. Partners will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEmergencyPause}
              className="bg-red-600 hover:bg-red-700"
            >
              Pause All Offers
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Extend Dialog */}
      <Dialog
        open={extendDialog.open}
        onOpenChange={(open) => setExtendDialog({ ...extendDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Offer Expiration</DialogTitle>
            <DialogDescription>Add additional time to the offer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="extend-hours">Additional Hours</Label>
              <Input
                id="extend-hours"
                type="number"
                min="1"
                max="720"
                value={extendDialog.hours}
                onChange={(e) =>
                  setExtendDialog({
                    ...extendDialog,
                    hours: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExtendDialog({ open: false, hours: 24 })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExtend}
              disabled={extendDialog.hours < 1 || extendOffer.isPending}
            >
              <Clock className="h-4 w-4 mr-2" />
              Extend Offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
