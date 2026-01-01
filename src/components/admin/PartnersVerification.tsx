import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { getPartnersPaged, approvePartner, updatePartner } from '@/lib/admin-api';
import { logAdminAction } from '@/lib/api/admin-advanced';
import { getCurrentUser } from '@/lib/api';
import type { Partner } from '@/lib/types';
import { toast } from 'sonner';
import { checkServerRateLimit } from '@/lib/rateLimiter-server';
import { logger } from '@/lib/logger';

interface Props {
  onStatsUpdate: () => void;
  isActive?: boolean; // Whether this tab is currently visible
}

export default function PartnersVerification({ onStatsUpdate, isActive = true }: Props) {
  const [pending, setPending] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState<Partner | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { items } = await getPartnersPaged({ page: 1, pageSize: 50, status: 'PENDING' });
      setPending(items);
    } catch (e) {
      logger.error(e);
      toast.error('Failed to load pending partners');
    } finally {
      setLoading(false);
    }
  };

  // ✅ OPTIMIZATION: Only load when tab becomes active
  useEffect(() => {
    if (isActive) {
      logger.log('▶️ [PartnersVerification] Loading pending partners - tab is active');
      load();
    } else {
      logger.log('⏸️ [PartnersVerification] Skipping load - tab not active');
    }
  }, [isActive]);

  const open = (p: Partner, a: 'approve' | 'reject') => {
    setSelected(p);
    setAction(a);
    setNote('');
  };
  const close = () => {
    setSelected(null);
    setAction(null);
    setNote('');
  };

  const confirm = async () => {
    if (!selected || !action) return;
    try {
      // Rate limit check for admin actions (100 per hour)
      const { user } = await getCurrentUser();
      if (user?.id) {
        const rateLimitCheck = await checkServerRateLimit('admin_action', user.id);
        if (!rateLimitCheck.allowed) {
          toast.error('Too many admin actions. Please try again later.');
          return;
        }
      }

      if (action === 'approve') {
        await approvePartner(selected.id);
        try { await logAdminAction('PARTNER_APPROVED', 'PARTNER', selected.id, { note }); } catch (logError) {
          logger.warn('Failed to log admin action:', logError);
        }
        toast.success('Partner approved');
      } else {
        await updatePartner(selected.id, { status: 'REJECTED' as any });
        try { await logAdminAction('PARTNER_REJECTED', 'PARTNER', selected.id, { note }); } catch (logError) {
          logger.warn('Failed to log admin action:', logError);
        }
        toast.success('Partner rejected');
      }
      close();
      await load();
      onStatsUpdate();
    } catch (e) {
      logger.error(e);
      toast.error('Action failed');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Partner Verification</CardTitle>
        <CardDescription>Approve or reject pending partners with a note</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-10 text-center text-gray-500">Loading…</div>
        ) : pending.length === 0 ? (
          <div className="text-center py-12">
            <Badge className="bg-green-100 text-green-800">No pending applications</Badge>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.business_name}</TableCell>
                    <TableCell>{p.email}</TableCell>
                    <TableCell>{p.city || '—'}</TableCell>
                    <TableCell>{p.business_type}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => open(p, 'reject')} className="text-red-600">Reject</Button>
                        <Button variant="default" size="sm" onClick={() => open(p, 'approve')} className="bg-green-600 hover:bg-green-700">Approve</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={!!action} onOpenChange={(o) => !o && close()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{action === 'approve' ? 'Approve Partner' : 'Reject Partner'}</DialogTitle>
              <DialogDescription>
                Add an optional note for the audit log.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="Reason or note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-24"
            />
            <DialogFooter>
              <Button variant="outline" onClick={close}>Cancel</Button>
              <Button onClick={confirm} className={action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}>
                {action === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}


