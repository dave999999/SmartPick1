import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Gift, Ban, Eye, Loader2, UserPlus } from 'lucide-react';
import { getUsersWithPointsSummary, banUser, grantPointsToUser } from '@/lib/api/admin-advanced';
import type { UserPointsSummary } from '@/lib/types/admin';
import { ClaimedPointsModal } from './ClaimedPointsModal';
import { BuyerPurchaseModal } from './BuyerPurchaseModal';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface NewUsersPanelProps {
  onStatsUpdate: () => void;
}

export function NewUsersPanel({ onStatsUpdate }: NewUsersPanelProps) {
  const [users, setUsers] = useState<UserPointsSummary[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showClaimedPointsModal, setShowClaimedPointsModal] = useState(false);
  const [showPurchaseHistoryModal, setShowPurchaseHistoryModal] = useState(false);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [showGrantPointsDialog, setShowGrantPointsDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserPointsSummary | null>(null);
  
  // Ban form
  const [banForm, setBanForm] = useState({
    reason: '',
    banType: 'PERMANENT' as 'PERMANENT' | 'TEMPORARY',
    expiresAt: '',
    internalNotes: '',
  });
  
  // Grant points form
  const [grantForm, setGrantForm] = useState({
    points: 0,
    reason: '',
    notes: '',
  });

  useEffect(() => {
    loadNewUsers();
  }, []);

  const loadNewUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await getUsersWithPointsSummary(undefined, 1000, 0);
      
      // Filter users registered in last 7 days and exclude admins
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const newUsers = allUsers.filter((u: any) => {
        const createdDate = new Date(u.created_at);
        return createdDate >= sevenDaysAgo && u.role !== 'ADMIN';
      });
      
      setUsers(newUsers);
    } catch (error) {
      logger.error('Error loading new users:', error);
      toast.error('Failed to load new users');
    } finally {
      setLoading(false);
    }
  };

  const handleViewClaimedPoints = (user: UserPointsSummary) => {
    setSelectedUser(user);
    setShowClaimedPointsModal(true);
  };

  const handleViewPurchaseHistory = (user: UserPointsSummary) => {
    setSelectedUser(user);
    setShowPurchaseHistoryModal(true);
  };

  const handleBanUser = (user: UserPointsSummary) => {
    setSelectedUser(user);
    setBanForm({
      reason: '',
      banType: 'PERMANENT',
      expiresAt: '',
      internalNotes: '',
    });
    setShowBanDialog(true);
  };

  const confirmBan = async () => {
    if (!selectedUser || !banForm.reason.trim()) {
      toast.error('Please provide a reason for the ban');
      return;
    }

    try {
      await banUser(
        selectedUser.user_id,
        banForm.reason,
        banForm.banType,
        banForm.banType === 'TEMPORARY' ? banForm.expiresAt : undefined,
        banForm.internalNotes
      );
      toast.success(`User ${selectedUser.name} has been banned`);
      setShowBanDialog(false);
      loadNewUsers();
      onStatsUpdate();
    } catch (error) {
      logger.error('Error banning user:', error);
      toast.error('Failed to ban user');
    }
  };

  const handleGrantPoints = (user: UserPointsSummary) => {
    setSelectedUser(user);
    setGrantForm({
      points: 0,
      reason: '',
      notes: '',
    });
    setShowGrantPointsDialog(true);
  };

  const confirmGrantPoints = async () => {
    if (!selectedUser || grantForm.points === 0 || !grantForm.reason.trim()) {
      toast.error('Please provide points amount and reason');
      return;
    }

    try {
      await grantPointsToUser(
        selectedUser.user_id,
        grantForm.points,
        grantForm.reason,
        grantForm.notes
      );
      toast.success(`${grantForm.points > 0 ? 'Granted' : 'Deducted'} ${Math.abs(grantForm.points)} points to ${selectedUser.name}`);
      setShowGrantPointsDialog(false);
      loadNewUsers();
      onStatsUpdate();
    } catch (error) {
      logger.error('Error granting points:', error);
      toast.error('Failed to grant points');
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      CUSTOMER: 'bg-blue-100 text-blue-800',
      PARTNER: 'bg-purple-100 text-purple-800',
    };
    return <Badge className={colors[role as keyof typeof colors] || ''}>{role}</Badge>;
  };

  const getDaysAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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
            <UserPlus className="h-5 w-5" />
            New Users (Last 7 Days)
          </CardTitle>
          <CardDescription>
            Recently registered users - Total: {users.length} new users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No new users registered in the last 7 days</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name / Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead className="text-right">Current Points</TableHead>
                    <TableHead className="text-right">Purchased</TableHead>
                    <TableHead className="text-right">Claimed</TableHead>
                    <TableHead className="text-right">Spent (GEL)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const daysAgo = getDaysAgo(user.created_at);
                    return (
                      <TableRow key={user.user_id} className={user.is_banned ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.name || 'N/A'}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                            {user.is_banned && (
                              <Badge variant="destructive" className="mt-1">BANNED</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{new Date(user.created_at).toLocaleDateString('ka-GE')}</p>
                            <Badge variant="secondary" className="mt-1">
                              {daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {user.current_points.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {user.total_purchased > 0 ? (
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 h-auto font-normal text-blue-600"
                              onClick={() => handleViewPurchaseHistory(user)}
                            >
                              {user.total_purchased.toLocaleString()}
                            </Button>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {user.total_claimed > 0 ? (
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 h-auto font-normal text-purple-600"
                              onClick={() => handleViewClaimedPoints(user)}
                            >
                              {user.total_claimed.toLocaleString()}
                            </Button>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          ₾{user.total_gel_spent.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleGrantPoints(user)}
                              title="Grant/Deduct Points"
                            >
                              <Gift className="h-4 w-4" />
                            </Button>
                            {!user.is_banned && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleBanUser(user)}
                                className="text-red-600 hover:text-red-700"
                                title="Ban User"
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {selectedUser && (
        <>
          <ClaimedPointsModal
            isOpen={showClaimedPointsModal}
            onClose={() => {
              setShowClaimedPointsModal(false);
              setSelectedUser(null);
            }}
            userId={selectedUser.user_id}
            userName={selectedUser.name}
          />

          <BuyerPurchaseModal
            isOpen={showPurchaseHistoryModal}
            onClose={() => {
              setShowPurchaseHistoryModal(false);
              setSelectedUser(null);
            }}
            userId={selectedUser.user_id}
          />
        </>
      )}

      {/* Ban Dialog */}
      <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban User - {selectedUser?.name}</DialogTitle>
            <DialogDescription>
              This user will be unable to access the platform
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Ban Type</Label>
              <Select
                value={banForm.banType}
                onValueChange={(v) => setBanForm({ ...banForm, banType: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERMANENT">Permanent</SelectItem>
                  <SelectItem value="TEMPORARY">Temporary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {banForm.banType === 'TEMPORARY' && (
              <div className="space-y-2">
                <Label>Expires At</Label>
                <Input
                  type="datetime-local"
                  value={banForm.expiresAt}
                  onChange={(e) => setBanForm({ ...banForm, expiresAt: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Reason (Required)</Label>
              <Textarea
                placeholder="e.g., Violated terms of service, spam, fraud..."
                value={banForm.reason}
                onChange={(e) => setBanForm({ ...banForm, reason: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Internal Notes (Optional)</Label>
              <Textarea
                placeholder="Additional notes for admin reference..."
                value={banForm.internalNotes}
                onChange={(e) => setBanForm({ ...banForm, internalNotes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBanDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmBan}>Ban User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grant Points Dialog */}
      <Dialog open={showGrantPointsDialog} onOpenChange={setShowGrantPointsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant/Deduct Points - {selectedUser?.name}</DialogTitle>
            <DialogDescription>
              Current balance: {selectedUser?.current_points.toLocaleString()} points
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Points (Use negative to deduct)</Label>
              <Input
                type="number"
                placeholder="e.g., 1000 or -500"
                value={grantForm.points || ''}
                onChange={(e) => setGrantForm({ ...grantForm, points: parseInt(e.target.value) || 0 })}
              />
              <p className="text-sm text-gray-600">
                New balance: {((selectedUser?.current_points || 0) + grantForm.points).toLocaleString()} points
              </p>
            </div>
            <div className="space-y-2">
              <Label>Reason (Required)</Label>
              <Input
                placeholder="e.g., Welcome bonus, Compensation, Promotion..."
                value={grantForm.reason}
                onChange={(e) => setGrantForm({ ...grantForm, reason: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Admin Notes (Optional)</Label>
              <Textarea
                placeholder="Additional details..."
                value={grantForm.notes}
                onChange={(e) => setGrantForm({ ...grantForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGrantPointsDialog(false)}>Cancel</Button>
            <Button onClick={confirmGrantPoints}>
              {grantForm.points >= 0 ? 'Grant Points' : 'Deduct Points'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
