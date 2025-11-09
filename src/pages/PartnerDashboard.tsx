import { useState, useEffect, useRef } from 'react';
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
  processOfferImages,
  resolveOfferImageUrl,
  getPartnerPoints,
  purchaseOfferSlot,
  partnerMarkNoShow,
  type PartnerPoints,
} from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { DEFAULT_24H_OFFER_DURATION_HOURS } from '@/lib/constants';
import ImageLibraryModal from '@/components/ImageLibraryModal';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, ShoppingBag, Package, CheckCircle, QrCode, Trash2, Pause, Play, LogOut, Edit, TrendingUp, Clock, Lock, Utensils, MessageSquare, Calendar, DollarSign, Hash, Upload, X, Eye, RefreshCw, Filter, ChevronDown, Camera } from 'lucide-react';
import { TelegramConnect } from '@/components/TelegramConnect';
import QRScanner from '@/components/QRScanner';
import EditPartnerProfile from '@/components/partner/EditPartnerProfile';
import EnhancedStatsCards from '@/components/partner/EnhancedStatsCards';
import QuickActions from '@/components/partner/QuickActions';
import EnhancedOffersTable from '@/components/partner/EnhancedOffersTable';
import EnhancedActiveReservations from '@/components/partner/EnhancedActiveReservations';
import QRScanFeedback from '@/components/partner/QRScanFeedback';
import { applyNoShowPenalty } from '@/lib/penalty-system';
import { useI18n } from '@/lib/i18n';
import { BuyPartnerPointsModal } from '@/components/BuyPartnerPointsModal';
// (Language switch removed from this page — language control moved to Index header)

