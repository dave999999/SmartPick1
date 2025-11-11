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
import { Loader2 } from 'lucide-react';
import { getUserClaimedPointsDetails } from '@/lib/api/admin-advanced';
import type { ClaimedPointsDetail } from '@/lib/types/admin';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface ClaimedPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

const SOURCE_COLORS = {
  ACHIEVEMENT: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  REFERRAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  BONUS: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  REWARD: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  OTHER: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
};

export function ClaimedPointsModal({ isOpen, onClose, userId, userName }: ClaimedPointsModalProps) {
  const [claims, setClaims] = useState<ClaimedPointsDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalClaimed: 0,
    bySource: {} as Record<string, number>,
  });

  useEffect(() => {
    if (isOpen && userId) {
      loadClaims();
    }
  }, [isOpen, userId]);

  const loadClaims = async () => {
    try {
      setLoading(true);
      const data = await getUserClaimedPointsDetails(userId);
      setClaims(data);

      // Calculate summary
      const totalClaimed = data.reduce((sum: number, c: any) => sum + (c.points_claimed || 0), 0);
      const bySource = data.reduce((acc: any, c: any) => {
        const source = c.claim_source || 'OTHER';
        acc[source] = (acc[source] || 0) + c.points_claimed;
        return acc;
      }, {});

      setSummary({ totalClaimed, bySource });
    } catch (error) {
      logger.error('Error loading claimed points:', error);
      toast.error('Failed to load claimed points details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Claimed Points History - {userName}</DialogTitle>
          <DialogDescription>
            Points earned through achievements, referrals, bonuses, and rewards
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="col-span-1 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Claimed</p>
                <p className="text-2xl font-bold">{summary.totalClaimed.toLocaleString()}</p>
              </div>
              {Object.entries(summary.bySource).map(([source, amount]) => (
                <div key={source} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{source}</p>
                  <p className="text-xl font-bold">{(amount as number).toLocaleString()}</p>
                </div>
              ))}
            </div>

            {/* Claims History */}
            {claims.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No claimed points found</p>
            ) : (
              <div>
                <h3 className="text-lg font-semibold mb-3">Claim History</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claims.map((claim, index) => (
                      <TableRow key={claim.transaction_id || index}>
                        <TableCell>
                          {new Date(claim.claim_date).toLocaleString('ka-GE', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge className={SOURCE_COLORS[claim.claim_source]}>
                            {claim.claim_source}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="text-sm text-gray-700 dark:text-gray-300 truncate" title={claim.source_description}>
                            {claim.source_description}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-green-600">
                            +{claim.points_claimed.toLocaleString()}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
