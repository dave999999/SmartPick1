import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { getBuyerPurchaseDetails } from '@/lib/api/admin-advanced';
import type { BuyerPurchaseDetail } from '@/lib/types/admin';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface BuyerPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string; // If provided, shows details for specific user
}

export function BuyerPurchaseModal({ isOpen, onClose, userId }: BuyerPurchaseModalProps) {
  const [purchases, setPurchases] = useState<BuyerPurchaseDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalPurchases: 0,
    totalPoints: 0,
    totalGel: 0,
    avgPurchase: 0,
  });

  useEffect(() => {
    if (isOpen) {
      loadPurchases();
    }
  }, [isOpen, userId]);

  const loadPurchases = async () => {
    try {
      setLoading(true);
      const data = await getBuyerPurchaseDetails(userId);
      setPurchases(data);

      // Calculate summary
      const totalPurchases = data.length;
      const totalPoints = data.reduce((sum: number, p: any) => sum + (p.points_purchased || 0), 0);
      const totalGel = data.reduce((sum: number, p: any) => sum + (p.amount_paid_gel || 0), 0);
      const avgPurchase = totalPurchases > 0 ? totalGel / totalPurchases : 0;

      setSummary({ totalPurchases, totalPoints, totalGel, avgPurchase });
    } catch (error) {
      logger.error('Error loading buyer purchases:', error);
      toast.error('Failed to load purchase details');
    } finally {
      setLoading(false);
    }
  };

  const exportToCsv = () => {
    const headers = ['Date', 'User Name', 'Email', 'Points Purchased', 'Amount Paid (GEL)'];
    const rows = purchases.map(p => [
      new Date(p.purchase_date).toLocaleString('ka-GE'),
      p.user_name,
      p.user_email,
      p.points_purchased,
      p.amount_paid_gel.toFixed(2),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `buyer-purchases-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    toast.success('Purchase history exported');
  };

  // Group purchases by user for summary view
  const buyerSummaries = purchases.reduce((acc: any, purchase: BuyerPurchaseDetail) => {
    const key = purchase.user_id;
    if (!acc[key]) {
      acc[key] = {
        user_id: purchase.user_id,
        user_name: purchase.user_name,
        user_email: purchase.user_email,
        total_purchases: 0,
        total_points: 0,
        total_gel: 0,
        last_purchase: purchase.purchase_date,
      };
    }
    acc[key].total_purchases += 1;
    acc[key].total_points += purchase.points_purchased;
    acc[key].total_gel += purchase.amount_paid_gel;
    if (new Date(purchase.purchase_date) > new Date(acc[key].last_purchase)) {
      acc[key].last_purchase = purchase.purchase_date;
    }
    return acc;
  }, {});

  const buyersList = Object.values(buyerSummaries).sort(
    (a: any, b: any) => b.total_gel - a.total_gel
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {userId ? 'User Purchase History' : 'All Point Purchases'}
          </DialogTitle>
          <DialogDescription>
            Detailed view of point purchases in GEL (Georgian Lari)
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Purchases</p>
                <p className="text-2xl font-bold">{summary.totalPurchases}</p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
                <p className="text-2xl font-bold">₾{summary.totalGel.toFixed(2)}</p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Points Sold</p>
                <p className="text-2xl font-bold">{summary.totalPoints.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Purchase</p>
                <p className="text-2xl font-bold">₾{summary.avgPurchase.toFixed(2)}</p>
              </div>
            </div>

            {/* Export Button */}
            <div className="flex justify-end">
              <Button onClick={exportToCsv} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export to CSV
              </Button>
            </div>

            {/* Show buyer summaries if viewing all purchases */}
            {!userId && buyersList.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Top Buyers</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Purchases</TableHead>
                      <TableHead className="text-right">Points Bought</TableHead>
                      <TableHead className="text-right">Total Spent (GEL)</TableHead>
                      <TableHead>Last Purchase</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {buyersList.slice(0, 10).map((buyer: any) => (
                      <TableRow key={buyer.user_id}>
                        <TableCell className="font-medium">{buyer.user_name}</TableCell>
                        <TableCell className="text-sm text-gray-600">{buyer.user_email}</TableCell>
                        <TableCell className="text-right">{buyer.total_purchases}</TableCell>
                        <TableCell className="text-right">{buyer.total_points.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold">
                          ₾{buyer.total_gel.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(buyer.last_purchase).toLocaleDateString('ka-GE')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Detailed Purchase History */}
            <div>
              <h3 className="text-lg font-semibold mb-3">
                {userId ? 'Purchase History' : 'Recent Transactions'}
              </h3>
              {purchases.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No purchases found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      {!userId && <TableHead>User</TableHead>}
                      {!userId && <TableHead>Email</TableHead>}
                      <TableHead className="text-right">Points</TableHead>
                      <TableHead className="text-right">Amount (GEL)</TableHead>
                      <TableHead className="text-right">Price per 100 pts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.slice(0, userId ? undefined : 50).map((purchase) => {
                      const pricePerHundred = (purchase.amount_paid_gel / purchase.points_purchased) * 100;
                      return (
                        <TableRow key={purchase.transaction_id}>
                          <TableCell>
                            {new Date(purchase.purchase_date).toLocaleString('ka-GE', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </TableCell>
                          {!userId && <TableCell className="font-medium">{purchase.user_name}</TableCell>}
                          {!userId && <TableCell className="text-sm text-gray-600">{purchase.user_email}</TableCell>}
                          <TableCell className="text-right">
                            <Badge variant="secondary">{purchase.points_purchased.toLocaleString()}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ₾{purchase.amount_paid_gel.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-sm text-gray-600">
                            ₾{pricePerHundred.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
