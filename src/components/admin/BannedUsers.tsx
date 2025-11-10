import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserX, Shield, AlertCircle, Clock } from 'lucide-react';
import { getBannedUsers, unbanUser } from '@/lib/admin-api';
import type { User } from '@/lib/types';
import { toast } from 'sonner';

export function BannedUsers() {
  const [bannedUsers, setBannedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUnbanDialog, setShowUnbanDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [unbanning, setUnbanning] = useState(false);

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

  const handleUnban = async () => {
    if (!selectedUser) return;

    try {
      setUnbanning(true);
      await unbanUser(selectedUser.id);
      toast.success(`${selectedUser.name || selectedUser.email} has been unbanned`);
      setShowUnbanDialog(false);
      setSelectedUser(null);
      loadBannedUsers(); // Reload list
    } catch (error) {
      logger.error('Error unbanning user:', error);
      toast.error('Failed to unban user');
    } finally {
      setUnbanning(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading banned users...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserX className="w-5 h-5 text-red-600" />
                Banned Users
              </CardTitle>
              <CardDescription>
                Users banned for repeated no-shows (3+ missed pickups)
              </CardDescription>
            </div>
            <Badge variant="destructive" className="text-lg px-4 py-2">
              {bannedUsers.length} Banned
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {bannedUsers.length === 0 ? (
            <Alert className="bg-green-50 border-green-200">
              <Shield className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                No banned users. All users are in good standing! ✅
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Alert className="mb-4 bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-900">
                  <strong>Penalty System:</strong> 1st no-show = 30 min penalty, 2nd = 1 hour penalty, 3rd = permanent ban
                </AlertDescription>
              </Alert>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>No-Shows</TableHead>
                    <TableHead>Banned On</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bannedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <UserX className="w-4 h-4 text-red-600" />
                          {user.name || 'Unknown'}
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">
                          {user.penalty_count || 3}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          {user.updated_at ? formatDate(user.updated_at) : 'Unknown'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUnbanDialog(true);
                          }}
                          className="text-green-600 border-green-600 hover:bg-green-50"
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          Unban
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      {/* Unban Confirmation Dialog */}
      <Dialog open={showUnbanDialog} onOpenChange={setShowUnbanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unban User</DialogTitle>
            <DialogDescription>
              Are you sure you want to unban this user? This will:
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <strong>{selectedUser.name || selectedUser.email}</strong>
                  <div className="mt-2 space-y-1 text-sm">
                    <div>✅ Restore account to ACTIVE status</div>
                    <div>✅ Reset penalty count to 0</div>
                    <div>✅ Remove all penalty restrictions</div>
                    <div>✅ Allow new reservations</div>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-sm text-yellow-900">
                  <strong>Note:</strong> The user will start fresh with 0 no-shows.
                  If they miss pickups again, penalties will apply (30 min → 1 hour → ban).
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUnbanDialog(false);
                setSelectedUser(null);
              }}
              disabled={unbanning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUnban}
              disabled={unbanning}
              className="bg-green-600 hover:bg-green-700"
            >
              {unbanning ? 'Unbanning...' : 'Yes, Unban User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

