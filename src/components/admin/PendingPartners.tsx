import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, XCircle, Eye, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Partner } from '@/lib/types';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface PendingPartnersProps {
  onStatsUpdate: () => void;
}

export function PendingPartners({ onStatsUpdate }: PendingPartnersProps) {
  const [pendingPartners, setPendingPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [partnerToReject, setPartnerToReject] = useState<Partner | null>(null);

  useEffect(() => {
    loadPendingPartners();
    
    // Subscribe to realtime changes on partners table
    const channel = supabase
      .channel('pending-partners-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'partners',
          filter: 'status=in.(pending,PENDING)'
        },
        (payload) => {
          logger.log('Realtime update received:', payload);
          // Reload pending partners when any change occurs
          loadPendingPartners();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadPendingPartners = async () => {
    try {
      setLoading(true);
      
      // Fetch all partners with status = 'PENDING'
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .or('status.eq.pending,status.eq.PENDING')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error loading pending partners:', error);
        toast.error('Failed to load pending partners');
        return;
      }

      setPendingPartners(data || []);
    } catch (error) {
      logger.error('Error loading pending partners:', error);
      toast.error('Failed to load pending partners');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (partner: Partner) => {
    setSelectedPartner(partner);
    setShowDetailsDialog(true);
  };

  const handleApprove = async (partner: Partner) => {
    try {
      // Update partner status to 'APPROVED' (uppercase to match filter in getActiveOffers)
      const { error } = await supabase
        .from('partners')
        .update({ status: 'APPROVED' })
        .eq('id', partner.id);

      if (error) {
        logger.error('Error approving partner:', error);
        toast.error('Failed to approve partner');
        return;
      }

      toast.success(`${partner.business_name} has been approved!`);
      loadPendingPartners();
      onStatsUpdate();
    } catch (error) {
      logger.error('Error approving partner:', error);
      toast.error('Failed to approve partner');
    }
  };

  const handleReject = (partner: Partner) => {
    setPartnerToReject(partner);
    setShowRejectDialog(true);
  };

  const confirmReject = async () => {
    if (!partnerToReject) return;

    try {
      // Update partner status to 'REJECTED' (uppercase for consistency)
      const { error } = await supabase
        .from('partners')
        .update({ status: 'REJECTED' })
        .eq('id', partnerToReject.id);

      if (error) {
        logger.error('Error rejecting partner:', error);
        toast.error('Failed to reject partner');
        return;
      }

      toast.success(`${partnerToReject.business_name} has been rejected`);
      setShowRejectDialog(false);
      setPartnerToReject(null);
      loadPendingPartners();
      onStatsUpdate();
    } catch (error) {
      logger.error('Error rejecting partner:', error);
      toast.error('Failed to reject partner');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Partner Applications
          </CardTitle>
          <CardDescription>
            Review and approve new partner applications (auto-updates with Realtime)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingPartners.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
              <p className="text-gray-500">No pending partner applications at the moment.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business Name</TableHead>
                    <TableHead>Business Type</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPartners.map((partner) => (
                    <TableRow key={partner.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-medium">{partner.business_name}</div>
                          <Badge className="bg-yellow-100 text-yellow-800 mt-1">
                            Pending Review
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{partner.business_type || 'N/A'}</TableCell>
                      <TableCell>{partner.email}</TableCell>
                      <TableCell>{partner.city || 'N/A'}</TableCell>
                      <TableCell>
                        {formatDate(partner.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(partner)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApprove(partner)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReject(partner)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
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

      {/* Partner Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Partner Application Details</DialogTitle>
            <DialogDescription>
              Review the complete application information
            </DialogDescription>
          </DialogHeader>
          {selectedPartner && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Business Information</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Business Name:</span> {selectedPartner.business_name}
                    </div>
                    <div>
                      <span className="font-medium">Business Type:</span> {selectedPartner.business_type || 'Not specified'}
                    </div>
                    <div>
                      <span className="font-medium">Address:</span> {selectedPartner.address || 'Not provided'}
                    </div>
                    <div>
                      <span className="font-medium">City:</span> {selectedPartner.city || 'Not provided'}
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Contact Information</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Email:</span> {selectedPartner.email}
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span> {selectedPartner.phone}
                    </div>
                    {selectedPartner.telegram && (
                      <div>
                        <span className="font-medium">Telegram:</span> {selectedPartner.telegram}
                      </div>
                    )}
                    {selectedPartner.whatsapp && (
                      <div>
                        <span className="font-medium">WhatsApp:</span> {selectedPartner.whatsapp}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {selectedPartner.description && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Business Description</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {selectedPartner.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Location</h4>
                  <div className="text-sm">
                    {selectedPartner.latitude && selectedPartner.longitude ? (
                      <div>
                        <div>Lat: {selectedPartner.latitude}</div>
                        <div>Lng: {selectedPartner.longitude}</div>
                      </div>
                    ) : (
                      <span className="text-gray-500">Location not provided</span>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Application Date</h4>
                  <div className="text-sm">
                    {formatDate(selectedPartner.created_at)}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => {
                  setShowDetailsDialog(false);
                  handleReject(selectedPartner!);
                }}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={() => {
                  setShowDetailsDialog(false);
                  handleApprove(selectedPartner!);
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Partner Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject "{partnerToReject?.business_name}"? This action can be reversed later if needed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmReject}>
              Reject Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
