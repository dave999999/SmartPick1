import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ShieldOff, Unlock, Loader2, Eye } from 'lucide-react';
import { getBannedUsers, unbanUser } from '@/lib/api/admin-advanced';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface BannedUsersPanelProps {
  onStatsUpdate: () => void;
}

export function BannedUsersPanel({ onStatsUpdate }: BannedUsersPanelProps) {
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUnbanDialog, setShowUnbanDialog] = useState(false);
  const [selectedBan, setSelectedBan] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    loadBannedUsers();
  }, []);

  const loadBannedUsers = async () => {
    try {
      setLoading(true);
      const data = await getBannedUsers();
      setBannedUsers(data);
    } catch (error) {
      logger.error('Error loading banned users:', error);
      toast.error('Failed to load banned users');
    } finally {
      setLoading(false);
    }
  };

  const handleUnban = (ban: any) => {
    setSelectedBan(ban);
    setShowUnbanDialog(true);
  };

  const confirmUnban = async () => {
    if (!selectedBan) return;

    try {
      await unbanUser(selectedBan.user_id);
      toast.success(`User ${selectedBan.user?.name} has been unbanned`);
      setShowUnbanDialog(false);
      setSelectedBan(null);
      loadBannedUsers();
      onStatsUpdate();
    } catch (error) {
      logger.error('Error unbanning user:', error);
      toast.error('Failed to unban user');
    }
  };

  const handleViewDetails = (ban: any) => {
    setSelectedBan(ban);
    setShowDetailsDialog(true);
  };

  const getBanTypeBadge = (banType: string) => {
    return banType === 'PERMANENT' ? (
      <Badge variant="destructive">PERMANENT</Badge>
    ) : (
      <Badge className="bg-orange-100 text-orange-800">TEMPORARY</Badge>
    );
  };

  const isExpiringSoon = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffHours = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours > 0 && diffHours < 24; // Expires within 24 hours
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
          <CardTitle className="flex items-center gap-2">
            <ShieldOff className="h-5 w-5 text-red-600" />
            Banned Users
          </CardTitle>
          <CardDescription>
            Users currently banned from the platform - Total: {bannedUsers.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bannedUsers.length === 0 ? (
            <div className="text-center py-12">
              <ShieldOff className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No banned users</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Banned By</TableHead>
                    <TableHead>Ban Type</TableHead>
                    <TableHead>Banned On</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bannedUsers.map((ban) => (
                    <TableRow key={ban.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{ban.user?.name || 'N/A'}</p>
                          <p className="text-sm text-gray-500">{ban.user?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{ban.admin?.name || 'N/A'}</p>
                          <p className="text-gray-500">{ban.admin?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getBanTypeBadge(ban.ban_type)}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(ban.created_at).toLocaleDateString('ka-GE', {
                          dateStyle: 'medium',
                        })}
                      </TableCell>
                      <TableCell>
                        {ban.expires_at ? (
                          <div>
                            <p className="text-sm">
                              {new Date(ban.expires_at).toLocaleDateString('ka-GE', {
                                dateStyle: 'medium',
                              })}
                            </p>
                            {isExpiringSoon(ban.expires_at) && (
                              <Badge className="bg-yellow-100 text-yellow-800 mt-1">
                                Expires Soon
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="text-sm text-gray-700 truncate" title={ban.reason}>
                            {ban.reason}
                          </p>
                          {ban.internal_notes && (
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 h-auto text-xs"
                              onClick={() => handleViewDetails(ban)}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View Details
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnban(ban)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <Unlock className="h-4 w-4 mr-1" />
                          Unban
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

      {/* Unban Confirmation Dialog */}
      <Dialog open={showUnbanDialog} onOpenChange={setShowUnbanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unban User</DialogTitle>
            <DialogDescription>
              Are you sure you want to unban "{selectedBan?.user?.name}"? They will regain full access to the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Banned By:</span>
                <span className="font-medium">{selectedBan?.admin?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Ban Type:</span>
                <span className="font-medium">{selectedBan?.ban_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Banned On:</span>
                <span className="font-medium">
                  {selectedBan && new Date(selectedBan.created_at).toLocaleDateString('ka-GE')}
                </span>
              </div>
              <div className="pt-2 border-t">
                <p className="text-gray-600 mb-1">Reason:</p>
                <p className="font-medium">{selectedBan?.reason}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnbanDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmUnban} className="bg-green-600 hover:bg-green-700">
              <Unlock className="h-4 w-4 mr-2" />
              Unban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban Details - {selectedBan?.user?.name}</DialogTitle>
            <DialogDescription>
              Complete information about this ban
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">User</label>
                <p className="text-sm mt-1">{selectedBan?.user?.name} ({selectedBan?.user?.email})</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Banned By</label>
                <p className="text-sm mt-1">{selectedBan?.admin?.name} ({selectedBan?.admin?.email})</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Ban Type</label>
                <p className="text-sm mt-1">{selectedBan?.ban_type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Banned On</label>
                <p className="text-sm mt-1">
                  {selectedBan && new Date(selectedBan.created_at).toLocaleString('ka-GE')}
                </p>
              </div>
              {selectedBan?.expires_at && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Expires At</label>
                  <p className="text-sm mt-1">
                    {new Date(selectedBan.expires_at).toLocaleString('ka-GE')}
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-600">Reason</label>
                <p className="text-sm mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                  {selectedBan?.reason}
                </p>
              </div>
              {selectedBan?.internal_notes && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Internal Notes (Admin Only)</label>
                  <p className="text-sm mt-1 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200">
                    {selectedBan.internal_notes}
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowDetailsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
