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
import { Plus, ShoppingBag, Package, CheckCircle, QrCode, Trash2, Pause, Play, LogOut, Edit, TrendingUp, Clock, Lock, Utensils, MessageSquare, Calendar, DollarSign, Hash, Upload, X, Eye, RefreshCw } from 'lucide-react';

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
  const navigate = useNavigate();

  const CATEGORIES = ['BAKERY', 'RESTAURANT', 'CAFE', 'GROCERY'];

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-8 h-8 text-mint-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">SmartPick Partner</h1>
              <p className="text-sm text-gray-500">{partner?.business_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate('/')}>
              Customer View
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className={isPending ? 'opacity-60' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Offers</CardTitle>
              <Package className="w-4 h-4 text-mint-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-mint-600">{isPending ? '—' : stats.activeOffers}</div>
              {isPending && (
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                  <Lock className="w-3 h-3" />
                  <span>Available after approval</span>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className={isPending ? 'opacity-60' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Reservations Today</CardTitle>
              <ShoppingBag className="w-4 h-4 text-coral-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-coral-600">{isPending ? '—' : stats.reservationsToday}</div>
              {isPending && (
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                  <Lock className="w-3 h-3" />
                  <span>Available after approval</span>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className={isPending ? 'opacity-60' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Items Picked Up</CardTitle>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{isPending ? '—' : stats.itemsPickedUp}</div>
              {isPending && (
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                  <Lock className="w-3 h-3" />
                  <span>Available after approval</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
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
              <Button className="bg-[#4CC9A8] hover:bg-[#3db891] text-white" disabled={isPending}>
                <Plus className="w-4 h-4 mr-2" />
                New Smart-Time Offer
                {isPending && <Lock className="w-4 h-4 ml-2" />}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Create New Offer</DialogTitle>
                <DialogDescription>Add a fresh Smart-Time offer for your customers</DialogDescription>
              </DialogHeader>
              
              {/* Single Page Form Header */}
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-[#4CC9A8] mb-6">
                <h3 className="font-semibold text-gray-900 mb-1">Complete Offer Details</h3>
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
                        className="text-base py-6"
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
                        className="text-base min-h-[100px]"
                      />
                      {formErrors.description && <p className="text-red-500 text-sm mt-1">{formErrors.description}</p>}
                    </div>

                    {/* Auto Category Display */}
                    <div>
                      <Label className="flex items-center gap-2 text-base font-semibold mb-2">
                        <Package className="w-4 h-4 text-[#4CC9A8]" />
                        Category
                      </Label>
                      <div className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-6 flex items-center gap-2">
                        <span className="text-2xl">{getCategoryIcon(partner?.business_type || 'RESTAURANT')}</span>
                        <span className="text-base font-medium text-gray-700">{partner?.business_type || 'RESTAURANT'}</span>
                        <span className="text-sm text-gray-500 ml-2">(auto-filled)</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Category is automatically set based on your business type</p>
                    </div>

                    <div>
                      <Label className="flex items-center gap-2 text-base font-semibold mb-2">
                        <Upload className="w-4 h-4 text-[#4CC9A8]" />
                        Images (Optional)
                      </Label>
                      <div
                        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                          isDragOver ? 'border-[#4CC9A8] bg-[#4CC9A8]/5' : 'border-gray-300'
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
                          className="text-base py-6"
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
                            className="text-base py-6 pr-12"
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
                            className="text-base py-6 pr-12"
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
                    className="flex-1 py-6 text-base"
                  >
                    Cancel
                  </Button>

                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-1 bg-[#4CC9A8] hover:bg-[#3db891] text-white py-6 text-lg font-bold shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
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
              <Button variant="outline" disabled={isPending}>
                <QrCode className="w-4 h-4 mr-2" />
                Scan QR Code
                {isPending && <Lock className="w-4 h-4 ml-2" />}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Validate Pickup</DialogTitle>
                <DialogDescription>Enter the customer's QR code</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="SP-2024-XY7K9"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleValidateQR()}
                />
                <Button onClick={handleValidateQR} className="w-full bg-mint-600 hover:bg-mint-700">
                  Validate & Confirm Pickup
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Active Reservations */}
        <Card className={`mb-8 ${isPending ? 'opacity-60' : ''}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Active Reservations
              {isPending && <Lock className="w-4 h-4 text-gray-400" />}
            </CardTitle>
            <CardDescription>
              {isPending ? 'This section will be available after approval' : 'Customers waiting for pickup'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isPending ? (
              <div className="text-center py-8">
                <Lock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">Reservations will appear here once your account is approved</p>
                <p className="text-sm text-gray-400">You'll be able to manage customer pickups and validate QR codes</p>
              </div>
            ) : reservations.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No active reservations</p>
                <p className="text-sm text-gray-400">When customers reserve your offers, they'll appear here</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Pickup Time</TableHead>
                    <TableHead>QR Code</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.map((reservation) => (
                    <TableRow key={reservation.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{reservation.customer?.name || 'Customer'}</div>
                          <div className="text-sm text-gray-500">{reservation.customer?.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{reservation.offer?.title}</TableCell>
                      <TableCell>{reservation.quantity}</TableCell>
                      <TableCell>
                        {reservation.offer?.pickup_start && (
                          <div className="text-sm">
                            <div>{formatDateTime(reservation.offer.pickup_start)}</div>
                            <div className="text-gray-500">to {formatDateTime(reservation.offer.pickup_end || reservation.offer.pickup_start)}</div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">{reservation.qr_code}</code>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleMarkAsPickedUp(reservation)}
                          disabled={processingIds.has(reservation.id)}
                          className="bg-mint-600 hover:bg-mint-700"
                        >
                          {processingIds.has(reservation.id) ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Processing...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Picked Up
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Your Offers */}
        <Card className={`mb-8 ${isPending ? 'opacity-60' : ''}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Your Offers
              {isPending && <Lock className="w-4 h-4 text-gray-400" />}
            </CardTitle>
            <CardDescription>
              {isPending ? 'This section will be available after approval' : 'Manage your Smart-Time offers'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isPending ? (
              <div className="text-center py-8">
                <Lock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">You'll be able to create and manage offers once approved</p>
                <p className="text-sm text-gray-400">Start reducing food waste by offering Smart-Time deals to customers</p>
              </div>
            ) : offers.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No offers yet. Create your first one!</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offers.map((offer) => (
                    <TableRow key={offer.id}>
                      <TableCell className="font-medium">{offer.title}</TableCell>
                      <TableCell>{offer.category}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-mint-600">{offer.smart_price} GEL</div>
                          <div className="text-sm text-gray-500 line-through">{offer.original_price} GEL</div>
                        </div>
                      </TableCell>
                      <TableCell>{offer.quantity_available}/{offer.quantity_total}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={offer.status === 'ACTIVE' ? 'default' : 'secondary'}
                          className={
                            offer.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                            offer.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }
                        >
                          {offer.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleOffer(offer.id, offer.status)}
                            disabled={processingIds.has(offer.id)}
                          >
                            {offer.status === 'ACTIVE' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRefreshQuantity(offer.id)}
                            disabled={processingIds.has(offer.id)}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-500 hover:bg-green-600 text-white"
                            onClick={() => handleCreateNewFromOld(offer)}
                            disabled={processingIds.has(offer.id)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(offer)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteOffer(offer.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Analytics Summary */}
        <Card className={isPending ? 'opacity-60' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Analytics Summary
              {isPending && <Lock className="w-4 h-4 text-gray-400" />}
            </CardTitle>
            <CardDescription>
              {isPending ? 'Analytics will be available after approval' : 'Your SmartPick performance overview'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-mint-600">{isPending ? '—' : analytics.totalOffers}</div>
                <div className="text-sm text-gray-500">Total Offers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-coral-600">{isPending ? '—' : analytics.totalReservations}</div>
                <div className="text-sm text-gray-500">Total Reservations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{isPending ? '—' : analytics.itemsSold}</div>
                <div className="text-sm text-gray-500">Items Sold</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{isPending ? '—' : analytics.revenue.toFixed(2)} GEL</div>
                <div className="text-sm text-gray-500">SmartPick Revenue</div>
              </div>
            </div>
            {isPending && (
              <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500">
                <Lock className="w-4 h-4" />
                <span>Full analytics will be unlocked once your application is approved</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Offer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Offer</DialogTitle>
            <DialogDescription>Update your Smart-Time offer</DialogDescription>
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
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-mint-600 hover:bg-mint-700">
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