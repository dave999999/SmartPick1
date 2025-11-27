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
import { Switch } from '@/components/ui/switch';
import { Search, Edit, Trash2, CheckCircle, Pause, Play, Ban, Upload, Plus, Loader2, Navigation, List, RefreshCw, Eye, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import EditPartnerProfile from '@/components/partner/EditPartnerProfile';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/supabase';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getPartnersPaged, updatePartner, deletePartner, approvePartner, pausePartner, unpausePartner, disablePartner, getPartnerOffers, pauseOffer, resumeOffer, deleteOffer, updateOffer } from '@/lib/admin-api';
import type { Partner, Offer } from '@/lib/types';
import { toast } from 'sonner';
import { BulkActions } from './BulkActions';
import { logger } from '@/lib/logger';

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
  const [showEditOfferDialog, setShowEditOfferDialog] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  // Activity logs state
  interface PartnerActivityLog { id?: string; partner_id: string; action: string; details?: string; admin_id?: string; created_at?: string; }
  const [partnerLogs, setPartnerLogs] = useState<PartnerActivityLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  // Grant slots dialog
  const [showGrantSlotsDialog, setShowGrantSlotsDialog] = useState(false);
  const [grantSlotsPartner, setGrantSlotsPartner] = useState<Partner | null>(null);
  const [currentSlots, setCurrentSlots] = useState<number>(0);
  const [addSlots, setAddSlots] = useState<string>('');

  // Add Partner modal state
  const [openAddPartner, setOpenAddPartner] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState<'BAKERY' | 'RESTAURANT' | 'CAFE' | 'GROCERY' | 'FAST_FOOD' | 'ALCOHOL'>('RESTAURANT');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [latitude, setLatitude] = useState<number>(41.7151);
  const [longitude, setLongitude] = useState<number>(44.8271);
  const [openTime, setOpenTime] = useState<string>('09:00');
  const [closeTime, setCloseTime] = useState<string>('18:00');
  const [open24h, setOpen24h] = useState<boolean>(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [debounceToken, setDebounceToken] = useState(0);

  // Bulk selection
  const [selectedPartners, setSelectedPartners] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadPartners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debounceToken, statusFilter]);

  useEffect(() => {
    const t = setTimeout(() => setDebounceToken(x => x + 1), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const loadPartners = async () => {
    try {
      setLoading(true);
      const { items, count } = await getPartnersPaged({
        page,
        pageSize,
        search: searchTerm,
        status: statusFilter,
      });
      setPartners(items);
      setFilteredPartners(items);
      setTotal(count);
    } catch (error) {
      logger.error('Error loading partners:', error);
      toast.error('Failed to load partners');
    } finally {
      setLoading(false);
    }
  };
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const goPrev = () => setPage(p => Math.max(1, p - 1));
  const goNext = () => setPage(p => Math.min(totalPages, p + 1));

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedPartners(new Set(filteredPartners.map(p => p.id)));
    } else {
      setSelectedPartners(new Set());
    }
  };

  const handleSelectPartner = (partnerId: string, checked: boolean) => {
    const newSelected = new Set(selectedPartners);
    if (checked) {
      newSelected.add(partnerId);
    } else {
      newSelected.delete(partnerId);
    }
    setSelectedPartners(newSelected);
    setSelectAll(newSelected.size === filteredPartners.length);
  };

  const handleBulkActionComplete = () => {
    setSelectedPartners(new Set());
    setSelectAll(false);
    loadPartners();
    onStatsUpdate();
  };

  const handleAddPartner = async () => {
    try {
      setSubmitting(true);
      // Basic validation
      if (!businessName.trim()) {
        toast.error('Business name is required');
        return;
      }
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
      if (!emailOk) {
        toast.error('Please enter a valid email');
        return;
      }
      // Georgian mobile format: +995 5XX XXX XXX (9 digits after +995)
      const phoneRegex = /^\+995[5-9]\d{8}$/;
      const cleanPhone = phone.replace(/\s/g, ''); // Remove spaces for validation

      if (!phoneRegex.test(cleanPhone)) {
        toast.error('Invalid phone number. Format: +995 5XX XXX XXX (Georgian mobile)');
        return;
      }
      if (!address.trim()) {
        toast.error('Business address is required');
        return;
      }
      if (!city.trim()) {
        toast.error('City is required');
        return;
      }
      if (!latitude || !longitude) {
        toast.error('Please set the location on the map');
        return;
      }
      if (!open24h && (!openTime || !closeTime)) {
        toast.error('Please provide opening and closing times');
        return;
      }

      // Password validation
      if (password && password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }

      // Check for duplicate email first (both flows)
      const { data: existingEmail, error: emailCheckErr } = await supabase
        .from('users')
        .select('id, role, email')
        .eq('email', email.trim())
        .maybeSingle();

      if (emailCheckErr) {
        logger.error('Email check error:', emailCheckErr);
      }

      if (existingEmail) {
        if (existingEmail.role === 'PARTNER') {
          toast.error(`A partner with email "${email}" already exists`);
          return;
        }
        // Allow converting USER to PARTNER
        toast.info(`User "${email}" exists. Converting to partner...`);
      }

      // If password is provided, use secure server endpoint
      if (password) {
        // Include Supabase access token so the API can authorize ADMINs
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          toast.error('You must be signed in as admin to perform this action');
          return;
        }

        const res = await fetch('/api/admin/create-partner', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: email.trim(),
            password: password,
            name: businessName.trim(),
            phone: phone.trim() || null,
            business_name: businessName.trim(),
            business_type: category,
            description: description.trim() || null,
            address: address.trim(),
            city: city.trim(),
            latitude,
            longitude,
            open_24h: open24h,
            open_time: openTime,
            close_time: closeTime,
          }),
        });
        const resp = await res.json();
        if (!res.ok) {
          logger.error('API error:', resp);
          throw new Error(resp?.error || 'Server error creating partner');
        }
        toast.success(`Partner "${businessName}" added successfully with password!`);
        setOpenAddPartner(false);
        setBusinessName(''); setEmail(''); setPhone(''); setAddress(''); setCity(''); setCategory('RESTAURANT'); setDescription('');
        setLatitude(41.7151); setLongitude(44.8271); setOpenTime('09:00'); setCloseTime('18:00');
        setOpen24h(false); setPassword(''); setGettingLocation(false);
        loadPartners();
        onStatsUpdate();
        return;
      }

      // Fallback: Create without password (client-side)
      // Check if user with this email already exists
      const { data: exists, error: existsErr } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.trim())
        .limit(1)
        .maybeSingle();
      if (existsErr) throw existsErr;
      if (exists) {
        toast.warning('A user with this email already exists. Linking partner...');
      }

      let userId = exists?.id as string | undefined;
      if (!userId) {
        const { data: newUser, error: userErr } = await supabase
          .from('users')
          .insert({
            email: email.trim(),
            name: businessName.trim(),
            phone: phone.trim() || null,
            role: 'PARTNER',
            status: 'ACTIVE',
          })
          .select()
          .single();
        if (userErr) throw userErr;
        userId = newUser.id;
      }

      const { error: partnerErr } = await supabase.from('partners').insert({
        user_id: userId,
        business_name: businessName.trim(),
        business_type: category,
        phone: phone.trim() || null,
        email: email.trim(),
        address: address.trim(),
        city: city.trim(),
        status: 'APPROVED',
        description: description.trim() || null,
        latitude,
        longitude,
        open_24h: open24h,
        business_hours: open24h ? null : { open: openTime, close: closeTime },
      });
      if (partnerErr) throw partnerErr;

      toast.success(`Partner "${businessName}" added successfully`);
      setOpenAddPartner(false);
      setBusinessName('');
      setEmail('');
      setPhone('');
      setAddress('');
      setCity('');
      setCategory('RESTAURANT');
      setDescription('');
      setLatitude(41.7151); setLongitude(44.8271);
      setOpenTime('09:00'); setCloseTime('18:00'); setOpen24h(false); setPassword(''); setGettingLocation(false);
      loadPartners();
      onStatsUpdate();

      // Optional invite (requires service role on server; skip in browser)
      // Future: Send partner invitation email
    } catch (error) {
      logger.error('Failed to add partner:', error);
      toast.error('Failed to add partner');
    } finally {
      setSubmitting(false);
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      // Use our backend proxy to avoid CORS issues
      const response = await fetch(
        `/api/geocode/reverse?lat=${lat}&lon=${lng}`
      );
      const data = await response.json();

      if (data && data.display_name) {
        // Format a nice address from the response
        const addr = data.address || {};
        const cityName = addr.city || addr.town || addr.village || '';
        const parts = [
          addr.road || addr.street,
          addr.house_number,
          addr.suburb || addr.neighbourhood,
        ].filter(Boolean);

        const formattedAddress = parts.length > 0 ? parts.join(', ') : data.display_name;
        setAddress(formattedAddress);
        setCity(cityName);
        toast.success('Address auto-filled from location');
      }
    } catch (error) {
      logger.error('Reverse geocoding error:', error);
      // Don't show error - address can be entered manually
    }
  };

  const forwardGeocode = async (fullAddress: string) => {
    if (!fullAddress.trim()) return;

    try {
      const response = await fetch(
        `/api/geocode/forward?address=${encodeURIComponent(fullAddress)}`
      );
      const data = await response.json();

      if (response.status === 404 || (data && data.error)) {
        toast.warning('Address not found. Please adjust the map marker manually.');
        return;
      }

      if (data && data.lat && data.lon) {
        const lat = parseFloat(data.lat);
        const lng = parseFloat(data.lon);
        setLatitude(lat);
        setLongitude(lng);
        toast.success('Map updated to address location');
      }
    } catch (error) {
      logger.error('Forward geocoding error:', error);
      toast.error('Failed to locate address. Please use the map.');
    }
  };

  // Debounced forward geocoding when address or city changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (address.trim() && city.trim()) {
        const fullAddress = `${address}, ${city}, Georgia`;
        forwardGeocode(fullAddress);
      }
    }, 1500); // Wait 1.5 seconds after user stops typing

    return () => clearTimeout(timer);
  }, [address, city]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        setLatitude(lat);
        setLongitude(lng);
        setGettingLocation(false);
        toast.success('Location set to your current position');

        // Auto-fill address using reverse geocoding
        await reverseGeocode(lat, lng);
      },
      (error) => {
        logger.error('Error getting location:', error);
        setGettingLocation(false);

        let errorMessage = 'Unable to get your location';
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = 'Location access denied. Please enable location permissions.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = 'Location information unavailable';
        } else if (error.code === error.TIMEOUT) {
          errorMessage = 'Location request timed out';
        }
        toast.error(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleEdit = (partner: Partner) => {
    setEditingPartner({ ...partner });
    setShowEditDialog(true);
  };

  const handleImpersonate = (partner: Partner) => {
    localStorage.setItem('impersonate_partner_id', partner.id);
    toast.success(`Impersonating ${partner.business_name}`);
    logAction(partner.id, 'IMPERSONATE', 'Admin began impersonation');
    navigate('/partner');
  };

  const openGrantSlots = async (partner: Partner) => {
    setGrantSlotsPartner(partner);
    setAddSlots('');
    // Fetch current slots from partner_points
    const { data, error } = await supabase
      .from('partner_points')
      .select('offer_slots')
      .eq('user_id', partner.id)
      .maybeSingle();
    if (!error && data) {
      setCurrentSlots(data.offer_slots || 0);
    } else {
      setCurrentSlots(0);
    }
    setShowGrantSlotsDialog(true);
  };

  const handleGrantSlots = async () => {
    if (!grantSlotsPartner) return;
    const toAdd = parseInt(addSlots, 10);
    if (isNaN(toAdd) || toAdd <= 0) {
      toast.error('Enter a slot number > 0');
      return;
    }
    const newTotal = currentSlots + toAdd;
    try {
      const { error } = await supabase.from('partner_points').upsert({
        user_id: grantSlotsPartner.user_id, // Use user_id, not partner id
        offer_slots: newTotal,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      if (error) throw error;
      toast.success(`Granted ${toAdd} slots (total ${newTotal})`);
      await logAction(grantSlotsPartner.id, 'GRANT_SLOTS', `Granted ${toAdd} slots; total now ${newTotal}`);
      setShowGrantSlotsDialog(false);
      setGrantSlotsPartner(null);
      await loadPartners(); // Refresh the list
    } catch (e) {
      logger.error('Grant slots error', e);
      toast.error('Failed to grant slots');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingPartner) return;

    try {
      await updatePartner(editingPartner.id, editingPartner);
      toast.success('Partner updated successfully');
      await logAction(editingPartner.id, 'EDIT_PARTNER', 'Partner profile updated');
      setShowEditDialog(false);
      setEditingPartner(null);
      loadPartners();
      onStatsUpdate();
    } catch (error) {
      logger.error('Error updating partner:', error);
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
      await logAction(partnerToDelete.id, 'DELETE_PARTNER', 'Partner deleted');
      setShowDeleteDialog(false);
      setPartnerToDelete(null);
      loadPartners();
      onStatsUpdate();
    } catch (error) {
      logger.error('Error deleting partner:', error);
      toast.error('Failed to delete partner');
    }
  };

  // Activity log helpers (must be defined before usage)
  const loadLogs = async (partnerId: string) => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('partner_activity_logs')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error && data) setPartnerLogs(data as any);
    } catch (e) {
      logger.debug('Skipping logs load (table missing?)', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const logAction = async (partnerId: string, action: string, details?: string) => {
    try {
      const { data } = await supabase.auth.getUser();
      const adminId = data.user?.id;
      await supabase.from('partner_activity_logs').insert({
        partner_id: partnerId,
        action,
        details,
        admin_id: adminId,
        created_at: new Date().toISOString(),
      });
      setPartnerLogs(prev => [{ partner_id: partnerId, action, details, admin_id: adminId, created_at: new Date().toISOString() }, ...prev].slice(0,50));
    } catch (e) {
      logger.debug('Log insert skipped', e);
    }
  };

  const handleApprove = async (partner: Partner) => {
    try {
      await approvePartner(partner.id);
      toast.success('Partner approved successfully');
      loadPartners();
      onStatsUpdate();
      await logAction(partner.id, 'APPROVE', 'Partner approved');
    } catch (error) {
      logger.error('Error approving partner:', error);
      toast.error('Failed to approve partner');
    }
  };

  const handleTogglePause = async (partner: Partner) => {
    try {
      logger.log('PartnersManagement: Toggling pause for partner:', { partnerId: partner.id, currentStatus: partner.status });
      
      if (partner.status === 'PAUSED') {
        await unpausePartner(partner.id);
        toast.success('Partner unpaused successfully');
        await logAction(partner.id, 'UNPAUSE', 'Partner unpaused');
      } else {
        await pausePartner(partner.id);
        toast.success('Partner paused successfully');
        await logAction(partner.id, 'PAUSE', 'Partner paused');
      }
      
      await loadPartners();
      onStatsUpdate();
    } catch (error) {
      logger.error('Error toggling partner pause:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to update partner status: ${errorMessage}`);
    }
  };

  const handleBan = async (partner: Partner) => {
    try {
      await disablePartner(partner.id);
      toast.success('Partner banned successfully');
      loadPartners();
      onStatsUpdate();
      await logAction(partner.id, 'BAN', 'Partner banned');
    } catch (error) {
      logger.error('Error banning partner:', error);
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
      await loadLogs(partner.id);
    } catch (error) {
      logger.error('Error loading partner offers:', error);
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
      logger.error('Error toggling offer pause:', error);
      toast.error('Failed to update offer status');
    }
  };

  const handleDeleteOffer = (offer: Offer) => {
    setOfferToDelete(offer);
    setShowDeleteOfferDialog(true);
  };

  const handleEditOffer = (offer: Offer) => {
    setEditingOffer(offer);
    setShowEditOfferDialog(true);
  };

  const handleRefreshOffer = async (offer: Offer) => {
    try {
      const now = new Date();
      const pickupEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24 hours
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24 hours
      
      // Directly update via Supabase to ensure created_at is updated
      const { error: updateError } = await supabase
        .from('offers')
        .update({
          status: 'ACTIVE',
          quantity_available: offer.quantity_total || offer.quantity_available,
          created_at: now.toISOString(),       // Reset creation time - appears as NEW
          updated_at: now.toISOString(),
          pickup_start: now.toISOString(),     // Start pickup immediately
          pickup_end: pickupEnd.toISOString(), // Extend pickup window by 24h
          expires_at: expiresAt.toISOString(), // Extend expiration
        })
        .eq('id', offer.id);
      
      if (updateError) throw updateError;
      
      toast.success('Offer refreshed - available for 24h, showing as NEW on map!');
      await logAction(offer.partner_id, 'REFRESH_OFFER', `Offer ${offer.id} refreshed`);
      
      // Reload offers for this partner
      if (selectedPartner) {
        const offers = await getPartnerOffers(selectedPartner.id);
        setPartnerOffers(offers);
      }
    } catch (error) {
      logger.error('Error refreshing offer:', error);
      toast.error('Failed to refresh offer');
    }
  };

  const handleToggleAutoRelist = async (offer: Offer) => {
    try {
      const newAutoRelistState = !(offer as any).auto_relist_enabled;
      const { error } = await supabase
        .from('offers')
        .update({ auto_relist_enabled: newAutoRelistState })
        .eq('id', offer.id);
      if (error) throw error;
      // Update local state without reload for snappier UX
      setPartnerOffers(prev => prev.map(o => o.id === offer.id ? ({ ...o, auto_relist_enabled: newAutoRelistState } as any) : o));
      toast.success(
        newAutoRelistState 
          ? 'Auto-relist enabled - Offer will refresh daily' 
          : 'Auto-relist disabled'
      );
      
      // Reload offers for this partner
      // Removed full reload; keep optional manual refresh path
    } catch (error) {
      logger.error('Error toggling auto-relist:', error);
      toast.error('Failed to update auto-relist setting');
    }
  };

  const handleSaveOfferEdit = async () => {
    if (!editingOffer) return;

    try {
      await updateOffer(editingOffer.id, {
        title: editingOffer.title,
        description: editingOffer.description,
        smart_price: editingOffer.smart_price,
        quantity_available: editingOffer.quantity_available,
        auto_relist_enabled: (editingOffer as any).auto_relist_enabled || false,
      });
      toast.success('Offer updated successfully');
      setShowEditOfferDialog(false);
      setEditingOffer(null);
      
      // Reload offers for this partner
      if (selectedPartner) {
        const offers = await getPartnerOffers(selectedPartner.id);
        setPartnerOffers(offers);
      }
    } catch (error) {
      logger.error('Error updating offer:', error);
      toast.error('Failed to update offer');
    }
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
      logger.error('Error deleting offer:', error);
      toast.error('Failed to delete offer');
    }
  };

  const getStatusBadge = (status: string) => {
    // Normalize status to uppercase for consistent color mapping
    const normalizedStatus = status?.toUpperCase();

    const statusColors = {
      APPROVED: 'bg-green-100 text-green-800',
      PENDING: 'bg-gray-100 text-gray-700',
      PAUSED: 'bg-yellow-100 text-yellow-700',
      BLOCKED: 'bg-red-100 text-red-700',
      REJECTED: 'bg-red-100 text-red-700',
    };

    const color = statusColors[normalizedStatus as keyof typeof statusColors] || 'bg-gray-100 text-gray-700';
    const label = normalizedStatus ? normalizedStatus.charAt(0) + normalizedStatus.slice(1).toLowerCase() : 'Unknown';

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

          {/* Actions */}
          <div className="flex items-center justify-end mb-4">
            <Button onClick={() => setOpenAddPartner(true)} className="bg-green-500 text-white hover:bg-green-600">
              <Plus className="h-4 w-4 mr-2" /> Add Partner
            </Button>
          </div>

          {/* Bulk Actions */}
          {selectedPartners.size > 0 && (
            <div className="mb-4">
              <BulkActions
                selectedIds={selectedPartners}
                onClearSelection={() => {
                  setSelectedPartners(new Set());
                  setSelectAll(false);
                }}
                onActionComplete={handleBulkActionComplete}
                entityType="partners"
                totalCount={total}
              />
            </div>
          )}

          {/* Partners Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectAll}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
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
                    <TableCell>
                      <Checkbox
                        checked={selectedPartners.has(partner.id)}
                        onCheckedChange={(checked) => handleSelectPartner(partner.id, checked as boolean)}
                      />
                    </TableCell>
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

                        {/* View Listings Button - Purple */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewPartner(partner)}
                          className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                          title="View Listings & Manage Slots"
                        >
                          <List className="h-4 w-4" />
                        </Button>

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
                        {/* Impersonate Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleImpersonate(partner)}
                          className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                          title="Impersonate Partner"
                        >
                          <User className="h-4 w-4" />
                        </Button>
                        {/* Grant Slots */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openGrantSlots(partner)}
                          className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 font-bold"
                          title="Grant additional offer slots"
                        >
                          +
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              Page {page} of {totalPages} · {total} partners
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={goPrev} disabled={page <= 1}>Prev</Button>
              <Button variant="outline" size="sm" onClick={goNext} disabled={page >= totalPages}>Next</Button>
            </div>
          </div>

          {filteredPartners.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No partners found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Partner Modal */}
      <Dialog open={openAddPartner} onOpenChange={(open) => {
        setOpenAddPartner(open);
        if (!open) {
          // Reset all fields when closing
          setBusinessName('');
          setEmail('');
          setPhone('');
          setAddress('');
          setCategory('RESTAURANT');
          setDescription('');
          setLatitude(41.7151);
          setLongitude(44.8271);
          setOpenTime('09:00');
          setCloseTime('18:00');
          setOpen24h(false);
          setPassword('');
          setGettingLocation(false);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Partner</DialogTitle>
            <DialogDescription>
              Fill in partner details to register them manually.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Business Name</Label>
              <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Partner Bakery" />
            </div>
            <div className="space-y-2">
              <Label>Owner Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+995 5XX XXX XXX" />
            </div>
            <div className="space-y-2">
              <Label>Business Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 123 Rustaveli Ave" />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Tbilisi" />
            </div>
            <div className="space-y-2">
              <Label>Business Type</Label>
              <Select
                value={category}
                onValueChange={(value: string) => {
                  setCategory(value as 'BAKERY' | 'RESTAURANT' | 'CAFE' | 'GROCERY' | 'FAST_FOOD' | 'ALCOHOL');
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[9999]">
                  <SelectItem value="BAKERY">🍞 Bakery</SelectItem>
                  <SelectItem value="RESTAURANT">🍕 Restaurant</SelectItem>
                  <SelectItem value="CAFE">☕ Café</SelectItem>
                  <SelectItem value="GROCERY">🛒 Grocery</SelectItem>
                  <SelectItem value="FAST_FOOD">🍔 Fast Food</SelectItem>
                  <SelectItem value="ALCOHOL">🍸 Alcohol</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Business Description (optional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe this business briefly" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Location</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGetCurrentLocation}
                  disabled={gettingLocation}
                  className="text-xs"
                >
                  {gettingLocation ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Getting location...
                    </>
                  ) : (
                    <>
                      <Navigation className="w-3 h-3 mr-1" />
                      Use Current Location
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500">Drag the marker to adjust location. Address will auto-fill! ✨</p>
              <div className="rounded-md overflow-hidden border">
                <MapContainer center={[latitude, longitude]} zoom={13} style={{ height: '200px', width: '100%' }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    subdomains="abcd"
                    maxZoom={20}
                  />
                  <Marker
                    position={[latitude, longitude]}
                    draggable
                    eventHandlers={{
                      dragend: async (e: any) => {
                        const pos = e.target.getLatLng();
                        setLatitude(pos.lat);
                        setLongitude(pos.lng);

                        // Auto-fill address when marker is dragged
                        await reverseGeocode(pos.lat, pos.lng);
                      },
                    }}
                  />
                </MapContainer>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                📍 Current: {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </p>
            </div>
            {/* 24-hour operation toggle */}
            <div className="flex items-center justify-between space-x-2 p-3 bg-gray-50 rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Open 24 Hours</Label>
                <p className="text-xs text-gray-500">Toggle if this business operates 24/7</p>
              </div>
              <Switch checked={open24h} onCheckedChange={setOpen24h} />
            </div>

            {/* Operating hours - only show if not 24h */}
            {!open24h && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Open Time</Label>
                  <Input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Close Time</Label>
                  <Input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} />
                </div>
              </div>
            )}

            {/* Password field */}
            <div className="border-t pt-4 space-y-2">
              <Label>Partner Password (Optional)</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (min. 6 characters)"
              />
              <p className="text-xs text-gray-500">
                💡 Set a password so the partner can login immediately. If left empty, partner will need to use "Forgot Password" to set their password.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAddPartner(false)}>Cancel</Button>
            <Button onClick={handleAddPartner} disabled={submitting} className="bg-green-600 text-white hover:bg-green-700">
              {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding…</>) : 'Add Partner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Grant Slots Dialog */}
      <Dialog open={showGrantSlotsDialog} onOpenChange={setShowGrantSlotsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Additional Slots</DialogTitle>
            <DialogDescription>
              {grantSlotsPartner ? `Partner: ${grantSlotsPartner.business_name}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Current slots: <span className="font-semibold">{currentSlots}</span></p>
            <div className="space-y-1">
              <Label>Add Slots</Label>
              <Input value={addSlots} onChange={(e) => setAddSlots(e.target.value)} placeholder="e.g. 2" />
            </div>
            <p className="text-xs text-gray-500">This increases partner's total active offer capacity immediately.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGrantSlotsDialog(false)}>Cancel</Button>
            <Button disabled={!addSlots} onClick={handleGrantSlots}>Grant Slots</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Partner Profile Editor (Replaces basic edit dialog) */}
      {editingPartner && (
        <EditPartnerProfile
          partner={editingPartner as any}
          open={showEditDialog}
          onOpenChange={(open) => {
            setShowEditDialog(open);
            if (!open) setEditingPartner(null);
          }}
          onUpdate={() => {
            loadPartners();
            onStatsUpdate();
          }}
        />
      )}

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
            <DialogTitle className="flex items-center gap-3">
              <span>Partner: {selectedPartner?.business_name}</span>
              {selectedPartner && (
                <div className="flex items-center gap-2 text-sm font-normal">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {partnerOffers.length} / {selectedPartner.approved_for_upload ? '∞' : '10'} slots
                  </Badge>
                  {partnerOffers.length >= 10 && !selectedPartner.approved_for_upload && (
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      Slots Full
                    </Badge>
                  )}
                </div>
              )}
            </DialogTitle>
            <DialogDescription className="space-y-1">
              <p>View and manage all offers for this partner</p>
              <p className="text-xs text-gray-500">
                💡 <strong>Refresh</strong> = Resets offer to max quantity without using new slot | 
                <strong className="ml-2">Auto-Relist</strong> = Automatically refreshes daily during business hours
              </p>
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
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Auto-Relist</TableHead>
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
                        <Switch
                          checked={(offer as any).auto_relist_enabled || false}
                          onCheckedChange={() => handleToggleAutoRelist(offer)}
                          className="data-[state=checked]:bg-green-600"
                          title={`Auto-relist: ${(offer as any).auto_relist_enabled ? 'ON' : 'OFF'}`}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(offer.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRefreshOffer(offer)}
                            className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                            title="Refresh offer - Reset to max quantity and show as new"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditOffer(offer)}
                            className="text-blue-600 hover:text-blue-700"
                            title="Edit offer details"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleOfferPause(offer)}
                            className={offer.status === 'PAUSED' ? 'text-green-600 hover:text-green-700' : 'text-orange-600 hover:text-orange-700'}
                            title={offer.status === 'PAUSED' ? 'Resume offer' : 'Pause offer'}
                          >
                            {offer.status === 'PAUSED' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteOffer(offer)}
                            className="text-red-600 hover:text-red-700"
                            title="Delete offer"
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
          {/* Activity Logs */}
          {selectedPartner && (
            <div className="mt-6 border rounded-md">
              <div className="px-4 py-2 border-b bg-gray-50 flex items-center justify-between">
                <h3 className="font-semibold text-sm">Activity Logs</h3>
                <Button variant="outline" size="sm" onClick={() => loadLogs(selectedPartner.id)} disabled={loadingLogs}>
                  {loadingLogs ? 'Loading…' : 'Reload'}
                </Button>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y text-sm">
                {loadingLogs && partnerLogs.length === 0 && (
                  <div className="p-4 text-gray-500">Loading logs…</div>
                )}
                {!loadingLogs && partnerLogs.length === 0 && (
                  <div className="p-4 text-gray-500">No activity recorded</div>
                )}
                {partnerLogs.map((log, idx) => (
                  <div key={idx} className="px-4 py-2 flex items-start gap-3">
                    <div className="w-32 text-xs text-gray-500">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                    </div>
                    <div className="flex-1">
                      <span className="font-medium">{log.action}</span>
                      {log.details && <span className="text-gray-600 ml-2">{log.details}</span>}
                    </div>
                    {log.admin_id && <div className="text-xs text-gray-400">Admin: {log.admin_id.slice(0,8)}</div>}
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500">
                Showing last {partnerLogs.length} actions (max 50)
              </div>
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

      {/* Edit Offer Dialog */}
      <Dialog open={showEditOfferDialog} onOpenChange={setShowEditOfferDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Offer</DialogTitle>
            <DialogDescription>
              Update offer details and automatic relisting settings
            </DialogDescription>
          </DialogHeader>
          {editingOffer && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="offer_title">Title</Label>
                <Input
                  id="offer_title"
                  value={editingOffer.title || ''}
                  onChange={(e) => setEditingOffer({
                    ...editingOffer,
                    title: e.target.value
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="offer_description">Description</Label>
                <Textarea
                  id="offer_description"
                  value={editingOffer.description || ''}
                  onChange={(e) => setEditingOffer({
                    ...editingOffer,
                    description: e.target.value
                  })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="offer_price">Price ($)</Label>
                  <Input
                    id="offer_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingOffer.smart_price || 0}
                    onChange={(e) => setEditingOffer({
                      ...editingOffer,
                      smart_price: parseFloat(e.target.value) || 0
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offer_quantity">Quantity</Label>
                  <Input
                    id="offer_quantity"
                    type="number"
                    min="0"
                    value={editingOffer.quantity_available || 0}
                    onChange={(e) => setEditingOffer({
                      ...editingOffer,
                      quantity_available: parseInt(e.target.value) || 0
                    })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between space-x-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Auto-Relist Daily</Label>
                  <p className="text-xs text-gray-600">
                    Automatically relist this offer every day when business opens until closing time
                  </p>
                </div>
                <Switch
                  checked={(editingOffer as any).auto_relist_enabled || false}
                  onCheckedChange={(checked) => setEditingOffer({
                    ...editingOffer,
                    auto_relist_enabled: checked
                  } as any)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditOfferDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveOfferEdit} className="bg-blue-600 text-white hover:bg-blue-700">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