export default function PartnerDashboard() {
  const { t } = useI18n();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stats, setStats] = useState({ activeOffers: 0, reservationsToday: 0, itemsPickedUp: 0 });
  const [analytics, setAnalytics] = useState({ totalOffers: 0, totalReservations: 0, itemsSold: 0, revenue: 0 });
  const [partnerPoints, setPartnerPoints] = useState<PartnerPoints | null>(null);
  const [isPurchaseSlotDialogOpen, setIsPurchaseSlotDialogOpen] = useState(false);
  const [isBuyPointsModalOpen, setIsBuyPointsModalOpen] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [isProcessingQR, setIsProcessingQR] = useState(false);
  const isProcessingQRRef = useRef(false); // Use ref for immediate synchronous check
  const [imageFiles, setImageFiles] = useState<(string | File)[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedLibraryImage, setSelectedLibraryImage] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [lastQrResult, setLastQrResult] = useState<null | 'success' | 'error'>(null);
  const [useBusinessHours, setUseBusinessHours] = useState(false);
  const [pickupStartSlot, setPickupStartSlot] = useState('');
  const [pickupEndSlot, setPickupEndSlot] = useState('');
  // Auto-expiration for 24h businesses: 12 hours by spec
  const [autoExpire6h, setAutoExpire6h] = useState(true);
  const [offerFilter, setOfferFilter] = useState<'all' | 'active' | 'expired' | 'sold_out' | 'scheduled'>('all');
  // Offer scheduling
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledPublishAt, setScheduledPublishAt] = useState('');
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
    // First check if partner operates 24/7
    if (partner?.open_24h) {
      return null; // No closing time for 24/7 businesses
    }

    // Use partner's closing_time field
    if (partner?.closing_time) {
      const [hours, minutes] = partner.closing_time.split(':').map(Number);
      const closing = new Date();
      closing.setHours(hours, minutes, 0, 0);

      // If closing time is in the past today, it means tomorrow
      if (closing < new Date()) {
        closing.setDate(closing.getDate() + 1);
      }

      return closing;
    }

    return null;
  };

  useEffect(() => {
    loadPartnerData();
  }, []);

  // Pickup times are set automatically on submit; no UI auto-fill needed
  useEffect(() => {}, [isCreateDialogOpen, partner]);

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
  toast.error(t('partner.dashboard.toast.partnerNotFound'));
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
        const [offersData, reservationsData, statsData, pointsData] = await Promise.all([
          getPartnerOffers(partnerData.id),
          getPartnerReservations(partnerData.id),
          getPartnerStats(partnerData.id),
          getPartnerPoints(user.id),
        ]);

        setOffers(offersData);
        setReservations(reservationsData.filter(r => r.status === 'ACTIVE'));
        setStats(statsData);
        setPartnerPoints(pointsData);

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
  toast.error(t('partner.dashboard.toast.applicationRejected'));
        navigate('/');
        return;
      }
    } catch (error) {
      console.error('Error loading partner data:', error);
  toast.error(t('partner.dashboard.toast.loadFail'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOffer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);

    try {
      setIsSubmitting(true);

      // Check offer slot limit
      if (partnerPoints) {
        const activeOfferCount = offers.filter(o => o.status === 'ACTIVE' || o.status === 'SCHEDULED').length;
        if (activeOfferCount >= partnerPoints.offer_slots) {
          // Close create dialog and open purchase dialog
          setIsCreateDialogOpen(false);
          setIsPurchaseSlotDialogOpen(true);
          toast.info(t('partner.points.needMoreSlots'));
          setIsSubmitting(false);
          return;
        }
      }

      // Extract and validate title and description with defaults
  const title = (formData.get('title') as string)?.trim() || t('partner.dashboard.fallback.untitledOffer');
      const description = (formData.get('description') as string)?.trim() || "No description provided";

      // Validate price
      const MIN_PRICE = 0.50; // Minimum 50 tetri
      const MAX_PRICE = 500.00; // Maximum ₾500
      const originalPrice = parseFloat(formData.get('original_price') as string);
      const smartPrice = parseFloat(formData.get('smart_price') as string);

      if (!smartPrice || isNaN(smartPrice)) {
        setFormErrors({ smart_price: 'Smart price is required' });
        return;
      }

      if (smartPrice < MIN_PRICE) {
        setFormErrors({ smart_price: `Minimum price is ₾${MIN_PRICE}` });
        return;
      }

      if (smartPrice > MAX_PRICE) {
        setFormErrors({ smart_price: `Maximum price is ₾${MAX_PRICE}` });
        return;
      }

      if (originalPrice && originalPrice < smartPrice) {
        setFormErrors({ original_price: 'Original price must be higher than smart price' });
        return;
      }

      // Validate quantity
      const MAX_QUANTITY = 100;
      const quantity = parseInt(formData.get('quantity') as string);

      if (!quantity || quantity <= 0) {
        setFormErrors({ quantity_initial: 'Quantity is required' });
        return;
      }

      if (quantity > MAX_QUANTITY) {
        setFormErrors({ quantity_initial: `Maximum ${MAX_QUANTITY} items per offer` });
        return;
      }

      // Compute pickup times automatically based on business hours
      const now = new Date();
      let pickupStart: Date = now;
      let pickupEnd: Date = now;

      console.log('Creating offer with business settings:', {
        is24HourBusiness,
        autoExpire6h,
        opening_time: partner?.opening_time,
        closing_time: partner?.closing_time,
        open_24h: partner?.open_24h,
      });

      if (is24HourBusiness && autoExpire6h) {
        // 24-hour business: live next 12 hours
        pickupEnd = new Date(now.getTime() + DEFAULT_24H_OFFER_DURATION_HOURS * 60 * 60 * 1000);
        console.log('24/7 business: Offer will be live for 12 hours until', pickupEnd);
      } else {
        const closing = getClosingTime();
        console.log('Regular business closing time:', closing);
        if (closing && closing > now) {
          // Live until closing time today
          pickupEnd = closing;
          console.log('Offer will be live until closing time:', pickupEnd);
        } else {
          // Fallback if closing unknown/past: default to +2 hours
          pickupEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000);
          console.log('Using fallback: Offer will be live for 2 hours until', pickupEnd);
        }
      }

      // Process images (both library URLs and custom uploads)
      const processedImages = await processOfferImages(imageFiles, partner?.id || '');

      const offerData = {
        title,
        description,
        category: partner?.business_type || 'RESTAURANT',
        images: processedImages, // Pass processed image URLs
        original_price: originalPrice,
        smart_price: smartPrice,
        quantity_total: quantity,
        pickup_window: {
          start: pickupStart,
          end: pickupEnd,
        },
      };

      if (partner) {
        // Determine status and scheduled_publish_at
        const offerStatus = isScheduled ? 'SCHEDULED' : 'ACTIVE';
        const scheduledDate = isScheduled && scheduledPublishAt ? new Date(scheduledPublishAt).toISOString() : null;

        // Create offer with already-processed image URLs
        let { data, error } = await supabase
          .from('offers')
          .insert({
            partner_id: partner.id,
            title: offerData.title,
            description: offerData.description,
            category: offerData.category,
            images: processedImages,
            original_price: offerData.original_price,
            smart_price: offerData.smart_price,
            quantity_available: offerData.quantity_total,
            quantity_total: offerData.quantity_total,
            pickup_start: offerData.pickup_window.start.toISOString(),
            pickup_end: offerData.pickup_window.end.toISOString(),
            status: offerStatus,
            expires_at: offerData.pickup_window.end.toISOString(),
            auto_expire_in: offerData.pickup_window.end.toISOString(),
            ...(scheduledDate && { scheduled_publish_at: scheduledDate }),
          })
          .select()
          .single();

        if (error && (String(error?.message || '').includes('auto_expire_in') || String(error?.code) === 'PGRST204')) {
          console.warn('API schema missing auto_expire_in; retrying insert without the column');
          const retry = await supabase
            .from('offers')
            .insert({
              partner_id: partner.id,
              title: offerData.title,
              description: offerData.description,
              category: offerData.category,
              images: processedImages,
              original_price: offerData.original_price,
              smart_price: offerData.smart_price,
              quantity_available: offerData.quantity_total,
              quantity_total: offerData.quantity_total,
              pickup_start: offerData.pickup_window.start.toISOString(),
              pickup_end: offerData.pickup_window.end.toISOString(),
              status: offerStatus,
              expires_at: offerData.pickup_window.end.toISOString(),
              ...(scheduledDate && { scheduled_publish_at: scheduledDate }),
            })
            .select()
            .single();
          data = retry.data as any;
          error = retry.error as any;
        }

        if (error) throw error;
  toast.success(isScheduled ? t('partner.dashboard.toast.offerScheduled') : t('partner.dashboard.toast.offerCreated'));
        setIsCreateDialogOpen(false);
        setImageFiles([]);
        setImagePreviews([]);
        setFormErrors({});
        setUseBusinessHours(false);
        setPickupStartSlot('');
        setPickupEndSlot('');
        setAutoExpire6h(true);
        setIsScheduled(false);
        setScheduledPublishAt('');
        loadPartnerData();
      }
    } catch (error) {
      console.error('Error creating offer:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  toast.error(`${t('partner.dashboard.toast.offerCreateFailed')}: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditOffer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingOffer) return;

    const formData = new FormData(e.currentTarget);

    try {
      // Validate price
      const MIN_PRICE = 0.50;
      const MAX_PRICE = 500.00;
      const originalPrice = parseFloat(formData.get('original_price') as string);
      const smartPrice = parseFloat(formData.get('smart_price') as string);

      if (!smartPrice || isNaN(smartPrice)) {
        toast.error('Smart price is required');
        return;
      }

      if (smartPrice < MIN_PRICE) {
        toast.error(`Minimum price is ₾${MIN_PRICE}`);
        return;
      }

      if (smartPrice > MAX_PRICE) {
        toast.error(`Maximum price is ₾${MAX_PRICE}`);
        return;
      }

      if (originalPrice && originalPrice < smartPrice) {
        toast.error('Original price must be higher than smart price');
        return;
      }

      // Validate quantity
      const MAX_QUANTITY = 100;
      const quantity = parseInt(formData.get('quantity') as string);

      if (!quantity || quantity <= 0) {
        toast.error('Quantity is required');
        return;
      }

      if (quantity > MAX_QUANTITY) {
        toast.error(`Maximum ${MAX_QUANTITY} items per offer`);
        return;
      }

      // Process images (both library URLs and custom uploads)
      const processedImages = await processOfferImages(imageFiles, partner?.id || '');

      // Use processed images if new ones were selected, otherwise keep existing
      const imageUrls = imageFiles.length > 0 ? processedImages : (editingOffer.images || []);

      // Compute pickup times automatically based on business hours (same logic as create)
      const now = new Date();
      let pickupStart: Date = now;
      let pickupEnd: Date = now;

      if (is24HourBusiness && autoExpire6h) {
        // 24-hour business: live next 12 hours
        pickupEnd = new Date(now.getTime() + DEFAULT_24H_OFFER_DURATION_HOURS * 60 * 60 * 1000);
      } else {
        const closing = getClosingTime();
        if (closing && closing > now) {
          // Live until closing time today
          pickupEnd = closing;
        } else {
          // Fallback if closing unknown/past: default to +2 hours
          pickupEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        }
      }

      const updates = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        category: partner?.business_type || editingOffer.category,
        images: imageUrls,
        original_price: originalPrice,
        smart_price: smartPrice,
        quantity_total: quantity,
        quantity_available: quantity,
        pickup_start: pickupStart.toISOString(),
        pickup_end: pickupEnd.toISOString(),
        expires_at: pickupEnd.toISOString(),
      };

      await updateOffer(editingOffer.id, updates);
  toast.success(t('partner.dashboard.toast.offerUpdated'));
      setIsEditDialogOpen(false);
      setEditingOffer(null);
      setImageFiles([]);
      setSelectedLibraryImage(null);
      loadPartnerData();
    } catch (error) {
      console.error('Error updating offer:', error);
  toast.error(t('partner.dashboard.toast.offerUpdateFailed'));
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
  toast.success(t('partner.dashboard.toast.quantityRefreshed'));
    } catch (error) {
      console.error('Error refreshing quantity:', error);
  toast.error(t('partner.dashboard.toast.quantityRefreshFailed'));
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

      // Set new pickup window using same logic as create offer
      const now = new Date();
      let pickupEnd: Date;

      if (is24HourBusiness && autoExpire6h) {
        // 24-hour business: live next 12 hours
        pickupEnd = new Date(now.getTime() + DEFAULT_24H_OFFER_DURATION_HOURS * 60 * 60 * 1000);
      } else {
        const closing = getClosingTime();
        if (closing && closing > now) {
          // Live until closing time today
          pickupEnd = closing;
        } else {
          // Fallback if closing unknown/past: default to +2 hours
          pickupEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        }
      }

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

    toast.success(t('partner.dashboard.toast.offerCreated'));
        await loadPartnerData();
      }
    } catch (error) {
      console.error('Error creating new offer:', error);
  toast.error(t('partner.dashboard.toast.offerCreateFailed'));
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
  toast.success(t('partner.dashboard.toast.toggleSuccess'));
      loadPartnerData();
    } catch (error) {
  toast.error(t('partner.dashboard.toast.toggleFailed'));
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(offerId);
        return newSet;
      });
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
  if (!confirm(t('partner.dashboard.confirm.deleteOffer'))) return;
    
    try {
      await deleteOffer(offerId);
  toast.success(t('partner.dashboard.toast.offerDeleted'));
      loadPartnerData();
    } catch (error) {
  toast.error(t('partner.dashboard.toast.offerDeleteFailed'));
    }
  };

  const handleMarkAsPickedUp = async (reservation: Reservation) => {
  if (processingIds.has(reservation.id)) return;

  try {
    setProcessingIds(prev => new Set(prev).add(reservation.id));

    // Optimistically remove from UI to prevent repeat clicks
    setReservations(prev => prev.filter(r => r.id !== reservation.id));

    // ✅ Only update reservation status in database
    await markAsPickedUp(reservation.id);

    // ❌ Do NOT modify offer quantity or status here
    // Offer quantity was already decreased when the reservation was made

  toast.success(t('partner.dashboard.toast.pickupConfirmed'));
    loadPartnerData();
  } catch (error: any) {
    console.error('Error marking as picked up:', error);
    // Show detailed error message
    const errorMsg = error?.message || error?.error?.message || 'Unknown error';
    toast.error(`Failed to mark as picked up: ${errorMsg}`);
    // Restore reservation in UI since it failed
    loadPartnerData();
  } finally {
    setProcessingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(reservation.id);
      return newSet;
    });
  }
};

  const handleMarkAsNoShow = async (reservation: Reservation) => {
    if (processingIds.has(reservation.id)) return;
    
    if (!confirm(t('confirm.markNoShow'))) return;
    
    try {
      setProcessingIds(prev => new Set(prev).add(reservation.id));
      // Optimistically remove to prevent multiple penalty applications
      setReservations(prev => prev.filter(r => r.id !== reservation.id));
      
      const result = await partnerMarkNoShow(reservation.id);
      
      if (result.success) {
        toast.success(`${t('toast.noShowMarked')} ${result.points_transferred} ${t('toast.pointsReceived')}`);
        await loadPartnerData();
      } else {
        toast.error(t('toast.failedMarkNoShow'));
      }
    } catch (error) {
      console.error('Error marking no-show:', error);
      toast.error(t('toast.failedMarkNoShow'));
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(reservation.id); return s; });
    }
  };

  const handleValidateQR = async () => {
    if (!qrInput.trim()) {
  toast.error(t('partner.dashboard.toast.qrEnter'));
      return;
    }

    try {
      // Validate and automatically mark as picked up
      const result = await validateQRCode(qrInput, true);
      if (result.valid && result.reservation) {
        setQrInput('');
        setQrScannerOpen(false);
        setLastQrResult('success');
        toast.success(t('partner.dashboard.toast.pickupConfirmed'));
        loadPartnerData(); // Refresh the dashboard
      } else {
  toast.error(result.error || t('partner.dashboard.toast.qrInvalid'));
        setLastQrResult('error');
      }
    } catch (error) {
  toast.error(t('partner.dashboard.toast.qrValidateFailed'));
      setLastQrResult('error');
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

    // Validation constants
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const MAX_IMAGES = 5;

    // Check total image count
    if (imageFiles.length + files.length > MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} images allowed per offer`);
      e.target.value = ''; // Reset input
      return;
    }

    // Validate each file
    for (const file of files) {
      // Check file type
      if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
        toast.error(`${file.name}: Only JPG, PNG, and WebP images are allowed`);
        e.target.value = '';
        return;
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        toast.error(`${file.name}: File too large (${sizeMB} MB). Maximum 2 MB allowed`);
        e.target.value = '';
        return;
      }
    }

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

    // Validation constants
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const MAX_IMAGES = 5;

    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));

    // Check total image count
    if (imageFiles.length + files.length > MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} images allowed per offer`);
      return;
    }

    // Validate each file
    for (const file of files) {
      // Check file type
      if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
        toast.error(`${file.name}: Only JPG, PNG, and WebP images are allowed`);
        return;
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        toast.error(`${file.name}: File too large (${sizeMB} MB). Maximum 2 MB allowed`);
        return;
      }
    }

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
    
  if (!titleInput?.value.trim()) errors.title = t('partner.dashboard.error.fieldRequired');
    if (!descInput?.value.trim()) errors.description = 'Please fill this field';
    
    if (!quantityInput?.value || parseInt(quantityInput.value) < 1) errors.quantity = 'Please fill this field';
    if (!originalPriceInput?.value || parseFloat(originalPriceInput.value) <= 0) errors.original_price = 'Please fill this field';
    if (!smartPriceInput?.value || parseFloat(smartPriceInput.value) <= 0) errors.smart_price = 'Please fill this field';
    
    // Pickup times are auto-set based on business hours or 24h policy; no validation needed here.
    
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

  // Purchase additional offer slot handler
  const handlePurchaseSlot = async () => {
    if (!partnerPoints) return;

    const nextSlotCost = (partnerPoints.offer_slots - 3) * 50;

    if (partnerPoints.balance < nextSlotCost) {
      toast.error(t('partner.points.insufficientBalance'));
      return;
    }

    try {
      setIsPurchasing(true);
      const result = await purchaseOfferSlot();

      if (result.success) {
        toast.success(`${t('partner.points.slotPurchased')} ${result.new_slots}`);
        // Refresh points
        const user = await getCurrentUser();
        if (user.user) {
          const updatedPoints = await getPartnerPoints(user.user.id);
          setPartnerPoints(updatedPoints);
        }
        setIsPurchaseSlotDialogOpen(false);
      } else {
        toast.error(result.message || t('partner.points.purchaseFailed'));
      }
    } catch (error) {
      console.error('Error purchasing slot:', error);
      toast.error(t('partner.points.purchaseFailed'));
    } finally {
      setIsPurchasing(false);
    }
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
  <p className="text-gray-500">{t('partner.dashboard.load')}</p>
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
              <p className="text-[11px] md:text-xs text-neutral-500">{t('partner.dashboard.title')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Partner Points Display */}
            {partnerPoints && (
              <Button
                variant="outline"
                onClick={() => setIsPurchaseSlotDialogOpen(true)}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#00C896] to-[#009B77] text-white rounded-full border-none hover:from-[#00B588] hover:to-[#008866] hover:scale-105 transition-all"
              >
                <DollarSign className="w-4 h-4" />
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-xs font-semibold">{partnerPoints.balance} {t('partner.points.points')}</span>
                  <span className="text-[10px] opacity-90">{partnerPoints.offer_slots} {t('partner.points.slots')}</span>
                </div>
              </Button>
            )}
            <Button
              variant="outline"
              className="h-9 md:h-11 rounded-full text-xs md:text-sm"
              onClick={() => setIsEditProfileOpen(true)}
            >
              <Edit className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">{t('partner.dashboard.editProfile')}</span>
              <span className="sm:hidden">{t('partner.dashboard.edit')}</span>
            </Button>
            <Button
              variant="outline"
              className="hidden md:flex h-11 rounded-full"
              onClick={() => navigate('/')}
            >
              🏠 {t('partner.dashboard.customerView')}
            </Button>
            <Button
              variant="outline"
              className="h-9 md:h-11 rounded-full"
              onClick={handleSignOut}
            >
              <LogOut className="w-3 h-3 md:w-4 md:h-4 mr-0 md:mr-2" />
              <span className="hidden md:inline">{t('partner.dashboard.signOut')}</span>
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
                    <strong className="text-lg">{t('partner.dashboard.pending.title')}</strong>
                    <p className="mt-1">{t('partner.dashboard.pending.text')}</p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Enhanced Stats Cards */}
        {!isPending && (
          <EnhancedStatsCards
            stats={{
              activeOffers: stats.activeOffers,
              reservationsToday: stats.reservationsToday,
              itemsPickedUp: stats.itemsPickedUp,
              revenue: analytics.revenue,
            }}
            className="mb-6 md:mb-8"
          />
        )}

        {isPending && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
            {[
              { icon: Package, label: t('partner.dashboard.cards.offersLive'), color: 'text-blue-600' },
              { icon: ShoppingBag, label: t('partner.dashboard.cards.pickedUp'), color: 'text-green-600' },
              { icon: TrendingUp, label: t('partner.dashboard.cards.itemsSold'), color: 'text-purple-600' },
              { icon: DollarSign, label: t('partner.dashboard.cards.revenue'), color: 'text-coral-600' },
            ].map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="opacity-60">
                  <CardContent className="p-4 text-center">
                    <Icon className={`w-8 h-8 mx-auto mb-2 ${stat.color}`} />
                    <p className="text-xs text-gray-600 mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-400">—</p>
                    <div className="flex items-center justify-center gap-1 mt-2 text-xs text-gray-500">
                      <Lock className="w-3 h-3" />
                      <span>{t('partner.dashboard.pending.afterApproval')}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

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
              setAutoExpire6h(true);
            }
          }}>
            <DialogTrigger asChild>
              <Button
                className="h-11 md:h-12 rounded-full bg-gradient-to-r from-[#00C896] to-[#009B77] hover:from-[#00B588] hover:to-[#008866] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                disabled={isPending}
              >
                <Plus className="w-5 h-5 mr-2" />
                {t('partner.dashboard.newOffer')}
                {isPending && <Lock className="w-4 h-4 ml-2" />}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#00C896] to-[#009B77] text-transparent bg-clip-text">
                  {t('partner.dashboard.dialog.createTitle')}
                </DialogTitle>
                <DialogDescription className="text-sm md:text-base">{t('partner.dashboard.dialog.createDescription')}</DialogDescription>
              </DialogHeader>

              {/* Single Page Form Header */}
              <div className="bg-gradient-to-r from-[#F9FFFB] to-[#EFFFF8] p-4 rounded-xl border-l-4 border-[#00C896] mb-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-1">📝 {t('partner.dashboard.section.basic')}</h3>
                <p className="text-sm text-gray-600">{t('partner.dashboard.dialog.createDescription')}</p>
              </div>

              <form onSubmit={handleCreateOffer} className="space-y-6">
                {/* Basic Info Section */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 text-lg border-b pb-2">{t('partner.dashboard.section.basic')}</h4>

                    <div>
                      <Label htmlFor="title" className="flex items-center gap-2 text-base font-semibold mb-2">
                        <Utensils className="w-4 h-4 text-[#4CC9A8]" />
                        {t('partner.dashboard.label.offerTitle')}
                      </Label>
                      <Input
                        id="title"
                        name="title"
                        required
                        placeholder={t('partner.dashboard.placeholder.title')}
                        className="text-base py-6 rounded-xl border-[#DFF5ED] focus:border-[#00C896] focus:ring-[#00C896]"
                      />
                      {formErrors.title && <p className="text-red-500 text-sm mt-1">{formErrors.title}</p>}
                    </div>

                    <div>
                      <Label htmlFor="description" className="flex items-center gap-2 text-base font-semibold mb-2">
                        <MessageSquare className="w-4 h-4 text-[#4CC9A8]" />
                        {t('partner.dashboard.label.description')}
                      </Label>
                      <Textarea
                        id="description"
                        name="description"
                        required
                        placeholder={t('partner.dashboard.placeholder.description')}
                        className="text-base min-h-[100px] rounded-xl border-[#DFF5ED] focus:border-[#00C896] focus:ring-[#00C896]"
                      />
                      {formErrors.description && <p className="text-red-500 text-sm mt-1">{formErrors.description}</p>}
                    </div>

                    {/* Auto Category Display */}
                    <div>
                      <Label className="flex items-center gap-2 text-base font-semibold mb-2">
                        <Package className="w-4 h-4 text-[#4CC9A8]" />
                        {t('partner.dashboard.label.category')}
                      </Label>
                      <div className="bg-gradient-to-r from-[#F9FFFB] to-[#EFFFF8] border border-[#DFF5ED] rounded-xl px-4 py-6 flex items-center gap-2">
                        <span className="text-2xl">{getCategoryIcon(partner?.business_type || 'RESTAURANT')}</span>
                        <span className="text-base font-medium text-gray-900">{partner?.business_type || 'RESTAURANT'}</span>
                        <span className="text-sm text-[#00C896] ml-2">{t('partner.dashboard.category.auto')}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{t('partner.dashboard.category.hint')}</p>
                    </div>

                    {/* Choose Image (opens library modal) */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowImageModal(true)}
                        className="w-full rounded-lg bg-[#00C896] py-2 font-medium text-white transition hover:bg-[#009B77]"
                      >
                        {t('partner.dashboard.chooseImage')}
                      </button>
                      {selectedLibraryImage && (
                        <img
                          src={selectedLibraryImage}
                          className="mt-2 h-40 w-full rounded-xl object-cover"
                          alt="Selected product"
                        />
                      )}

                      {showImageModal && (
                        <ImageLibraryModal
                          category={partner?.business_type || 'RESTAURANT'}
                          onSelect={(url) => {
                            setSelectedLibraryImage(url);
                            setImageFiles([url]);
                          }}
                          onClose={() => setShowImageModal(false)}
                        />
                      )}
                    </div>
                </div>

                {/* Pricing & Quantity Section */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 text-lg border-b pb-2">{t('partner.dashboard.section.pricing')}</h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="quantity" className="flex items-center gap-2 text-base font-semibold mb-2">
                          <Hash className="w-4 h-4 text-[#4CC9A8]" />
                          {t('partner.dashboard.label.quantity')}
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
                          {t('partner.dashboard.label.originalPrice')}
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
                          {t('partner.dashboard.label.smartPrice')}
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
                          id="auto_expire_6h"
                          checked={autoExpire6h}
                          onCheckedChange={(checked) => {
                            setAutoExpire6h(checked as boolean);
                            setFormErrors({});
                          }}
                        />
                        <Label htmlFor="auto_expire_6h" className="text-sm cursor-pointer">
                          This offer expires automatically in 12 hours
                        </Label>
                      </div>
                    )}
                </div>

                {/* Pickup timing is set automatically */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-900 text-lg border-b pb-2">{t('partner.dashboard.section.pickupTime')}</h4>
                  <p className="text-sm text-gray-600">
                    {t('partner.dashboard.pickup.autoSetTimes')}
                    {" "}
                    <span className="font-medium">{t('partner.dashboard.pickup.untilClosing')}</span> {t('partner.dashboard.pickup.ifDailyHours')}
                    {" "}
                    <span className="font-medium">{t('partner.dashboard.pickup.next12Hours')}</span> {t('partner.dashboard.pickup.if24h')}
                  </p>
                </div>

                {/* Offer Scheduling Section */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 text-lg border-b pb-2">{t('partner.dashboard.section.schedule')}</h4>

                  <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <Checkbox
                      id="is_scheduled"
                      checked={isScheduled}
                      onCheckedChange={(checked) => {
                        setIsScheduled(checked as boolean);
                        if (!checked) {
                          setScheduledPublishAt('');
                        }
                      }}
                    />
                    <Label htmlFor="is_scheduled" className="text-sm cursor-pointer font-medium">
                      {t('partner.dashboard.schedule.toggleLabel')}
                    </Label>
                  </div>

                  {isScheduled && (
                    <div>
                      <Label htmlFor="scheduled_publish_at" className="flex items-center gap-2 text-base font-semibold mb-2">
                        <Calendar className="w-4 h-4 text-[#4CC9A8]" />
                        {t('partner.dashboard.label.publishDateTime')}
                      </Label>
                      <Input
                        id="scheduled_publish_at"
                        type="datetime-local"
                        value={scheduledPublishAt}
                        onChange={(e) => setScheduledPublishAt(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        required={isScheduled}
                        className="text-base py-6 rounded-xl border-[#DFF5ED] focus:border-[#00C896] focus:ring-[#00C896]"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        The offer will automatically go live at the specified time
                      </p>
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
                    {t('partner.dashboard.button.cancel')}
                  </Button>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-[#00C896] to-[#009B77] hover:from-[#00B588] hover:to-[#008866] text-white py-6 text-lg font-bold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        {t('partner.dashboard.button.creatingOffer')}
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5 mr-2" />
                        {t('partner.dashboard.button.createOffer')}
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
                📱 {t('partner.dashboard.qr.scanTitle')}
                {isPending && <Lock className="w-4 h-4 ml-2" />}
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-[#00C896] to-[#009B77] text-transparent bg-clip-text">
                  📱 {t('partner.dashboard.qr.validateTitle')}
                </DialogTitle>
                <DialogDescription className="text-base">{t('partner.dashboard.qr.descriptionPartner')}</DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="camera" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="camera" aria-label={t('partner.dashboard.qr.aria.camera')} className="flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    {t('partner.dashboard.qr.tab.camera')}
                  </TabsTrigger>
                  <TabsTrigger value="manual" aria-label={t('partner.dashboard.qr.aria.manual')} className="flex items-center gap-2">
                    <QrCode className="w-4 h-4" />
                    {t('partner.dashboard.qr.tab.manual')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="camera" className="space-y-4 mt-4">
                  <QRScanner
                    onScan={async (code) => {
                      // Use ref for immediate synchronous check to prevent race conditions
                      if (isProcessingQRRef.current) {
                        console.log('Already processing a QR code, ignoring...');
                        return;
                      }

                      // Set ref immediately (synchronous) to block other scans
                      isProcessingQRRef.current = true;
                      setIsProcessingQR(true);
                      
                      try {
                        // Clean and normalize the scanned code
                        const cleanCode = code.trim();
                        console.log('QR Code scanned:', cleanCode);
                        setQrInput(cleanCode);

                        // Automatically validate and mark as picked up
                        console.log('Validating QR code:', cleanCode);
                        const result = await validateQRCode(cleanCode, true);
                        console.log('Validation result:', result);

                        if (result.valid && result.reservation) {
                          setQrInput('');
                          setQrScannerOpen(false);
                          toast.success(t('partner.dashboard.toast.pickupConfirmed'));
                          setLastQrResult('success');
                          loadPartnerData(); // Refresh dashboard
                        } else {
                          console.error('QR validation failed:', result.error);
                          toast.error(result.error || 'Invalid QR code');
                          setLastQrResult('error');
                        }
                      } catch (error) {
                        console.error('Error validating QR code:', error);
                        toast.error(`Failed to validate QR code: ${error instanceof Error ? error.message : 'Unknown error'}`);
                        setLastQrResult('error');
                      } finally {
                        // Reset processing flag after a delay to allow scanner to stop
                        setTimeout(() => {
                          isProcessingQRRef.current = false;
                          setIsProcessingQR(false);
                        }, 2000); // Longer delay to ensure scanner stops
                      }
                    }}
                    onError={(error) => {
                      console.error('QR Scanner error:', error);
                      toast.error(error);
                    }}
                  />
                </TabsContent>

                <TabsContent value="manual" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <Input
                      aria-label="Enter QR code manually"
                      placeholder="SP-2024-XY7K9"
                      value={qrInput}
                      onChange={(e) => setQrInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleValidateQR()}
                      className="text-base py-6 rounded-xl border-[#DFF5ED] focus:border-[#00C896] focus:ring-[#00C896] font-mono"
                    />
                    <Button
                      aria-label={t('partner.dashboard.qr.validateAction')}
                      onClick={handleValidateQR}
                      className="w-full bg-gradient-to-r from-[#00C896] to-[#009B77] hover:from-[#00B588] hover:to-[#008866] text-white py-6 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      {t('partner.dashboard.qr.validateAction')}
                    </Button>
                    {lastQrResult && <QRScanFeedback result={lastQrResult} />}
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>

        {/* Active Reservations - Enhanced Mobile-First */}
        {isPending ? (
          <Card className="mb-6 md:mb-8 rounded-2xl border-[#E8F9F4] shadow-lg opacity-60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
                🛎️ {t('partner.dashboard.active.title')}
                <Lock className="w-5 h-5 text-gray-400" />
              </CardTitle>
              <CardDescription className="text-sm md:text-base">
                {t('partner.dashboard.active.pending')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 md:py-12">
                <Lock className="w-16 h-16 md:w-20 md:h-20 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2 text-sm md:text-base">{t('partner.dashboard.active.pendingReservations')}</p>
                <p className="text-xs md:text-sm text-gray-400">{t('partner.dashboard.qr.helperText')}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="mb-6 md:mb-8">
            <EnhancedActiveReservations
              reservations={reservations}
              onMarkAsPickedUp={handleMarkAsPickedUp}
              onMarkAsNoShow={handleMarkAsNoShow}
              processingIds={processingIds}
            />
          </div>
        )}

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
                <p className="text-gray-500 mb-2 text-sm md:text-base">{t('partner.dashboard.pending.offersDisabled')}</p>
                <p className="text-xs md:text-sm text-gray-400">{t('partner.dashboard.pending.createReach')}</p>
              </div>
            ) : offers.length === 0 ? (
                <div className="text-center py-8 md:py-12">
                  <Package className="w-16 h-16 md:w-20 md:h-20 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2 text-sm md:text-base">{t('partner.dashboard.empty.noOffers')}</p>
                  <p className="text-xs md:text-sm text-gray-400">{t('partner.dashboard.offers.emptyCta')}</p>
                </div>
            ) : filteredOffers.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <Filter className="w-16 h-16 md:w-20 md:h-20 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-sm md:text-base">{t('partner.dashboard.filter.none')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#E8F9F4]">
                      <TableHead className="text-gray-700 font-semibold">{t('partner.dashboard.table.title')}</TableHead>
                      <TableHead className="text-gray-700 font-semibold">{t('partner.dashboard.table.category')}</TableHead>
                      <TableHead className="text-gray-700 font-semibold">{t('partner.dashboard.table.price')}</TableHead>
                      <TableHead className="text-gray-700 font-semibold">{t('partner.dashboard.table.available')}</TableHead>
                      <TableHead className="text-gray-700 font-semibold">{t('partner.dashboard.table.status')}</TableHead>
                      <TableHead className="text-gray-700 font-semibold">{t('partner.dashboard.table.actions')}</TableHead>
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
                              title={offer.status === 'ACTIVE' ? t('partner.dashboard.action.pause') : t('partner.dashboard.action.activate')}
                            >
                              {offer.status === 'ACTIVE' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full border-[#E8F9F4] hover:border-blue-500 hover:bg-blue-50"
                              onClick={() => handleRefreshQuantity(offer.id)}
                              disabled={processingIds.has(offer.id)}
                              title={t('partner.dashboard.action.refreshQty')}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              className="rounded-full bg-green-500 hover:bg-green-600 text-white"
                              onClick={() => handleCreateNewFromOld(offer)}
                              disabled={processingIds.has(offer.id)}
                              title={t('partner.dashboard.action.clone')}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full border-[#E8F9F4] hover:border-[#00C896] hover:bg-[#F9FFFB]"
                              onClick={() => openEditDialog(offer)}
                              title={t('partner.dashboard.action.edit')}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full border-[#E8F9F4] hover:border-red-500 hover:bg-red-50"
                              onClick={() => handleDeleteOffer(offer.id)}
                              title={t('partner.dashboard.action.delete')}
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

        {/* Payout information removed per business model (no partner payouts) */}

        {/* Trends / analytics summary removed as requested */}

        {/* Notification Settings - Telegram */}
        {partner && (
          <Card className="mb-6 md:mb-8 rounded-2xl border-[#E8F9F4] shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
                📲 {t('partner.dashboard.notifications.title')}
              </CardTitle>
              <CardDescription className="text-sm md:text-base">
                {t('partner.dashboard.notifications.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TelegramConnect userId={partner.user_id} userType="partner" />
            </CardContent>
          </Card>
        )}
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-[#00C896] to-[#009B77] text-transparent bg-clip-text">
              {t('partner.dashboard.edit.dialogTitle')}
            </DialogTitle>
            <DialogDescription className="text-base">{t('partner.dashboard.edit.dialogDescription')}</DialogDescription>
          </DialogHeader>
          {editingOffer && (
            <form onSubmit={handleEditOffer} className="space-y-6">
              {/* 📋 Basic Details Section */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 text-lg border-b pb-2 flex items-center gap-2">
                  <span>🏷️</span> Basic Details
                </h4>

                <div>
                  <Label htmlFor="edit_title" className="text-sm font-semibold">
                    Title / დასახელება
                  </Label>
                  <Input
                    id="edit_title"
                    name="title"
                    required
                    defaultValue={editingOffer.title}
                    placeholder="e.g., Fresh Croissants / ახალი კრუასანები"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="edit_description" className="text-sm font-semibold">
                    Description / აღწერა
                  </Label>
                  <Textarea
                    id="edit_description"
                    name="description"
                    required
                    defaultValue={editingOffer.description}
                    placeholder={t('partner.dashboard.placeholder.descriptionEdit')}
                    className="mt-1 min-h-[100px] resize-y"
                  />
                </div>
              </div>

              {/* 💰 Pricing & Quantity Section */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 text-lg border-b pb-2 flex items-center gap-2">
                  <span>💰</span> {t('partner.dashboard.section.pricing')}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit_category" className="text-sm font-semibold">{t('partner.dashboard.label.category')}</Label>
                    <Input
                      id="edit_category"
                      value={partner?.business_type || editingOffer.category}
                      disabled
                      className="mt-1 bg-gray-50 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('partner.dashboard.autoSetCategory')}</p>
                  </div>

                  <div>
                    <Label htmlFor="edit_quantity" className="text-sm font-semibold">{t('partner.dashboard.label.quantity')}</Label>
                    <Input
                      id="edit_quantity"
                      name="quantity"
                      type="number"
                      required
                      min="1"
                      defaultValue={editingOffer.quantity_total}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit_original_price" className="text-sm font-semibold">
                      {t('partner.dashboard.label.originalPriceCurrency')}
                    </Label>
                    <Input
                      id="edit_original_price"
                      name="original_price"
                      type="number"
                      step="0.01"
                      required
                      defaultValue={editingOffer.original_price}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit_smart_price" className="text-sm font-semibold">
                      {t('partner.dashboard.label.smartPriceCurrency')}
                    </Label>
                    <Input
                      id="edit_smart_price"
                      name="smart_price"
                      type="number"
                      step="0.01"
                      required
                      defaultValue={editingOffer.smart_price}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">{t('partner.dashboard.tip.smartPrice')}</p>
                </div>
              </div>

              {/* 🕒 Pickup Time Section */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 text-lg border-b pb-2 flex items-center gap-2">
                  <span>🕒</span> Pickup Time Window
                </h4>

                <div className="bg-[#F0FDF9] border border-[#DFF5ED] rounded-lg p-4">
                  <p className="text-sm text-gray-700 mb-2">
                    ⚙️ Pickup times are set <strong>automatically</strong> based on your business hours.
                  </p>
                  <p className="text-sm text-gray-600">
                    {is24HourBusiness ? (
                      <>📅 <strong>24/7 business:</strong> Your offer will be live for the next <strong>12 hours</strong>.</>
                    ) : (
                      <>📅 <strong>Regular hours:</strong> Your offer will be live until <strong>closing time today</strong>.</>
                    )}
                  </p>
                  {editingOffer.pickup_start && editingOffer.pickup_end && (
                    <div className="mt-3 pt-3 border-t border-[#DFF5ED]">
                      <p className="text-sm font-semibold text-[#00C896]">
                        Current window: {new Date(editingOffer.pickup_start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        {' → '}
                        {new Date(editingOffer.pickup_end).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        (Will be updated to current business hours on save)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 📸 Product Image Section */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 text-lg border-b pb-2 flex items-center gap-2">
                  <span>📸</span> Product Image
                </h4>

                {/* Current Image Preview */}
                {editingOffer.images && editingOffer.images.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-2">{t('partner.dashboard.edit.currentImage')}</p>
                    <img
                      src={resolveOfferImageUrl(editingOffer.images[0], editingOffer.category)}
                      alt="Current offer"
                      className="h-32 w-48 object-cover rounded-lg border-2 border-gray-200"
                    />
                  </div>
                )}

                {/* Choose Image Button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowImageModal(true);
                  }}
                  className="w-full rounded-lg bg-gradient-to-r from-[#00C896] to-[#009B77] hover:from-[#00B588] hover:to-[#008866] py-3 font-semibold text-white transition-all duration-300 hover:shadow-lg flex items-center justify-center gap-2"
                >
                  📷 Choose New Image from Library
                </button>

                {selectedLibraryImage && (
                  <div className="mt-2">
                    <p className="text-sm text-green-600 font-medium">✓ New image selected from library</p>
                    <img
                      src={selectedLibraryImage}
                      alt="Selected"
                      className="mt-2 h-32 w-48 object-cover rounded-lg border-2 border-[#00C896]"
                    />
                  </div>
                )}

                {/* Image Library Modal */}
                {showImageModal && (
                  <ImageLibraryModal
                    category={partner?.business_type || 'RESTAURANT'}
                    onSelect={(url) => {
                      setSelectedLibraryImage(url);
                      setImageFiles([url]);
                    }}
                    onClose={() => setShowImageModal(false)}
                  />
                )}

                {/* Optional: Custom Upload for Approved Partners */}
                {partner?.approved_for_upload && (
                  <div className="mt-3 pt-3 border-t">
                    <Label htmlFor="edit_custom_upload" className="text-sm text-gray-600">
                      Or upload custom image (approved partners only)
                    </Label>
                    <Input
                      id="edit_custom_upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        // Validation constants
                        const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
                        const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

                        // Check file type
                        if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
                          toast.error(`${file.name}: Only JPG, PNG, and WebP images are allowed`);
                          e.target.value = '';
                          return;
                        }

                        // Check file size
                        if (file.size > MAX_FILE_SIZE) {
                          const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
                          toast.error(`${file.name}: File too large (${sizeMB} MB). Maximum 2 MB allowed`);
                          e.target.value = '';
                          return;
                        }

                        setImageFiles([file]);
                        setSelectedLibraryImage(null);
                      }}
                      className="mt-1"
                    />
                  </div>
                )}
              </div>

              {/* Sticky Footer Buttons */}
              <DialogFooter className="sticky bottom-0 bg-white pt-4 border-t mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setSelectedLibraryImage(null);
                    setImageFiles([]);
                  }}
                  className="rounded-full border-[#E8F9F4] hover:border-gray-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-[#00C896] to-[#009B77] hover:from-[#00B588] hover:to-[#008866] text-white rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  ✅ Update Offer
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Actions - Mobile Bottom Bar */}
      {!isPending && (
        <QuickActions
          onNewOffer={() => {
            setIsCreateDialogOpen(true);
            setImageFiles([]);
            setImagePreviews([]);
            setFormErrors({});
          }}
          onScanQR={() => setQrScannerOpen(true)}
        />
      )}

      {/* Edit Partner Profile Dialog */}
      {partner && (
        <EditPartnerProfile
          partner={partner}
          open={isEditProfileOpen}
          onOpenChange={setIsEditProfileOpen}
          onUpdate={loadPartnerData}
        />
      )}

      {/* Purchase Offer Slot Dialog */}
      <Dialog open={isPurchaseSlotDialogOpen} onOpenChange={setIsPurchaseSlotDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('partner.points.purchaseSlot')}</DialogTitle>
            <DialogDescription>
              {t('partner.points.purchaseSlotDesc')}
            </DialogDescription>
          </DialogHeader>
          {partnerPoints && (
            <div className="space-y-4 py-4">
              <div className="bg-gradient-to-r from-[#E8F9F4] to-[#C9F9E9] p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">{t('partner.points.currentBalance')}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-[#00C896]">{partnerPoints.balance}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsPurchaseSlotDialogOpen(false);
                        setIsBuyPointsModalOpen(true);
                      }}
                      className="text-xs bg-[#4CC9A8] text-white hover:bg-[#3db891] border-none"
                    >
                      + Buy Points
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{t('partner.points.currentSlots')}</span>
                  <span className="text-lg font-bold text-[#00C896]">{partnerPoints.offer_slots}</span>
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-900">{t('partner.points.nextSlotCost')}</span>
                  <span className="text-xl font-bold text-blue-600">{(partnerPoints.offer_slots - 3) * 50}</span>
                </div>
                <p className="text-xs text-blue-700 mt-2">{t('partner.points.costIncreases')}</p>
              </div>
              {partnerPoints.balance < (partnerPoints.offer_slots - 3) * 50 && (
                <Alert className="bg-orange-50 border-orange-200">
                  <AlertDescription className="text-orange-800">
                    {t('partner.points.insufficientBalance')}
                    <Button
                      variant="link"
                      onClick={() => {
                        setIsPurchaseSlotDialogOpen(false);
                        setIsBuyPointsModalOpen(true);
                      }}
                      className="text-[#00C896] font-semibold underline ml-2"
                    >
                      Buy Points
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPurchaseSlotDialogOpen(false)}>
              {t('partner.points.cancel')}
            </Button>
            <Button
              onClick={handlePurchaseSlot}
              disabled={isPurchasing || !partnerPoints || partnerPoints.balance < (partnerPoints.offer_slots - 3) * 50}
              className="bg-gradient-to-r from-[#00C896] to-[#009B77] hover:from-[#00B588] hover:to-[#008866] text-white"
            >
              {isPurchasing ? t('partner.points.purchasing') : t('partner.points.confirmPurchase')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Buy Partner Points Modal */}
      {partner && partnerPoints && (
        <BuyPartnerPointsModal
          open={isBuyPointsModalOpen}
          onClose={() => setIsBuyPointsModalOpen(false)}
          partnerId={partner.id}
          currentBalance={partnerPoints.balance}
          onSuccess={(newBalance) => {
            setPartnerPoints({ ...partnerPoints, balance: newBalance });
            setIsBuyPointsModalOpen(false);
            toast.success(`✅ Successfully purchased points! New balance: ${newBalance}`);
          }}
        />
      )}
    </div>
  );
}
