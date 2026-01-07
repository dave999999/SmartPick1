import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Menu, 
  UserPlus, 
  Ban, 
  Gift, 
  Megaphone, 
  RefreshCw 
} from 'lucide-react';
import { toast } from 'sonner';
import { banUser, grantPointsToUser } from '@/lib/api/admin-advanced';
import { logger } from '@/lib/logger';

interface AdminActionsMenuProps {
  onRefresh?: () => void;
}

export function AdminActionsMenu({ onRefresh }: AdminActionsMenuProps) {
  const [showBanUserDialog, setShowBanUserDialog] = useState(false);
  const [showGrantPointsDialog, setShowGrantPointsDialog] = useState(false);
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false);

  // Ban form state
  const [banForm, setBanForm] = useState({
    userEmail: '',
    reason: '',
    banType: 'PERMANENT' as 'PERMANENT' | 'TEMPORARY',
    expiresAt: '',
    notes: '',
  });

  // Grant points form state
  const [grantForm, setGrantForm] = useState({
    userEmail: '',
    points: 0,
    reason: '',
    notes: '',
  });

  // Announcement form state
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    message: '',
    target: 'ALL' as 'ALL' | 'CUSTOMERS' | 'PARTNERS',
  });

  const [processing, setProcessing] = useState(false);

  const handleBanUser = async () => {
    if (!banForm.userEmail || !banForm.reason) {
      toast.error('Email and reason are required');
      return;
    }

    if (banForm.banType === 'TEMPORARY' && !banForm.expiresAt) {
      toast.error('Expiration date required for temporary bans');
      return;
    }

    try {
      setProcessing(true);
      
      // Find user by email first (you'll need to add a function for this)
      // For now, we'll need to pass email to the function
      const expiresAt = banForm.banType === 'PERMANENT' ? null : new Date(banForm.expiresAt).toISOString();
      
      await banUser({
        userEmail: banForm.userEmail,
        reason: banForm.reason,
        banType: banForm.banType,
        expiresAt,
        notes: banForm.notes,
      });

      toast.success(`User ${banForm.userEmail} has been banned`);
      setShowBanUserDialog(false);
      setBanForm({
        userEmail: '',
        reason: '',
        banType: 'PERMANENT',
        expiresAt: '',
        notes: '',
      });
      
      if (onRefresh) onRefresh();
    } catch (error) {
      logger.error('Error banning user:', error);
      toast.error('Failed to ban user');
    } finally {
      setProcessing(false);
    }
  };

  const handleGrantPoints = async () => {
    if (!grantForm.userEmail || !grantForm.points || !grantForm.reason) {
      toast.error('Email, points, and reason are required');
      return;
    }

    try {
      setProcessing(true);
      
      await grantPointsToUser({
        userEmail: grantForm.userEmail,
        points: grantForm.points,
        reason: grantForm.reason,
        adminNotes: grantForm.notes,
      });

      const action = grantForm.points >= 0 ? 'granted' : 'deducted';
      toast.success(`${Math.abs(grantForm.points)} points ${action} for ${grantForm.userEmail}`);
      setShowGrantPointsDialog(false);
      setGrantForm({
        userEmail: '',
        points: 0,
        reason: '',
        notes: '',
      });
      
      if (onRefresh) onRefresh();
    } catch (error) {
      logger.error('Error granting points:', error);
      toast.error('Failed to grant points');
    } finally {
      setProcessing(false);
    }
  };

  const handleSendAnnouncement = async () => {
    if (!announcementForm.title || !announcementForm.message) {
      toast.error('Title and message are required');
      return;
    }

    try {
      setProcessing(true);
      
      // TODO: Implement send announcement function
      logger.log('Sending announcement:', announcementForm);
      
      toast.success('Announcement sent successfully');
      setShowAnnouncementDialog(false);
      setAnnouncementForm({
        title: '',
        message: '',
        target: 'ALL',
      });
    } catch (error) {
      logger.error('Error sending announcement:', error);
      toast.error('Failed to send announcement');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="gap-2 border-gray-300 hover:border-teal-500 hover:text-teal-600 transition-colors"
          >
            <Menu className="w-4 h-4" />
            Quick Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-gray-700">Admin Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setShowBanUserDialog(true)}
            className="cursor-pointer hover:bg-gray-50"
          >
            <Ban className="w-4 h-4 mr-2 text-red-600" />
            <span>Ban User</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setShowGrantPointsDialog(true)}
            className="cursor-pointer hover:bg-gray-50"
          >
            <Gift className="w-4 h-4 mr-2 text-teal-600" />
            <span>Grant/Deduct Points</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setShowAnnouncementDialog(true)}
            className="cursor-pointer hover:bg-gray-50"
          >
            <Megaphone className="w-4 h-4 mr-2 text-blue-600" />
            <span>Send Announcement</span>
          </DropdownMenuItem>
          
          {onRefresh && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onRefresh}
                className="cursor-pointer hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4 mr-2 text-gray-600" />
                <span>Refresh Data</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Ban User Dialog */}
      <Dialog open={showBanUserDialog} onOpenChange={setShowBanUserDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-600" />
              Ban User
            </DialogTitle>
            <DialogDescription>
              Ban a user by email address. They will be unable to access the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ban-email">User Email *</Label>
              <Input
                id="ban-email"
                type="email"
                placeholder="user@example.com"
                value={banForm.userEmail}
                onChange={(e) => setBanForm({ ...banForm, userEmail: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ban-type">Ban Type *</Label>
              <Select
                value={banForm.banType}
                onValueChange={(v) => setBanForm({ ...banForm, banType: v as any })}
              >
                <SelectTrigger id="ban-type">
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
                <Label htmlFor="ban-expires">Expires At *</Label>
                <Input
                  id="ban-expires"
                  type="datetime-local"
                  value={banForm.expiresAt}
                  onChange={(e) => setBanForm({ ...banForm, expiresAt: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="ban-reason">Reason *</Label>
              <Textarea
                id="ban-reason"
                placeholder="e.g., Violated terms of service, spam, fraud..."
                value={banForm.reason}
                onChange={(e) => setBanForm({ ...banForm, reason: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ban-notes">Internal Notes</Label>
              <Textarea
                id="ban-notes"
                placeholder="Additional notes for admin reference..."
                value={banForm.notes}
                onChange={(e) => setBanForm({ ...banForm, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowBanUserDialog(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBanUser}
              disabled={processing}
            >
              {processing ? 'Banning...' : 'Ban User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grant Points Dialog */}
      <Dialog open={showGrantPointsDialog} onOpenChange={setShowGrantPointsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-teal-600" />
              Grant or Deduct Points
            </DialogTitle>
            <DialogDescription>
              Add or remove points from a user's account by email.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="grant-email">User Email *</Label>
              <Input
                id="grant-email"
                type="email"
                placeholder="user@example.com"
                value={grantForm.userEmail}
                onChange={(e) => setGrantForm({ ...grantForm, userEmail: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grant-points">Points *</Label>
              <Input
                id="grant-points"
                type="number"
                placeholder="e.g., 1000 or -500"
                value={grantForm.points || ''}
                onChange={(e) => setGrantForm({ ...grantForm, points: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-gray-500">
                Use positive numbers to grant, negative to deduct
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="grant-reason">Reason *</Label>
              <Input
                id="grant-reason"
                placeholder="e.g., Compensation, Promotion, Error correction..."
                value={grantForm.reason}
                onChange={(e) => setGrantForm({ ...grantForm, reason: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grant-notes">Admin Notes</Label>
              <Textarea
                id="grant-notes"
                placeholder="Additional details..."
                value={grantForm.notes}
                onChange={(e) => setGrantForm({ ...grantForm, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowGrantPointsDialog(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button 
              className="bg-teal-600 hover:bg-teal-700"
              onClick={handleGrantPoints}
              disabled={processing}
            >
              {processing ? 'Processing...' : grantForm.points >= 0 ? 'Grant Points' : 'Deduct Points'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Announcement Dialog */}
      <Dialog open={showAnnouncementDialog} onOpenChange={setShowAnnouncementDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-blue-600" />
              Send Announcement
            </DialogTitle>
            <DialogDescription>
              Send a notification to all users, customers only, or partners only.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="announce-target">Target Audience *</Label>
              <Select
                value={announcementForm.target}
                onValueChange={(v) => setAnnouncementForm({ ...announcementForm, target: v as any })}
              >
                <SelectTrigger id="announce-target">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Users</SelectItem>
                  <SelectItem value="CUSTOMERS">Customers Only</SelectItem>
                  <SelectItem value="PARTNERS">Partners Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="announce-title">Title *</Label>
              <Input
                id="announce-title"
                placeholder="e.g., System Maintenance, New Feature..."
                value={announcementForm.title}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="announce-message">Message *</Label>
              <Textarea
                id="announce-message"
                placeholder="Enter your announcement message..."
                value={announcementForm.message}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowAnnouncementDialog(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleSendAnnouncement}
              disabled={processing}
            >
              {processing ? 'Sending...' : 'Send Announcement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
