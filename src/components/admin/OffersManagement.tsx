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
import { Search, Edit, Trash2, CheckCircle, XCircle, Package } from 'lucide-react';
import { getAllOffers, updateOffer, deleteOffer, enableOffer, disableOffer } from '@/lib/admin-api';
import type { Offer } from '@/lib/types';
import { toast } from 'sonner';

interface OffersManagementProps {
  onStatsUpdate: () => void;
}

export function OffersManagement({ onStatsUpdate }: OffersManagementProps) {
  const [offers, setOffers] = useState<any[]>([]);
  const [filteredOffers, setFilteredOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editingOffer, setEditingOffer] = useState<any | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<any | null>(null);

  useEffect(() => {
    loadOffers();
  }, []);

  useEffect(() => {
    filterOffers();
  }, [offers, searchTerm, statusFilter, categoryFilter]);

  const loadOffers = async () => {
    try {
      setLoading(true);
      const data = await getAllOffers();
      setOffers(data);
    } catch (error) {
      console.error('Error loading offers:', error);
      toast.error('Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  const getDerivedStatus = (offer: any) => {
    const now = Date.now();
    if (offer.expires_at) {
      const exp = new Date(offer.expires_at).getTime();
      if (!isNaN(exp) && exp <= now) return 'EXPIRED';
    }
    if (typeof offer.quantity_available === 'number' && offer.quantity_available <= 0) {
      return 'SOLD_OUT';
    }
    return offer.status;
  };

  const filterOffers = () => {
    let filtered = offers;

    if (searchTerm) {
      filtered = filtered.filter(offer =>
        offer.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offer.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offer.partner?.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(offer => getDerivedStatus(offer) === statusFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(offer => offer.category === categoryFilter);
    }

    setFilteredOffers(filtered);
  };

  const handleEdit = (offer: any) => {
    setEditingOffer({ ...offer });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingOffer) return;

    try {
      const { partner, ...offerData } = editingOffer;
      await updateOffer(editingOffer.id, offerData);
      toast.success('Offer updated successfully');
      setShowEditDialog(false);
      setEditingOffer(null);
      loadOffers();
      onStatsUpdate();
    } catch (error) {
      console.error('Error updating offer:', error);
      toast.error('Failed to update offer');
    }
  };

  const handleDelete = (offer: any) => {
    setOfferToDelete(offer);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!offerToDelete) return;

    try {
      await deleteOffer(offerToDelete.id);
      toast.success('Offer deleted successfully');
      setShowDeleteDialog(false);
      setOfferToDelete(null);
      loadOffers();
      onStatsUpdate();
    } catch (error) {
      console.error('Error deleting offer:', error);
      toast.error('Failed to delete offer');
    }
  };

  const handleEnable = async (offer: any) => {
    try {
      await enableOffer(offer.id);
      toast.success('Offer enabled successfully');
      loadOffers();
      onStatsUpdate();
    } catch (error) {
      console.error('Error enabling offer:', error);
      toast.error('Failed to enable offer');
    }
  };

  const handleDisable = async (offer: any) => {
    try {
      await disableOffer(offer.id);
      toast.success('Offer disabled successfully');
      loadOffers();
      onStatsUpdate();
    } catch (error) {
      console.error('Error disabling offer:', error);
      toast.error('Failed to disable offer');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'SOLD_OUT':
        return <Badge className="bg-red-100 text-red-800">Sold Out</Badge>;
      case 'DISABLED':
        return <Badge className="bg-red-100 text-red-800">Disabled</Badge>;
      case 'EXPIRED':
        return <Badge className="bg-gray-100 text-gray-800">Expired</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors = {
      'bakery': 'bg-orange-100 text-orange-800',
      'restaurant': 'bg-red-100 text-red-800',
      'cafe': 'bg-brown-100 text-brown-800',
      'grocery': 'bg-green-100 text-green-800',
      'other': 'bg-gray-100 text-gray-800'
    };
    
    return (
      <Badge className={colors[category as keyof typeof colors] || colors.other}>
        {category}
      </Badge>
    );
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
          <CardTitle>Offers Management</CardTitle>
          <CardDescription>Manage all offers in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search offers..."
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
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SOLD_OUT">Sold Out</SelectItem>
                <SelectItem value="DISABLED">Disabled</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="bakery">Bakery</SelectItem>
                <SelectItem value="restaurant">Restaurant</SelectItem>
                <SelectItem value="cafe">Cafe</SelectItem>
                <SelectItem value="grocery">Grocery</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Offers Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOffers.map((offer) => (
                  <TableRow key={offer.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-medium">{offer.title}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {offer.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{offer.partner?.business_name || offer.partner?.name}</TableCell>
                    <TableCell>{getCategoryBadge(offer.category)}</TableCell>
                    <TableCell>{formatPrice(offer.original_price)}</TableCell>
                    <TableCell>{offer.quantity_available}</TableCell>
                    <TableCell>{getStatusBadge(getDerivedStatus(offer))}</TableCell>
                    <TableCell>
                      {new Date(offer.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(offer)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {offer.status === 'DISABLED' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEnable(offer)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDisable(offer)}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(offer)}
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

          {filteredOffers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No offers found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Offer</DialogTitle>
            <DialogDescription>
              Update offer information and settings
            </DialogDescription>
          </DialogHeader>
          {editingOffer && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={editingOffer.title || ''}
                  onChange={(e) => setEditingOffer({
                    ...editingOffer,
                    title: e.target.value
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editingOffer.description || ''}
                  onChange={(e) => setEditingOffer({
                    ...editingOffer,
                    description: e.target.value
                  })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={editingOffer.category}
                    onValueChange={(value) => setEditingOffer({
                      ...editingOffer,
                      category: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bakery">Bakery</SelectItem>
                      <SelectItem value="restaurant">Restaurant</SelectItem>
                      <SelectItem value="cafe">Cafe</SelectItem>
                      <SelectItem value="grocery">Grocery</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={editingOffer.status}
                    onValueChange={(value) => setEditingOffer({
                      ...editingOffer,
                      status: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="DISABLED">Disabled</SelectItem>
                      <SelectItem value="EXPIRED">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="original_price">Original Price</Label>
                  <Input
                    id="original_price"
                    type="number"
                    step="0.01"
                    value={editingOffer.original_price || ''}
                    onChange={(e) => setEditingOffer({
                      ...editingOffer,
                      original_price: parseFloat(e.target.value)
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discounted_price">Discounted Price</Label>
                  <Input
                    id="discounted_price"
                    type="number"
                    step="0.01"
                    value={editingOffer.discounted_price || ''}
                    onChange={(e) => setEditingOffer({
                      ...editingOffer,
                      discounted_price: parseFloat(e.target.value)
                    })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity_available">Quantity Available</Label>
                  <Input
                    id="quantity_available"
                    type="number"
                    value={editingOffer.quantity_available || ''}
                    onChange={(e) => setEditingOffer({
                      ...editingOffer,
                      quantity_available: parseInt(e.target.value)
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickup_start">Pickup Start Time</Label>
                  <Input
                    id="pickup_start"
                    type="time"
                    value={editingOffer.pickup_start || ''}
                    onChange={(e) => setEditingOffer({
                      ...editingOffer,
                      pickup_start: e.target.value
                    })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pickup_end">Pickup End Time</Label>
                <Input
                  id="pickup_end"
                  type="time"
                  value={editingOffer.pickup_end || ''}
                  onChange={(e) => setEditingOffer({
                    ...editingOffer,
                    pickup_end: e.target.value
                  })}
                />
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
            <DialogTitle>Delete Offer</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{offerToDelete?.title}"? This action cannot be undone.
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
    </div>
  );
}
