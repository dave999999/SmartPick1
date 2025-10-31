import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Offer, Reservation, Partner, CreateOfferDTO } from '@/lib/types';
import {
  getPartnerByUserId,
  getPartnerOffers,
  getPartnerReservations,
  getPartnerStats,
  createOffer,
  updateOffer,
  deleteOffer,
  validateQRCode,
  markAsPickedUp,
  getCurrentUser,
  signOut,
  uploadImages,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, ShoppingBag, Package, CheckCircle, QrCode, Trash2, Pause, Play, LogOut, Edit, TrendingUp, Clock, Lock, Utensils, MessageSquare, Calendar, DollarSign, Hash, Upload, X, Eye, RefreshCw, Filter, ChevronDown } from 'lucide-react';
// (Language switch removed from this page — language control moved to Index header)

export default function PartnerDashboard() {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stats, setStats] = useState({ activeOffers: 0, reservationsToday: 0, itemsPickedUp: 0 });
  const [analytics, setAnalytics] = useState({ totalOffers: 0, totalReservations: 0, itemsSold: 0, revenue: 0 });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [useBusinessHours, setUseBusinessHours] = useState(false);
  const [pickupStartSlot, setPickupStartSlot] = useState('');
  const [pickupEndSlot, setPickupEndSlot] = useState('');
  const [autoExpire12h, setAutoExpire12h] = useState(true);
  const [offerFilter, setOfferFilter] = useState<'all' | 'active' | 'expired' | 'sold_out'>('all');
  const navigate = useNavigate();

  const CATEGORIES = ['BAKERY', 'RESTAURANT', 'CAFE', 'GROCERY'];

  // Derive display status for an offer based on quantity and time
  const getOfferDisplayStatus = (offer: Offer): string => {
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

  // Check if partner is pending - case insensitive
  const isPending = partner?.status?.toUpperCase() === 'PENDING';
  
  // Check if partner operates 24 hours
  const is24HourBusiness = partner?.open_24h === true;

  // Helper: Round time to nearest 15 minutes UP
  const roundToNearest15 = (date: Date): Date => {
    const minutes = Math.ceil(date.getMinutes() / 15) * 15;
    const newDate = new Date(date);
    if (minutes === 60) {
      newDate.setHours(newDate.getHours() + 1);
      newDate.setMinutes(0);
    } else {
      newDate.setMinutes(minutes);
    }
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    return newDate;
  };

  // Helper: Generate 30-min time slots
  const generateTimeSlots = (start: Date, end: Date): string[] => {
    const slots: string[] = [];
    const current = new Date(start);
    while (current <= end) {
      const hours = current.getHours().toString().padStart(2, '0');
      const minutes = current.getMinutes().toString().padStart(2, '0');
      slots.push(`${hours}:${minutes}`);
      current.setTime(current.getTime() + 30 * 60 * 1000);
    }
    return slots;
  };

  // Get business closing time as Date
  const getClosingTime = (): Date | null => {
    if (partner?.business_hours && typeof partner.business_hours === 'object' && 'close' in partner.business_hours) {
      const closingTime = (partner.business_hours as { close: string }).close;
      const [hours, minutes] = closingTime.split(':').map(Number);
      const closing = new Date();
      closing.setHours(hours, minutes, 0, 0);
      return closing;
    }
    return null;
  };

  useEffect(() => {
    loadPartnerData();
  }, []);

  // Auto-fill pickup times when dialog opens
  useEffect(() => {
    if (isCreateDialogOpen && partner) {
      const now = new Date();
      
      // For 24-hour businesses with auto-expire enabled
      if (is24HourBusiness && autoExpire12h) {
        const end = new Date(now.getTime() + 12 * 60 * 60 * 1000); // +12 hours
        
        const pickupStartInput = document.getElementById('pickup_start') as HTMLInputElement;
        const pickupEndInput = document.getElementById('pickup_end') as HTMLInputElement;
        
        if (pickupStartInput) {
          pickupStartInput.value = now.toISOString().slice(0, 16);
          pickupStartInput.readOnly = true;
        }
        if (pickupEndInput) {
          pickupEndInput.value = end.toISOString().slice(0, 16);
          pickupEndInput.readOnly = true;
        }
      } else {
        // For non-24h businesses or 24h with auto-expire disabled
        const roundedNow = roundToNearest15(now);
        const pickupStartInput = document.getElementById('pickup_start') as HTMLInputElement;
        
        if (pickupStartInput && !useBusinessHours) {
          pickupStartInput.value = roundedNow.toISOString().slice(0, 16);
          pickupStartInput.readOnly = false;
        }

        // Set pickup end based on business hours or +2 hours
        let endTime: Date;
        const closing = getClosingTime();
        if (closing && closing > roundedNow && !is24HourBusiness) {
          endTime = closing;
        } else {
          // Fallback: +2 hours
          endTime = new Date(roundedNow.getTime() + 2 * 60 * 60 * 1000);
        }

        const pickupEndInput = document.getElementById('pickup_end') as HTMLInputElement;
        if (pickupEndInput && !useBusinessHours) {
          pickupEndInput.value = endTime.toISOString().slice(0, 16);
          pickupEndInput.readOnly = false;
        }

        // Initialize dropdown slots if in dropdown mode
        if (useBusinessHours) {
          const slots = generateTimeSlots(roundedNow, endTime);
          if (slots.length > 0) {
            setPickupStartSlot(slots[0]);
            setPickupEndSlot(slots[slots.length - 1]);
          }
        }
      }
    }
  }, [isCreateDialogOpen, partner,  useBusinessHours, is24HourBusiness, autoExpire12h]);

  const loadPartnerData = async () => {
    try {
      setIsLoading(true);
      const { user } = await getCurrentUser();
      if (!user) {
        navigate('/');
        return;
      }

      const partnerData = await getPartnerByUserId(user.id);
      if (!partnerData) {
        toast.error('Partner profile not found');
        navigate('/partner/apply');
        return;
      }

      setPartner(partnerData);
      
      // Normalize status to uppercase for comparison
      const normalizedStatus = partnerData.status?.toUpperCase();
      
      // If partner is pending, only load basic data (no offers/reservations)
      if (normalizedStatus === 'PENDING') {
        setIsLoading(false);
        return;
      }

      // If approved, load full dashboard data
      if (normalizedStatus === 'APPROVED') {
        const [offersData, reservationsData, statsData] = await Promise.all([
          getPartnerOffers(partnerData.id),
          getPartnerReservations(partnerData.id),
          getPartnerStats(partnerData.id),
        ]);

        setOffers(offersData);
        setReservations(reservationsData.filter(r => r.status === 'ACTIVE'));
        setStats(statsData);

        // Calculate analytics
        const totalReservations = reservationsData.length;
        const itemsSold = reservationsData.filter(r => r.status === 'PICKED_UP').reduce((sum, r) => sum + r.quantity, 0);
        const revenue = reservationsData.filter(r => r.status === 'PICKED_UP').reduce((sum, r) => sum + r.total_price, 0);
        
        setAnalytics({
          totalOffers: offersData.length,
          totalReservations,
          itemsSold,
          revenue
        });
      } else {
        // Status is REJECTED or other
        toast.error('Your partner application was not approved');
        navigate('/');
        return;
      }
    } catch (error) {
      console.error('Error loading partner data:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOffer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);

    try {
      setIsSubmitting(true);

      // Extract and validate title and description with defaults
      const title = (formData.get('title') as string)?.trim() || "Untitled Offer";
      const description = (formData.get('description') as string)?.trim() || "No description provided";

      // Handle pickup times based on mode
      let pickupStart: Date;
      let pickupEnd: Date;

      if (is24HourBusiness && autoExpire12h) {
        // 24-hour business with auto-expire: current time + 12 hours
        pickupStart = new Date();
        pickupEnd = new Date(pickupStart.getTime() + 12 * 60 * 60 * 1000);
      } else {
        // Read 24-hour time inputs and combine with today's date
        const today = new Date();
        const startTime = formData.get('pickup_start_time') as string;
        const endTime = formData.get('pickup_end_time') as string;
        
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const [endHours, endMinutes] = endTime.split(':').map(Number);
        
        pickupStart = new Date(today);
        pickupStart.setHours(startHours, startMinutes, 0, 0);
        
        pickupEnd = new Date(today);
        pickupEnd.setHours(endHours, endMinutes, 0, 0);
      }

      const offerData = {
        title,
        description,
        category: partner?.business_type || 'RESTAURANT',
        images: imageFiles, // Pass File[] array, API will handle upload
        original_price: parseFloat(formData.get('original_price') as string),
        smart_price: parseFloat(formData.get('smart_price') as string),
        quantity_total: parseInt(formData.get('quantity') as string),
        pickup_window: {
          start: pickupStart,
          end: pickupEnd,
        },
      };

      console.log('Creating offer with data:', offerData);

      if (partner) {
        await createOffer(offerData, partner.id);
        toast.success('Offer created successfully!');
        setIsCreateDialogOpen(false);
        setImageFiles([]);
        setImagePreviews([]);
        setFormErrors({});
        setUseBusinessHours(false);
        setPickupStartSlot('');
        setPickupEndSlot('');
        setAutoExpire12h(true);
        loadPartnerData();
      }
    } catch (error) {
      console.error('Error creating offer:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to create offer: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditOffer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingOffer) return;

    const formData = new FormData(e.currentTarget);

    try {
      // Upload new images if any
      let imageUrls = editingOffer.images || [];
      if (imageFiles.length > 0) {
        const newImageUrls = await uploadImages(imageFiles, 'offer-images');
        imageUrls = [...imageUrls, ...newImageUrls];
      }

      const updates = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        category: formData.get('category') as string,
        images: imageUrls,
        original_price: parseFloat(formData.get('original_price') as string),
        smart_price: parseFloat(formData.get('smart_price') as string),
        quantity_total: parseInt(formData.get('quantity') as string),
        quantity_available: parseInt(formData.get('quantity') as string),
        pickup_start: new Date(formData.get('pickup_start') as string).toISOString(),
        pickup_end: new Date(formData.get('pickup_end') as string).toISOString(),
      };

      await updateOffer(editingOffer.id, updates);
      toast.success('Offer updated successfully!');
      setIsEditDialogOpen(false);
      setEditingOffer(null);
      setImageFiles([]);
      loadPartnerData();
    } catch (error) {
      console.error('Error updating offer:', error);
      toast.error('Failed to update offer');
    }
  };

  const handleRefreshQuantity = async (offerId: string) => {
    if (processingIds.has(offerId)) return;
    
    try {
      setProcessingIds(prev => new Set(prev).add(offerId));
      const offer = offers.find(o => o.id === offerId);
      
      await updateOffer(offerId, { 
        quantity_available: offer?.quantity_total || 0
      });
      await loadPartnerData();
      toast.success('Quantity refreshed successfully');
    } catch (error) {
      console.error('Error refreshing quantity:', error);
      toast.error('Failed to refresh quantity');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(offerId);
        return next;
      });
    }
  };

  const handleCreateNewFromOld = async (oldOffer: Offer) => {
    if (processingIds.has(oldOffer.id)) return;

    try {
      setProcessingIds(prev => new Set(prev).add(oldOffer.id));
      
      // Set new pickup window (2 hours from now)
      const now = new Date();
      const pickupEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      // Create new offer with old parameters but new times
      if (partner) {
        // First create the offer without images
        const createData: CreateOfferDTO = {
          title: oldOffer.title,
          description: oldOffer.description,
          category: oldOffer.category,
          original_price: oldOffer.original_price,
          smart_price: oldOffer.smart_price,
          quantity_total: oldOffer.quantity_total,
          images: [], // Start with empty images array
          pickup_window: {
            start: now,
            end: pickupEnd,
          }
        };

        // Create the initial offer
        const newOffer = await createOffer(createData, partner.id);
        
        // If we have images from the old offer, update the new offer with them
        if (newOffer && oldOffer.images && oldOffer.images.length > 0) {
          await updateOffer(newOffer.id, {
            images: oldOffer.images
          });
        }

        toast.success('New offer created successfully');
        await loadPartnerData();
      }
    } catch (error) {
      console.error('Error creating new offer:', error);
      toast.error('Failed to create new offer');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(oldOffer.id);
        return next;
      });
    }
  };

  const handleToggleOffer = async (offerId: string, currentStatus: string) => {
    if (processingIds.has(offerId)) return;

    try {
      setProcessingIds(prev => new Set(prev).add(offerId));
      const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      await updateOffer(offerId, { status: newStatus });
      toast.success(`Offer ${newStatus.toLowerCase()}`);
      loadPartnerData();
    } catch (error) {
      toast.error('Failed to update offer');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(offerId);
        return newSet;
      });
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm('Are you sure you want to delete this offer?')) return;
    
    try {
      await deleteOffer(offerId);
      toast.success('Offer deleted');
      loadPartnerData();
    } catch (error) {
      toast.error('Failed to delete offer');
    }
  };

  const handleMarkAsPickedUp = async (reservation: Reservation) => {
  if (processingIds.has(reservation.id)) return;

  try {
    setProcessingIds(prev => new Set(prev).add(reservation.id));

    // ✅ Only update reservation status in database
    await markAsPickedUp(reservation.id);

    // ❌ Do NOT modify offer quantity or status here
    // Offer quantity was already decreased when the reservation was made

    toast.success('Pickup confirmed successfully!');
    loadPartnerData();
  } catch (error) {
    console.error('Error marking as picked up:', error);
    toast.error('Failed to confirm pickup');
  } finally {
    setProcessingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(reservation.id);
      return newSet;
    });
  }
};

  const handleValidateQR = async () => {
    if (!qrInput.trim()) {
      toast.error('Please enter a QR code');
      return;
    }

    try {
      const result = await validateQRCode(qrInput);
      if (result.valid && result.reservation) {
        await handleMarkAsPickedUp(result.reservation);
        setQrInput('');
        setQrScannerOpen(false);
      } else {
        toast.error(result.error || 'Invalid QR code');
      }
    } catch (error) {
      toast.error('Failed to validate QR code');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const openEditDialog = (offer: Offer) => {
    setEditingOffer(offer);
    setIsEditDialogOpen(true);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImageFiles(files);
    
    // Create previews
    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    setImageFiles(files);
    
    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handlePickupStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const startTime = e.target.value;
    if (startTime && !useBusinessHours && !is24HourBusiness) {
      const startDate = new Date(startTime);
      
      // Check if we should use business closing time or +2 hours
      let endDate: Date;
      const closing = getClosingTime();
      if (closing && closing > startDate) {
        endDate = closing;
      } else {
        endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
      }
      
      const endTimeString = endDate.toISOString().slice(0, 16);
      const pickupEndInput = document.getElementById('pickup_end') as HTMLInputElement;
      if (pickupEndInput) {
        pickupEndInput.value = endTimeString;
      }
    }
  };

  const handlePickupStartSlotChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedStart = e.target.value;
    setPickupStartSlot(selectedStart);
    
    // Auto-update end slot to be at least 30 min after start
    if (selectedStart) {
      const [hours, minutes] = selectedStart.split(':').map(Number);
      const startTime = new Date();
      startTime.setHours(hours, minutes, 0, 0);
      
      const closing = getClosingTime();
      const endTime = closing || new Date(startTime.getTime() + 2 * 60 * 60 * 1000);
      
      const slots = generateTimeSlots(new Date(startTime.getTime() + 30 * 60 * 1000), endTime);
      if (slots.length > 0 && (!pickupEndSlot || pickupEndSlot <= selectedStart)) {
        setPickupEndSlot(slots[slots.length - 1]);
      }
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    const titleInput = document.getElementById('title') as HTMLInputElement;
    const descInput = document.getElementById('description') as HTMLTextAreaElement;
    const quantityInput = document.getElementById('quantity') as HTMLInputElement;
    const originalPriceInput = document.getElementById('original_price') as HTMLInputElement;
    const smartPriceInput = document.getElementById('smart_price') as HTMLInputElement;
    
    if (!titleInput?.value.trim()) errors.title = 'Please fill this field';
    if (!descInput?.value.trim()) errors.description = 'Please fill this field';
    
    if (!quantityInput?.value || parseInt(quantityInput.value) < 1) errors.quantity = 'Please fill this field';
    if (!originalPriceInput?.value || parseFloat(originalPriceInput.value) <= 0) errors.original_price = 'Please fill this field';
    if (!smartPriceInput?.value || parseFloat(smartPriceInput.value) <= 0) errors.smart_price = 'Please fill this field';
    
    // Skip pickup time validation for 24h businesses with auto-expire enabled
    if (is24HourBusiness && autoExpire12h) {
      // No validation needed, times are auto-set
    } else if (useBusinessHours) {
      // Dropdown mode validation
      if (!pickupStartSlot) errors.pickup_start = 'Please select pickup start time';
      if (!pickupEndSlot) errors.pickup_end = 'Please select pickup end time';
      
      if (pickupStartSlot && pickupEndSlot && pickupEndSlot <= pickupStartSlot) {
        errors.pickup_end = 'Pickup end must be after pickup start';
      }
    } else {
      // Date-time picker mode validation
      const pickupStartInput = document.getElementById('pickup_start') as HTMLInputElement;
      const pickupEndInput = document.getElementById('pickup_end') as HTMLInputElement;
      
      if (!pickupStartInput?.value) errors.pickup_start = 'Please fill this field';
      if (!pickupEndInput?.value) errors.pickup_end = 'Please fill this field';
      
      if (pickupStartInput?.value && pickupEndInput?.value) {
        const startTime = new Date(pickupStartInput.value);
        const endTime = new Date(pickupEndInput.value);
        
        if (endTime <= startTime) {
          errors.pickup_end = 'Pickup end must be after pickup start';
        }
        
        // Validate against business closing time (only for non-24h businesses)
        if (!is24HourBusiness) {
          const closing = getClosingTime();
          if (closing && endTime > closing && endTime.getDate() === closing.getDate()) {
            errors.pickup_end = 'Pickup end cannot exceed business closing time';
          }
          
          // Validate start time is within business hours
          if (closing && startTime > closing && startTime.getDate() === closing.getDate()) {
            errors.pickup_start = 'Pickup time must be within business hours';
          }
        }
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'BAKERY': return '🥖';
      case 'RESTAURANT': return '🍽️';
      case 'CAFE': return '☕';
      case 'GROCERY': return '🛒';
      default: return '🏷️';
    }
  };

  // Generate time slot options for dropdowns
  const getStartTimeSlots = () => {
    const now = roundToNearest15(new Date());
    const closing = getClosingTime();
    const end = closing || new Date(now.getTime() + 8 * 60 * 60 * 1000); // 8 hours if no closing time
    return generateTimeSlots(now, end);
  };

// Generate 24-hour time options (00:00 to 23:00)
const generate24HourOptions = (): string[] => {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const hourStr = hour.toString().padStart(2, "0");
      const minuteStr = minute.toString().padStart(2, "0");
      options.push(`${hourStr}:${minuteStr}`);
    }
  }
  return options;
};
  const getEndTimeSlots = () => {
    if (!pickupStartSlot) return [];

    const [hours, minutes] = pickupStartSlot.split(':').map(Number);
    const startTime = new Date();
    startTime.setHours(hours, minutes, 0, 0);

    const minEndTime = new Date(startTime.getTime() + 30 * 60 * 1000); // At least 30 min after start
    const closing = getClosingTime();
    const maxEndTime = closing || new Date(startTime.getTime() + 8 * 60 * 60 * 1000);

    return generateTimeSlots(minEndTime, maxEndTime);
  };

  // Filter offers based on selected filter
  const filteredOffers = offers.filter(offer => {
    const displayStatus = getOfferDisplayStatus(offer);

    if (offerFilter === 'all') return true;
    if (offerFilter === 'active') return displayStatus === 'ACTIVE';
    if (offerFilter === 'expired') return displayStatus === 'EXPIRED';
    if (offerFilter === 'sold_out') return displayStatus === 'SOLD_OUT';

    return true;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#EFFFF8] to-[#C9F9E9]" style={{ fontFamily: 'Inter, Poppins, sans-serif' }}>
      {/* Header */}
      <header className="bg-white border-b border-[#E8F9F4] sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/icon1.png" alt="SmartPick icon" className="h-8 md:h-10 w-8 md:w-10 object-contain" />
            <div className="leading-tight">
              <h1 className="text-lg md:text-xl font-extrabold bg-gradient-to-r from-[#00C896] to-[#009B77] text-transparent bg-clip-text">
                {partner?.business_name}
              </h1>
              <p className="text-[11px] md:text-xs text-neutral-500">Partner Dashboard</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="outline"
              className="h-11 rounded-full"
              onClick={() => navigate('/')}
            >
              🏠 Customer View
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-full"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Pending Status Banner */}
        {isPending && (
          <div className="mb-8">
            <Alert className="bg-yellow-50 border-yellow-200">
              <Clock className="h-5 w-5 text-yellow-600" />
              <AlertDescription className="text-yellow-900">
                <div className="flex items-center justify-between">
                  <div>
                    <strong className="text-lg">🕓 Your partner application is under review.</strong>
                    <p className="mt-1">You'll be notified once approved. Meanwhile, you can explore the dashboard interface below.</p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Summary Bar - Enhanced with Mint Theme */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card className={`rounded-2xl border-[#E8F9F4] shadow-lg hover:shadow-xl transition-all duration-300 ${isPending ? 'opacity-60' : 'hover:scale-[1.02]'}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-gray-600">📦 Offers Live</CardTitle>
              <Package className="w-5 h-5 text-[#00C896]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#00C896] to-[#009B77] text-transparent bg-clip-text">
                {isPending ? '—' : stats.activeOffers}
              </div>
              {isPending && (
                <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                  <Lock className="w-3 h-3" />
                  <span>Available after approval</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={`rounded-2xl border-[#E8F9F4] shadow-lg hover:shadow-xl transition-all duration-300 ${isPending ? 'opacity-60' : 'hover:scale-[1.02]'}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-gray-600">✅ Picked Up Today</CardTitle>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl md:text-4xl font-bold text-green-600">
                {isPending ? '—' : stats.itemsPickedUp}
              </div>
              {isPending && (
                <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                  <Lock className="w-3 h-3" />
                  <span>Available after approval</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={`rounded-2xl border-[#E8F9F4] shadow-lg hover:shadow-xl transition-all duration-300 ${isPending ? 'opacity-60' : 'hover:scale-[1.02]'}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-gray-600">💰 SmartPick Revenue</CardTitle>
              <DollarSign className="w-5 h-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl md:text-4xl font-bold text-purple-600">
                {isPending ? '—' : `${analytics.revenue.toFixed(2)} ₾`}
              </div>
              {isPending && (
                <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                  <Lock className="w-3 h-3" />
                  <span>Available after approval</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-6 md:mb-8">
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) {
              setImageFiles([]);
              setImagePreviews([]);
              setFormErrors({});
              setUseBusinessHours(false);
              setPickupStartSlot('');
              setPickupEndSlot('');
              setAutoExpire12h(true);
            }
          }}>
            <DialogTrigger asChild>
              <Button
                className="h-11 md:h-12 rounded-full bg-gradient-to-r from-[#00C896] to-[#009B77] hover:from-[#00B588] hover:to-[#008866] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                disabled={isPending}
              >
                <Plus className="w-5 h-5 mr-2" />
                ✨ New Smart-Time Offer
                {isPending && <Lock className="w-4 h-4 ml-2" />}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#00C896] to-[#009B77] text-transparent bg-clip-text">
                  ✨ Create New Offer
                </DialogTitle>
                <DialogDescription className="text-sm md:text-base">Add a fresh Smart-Time offer for your customers</DialogDescription>
              </DialogHeader>

              {/* Single Page Form Header */}
              <div className="bg-gradient-to-r from-[#F9FFFB] to-[#EFFFF8] p-4 rounded-xl border-l-4 border-[#00C896] mb-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-1">📝 Complete Offer Details</h3>
                <p className="text-sm text-gray-600">Fill in all information to create your Smart-Time offer</p>
              </div>

              <form onSubmit={handleCreateOffer} className="space-y-6">
                {/* Basic Info Section */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 text-lg border-b pb-2">Basic Information</h4>

                    <div>
                      <Label htmlFor="title" className="flex items-center gap-2 text-base font-semibold mb-2">
                        <Utensils className="w-4 h-4 text-[#4CC9A8]" />
                        Offer Title *
                      </Label>
                      <Input
                        id="title"
                        name="title"
                        required
                        placeholder="e.g., Fresh Khachapuri"
                        className="text-base py-6 rounded-xl border-[#DFF5ED] focus:border-[#00C896] focus:ring-[#00C896]"
                      />
                      {formErrors.title && <p className="text-red-500 text-sm mt-1">{formErrors.title}</p>}
                    </div>

                    <div>
                      <Label htmlFor="description" className="flex items-center gap-2 text-base font-semibold mb-2">
                        <MessageSquare className="w-4 h-4 text-[#4CC9A8]" />
                        Description *
                      </Label>
                      <Textarea
                        id="description"
                        name="description"
                        required
                        placeholder="Describe your offer in detail..."
                        className="text-base min-h-[100px] rounded-xl border-[#DFF5ED] focus:border-[#00C896] focus:ring-[#00C896]"
                      />
                      {formErrors.description && <p className="text-red-500 text-sm mt-1">{formErrors.description}</p>}
                    </div>

                    {/* Auto Category Display */}
                    <div>
                      <Label className="flex items-center gap-2 text-base font-semibold mb-2">
                        <Package className="w-4 h-4 text-[#4CC9A8]" />
                        Category
                      </Label>
                      <div className="bg-gradient-to-r from-[#F9FFFB] to-[#EFFFF8] border border-[#DFF5ED] rounded-xl px-4 py-6 flex items-center gap-2">
                        <span className="text-2xl">{getCategoryIcon(partner?.business_type || 'RESTAURANT')}</span>
                        <span className="text-base font-medium text-gray-900">{partner?.business_type || 'RESTAURANT'}</span>
                        <span className="text-sm text-[#00C896] ml-2">(auto-filled)</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Category is automatically set based on your business type</p>
                    </div>

                    <div>
                      <Label className="flex items-center gap-2 text-base font-semibold mb-2">
                        <Upload className="w-4 h-4 text-[#4CC9A8]" />
                        Images (Optional)
                      </Label>
                      <div
                        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 ${
                          isDragOver ? 'border-[#00C896] bg-[#F9FFFB] scale-105' : 'border-[#DFF5ED] hover:border-[#00C896]'
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      >
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 mb-2">Drag & drop images here, or click to browse</p>
                        <Input 
                          id="images" 
                          type="file" 
                          multiple 
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('images')?.click()}
                          className="mt-2"
                        >
                          Choose Files
                        </Button>
                      </div>
                      
                      {imagePreviews.length > 0 && (
                        <div className="grid grid-cols-3 gap-3 mt-4">
                          {imagePreviews.map((preview, index) => (
                            <div key={index} className="relative group">
                              <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                </div>

                {/* Pricing & Quantity Section */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 text-lg border-b pb-2">Pricing & Quantity</h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="quantity" className="flex items-center gap-2 text-base font-semibold mb-2">
                          <Hash className="w-4 h-4 text-[#4CC9A8]" />
                          Quantity *
                        </Label>
                        <Input
                          id="quantity"
                          name="quantity"
                          type="number"
                          required
                          min="1"
                          placeholder="10"
                          className="text-base py-6 rounded-xl border-[#DFF5ED] focus:border-[#00C896] focus:ring-[#00C896]"
                        />
                        {formErrors.quantity && <p className="text-red-500 text-sm mt-1">{formErrors.quantity}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="original_price" className="flex items-center gap-2 text-base font-semibold mb-2">
                          <DollarSign className="w-4 h-4 text-gray-500" />
                          Original Price *
                        </Label>
                        <div className="relative">
                          <Input
                            id="original_price"
                            name="original_price"
                            type="number"
                            step="0.01"
                            required
                            placeholder="10.00"
                            className="text-base py-6 pr-12 rounded-xl border-[#DFF5ED] focus:border-[#00C896] focus:ring-[#00C896]"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">₾</span>
                        </div>
                        {formErrors.original_price && <p className="text-red-500 text-sm mt-1">{formErrors.original_price}</p>}
                      </div>
                      <div>
                        <Label htmlFor="smart_price" className="flex items-center gap-2 text-base font-semibold mb-2">
                          <DollarSign className="w-4 h-4 text-[#4CC9A8]" />
                          Smart Price *
                        </Label>
                        <div className="relative">
                          <Input
                            id="smart_price"
                            name="smart_price"
                            type="number"
                            step="0.01"
                            required
                            placeholder="6.00"
                            className="text-base py-6 pr-12 rounded-xl border-[#DFF5ED] focus:border-[#00C896] focus:ring-[#00C896]"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4CC9A8] font-semibold">₾</span>
                        </div>
                        {formErrors.smart_price && <p className="text-red-500 text-sm mt-1">{formErrors.smart_price}</p>}
                      </div>
                    </div>

                    {/* 24-Hour Business Auto-Expire Checkbox */}
                    {is24HourBusiness && (
                      <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <Checkbox 
                          id="auto_expire_12h" 
                          checked={autoExpire12h}
                          onCheckedChange={(checked) => {
                            setAutoExpire12h(checked as boolean);
                            setFormErrors({});
                          }}
                        />
                        <Label htmlFor="auto_expire_12h" className="text-sm cursor-pointer">
                          This offer expires automatically in 12 hours
                        </Label>
                      </div>
                    )}
                </div>

                {/* Pickup Time Section */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 text-lg border-b pb-2">Pickup Time Window</h4>

                  {/* 24-hour time dropdowns */}
                  {(!is24HourBusiness || !autoExpire12h) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="pickup_start_time" className="flex items-center gap-2 text-base font-semibold mb-2">
                            <Clock className="w-4 h-4 text-[#4CC9A8]" />
                            Pickup Start Time *
                          </Label>
                          <select
                            id="pickup_start_time"
                            name="pickup_start_time"
                            required
                            className="w-full text-base py-3 px-4 border border-[#DFF5ED] rounded-md focus:border-[#4CC9A8] focus:outline-none"
                          >
                            <option value="">Select time</option>
                            {generate24HourOptions().map(time => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-500 mt-1">24-hour format (HH:mm)</p>
                          {formErrors.pickup_start && <p className="text-red-500 text-sm mt-1">{formErrors.pickup_start}</p>}
                        </div>
                        <div>
                          <Label htmlFor="pickup_end_time" className="flex items-center gap-2 text-base font-semibold mb-2">
                            <Clock className="w-4 h-4 text-[#4CC9A8]" />
                            Pickup End Time *
                          </Label>
                          <select
                            id="pickup_end_time"
                            name="pickup_end_time"
                            required
                            className="w-full text-base py-3 px-4 border border-[#DFF5ED] rounded-md focus:border-[#4CC9A8] focus:outline-none"
                          >
                            <option value="">Select time</option>
                            {generate24HourOptions().map(time => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-500 mt-1">24-hour format (HH:mm)</p>
                          {formErrors.pickup_end && <p className="text-red-500 text-sm mt-1">{formErrors.pickup_end}</p>}
                        </div>
                      </div>
                  )}
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-3 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="flex-1 py-6 text-base rounded-full border-[#E8F9F4] hover:border-gray-400"
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-[#00C896] to-[#009B77] hover:from-[#00B588] hover:to-[#008866] text-white py-6 text-lg font-bold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Creating Offer...
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5 mr-2" />
                        Create Offer
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={qrScannerOpen} onOpenChange={setQrScannerOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="h-11 md:h-12 rounded-full border-[#E8F9F4] hover:border-[#00C896] hover:bg-[#F9FFFB] font-semibold transition-all duration-300"
                disabled={isPending}
              >
                <QrCode className="w-5 h-5 mr-2" />
                📱 Scan QR Code
                {isPending && <Lock className="w-4 h-4 ml-2" />}
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-[#00C896] to-[#009B77] text-transparent bg-clip-text">
                  📱 Validate Pickup
                </DialogTitle>
                <DialogDescription className="text-base">Enter the customer's QR code to confirm pickup</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="SP-2024-XY7K9"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleValidateQR()}
                  className="text-base py-6 rounded-xl border-[#DFF5ED] focus:border-[#00C896] focus:ring-[#00C896] font-mono"
                />
                <Button
                  onClick={handleValidateQR}
                  className="w-full bg-gradient-to-r from-[#00C896] to-[#009B77] hover:from-[#00B588] hover:to-[#008866] text-white py-6 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Validate & Confirm Pickup
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Active Reservations - Card-based Layout */}
        <Card className={`mb-6 md:mb-8 rounded-2xl border-[#E8F9F4] shadow-lg ${isPending ? 'opacity-60' : ''}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
              🛎️ Active Reservations
              {isPending && <Lock className="w-5 h-5 text-gray-400" />}
            </CardTitle>
            <CardDescription className="text-sm md:text-base">
              {isPending ? 'This section will be available after approval' : 'Customers waiting for pickup'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isPending ? (
              <div className="text-center py-8 md:py-12">
                <Lock className="w-16 h-16 md:w-20 md:h-20 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2 text-sm md:text-base">Reservations will appear here once your account is approved</p>
                <p className="text-xs md:text-sm text-gray-400">You'll be able to manage customer pickups and validate QR codes</p>
              </div>
            ) : reservations.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <ShoppingBag className="w-16 h-16 md:w-20 md:h-20 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2 text-sm md:text-base">No active reservations</p>
                <p className="text-xs md:text-sm text-gray-400">When customers reserve your offers, they'll appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reservations.map((reservation) => (
                  <Card key={reservation.id} className="rounded-xl border-[#E8F9F4] hover:border-[#00C896] transition-all duration-300 hover:shadow-lg">
                    <CardContent className="p-4 md:p-5">
                      <div className="space-y-3">
                        {/* Customer Info */}
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">{reservation.customer?.name || 'Customer'}</p>
                            <p className="text-xs md:text-sm text-gray-500">{reservation.customer?.email}</p>
                          </div>
                          <Badge className="bg-[#00C896] hover:bg-[#00B588] text-white">
                            {reservation.quantity}x
                          </Badge>
                        </div>

                        {/* Offer Title */}
                        <div className="bg-[#F9FFFB] rounded-lg p-3">
                          <p className="font-medium text-gray-900 text-sm md:text-base">{reservation.offer?.title}</p>
                        </div>

                        {/* Pickup Time */}
                        {reservation.offer?.pickup_start && (
                          <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
                            <Clock className="w-4 h-4 text-[#00C896]" />
                            <span>
                              {formatDateTime(reservation.offer.pickup_start)} - {formatDateTime(reservation.offer.pickup_end || reservation.offer.pickup_start)}
                            </span>
                          </div>
                        )}

                        {/* QR Code */}
                        <div className="flex items-center gap-2">
                          <QrCode className="w-4 h-4 text-gray-400" />
                          <code className="text-xs bg-gray-100 px-3 py-1 rounded-full font-mono">{reservation.qr_code}</code>
                        </div>

                        {/* Action Button */}
                        <Button
                          className="w-full rounded-full bg-green-500 hover:bg-green-600 text-white font-semibold transition-all duration-300 hover:scale-[1.02]"
                          onClick={() => handleMarkAsPickedUp(reservation)}
                          disabled={processingIds.has(reservation.id)}
                        >
                          {processingIds.has(reservation.id) ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Processing...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              ✅ Mark as Picked Up
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Your Offers with Filter Tabs */}
        <Card className={`mb-6 md:mb-8 rounded-2xl border-[#E8F9F4] shadow-lg ${isPending ? 'opacity-60' : ''}`}>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
                  📦 Your Offers
                  {isPending && <Lock className="w-5 h-5 text-gray-400" />}
                </CardTitle>
                <CardDescription className="text-sm md:text-base">
                  {isPending ? 'This section will be available after approval' : 'Manage your Smart-Time offers'}
                </CardDescription>
              </div>

              {/* Filter Tabs */}
              {!isPending && offers.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                  <Button
                    variant={offerFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOfferFilter('all')}
                    className={`rounded-full transition-all duration-300 ${
                      offerFilter === 'all'
                        ? 'bg-gradient-to-r from-[#00C896] to-[#009B77] text-white'
                        : 'border-[#E8F9F4] hover:border-[#00C896] hover:bg-[#F9FFFB]'
                    }`}
                  >
                    All ({offers.length})
                  </Button>
                  <Button
                    variant={offerFilter === 'active' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOfferFilter('active')}
                    className={`rounded-full transition-all duration-300 ${
                      offerFilter === 'active'
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'border-[#E8F9F4] hover:border-green-500 hover:bg-green-50'
                    }`}
                  >
                    Active ({offers.filter(o => getOfferDisplayStatus(o) === 'ACTIVE').length})
                  </Button>
                  <Button
                    variant={offerFilter === 'expired' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOfferFilter('expired')}
                    className={`rounded-full transition-all duration-300 ${
                      offerFilter === 'expired'
                        ? 'bg-gray-500 text-white hover:bg-gray-600'
                        : 'border-[#E8F9F4] hover:border-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    Expired ({offers.filter(o => getOfferDisplayStatus(o) === 'EXPIRED').length})
                  </Button>
                  <Button
                    variant={offerFilter === 'sold_out' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOfferFilter('sold_out')}
                    className={`rounded-full transition-all duration-300 ${
                      offerFilter === 'sold_out'
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'border-[#E8F9F4] hover:border-red-500 hover:bg-red-50'
                    }`}
                  >
                    Sold Out ({offers.filter(o => getOfferDisplayStatus(o) === 'SOLD_OUT').length})
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isPending ? (
              <div className="text-center py-8 md:py-12">
                <Lock className="w-16 h-16 md:w-20 md:h-20 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2 text-sm md:text-base">You'll be able to create and manage offers once approved</p>
                <p className="text-xs md:text-sm text-gray-400">Start reducing food waste by offering Smart-Time deals to customers</p>
              </div>
            ) : offers.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <Package className="w-16 h-16 md:w-20 md:h-20 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2 text-sm md:text-base">No offers yet. Create your first one!</p>
                <p className="text-xs md:text-sm text-gray-400">Start offering Smart-Time deals to attract customers</p>
              </div>
            ) : filteredOffers.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <Filter className="w-16 h-16 md:w-20 md:h-20 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-sm md:text-base">No {offerFilter} offers found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#E8F9F4]">
                      <TableHead className="text-gray-700 font-semibold">Title</TableHead>
                      <TableHead className="text-gray-700 font-semibold">Category</TableHead>
                      <TableHead className="text-gray-700 font-semibold">Price</TableHead>
                      <TableHead className="text-gray-700 font-semibold">Available</TableHead>
                      <TableHead className="text-gray-700 font-semibold">Status</TableHead>
                      <TableHead className="text-gray-700 font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                      {filteredOffers.map((offer) => (
                      <TableRow key={offer.id} className="border-[#E8F9F4] hover:bg-[#F9FFFB] transition-colors">
                        <TableCell className="font-semibold text-gray-900">{offer.title}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="text-lg">{getCategoryIcon(offer.category)}</span>
                            <span className="text-sm text-gray-600">{offer.category}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-bold text-[#00C896]">{offer.smart_price} ₾</div>
                            <div className="text-xs text-gray-400 line-through">{offer.original_price} ₾</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-[#E8F9F4] font-medium">
                            {offer.quantity_available}/{offer.quantity_total}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const st = getOfferDisplayStatus(offer);
                            const isActive = st === 'ACTIVE';
                            const cls = isActive
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : st === 'SOLD_OUT'
                                ? 'bg-red-100 text-red-800 border-red-200'
                                : st === 'EXPIRED'
                                  ? 'bg-gray-100 text-gray-800 border-gray-200'
                                  : st === 'PAUSED'
                                    ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                    : 'bg-gray-100 text-gray-800 border-gray-200';
                            return (
                              <Badge className={`${cls} rounded-full font-medium`}>
                                {st}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full border-[#E8F9F4] hover:border-[#00C896] hover:bg-[#F9FFFB]"
                              onClick={() => handleToggleOffer(offer.id, offer.status)}
                              disabled={processingIds.has(offer.id)}
                              title={offer.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                            >
                              {offer.status === 'ACTIVE' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full border-[#E8F9F4] hover:border-blue-500 hover:bg-blue-50"
                              onClick={() => handleRefreshQuantity(offer.id)}
                              disabled={processingIds.has(offer.id)}
                              title="Refresh quantity"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              className="rounded-full bg-green-500 hover:bg-green-600 text-white"
                              onClick={() => handleCreateNewFromOld(offer)}
                              disabled={processingIds.has(offer.id)}
                              title="Clone offer"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full border-[#E8F9F4] hover:border-[#00C896] hover:bg-[#F9FFFB]"
                              onClick={() => openEditDialog(offer)}
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full border-[#E8F9F4] hover:border-red-500 hover:bg-red-50"
                              onClick={() => handleDeleteOffer(offer.id)}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
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

        {/* Analytics Summary - Collapsible */}
        <Card className={`mb-6 md:mb-8 rounded-2xl border-[#E8F9F4] shadow-lg ${isPending ? 'opacity-60' : ''}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
              <TrendingUp className="w-5 h-5" />
              📊 Analytics Overview
              {isPending && <Lock className="w-5 h-5 text-gray-400" />}
            </CardTitle>
            <CardDescription className="text-sm md:text-base">
              {isPending ? 'Analytics will be available after approval' : 'Your complete SmartPick performance metrics'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center bg-[#F9FFFB] rounded-xl p-4">
                <div className="text-2xl md:text-3xl font-bold text-[#00C896]">{isPending ? '—' : analytics.totalOffers}</div>
                <div className="text-xs md:text-sm text-gray-600 mt-1">Total Offers Created</div>
              </div>
              <div className="text-center bg-[#FFF9F5] rounded-xl p-4">
                <div className="text-2xl md:text-3xl font-bold text-orange-600">{isPending ? '—' : analytics.totalReservations}</div>
                <div className="text-xs md:text-sm text-gray-600 mt-1">Total Reservations</div>
              </div>
              <div className="text-center bg-green-50 rounded-xl p-4">
                <div className="text-2xl md:text-3xl font-bold text-green-600">{isPending ? '—' : analytics.itemsSold}</div>
                <div className="text-xs md:text-sm text-gray-600 mt-1">Items Sold</div>
              </div>
              <div className="text-center bg-purple-50 rounded-xl p-4">
                <div className="text-2xl md:text-3xl font-bold text-purple-600">{isPending ? '—' : `${analytics.revenue.toFixed(2)} ₾`}</div>
                <div className="text-xs md:text-sm text-gray-600 mt-1">Total Revenue</div>
              </div>
            </div>
            {isPending && (
              <div className="flex items-center justify-center gap-2 mt-4 text-xs md:text-sm text-gray-500">
                <Lock className="w-4 h-4" />
                <span>Full analytics will be unlocked once your application is approved</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Floating Action Button (Mobile) */}
      <button
        onClick={() => setIsCreateDialogOpen(true)}
        disabled={isPending}
        className="md:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-[#00C896] to-[#009B77] hover:from-[#00B588] hover:to-[#008866] text-white shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Create new offer"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Edit Offer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-[#00C896] to-[#009B77] text-transparent bg-clip-text">
              ✏️ Edit Offer
            </DialogTitle>
            <DialogDescription className="text-base">Update your Smart-Time offer details</DialogDescription>
          </DialogHeader>
          {editingOffer && (
            <form onSubmit={handleEditOffer} className="space-y-4">
              <div>
                <Label htmlFor="edit_title">Title</Label>
                <Input id="edit_title" name="title" required defaultValue={editingOffer.title} />
              </div>
              <div>
                <Label htmlFor="edit_description">Description</Label>
                <Textarea id="edit_description" name="description" required defaultValue={editingOffer.description} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_category">Category</Label>
                  <select id="edit_category" name="category" required defaultValue={editingOffer.category} className="w-full border rounded-md p-2">
                    <option value="BAKERY">Bakery</option>
                    <option value="RESTAURANT">Restaurant</option>
                    <option value="CAFE">Café</option>
                    <option value="GROCERY">Grocery</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="edit_quantity">Quantity</Label>
                  <Input id="edit_quantity" name="quantity" type="number" required min="1" defaultValue={editingOffer.quantity_total} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_original_price">Original Price (GEL)</Label>
                  <Input id="edit_original_price" name="original_price" type="number" step="0.01" required defaultValue={editingOffer.original_price} />
                </div>
                <div>
                  <Label htmlFor="edit_smart_price">Smart Price (GEL)</Label>
                  <Input id="edit_smart_price" name="smart_price" type="number" step="0.01" required defaultValue={editingOffer.smart_price} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_pickup_start">Pickup Start</Label>
                  <Input 
                    id="edit_pickup_start" 
                    name="pickup_start" 
                    type="datetime-local" 
                    required 
                    defaultValue={editingOffer.pickup_start ? new Date(editingOffer.pickup_start).toISOString().slice(0, 16) : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_pickup_end">Pickup End</Label>
                  <Input 
                    id="edit_pickup_end" 
                    name="pickup_end" 
                    type="datetime-local" 
                    required 
                    defaultValue={editingOffer.pickup_end ? new Date(editingOffer.pickup_end).toISOString().slice(0, 16) : ''}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit_images">Add More Images</Label>
                <Input 
                  id="edit_images" 
                  type="file" 
                  multiple 
                  accept="image/*"
                  onChange={(e) => setImageFiles(Array.from(e.target.files || []))}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  className="rounded-full border-[#E8F9F4] hover:border-gray-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-[#00C896] to-[#009B77] hover:from-[#00B588] hover:to-[#008866] text-white rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Update Offer
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
