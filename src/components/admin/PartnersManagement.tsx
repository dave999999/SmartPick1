import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Edit, Trash2, CheckCircle, XCircle, Eye, Pause, Play, Ban } from 'lucide-react';
import { getAllPartners, updatePartner, deletePartner, approvePartner, pausePartner, unpausePartner, disablePartner, getPartnerOffers, pauseOffer, resumeOffer, deleteOffer } from '@/lib/admin-api';
import type { Partner, Offer } from '@/lib/types';
import { toast } from 'sonner';

interface PartnersManagementProps {
  onStatsUpdate: () => void;
}

export function PartnersManagement({ onStatsUpdate }: PartnersManagementProps) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filteredPartners, setFilteredPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null);
  
  // Partner View Modal
  const [showPartnerView, setShowPartnerView] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [partnerOffers, setPartnerOffers] = useState<Offer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [showDeleteOfferDialog, setShowDeleteOfferDialog] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<Offer | null>(null);

  useEffect(() => {
    loadPartners();
  }, []);

  useEffect(() => {
    filterPartners();
  }, [partners, searchTerm, statusFilter]);

  const loadPartners = async () => {
    try {
      setLoading(true);
      const data = await getAllPartners();
      setPartners(data);
    } catch (error) {
      console.error('Error loading partners:', error);
      toast.error('Failed to load partners');
    } finally {
      setLoading(false);
    }
  };

  const filterPartners = () => {
    let filtered = partners;

    if (searchTerm) {
      filtered = filtered.filter(partner =>
        partner.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        partner.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(partner => partner.status === statusFilter);
    }

    setFilteredPartners(filtered);
  };

  const handleEdit = (partner: Partner) => {
    setEditingPartner({ ...partner });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingPartner) return;

    try {
      await updatePartner(editingPartner.id, editingPartner);
      toast.success('Partner updated successfully');
      setShowEditDialog(false);
      setEditingPartner(null);
      loadPartners();
      onStatsUpdate();
    } catch (error) {
      console.error('Error updating partner:', error);
      toast.error('Failed to update partner');
    }
  };

  const handleDelete = (partner: Partner) => {
    setPartnerToDelete(partner);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!partnerToDelete) return;

    try {
      await deletePartner(partnerToDelete.id);
      toast.success('Partner deleted successfully');
      setShowDeleteDialog(false);
      setPartnerToDelete(null);
      loadPartners();
      onStatsUpdate();
    } catch (error) {
      console.error('Error deleting partner:', error);
      toast.error('Failed to delete partner');
    }
  };

  const handleApprove = async (partner: Partner) => {
    try {
      await approvePartner(partner.id);
      toast.success('Partner approved successfully');
      loadPartners();
      onStatsUpdate();
    } catch (error) {
      console.error('Error approving partner:', error);
      toast.error('Failed to approve partner');
    }
  };

  const handleTogglePause = async (partner: Partner) => {
    try {
      if (partner.status === 'PAUSED') {
        await unpausePartner(partner.id);
        toast.success('Partner unpaused successfully');
      } else {
        await pausePartner(partner.id);
        toast.success('Partner paused successfully');
      }
      loadPartners();
      onStatsUpdate();
    } catch (error) {
      console.error('Error toggling partner pause:', error);
      toast.error('Failed to update partner status');
    }
  };

  const handleBan = async (partner: Partner) => {
    try {
      await disablePartner(partner.id);
      toast.success('Partner banned successfully');
      loadPartners();
      onStatsUpdate();
    } catch (error) {
      console.error('Error banning partner:', error);
      toast.error('Failed to ban partner');
    }
  };

  const handleViewPartner = async (partner: Partner) => {
    setSelectedPartner(partner);
    setShowPartnerView(true);
    setLoadingOffers(true);
    
    try {
      const offers = await getPartnerOffers(partner.id);
      setPartnerOffers(offers);
    } catch (error) {
      console.error('Error loading partner offers:', error);
      toast.error('Failed to load partner offers');
    } finally {
      setLoadingOffers(false);
    }
  };

  const handleToggleOfferPause = async (offer: Offer) => {
    try {
      if (offer.status === 'PAUSED') {
        await resumeOffer(offer.id);
        toast.success('Offer resumed successfully');
      } else {
        await pauseOffer(offer.id);
        toast.success('Offer paused successfully');
      }
      
      // Reload offers for this partner
      if (selectedPartner) {
        const offers = await getPartnerOffers(selectedPartner.id);
        setPartnerOffers(offers);
      }
    } catch (error) {
      console.error('Error toggling offer pause:', error);
      toast.error('Failed to update offer status');
    }
  };

  const handleDeleteOffer = (offer: Offer) => {
    setOfferToDelete(offer);
    setShowDeleteOfferDialog(true);
  };

  const confirmDeleteOffer = async () => {
    if (!offerToDelete) return;

    try {
      await deleteOffer(offerToDelete.id);
      toast.success('Offer deleted successfully');
      setShowDeleteOfferDialog(false);
      setOfferToDelete(null);
      
      // Reload offers for this partner
      if (selectedPartner) {
        const offers = await getPartnerOffers(selectedPartner.id);
        setPartnerOffers(offers);
      }
      onStatsUpdate();
    } catch (error) {
      console.error('Error deleting offer:', error);
      toast.error('Failed to delete offer');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      APPROVED: 'bg-green-100 text-green-800',
      PENDING: 'bg-gray-100 text-gray-700',
      PAUSED: 'bg-yellow-100 text-yellow-700',
      BLOCKED: 'bg-red-100 text-red-700',
    };

    const color = statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-700';
    const label = status.charAt(0) + status.slice(1).toLowerCase();

    return (
      <span className={`px-2 py-1 rounded-full text-sm font-medium ${color}`}>
        {label}
      </span>
    );
  };

  const getOfferStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'PAUSED':
        return <Badge className="bg-orange-100 text-orange-800">Paused</Badge>;
      case 'EXPIRED':
        return <Badge className="bg-gray-100 text-gray-800">Expired</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
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
          <CardTitle>Partners Management</CardTitle>
          <CardDescription>Manage all business partners in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search partners..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PAUSED">Paused</SelectItem>
                <SelectItem value="BLOCKED">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Partners Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPartners.map((partner) => (
                  <TableRow key={partner.id}>
                    <TableCell className="font-medium">
                      <button
                        onClick={() => handleViewPartner(partner)}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                      >
                        {partner.business_name}
                      </button>
                    </TableCell>
                    <TableCell>{partner.email}</TableCell>
                    <TableCell>{partner.phone}</TableCell>
                    <TableCell>{getStatusBadge(partner.status)}</TableCell>
                    <TableCell>
                      {new Date(partner.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {/* Approve Button - Green */}
                        {partner.status !== 'APPROVED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApprove(partner)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Approve Partner"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Pause/Unpause Button - Yellow */}
                        {partner.status !== 'BLOCKED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTogglePause(partner)}
                            className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                            title={partner.status === 'PAUSED' ? 'Unpause Partner' : 'Pause Partner'}
                          >
                            {partner.status === 'PAUSED' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                          </Button>
                        )}

                        {/* Ban Button - Red */}
                        {partner.status !== 'BLOCKED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleBan(partner)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Ban Partner"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Edit Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(partner)}
                          className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                          title="Edit Partner"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredPartners.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No partners found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Partner</DialogTitle>
            <DialogDescription>
              Update partner information and settings
            </DialogDescription>
          </DialogHeader>
          {editingPartner && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="business_name">Business Name</Label>
                  <Input
                    id="business_name"
                    value={editingPartner.business_name || ''}
                    onChange={(e) => setEditingPartner({
                      ...editingPartner,
                      business_name: e.target.value
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editingPartner.email || ''}
                    onChange={(e) => setEditingPartner({
                      ...editingPartner,
                      email: e.target.value
                    })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={editingPartner.phone || ''}
                    onChange={(e) => setEditingPartner({
                      ...editingPartner,
                      phone: e.target.value
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={editingPartner.status}
                    onValueChange={(value) => setEditingPartner({
                      ...editingPartner,
                      status: value as 'PENDING' | 'APPROVED' | 'BLOCKED' | 'PAUSED'
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="PAUSED">Paused</SelectItem>
                      <SelectItem value="BLOCKED">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={editingPartner.address || ''}
                  onChange={(e) => setEditingPartner({
                    ...editingPartner,
                    address: e.target.value
                  })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={editingPartner.latitude || ''}
                    onChange={(e) => setEditingPartner({
                      ...editingPartner,
                      latitude: parseFloat(e.target.value)
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={editingPartner.longitude || ''}
                    onChange={(e) => setEditingPartner({
                      ...editingPartner,
                      longitude: parseFloat(e.target.value)
                    })}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Partner</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{partnerToDelete?.business_name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Partner View Modal */}
      <Dialog open={showPartnerView} onOpenChange={setShowPartnerView}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Partner: {selectedPartner?.business_name}</DialogTitle>
            <DialogDescription>
              View and manage all offers for this partner
            </DialogDescription>
          </DialogHeader>
          
          {loadingOffers ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : partnerOffers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No offers found for this partner</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partnerOffers.map((offer) => (
                    <TableRow key={offer.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-medium">{offer.title}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {offer.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{offer.category}</TableCell>
                      <TableCell>{formatPrice(offer.smart_price)}</TableCell>
                      <TableCell>{offer.quantity_available}</TableCell>
                      <TableCell>{getOfferStatusBadge(offer.status)}</TableCell>
                      <TableCell>
                        {new Date(offer.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleOfferPause(offer)}
                            className={offer.status === 'PAUSED' ? 'text-green-600 hover:text-green-700' : 'text-orange-600 hover:text-orange-700'}
                          >
                            {offer.status === 'PAUSED' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteOffer(offer)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPartnerView(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Offer Confirmation Dialog */}
      <Dialog open={showDeleteOfferDialog} onOpenChange={setShowDeleteOfferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Offer</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{offerToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteOfferDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteOffer}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}