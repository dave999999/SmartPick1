import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DollarSign, Download, TrendingUp, Users, Package, CheckCircle } from 'lucide-react';
import {
  getPlatformRevenueStats,
  getPartnerPayouts,
  createPartnerPayout,
  updatePayoutStatus,
  exportFinancialReport,
} from '@/lib/api/admin-advanced';
import { getAllPartners } from '@/lib/admin-api';
import type { RevenueStats, PartnerPayout } from '@/lib/types/admin';
import type { Partner } from '@/lib/types';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export default function FinancialDashboardPanel() {
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [payouts, setPayouts] = useState<PartnerPayout[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [createPayoutDialogOpen, setCreatePayoutDialogOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState('');
  const [commissionRate, setCommissionRate] = useState('15');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get stats for last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const [stats, payoutsData, partnersData] = await Promise.all([
        getPlatformRevenueStats(startDate.toISOString(), endDate.toISOString()),
        getPartnerPayouts(),
        getAllPartners()
      ]);

      setRevenueStats(stats);
      setPayouts(payoutsData);
      setPartners(partnersData);
    } catch (error) {
      logger.error('Error loading financial data:', error);
      toast.error('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayout = async () => {
    if (!selectedPartner) {
      toast.error('Please select a partner');
      return;
    }

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      await createPartnerPayout(
        selectedPartner,
        startDate.toISOString(),
        endDate.toISOString(),
        parseFloat(commissionRate)
      );

      toast.success('Payout created successfully');
      setCreatePayoutDialogOpen(false);
      setSelectedPartner('');
      await loadData();
    } catch (error) {
      logger.error('Error creating payout:', error);
      toast.error('Failed to create payout');
    }
  };

  const handleUpdatePayoutStatus = async (payoutId: string, status: 'PAID' | 'CANCELLED') => {
    try {
      await updatePayoutStatus(payoutId, status);
      toast.success(`Payout marked as ${status.toLowerCase()}`);
      await loadData();
    } catch (error) {
      logger.error('Error updating payout:', error);
      toast.error('Failed to update payout');
    }
  };

  const handleExportReport = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const csv = await exportFinancialReport(startDate.toISOString(), endDate.toISOString());

      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success('Report exported successfully');
    } catch (error) {
      logger.error('Error exporting report:', error);
      toast.error('Failed to export report');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00C896]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Revenue Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Revenue (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#00C896]">
              ₾{revenueStats?.total_revenue.toFixed(2) || '0.00'}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              <TrendingUp className="w-3 h-3" />
              Platform-wide
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Reservations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {revenueStats?.total_reservations || 0}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              <Package className="w-3 h-3" />
              Last 30 days
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {revenueStats?.completion_rate.toFixed(1) || 0}%
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              <CheckCircle className="w-3 h-3" />
              Pickup success
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Avg Order Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₾{revenueStats?.average_order_value.toFixed(2) || '0.00'}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              <DollarSign className="w-3 h-3" />
              Per reservation
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={() => setCreatePayoutDialogOpen(true)}>
          <DollarSign className="w-4 h-4 mr-2" />
          Create Payout
        </Button>
        <Button variant="outline" onClick={handleExportReport}>
          <Download className="w-4 h-4 mr-2" />
          Export Report (CSV)
        </Button>
      </div>

      {/* Partner Payouts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Partner Payouts</CardTitle>
          <CardDescription>Manage partner commission payouts</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Payout</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500">
                    No payouts created yet
                  </TableCell>
                </TableRow>
              ) : (
                payouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell className="font-medium">
                      {payout.partner?.business_name}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(payout.period_start).toLocaleDateString()} -{' '}
                      {new Date(payout.period_end).toLocaleDateString()}
                    </TableCell>
                    <TableCell>₾{payout.total_revenue.toFixed(2)}</TableCell>
                    <TableCell>
                      ₾{payout.commission_amount.toFixed(2)}
                      <span className="text-xs text-gray-500 ml-1">
                        ({payout.commission_rate}%)
                      </span>
                    </TableCell>
                    <TableCell className="font-bold">
                      ₾{payout.payout_amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          payout.status === 'PAID'
                            ? 'default'
                            : payout.status === 'PENDING'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {payout.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {payout.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdatePayoutStatus(payout.id, 'PAID')}
                          >
                            Mark Paid
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleUpdatePayoutStatus(payout.id, 'CANCELLED')}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Payout Dialog */}
      <Dialog open={createPayoutDialogOpen} onOpenChange={setCreatePayoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Partner Payout</DialogTitle>
            <DialogDescription>
              Generate a payout for a partner based on last 30 days
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Partner</Label>
              <select
                className="w-full mt-1 px-3 py-2 border rounded-md"
                value={selectedPartner}
                onChange={(e) => setSelectedPartner(e.target.value)}
              >
                <option value="">Select a partner...</option>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.business_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Commission Rate (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatePayoutDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePayout}>Create Payout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

