import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Flag, AlertTriangle, CheckCircle, XCircle, Eye, Loader2 } from 'lucide-react';
import { getFlaggedContent, updateFlagStatus, autoFlagSuspiciousContent } from '@/lib/api/admin-advanced';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface ModerationPanelProps {
  onStatsUpdate: () => void;
}

export function ModerationPanel({ onStatsUpdate }: ModerationPanelProps) {
  const [flaggedItems, setFlaggedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState<any>(null);
  const [reviewForm, setReviewForm] = useState({
    status: 'RESOLVED' as 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED',
    adminNotes: '',
    resolutionAction: '',
  });

  useEffect(() => {
    loadFlaggedContent();
  }, [statusFilter]);

  const loadFlaggedContent = async () => {
    try {
      setLoading(true);
      const data = await getFlaggedContent(
        statusFilter === 'ALL' ? undefined : (statusFilter as any)
      );
      setFlaggedItems(data);
    } catch (error) {
      logger.error('Error loading flagged content:', error);
      toast.error('Failed to load flagged content');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (flag: any) => {
    setSelectedFlag(flag);
    setReviewForm({
      status: 'RESOLVED',
      adminNotes: '',
      resolutionAction: '',
    });
    setShowReviewDialog(true);
  };

  const confirmReview = async () => {
    if (!selectedFlag) return;

    try {
      await updateFlagStatus(
        selectedFlag.id,
        reviewForm.status,
        reviewForm.adminNotes,
        reviewForm.resolutionAction
      );
      toast.success('Flag status updated');
      setShowReviewDialog(false);
      loadFlaggedContent();
      onStatsUpdate();
    } catch (error) {
      logger.error('Error updating flag:', error);
      toast.error('Failed to update flag status');
    }
  };

  const handleAutoFlag = async () => {
    try {
      const result = await autoFlagSuspiciousContent();
      toast.success(`Auto-flagging complete. New flags created.`);
      loadFlaggedContent();
      onStatsUpdate();
    } catch (error) {
      logger.error('Error auto-flagging:', error);
      toast.error('Failed to run auto-flagging');
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      LOW: 'bg-blue-100 text-blue-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      HIGH: 'bg-orange-100 text-orange-800',
      CRITICAL: 'bg-red-100 text-red-800',
    };
    return (
      <Badge className={colors[severity as keyof typeof colors] || ''}>
        {severity}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const icons = {
      PENDING: <Flag className="h-3 w-3 mr-1" />,
      UNDER_REVIEW: <Eye className="h-3 w-3 mr-1" />,
      RESOLVED: <CheckCircle className="h-3 w-3 mr-1" />,
      DISMISSED: <XCircle className="h-3 w-3 mr-1" />,
    };
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      UNDER_REVIEW: 'bg-blue-100 text-blue-800',
      RESOLVED: 'bg-green-100 text-green-800',
      DISMISSED: 'bg-gray-100 text-gray-800',
    };
    return (
      <Badge className={`${colors[status as keyof typeof colors]} flex items-center w-fit`}>
        {icons[status as keyof typeof icons]}
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getContentTypeBadge = (type: string) => {
    const colors = {
      OFFER: 'bg-purple-100 text-purple-800',
      PARTNER: 'bg-indigo-100 text-indigo-800',
      USER: 'bg-pink-100 text-pink-800',
    };
    return <Badge className={colors[type as keyof typeof colors]}>{type}</Badge>;
  };

  const getSourceBadge = (source: string) => {
    return source === 'SYSTEM_AUTO' ? (
      <Badge className="bg-cyan-100 text-cyan-800">
        <AlertTriangle className="h-3 w-3 mr-1" />
        AUTO
      </Badge>
    ) : (
      <Badge variant="outline">USER REPORT</Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-orange-600" />
                Moderation Queue
              </CardTitle>
              <CardDescription>
                Review flagged offers, partners, and users - Total: {flaggedItems.length}
              </CardDescription>
            </div>
            <Button onClick={handleAutoFlag} variant="outline">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Run Auto-Flagging
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Status Filter */}
          <div className="mb-6">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="DISMISSED">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {flaggedItems.length === 0 ? (
            <div className="text-center py-12">
              <Flag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No flagged content</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Content Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Flagged On</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flaggedItems.map((flag) => (
                    <TableRow key={flag.id}>
                      <TableCell>{getContentTypeBadge(flag.content_type)}</TableCell>
                      <TableCell>{getSourceBadge(flag.flag_source)}</TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="font-medium text-sm">{flag.flag_reason.replace(/_/g, ' ')}</p>
                          {flag.description && (
                            <p className="text-xs text-gray-500 truncate" title={flag.description}>
                              {flag.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getSeverityBadge(flag.severity)}</TableCell>
                      <TableCell>{getStatusBadge(flag.status)}</TableCell>
                      <TableCell>
                        {flag.reporter ? (
                          <div className="text-sm">
                            <p>{flag.reporter.name}</p>
                            <p className="text-gray-500 text-xs">{flag.reporter.email}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">System</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(flag.created_at).toLocaleDateString('ka-GE', {
                          dateStyle: 'short',
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReview(flag)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Flagged Content</DialogTitle>
            <DialogDescription>
              Review and take action on this flag
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Flag Details */}
            <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Content Type:</span>
                {selectedFlag && getContentTypeBadge(selectedFlag.content_type)}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Source:</span>
                {selectedFlag && getSourceBadge(selectedFlag.flag_source)}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Severity:</span>
                {selectedFlag && getSeverityBadge(selectedFlag.severity)}
              </div>
              <div>
                <span className="text-sm font-medium">Reason:</span>
                <p className="text-sm mt-1">{selectedFlag?.flag_reason.replace(/_/g, ' ')}</p>
              </div>
              {selectedFlag?.description && (
                <div>
                  <span className="text-sm font-medium">Description:</span>
                  <p className="text-sm mt-1">{selectedFlag.description}</p>
                </div>
              )}
              {selectedFlag?.reporter && (
                <div>
                  <span className="text-sm font-medium">Reported By:</span>
                  <p className="text-sm mt-1">
                    {selectedFlag.reporter.name} ({selectedFlag.reporter.email})
                  </p>
                </div>
              )}
            </div>

            {/* Review Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Resolution Status</Label>
                <Select
                  value={reviewForm.status}
                  onValueChange={(v) => setReviewForm({ ...reviewForm, status: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="DISMISSED">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Resolution Action (What did you do?)</Label>
                <Input
                  placeholder="e.g., Removed content, Warned user, No action needed..."
                  value={reviewForm.resolutionAction}
                  onChange={(e) => setReviewForm({ ...reviewForm, resolutionAction: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Admin Notes</Label>
                <Textarea
                  placeholder="Additional notes about your review..."
                  value={reviewForm.adminNotes}
                  onChange={(e) => setReviewForm({ ...reviewForm, adminNotes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmReview}>Submit Review</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
