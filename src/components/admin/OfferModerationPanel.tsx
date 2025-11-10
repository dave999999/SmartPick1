import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Flag, CheckCircle, XCircle, Eye, Star, StarOff } from 'lucide-react';
import { getFlaggedOffers, reviewOfferFlag, flagOffer, unflagOffer, featureOffer, unfeatureOffer } from '@/lib/api/admin-advanced';
import { getAllOffers } from '@/lib/admin-api';
import type { OfferFlag } from '@/lib/types/admin';
import type { Offer } from '@/lib/types';
import { toast } from 'sonner';

export default function OfferModerationPanel() {
  const [flaggedOffers, setFlaggedOffers] = useState<OfferFlag[]>([]);
  const [allOffers, setAllOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFlag, setSelectedFlag] = useState<OfferFlag | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [flags, offers] = await Promise.all([
        getFlaggedOffers(),
        getAllOffers()
      ]);
      setFlaggedOffers(flags);
      setAllOffers(offers);
    } catch (error) {
      logger.error('Error loading moderation data:', error);
      toast.error('Failed to load moderation data');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewFlag = async (status: 'REVIEWED' | 'RESOLVED' | 'DISMISSED') => {
    if (!selectedFlag) return;

    try {
      setProcessing(true);
      await reviewOfferFlag(selectedFlag.id, status, adminNotes);
      toast.success(`Flag ${status.toLowerCase()} successfully`);
      setReviewDialogOpen(false);
      setSelectedFlag(null);
      setAdminNotes('');
      await loadData();
    } catch (error) {
      logger.error('Error reviewing flag:', error);
      toast.error('Failed to review flag');
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleFlag = async (offer: Offer) => {
    try {
      if (offer.is_flagged) {
        await unflagOffer(offer.id);
        toast.success('Offer unflagged');
      } else {
        await flagOffer(offer.id, 'ADMIN_REVIEW', 'Flagged by admin for review');
        toast.success('Offer flagged for review');
      }
      await loadData();
    } catch (error) {
      logger.error('Error toggling flag:', error);
      toast.error('Failed to update flag');
    }
  };

  const handleToggleFeature = async (offer: Offer) => {
    try {
      if (offer.is_featured) {
        await unfeatureOffer(offer.id);
        toast.success('Offer removed from featured');
      } else {
        // Feature for 7 days by default
        const featuredUntil = new Date();
        featuredUntil.setDate(featuredUntil.getDate() + 7);
        await featureOffer(offer.id, featuredUntil.toISOString());
        toast.success('Offer featured for 7 days');
      }
      await loadData();
    } catch (error) {
      logger.error('Error toggling feature:', error);
      toast.error('Failed to update featured status');
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
      {/* Flagged Offers Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-orange-600" />
            Flagged Offers ({flaggedOffers.length})
          </CardTitle>
          <CardDescription>
            Offers reported by users or flagged by admins for review
          </CardDescription>
        </CardHeader>
        <CardContent>
          {flaggedOffers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p>No flagged offers - all clear!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Offer</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Reported By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flaggedOffers.map((flag) => (
                  <TableRow key={flag.id}>
                    <TableCell className="font-medium">
                      {flag.offer?.title}
                    </TableCell>
                    <TableCell>{flag.offer?.partner?.business_name}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{flag.reason}</Badge>
                    </TableCell>
                    <TableCell>{flag.reporter?.name || 'Admin'}</TableCell>
                    <TableCell>
                      {new Date(flag.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedFlag(flag);
                          setReviewDialogOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* All Offers Moderation */}
      <Card>
        <CardHeader>
          <CardTitle>All Offers Moderation</CardTitle>
          <CardDescription>
            Flag inappropriate content or feature quality offers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {allOffers.map((offer) => (
              <div
                key={offer.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{offer.title}</span>
                    {offer.is_flagged && (
                      <Badge variant="destructive">Flagged</Badge>
                    )}
                    {offer.is_featured && (
                      <Badge className="bg-yellow-500">Featured</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {offer.smart_price} ₾ • {offer.category}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={offer.is_flagged ? 'default' : 'outline'}
                    onClick={() => handleToggleFlag(offer)}
                  >
                    <Flag className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={offer.is_featured ? 'default' : 'outline'}
                    onClick={() => handleToggleFeature(offer)}
                  >
                    {offer.is_featured ? (
                      <StarOff className="w-4 h-4" />
                    ) : (
                      <Star className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Flagged Offer</DialogTitle>
            <DialogDescription>
              Review and take action on this flagged offer
            </DialogDescription>
          </DialogHeader>

          {selectedFlag && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Offer:</p>
                <p className="text-gray-700">{selectedFlag.offer?.title}</p>
              </div>

              <div>
                <p className="text-sm font-medium">Reason:</p>
                <Badge variant="destructive">{selectedFlag.reason}</Badge>
              </div>

              {selectedFlag.description && (
                <div>
                  <p className="text-sm font-medium">Description:</p>
                  <p className="text-gray-700">{selectedFlag.description}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-2">Admin Notes:</p>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about your decision..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => handleReviewFlag('DISMISSED')}
              disabled={processing}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Dismiss
            </Button>
            <Button
              variant="default"
              onClick={() => handleReviewFlag('RESOLVED')}
              disabled={processing}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

