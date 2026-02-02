/**
 * Partner Management Page ★ COMPLETED
 * Approval workflow, trust scoring, and business performance tracking
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Store,
  Filter,
  MoreVertical,
  CheckCircle,
  XCircle,
  Ban,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Shield,
  Eye,
  Star,
} from 'lucide-react';
import {
  usePartners,
  useApprovePartner,
  useRejectPartner,
  useSuspendPartner,
  useReactivatePartner,
  useUpdateTrustScore,
  PartnerFilters,
} from '@/hooks/admin/usePartners';
import { useAuthState } from '@/hooks/pages/useAuthState';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { PermissionGuard } from '@/components/admin/PermissionGuard';

export default function PartnerManagement() {
  const { user } = useAuthState();
  const [filters, setFilters] = useState<PartnerFilters>({
    page: 1,
    limit: 50,
  });

  const { data, isLoading, refetch } = usePartners(filters);
  const approvePartner = useApprovePartner();
  const rejectPartner = useRejectPartner();
  const suspendPartner = useSuspendPartner();
  const reactivatePartner = useReactivatePartner();
  const updateTrustScore = useUpdateTrustScore();

  // Dialog states
  const [approveDialog, setApproveDialog] = useState<{ open: boolean; partnerId?: string }>({
    open: false,
  });
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    partnerId?: string;
    reason: string;
  }>({ open: false, reason: '' });
  const [suspendDialog, setSuspendDialog] = useState<{
    open: boolean;
    partnerId?: string;
    reason: string;
  }>({ open: false, reason: '' });
  const [trustScoreDialog, setTrustScoreDialog] = useState<{
    open: boolean;
    partnerId?: string;
    currentScore?: number;
    newScore: number;
    reason: string;
  }>({ open: false, newScore: 0, reason: '' });

  const handleApprove = () => {
    if (!approveDialog.partnerId || !user) return;
    approvePartner.mutate(
      { partnerId: approveDialog.partnerId, adminId: user.id },
      {
        onSuccess: () => setApproveDialog({ open: false }),
      }
    );
  };

  const handleReject = () => {
    if (!rejectDialog.partnerId || !rejectDialog.reason.trim()) return;
    rejectPartner.mutate(
      { partnerId: rejectDialog.partnerId, reason: rejectDialog.reason },
      {
        onSuccess: () => setRejectDialog({ open: false, reason: '' }),
      }
    );
  };

  const handleSuspend = () => {
    if (!suspendDialog.partnerId || !suspendDialog.reason.trim()) return;
    suspendPartner.mutate(
      { partnerId: suspendDialog.partnerId, reason: suspendDialog.reason },
      {
        onSuccess: () => setSuspendDialog({ open: false, reason: '' }),
      }
    );
  };

  const handleUpdateTrustScore = () => {
    if (!trustScoreDialog.partnerId || !trustScoreDialog.reason.trim()) return;
    updateTrustScore.mutate(
      {
        partnerId: trustScoreDialog.partnerId,
        trustScore: trustScoreDialog.newScore,
        reason: trustScoreDialog.reason,
      },
      {
        onSuccess: () =>
          setTrustScoreDialog({ open: false, newScore: 0, reason: '' }),
      }
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
            Pending Review
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case 'suspended':
        return (
          <Badge variant="destructive">
            <Ban className="h-3 w-3 mr-1" />
            Suspended
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="text-red-600 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  const getTrustScoreBadge = (score: number) => {
    if (score >= 90) {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200">
          <Star className="h-3 w-3 mr-1" />
          Excellent
        </Badge>
      );
    } else if (score >= 70) {
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200">
          Good
        </Badge>
      );
    } else if (score >= 50) {
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
          Average
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          Poor
        </Badge>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Store className="h-6 w-6" />
            Partner Management
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
            <Store className="h-6 w-6" />
            Partner Management
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              ✓ ACTIVE
            </Badge>
          </h1>
          <p className="text-sm text-gray-500 mt-1">{data?.total || 0} total partners</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Total Partners</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {data?.partners.filter((p) => p.status === 'approved').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Pending Review</div>
            <div className="text-2xl font-bold text-yellow-600 mt-1">
              {data?.partners.filter((p) => p.status === 'pending').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Active Offers</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">
              {data?.partners.reduce((sum, p) => sum + (p.active_offers || 0), 0) || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Suspended</div>
            <div className="text-2xl font-bold text-red-600 mt-1">
              {data?.partners.filter((p) => p.status === 'suspended').length || 0}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <SelectItem value="pending">Pending Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            {/* Search */}
            <Input
              placeholder="Search by business name..."
              value={filters.search || ''}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value || undefined, page: 1 })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Partners Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Trust Score</TableHead>
              <TableHead>Active Offers</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.partners.map((partner) => (
              <TableRow key={partner.id} className="hover:bg-gray-50">
                {/* Business Info */}
                <TableCell>
                  <div>
                    <div className="font-medium text-gray-900">{partner.business_name}</div>
                    <div className="text-sm text-gray-500">{partner.business_email}</div>
                  </div>
                </TableCell>

                {/* Owner */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={partner.user?.avatar_url} />
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        {partner.user?.name[0] || 'P'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {partner.user?.name}
                      </div>
                      <div className="text-xs text-gray-500">{partner.user?.email}</div>
                    </div>
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell>{getStatusBadge(partner.status)}</TableCell>

                {/* Trust Score */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Shield className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{partner.trust_score}</span>
                    </div>
                    {getTrustScoreBadge(partner.trust_score)}
                  </div>
                </TableCell>

                {/* Active Offers */}
                <TableCell>
                  <div className="text-center">
                    <span className="font-medium">{partner.active_offers}</span>
                    <span className="text-gray-500 text-sm"> / {partner.total_offers}</span>
                  </div>
                </TableCell>

                {/* Revenue */}
                <TableCell>
                  <div className="flex items-center gap-1 text-green-600 font-medium">
                    <TrendingUp className="h-4 w-4" />
                    ${(partner.revenue_generated || 0).toFixed(0)}
                  </div>
                </TableCell>

                {/* Joined Date */}
                <TableCell className="text-sm text-gray-500">
                  {format(new Date(partner.created_at), 'MMM d, yyyy')}
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <PermissionGuard permission="partners:view_details">
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

                        {/* Approval Actions */}
                        {partner.status === 'pending' && (
                          <PermissionGuard permission="partners:approve">
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  setApproveDialog({ open: true, partnerId: partner.id })
                                }
                                className="text-green-600"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  setRejectDialog({
                                    open: true,
                                    partnerId: partner.id,
                                    reason: '',
                                  })
                                }
                                className="text-red-600"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          </PermissionGuard>
                        )}

                        {/* Suspend/Reactivate */}
                        {partner.status === 'approved' && (
                          <PermissionGuard permission="partners:suspend">
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  setSuspendDialog({
                                    open: true,
                                    partnerId: partner.id,
                                    reason: '',
                                  })
                                }
                                className="text-red-600"
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Suspend
                              </DropdownMenuItem>
                            </>
                          </PermissionGuard>
                        )}
                        {partner.status === 'suspended' && (
                          <PermissionGuard permission="partners:reactivate">
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  reactivatePartner.mutate({ partnerId: partner.id })
                                }
                                className="text-green-600"
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Reactivate
                              </DropdownMenuItem>
                            </>
                          </PermissionGuard>
                        )}

                        {/* Trust Score */}
                        <PermissionGuard permission="partners:update_trust_score">
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                setTrustScoreDialog({
                                  open: true,
                                  partnerId: partner.id,
                                  currentScore: partner.trust_score,
                                  newScore: partner.trust_score,
                                  reason: '',
                                })
                              }
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Update Trust Score
                            </DropdownMenuItem>
                          </>
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
        {data?.partners.length === 0 && (
          <div className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No partners found</p>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
          </div>
        )}

        {/* Pagination */}
        {data && data.total > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
            <div className="text-sm text-gray-500">
              Showing {(filters.page! - 1) * filters.limit! + 1} to{' '}
              {Math.min(filters.page! * filters.limit!, data.total)} of {data.total} partners
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

      {/* Approve Dialog */}
      <Dialog open={approveDialog.open} onOpenChange={(open) => setApproveDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Partner Application</DialogTitle>
            <DialogDescription>
              This will approve the partner and allow them to create offers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog({ open: false })}>
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approvePartner.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Partner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => setRejectDialog({ open, reason: '' })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Partner Application</DialogTitle>
            <DialogDescription>Provide a reason for rejection.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="reject-reason">Rejection Reason</Label>
              <Textarea
                id="reject-reason"
                value={rejectDialog.reason}
                onChange={(e) =>
                  setRejectDialog({ ...rejectDialog, reason: e.target.value })
                }
                placeholder="Explain why this application is being rejected..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialog({ open: false, reason: '' })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={!rejectDialog.reason.trim() || rejectPartner.isPending}
              variant="destructive"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog
        open={suspendDialog.open}
        onOpenChange={(open) => setSuspendDialog({ open, reason: '' })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Partner</DialogTitle>
            <DialogDescription>
              This will suspend the partner and deactivate all their offers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="suspend-reason">Suspension Reason</Label>
              <Textarea
                id="suspend-reason"
                value={suspendDialog.reason}
                onChange={(e) =>
                  setSuspendDialog({ ...suspendDialog, reason: e.target.value })
                }
                placeholder="Explain why this partner is being suspended..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSuspendDialog({ open: false, reason: '' })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSuspend}
              disabled={!suspendDialog.reason.trim() || suspendPartner.isPending}
              variant="destructive"
            >
              <Ban className="h-4 w-4 mr-2" />
              Suspend Partner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trust Score Dialog */}
      <Dialog
        open={trustScoreDialog.open}
        onOpenChange={(open) => setTrustScoreDialog({ ...trustScoreDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Trust Score</DialogTitle>
            <DialogDescription>
              Current score: {trustScoreDialog.currentScore}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="new-score">New Trust Score (0-100)</Label>
              <Input
                id="new-score"
                type="number"
                min="0"
                max="100"
                value={trustScoreDialog.newScore}
                onChange={(e) =>
                  setTrustScoreDialog({
                    ...trustScoreDialog,
                    newScore: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="score-reason">Reason for Change</Label>
              <Textarea
                id="score-reason"
                value={trustScoreDialog.reason}
                onChange={(e) =>
                  setTrustScoreDialog({ ...trustScoreDialog, reason: e.target.value })
                }
                placeholder="Explain why the trust score is changing..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setTrustScoreDialog({ open: false, newScore: 0, reason: '' })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateTrustScore}
              disabled={
                !trustScoreDialog.reason.trim() ||
                trustScoreDialog.newScore < 0 ||
                trustScoreDialog.newScore > 100 ||
                updateTrustScore.isPending
              }
            >
              <Shield className="h-4 w-4 mr-2" />
              Update Score
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
