import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Search, Eye, Ban, Gift, Loader2 } from 'lucide-react';
import { getUsersWithPointsSummary, banUser, grantPointsToUser } from '@/lib/api/admin-advanced';
import type { UserPointsSummary } from '@/lib/types/admin';
import { ClaimedPointsModal } from './ClaimedPointsModal';
import { BuyerPurchaseModal } from './BuyerPurchaseModal';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface EnhancedUsersManagementProps {
  onStatsUpdate: () => void;
}

export function EnhancedUsersManagement({ onStatsUpdate }: EnhancedUsersManagementProps) {
  const [users, setUsers] = useState<UserPointsSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'CUSTOMER' | 'PARTNER'>('ALL');
  
  // Modals
  const [showClaimedPointsModal, setShowClaimedPointsModal] = useState(false);
  const [showPurchaseHistoryModal, setShowPurchaseHistoryModal] = useState(false);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [showGrantPointsDialog, setShowGrantPointsDialog] = useState(false);
  
  // Selected user for modals
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
    loadUsers();
  }, [roleFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const role = roleFilter === 'ALL' ? null : roleFilter;
      const data = await getUsersWithPointsSummary(role === null ? undefined : role, 1000, 0);
      // Filter out admins
      const filtered = data.filter((u: any) => u.role !== 'ADMIN');
      setUsers(filtered);
    } catch (error) {
      logger.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

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
      loadUsers();
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
      loadUsers();
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
      ADMIN: 'bg-red-100 text-red-800',
    };
    return <Badge className={colors[role as keyof typeof colors] || ''}>{role}</Badge>;
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
          <CardTitle>Users Management</CardTitle>
          <CardDescription>
            Manage customers and partners (admins excluded) - Total: {filteredUsers.length} users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Roles</SelectItem>
                <SelectItem value="CUSTOMER">Customers Only</SelectItem>
                <SelectItem value="PARTNER">Partners Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name / Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Current Points</TableHead>
                  <TableHead className="text-right">Purchased</TableHead>
                  <TableHead className="text-right">Claimed</TableHead>
                  <TableHead className="text-right">Total Spent (GEL)</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
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
                    <TableCell className="text-right font-semibold">
                      {user.current_points.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto font-normal text-blue-600"
                        onClick={() => handleViewPurchaseHistory(user)}
                      >
                        {user.total_purchased.toLocaleString()}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto font-normal text-purple-600"
                        onClick={() => handleViewClaimedPoints(user)}
                      >
                        {user.total_claimed.toLocaleString()}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      ₾{user.total_gel_spent.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(user.created_at).toLocaleDateString('ka-GE')}
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
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No users found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Claimed Points Modal */}
      {selectedUser && (
        <ClaimedPointsModal
          isOpen={showClaimedPointsModal}
          onClose={() => {
            setShowClaimedPointsModal(false);
            setSelectedUser(null);
          }}
          userId={selectedUser.user_id}
          userName={selectedUser.name}
        />
      )}

      {/* Purchase History Modal */}
      {selectedUser && (
        <BuyerPurchaseModal
          isOpen={showPurchaseHistoryModal}
          onClose={() => {
            setShowPurchaseHistoryModal(false);
            setSelectedUser(null);
          }}
          userId={selectedUser.user_id}
        />
      )}

      {/* Ban User Dialog */}
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
                placeholder="e.g., Compensation, Promotion, Error correction..."
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
