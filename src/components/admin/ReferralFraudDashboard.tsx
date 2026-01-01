import { logger } from '@/lib/logger';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, Shield, Ban } from 'lucide-react';
import { toast } from 'sonner';
// Removed unused date-fns import

interface ReferralTracking {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  referral_code: string;
  ip_address: string;
  user_agent: string;
  device_fingerprint: string;
  claimed_at: string;
  suspicious_score: number;
  flagged: boolean;
  flag_reason: string | null;
  referrer_email?: string;
  referred_email?: string;
}

export default function ReferralFraudDashboard() {
  const [flaggedReferrals, setFlaggedReferrals] = useState<ReferralTracking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    loadFlaggedReferrals();
  }, []);

  const loadFlaggedReferrals = async () => {
    try {
      setIsLoading(true);

      // Fetch flagged referrals with user email info
      const { data, error } = await supabase
        .from('referral_tracking')
        .select(`
          *,
          referrer:users!referrer_id(email),
          referred:users!referred_user_id(email)
        `)
        .eq('flagged', true)
        .order('claimed_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const enriched = data.map((item: any) => ({
        ...item,
        referrer_email: item.referrer?.email,
        referred_email: item.referred?.email,
      }));

      setFlaggedReferrals(enriched);
    } catch (error) {
      logger.error('Error loading flagged referrals:', error);
      toast.error('Failed to load flagged referrals');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewAction = async (trackingId: string, action: string, reason?: string) => {
    try {
      setActionInProgress(trackingId);

      const { data, error } = await supabase.rpc('admin_review_referral', {
        p_tracking_id: trackingId,
        p_action: action,
        p_reason: reason,
      });

      if (error) throw error;

      const result = data as { success: boolean; message?: string; error?: string };

      if (result.success) {
        toast.success(result.message || 'Action completed');
        await loadFlaggedReferrals(); // Reload data
      } else {
        toast.error(result.error || 'Action failed');
      }
    } catch (error) {
      logger.error('Error reviewing referral:', error);
      toast.error('Failed to process action');
    } finally {
      setActionInProgress(null);
    }
  };

  const getSeverityColor = (score: number) => {
    if (score >= 100) return 'bg-red-500';
    if (score >= 80) return 'bg-orange-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getSeverityLabel = (score: number) => {
    if (score >= 100) return 'Critical';
    if (score >= 80) return 'High';
    if (score >= 50) return 'Medium';
    return 'Low';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Referral Fraud Detection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-500" />
                Referral Fraud Detection Dashboard
              </CardTitle>
              <CardDescription>
                Review and manage suspicious referral activities
              </CardDescription>
            </div>
            <Button onClick={loadFlaggedReferrals} variant="outline" size="sm">
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {flaggedReferrals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <p>No flagged referrals found. System is healthy! 🎉</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Risk Score</TableHead>
                    <TableHead>Referrer</TableHead>
                    <TableHead>Referred User</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Device FP</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flaggedReferrals.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell className="text-sm">
                        {format(new Date(referral.claimed_at), 'MMM dd, HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getSeverityColor(referral.suspicious_score)} text-white`}>
                          {referral.suspicious_score} - {getSeverityLabel(referral.suspicious_score)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium">{referral.referrer_email}</span>
                          <span className="text-xs text-gray-500">Code: {referral.referral_code}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{referral.referred_email}</TableCell>
                      <TableCell className="text-xs font-mono">{referral.ip_address || 'N/A'}</TableCell>
                      <TableCell className="text-xs font-mono truncate max-w-[100px]" title={referral.device_fingerprint}>
                        {referral.device_fingerprint || 'N/A'}
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px]">
                        {referral.flag_reason || 'Auto-flagged'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2"
                            onClick={() => handleReviewAction(referral.id, 'unflag')}
                            disabled={actionInProgress === referral.id}
                            title="Approve referral"
                          >
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2"
                            onClick={() => handleReviewAction(referral.id, 'restrict_user', 'Manual review - abuse detected')}
                            disabled={actionInProgress === referral.id}
                            title="Restrict user"
                          >
                            <Ban className="h-3 w-3 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Flagged</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{flaggedReferrals.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Critical Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {flaggedReferrals.filter((r) => r.suspicious_score >= 100).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {flaggedReferrals.filter((r) => r.suspicious_score >= 80 && r.suspicious_score < 100).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Medium Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {flaggedReferrals.filter((r) => r.suspicious_score >= 50 && r.suspicious_score < 80).length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
