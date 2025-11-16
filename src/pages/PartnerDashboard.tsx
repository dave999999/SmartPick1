import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Offer, Reservation, Partner } from '@/lib/types';
import {
  getPartnerByUserId,
  getPartnerOffers,
  getPartnerReservations,
  getPartnerStats,
  updateOffer,
  deleteOffer,
  validateQRCode,
  markAsPickedUp,
  getCurrentUser,
  signOut,
  resolveOfferImageUrl,
  getPartnerPoints,
  purchaseOfferSlot,
  partnerConfirmNoShow,
  partnerForgiveCustomer,
  duplicateOffer,
  type PartnerPoints,
} from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { checkServerRateLimit } from '@/lib/rateLimiter-server';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuShortcut,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import Plus from 'lucide-react/dist/esm/icons/plus';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import QrCode from 'lucide-react/dist/esm/icons/qr-code';
import LogOut from 'lucide-react/dist/esm/icons/log-out';
import Lock from 'lucide-react/dist/esm/icons/lock';
import User from 'lucide-react/dist/esm/icons/user';
import Home from 'lucide-react/dist/esm/icons/home';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import Camera from 'lucide-react/dist/esm/icons/camera';
import { Edit, Star, Heart, UserCircle, Languages } from 'lucide-react';
import { TelegramConnect } from '@/components/TelegramConnect';
import QRScanner from '@/components/QRScanner';
import EditPartnerProfile from '@/components/partner/EditPartnerProfile';
import EnhancedStatsCards from '@/components/partner/EnhancedStatsCards';
import QuickActions from '@/components/partner/QuickActions';
import EnhancedActiveReservations from '@/components/partner/EnhancedActiveReservations';
import QRScanFeedback from '@/components/partner/QRScanFeedback';
import { useI18n } from '@/lib/i18n';
import { BuyPartnerPointsModal } from '@/components/BuyPartnerPointsModal';
import PendingPartnerStatus from '@/components/partner/PendingPartnerStatus';
import PartnerAnalytics from '@/components/partner/PartnerAnalytics';
import PartnerOffers from '@/components/partner/PartnerOffers';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/lib/logger';
// (Language switch removed from this page — language control moved to Index header)

export default function PartnerDashboard() {
  logger.log('🚨🚨🚨 PARTNER DASHBOARD LOADED - Debug Build 20251109204500 🚨🚨🚨');
  const { t, language, setLanguage } = useI18n();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]); // Active reservations only
  const [allReservations, setAllReservations] = useState<Reservation[]>([]); // All reservations for analytics
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
  const [activeView, setActiveView] = useState('reservations');
  const [qrInput, setQrInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [isProcessingQR, setIsProcessingQR] = useState(false);
  const isProcessingQRRef = useRef(false); // Use ref for immediate synchronous check
  const [imageFiles, setImageFiles] = useState<(string | File)[]>([]);
  const [selectedLibraryImage, setSelectedLibraryImage] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastQrResult, setLastQrResult] = useState<null | 'success' | 'error'>(null);
  // Auto-expiration for 24h businesses: 12 hours by spec
  const [autoExpire6h, setAutoExpire6h] = useState(true);
  // Offer scheduling
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledPublishAt, setScheduledPublishAt] = useState('');
  const navigate = useNavigate();

  // Check if partner is pending - case insensitive
  const isPending = partner?.status?.toUpperCase() === 'PENDING';
  
  // Check if partner operates 24 hours
  const is24HourBusiness = partner?.open_24h === true;

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
        setReservations(reservationsData.filter(r => r.status === 'ACTIVE')); // Active only for quick actions
        setAllReservations(reservationsData); // All for analytics
        setStats(statsData);
        setPartnerPoints(pointsData);

        // Calculate analytics
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const totalReservations = reservationsData.length;
        const itemsSold = reservationsData.filter(r => r.status === 'PICKED_UP').reduce((sum, r) => sum + r.quantity, 0);
        
        // Calculate TODAY'S revenue (must match itemsPickedUp timeframe)
        const todayRevenue = reservationsData
          .filter(r => r.status === 'PICKED_UP' && r.picked_up_at && new Date(r.picked_up_at) >= today)
          .reduce((sum, r) => sum + r.total_price, 0);
        
        setAnalytics({
          totalOffers: offersData.length,
          totalReservations,
          itemsSold,
          revenue: todayRevenue  // Changed from all-time revenue to today's revenue
        });
      } else {
        // Status is REJECTED or other
  toast.error(t('partner.dashboard.toast.applicationRejected'));
        navigate('/');
        return;
      }
    } catch (error) {
      logger.error('Error loading partner data:', error);
  toast.error(t('partner.dashboard.toast.loadFail'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOffer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    logger.log('🔥🔥🔥 CREATE OFFER BUTTON CLICKED 🔥🔥🔥');
    
    const formData = new FormData(e.currentTarget);

    try {
      setIsSubmitting(true);

      // Rate limit check for offer creation (20 per hour)
      if (partner?.user_id) {
        const rateLimitCheck = await checkServerRateLimit('offer_create', partner.user_id);
        if (!rateLimitCheck.allowed) {
          toast.error(t('errors.rateLimitExceeded') || 'Too many offers created. Please try again later.');
          setIsSubmitting(false);
          return;
        }
      }

      // Check offer slot limit
      if (partnerPoints) {
        const activeOfferCount = offers.filter(o => o.status === 'ACTIVE' || o.status === 'SCHEDULED').length;
        if (activeOfferCount >= partnerPoints.offer_slots) {
          // Close create dialog and open purchase dialog
          setIsCreateDialogOpen(false);
          setIsPurchaseSlotDialogOpen(true);
          
          // Show prominent error with clear explanation
          toast.error(
            `You've used all ${partnerPoints.offer_slots} listing slots! Buy more slots to create new offers.`,
            { 
              duration: 6000,
              description: `Current: ${activeOfferCount}/${partnerPoints.offer_slots} slots used`
            }
          );
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

      logger.log('Creating offer with business settings:', {
        is24HourBusiness,
        autoExpire6h,
        opening_time: partner?.opening_time,
        closing_time: partner?.closing_time,
        open_24h: partner?.open_24h,
      });

      if (is24HourBusiness && autoExpire6h) {
        // 24-hour business: live next 12 hours
        pickupEnd = new Date(now.getTime() + DEFAULT_24H_OFFER_DURATION_HOURS * 60 * 60 * 1000);
        logger.log('24/7 business: Offer will be live for 12 hours until', pickupEnd);
      } else {
        const closing = getClosingTime();
        logger.log('Regular business closing time:', closing);
        if (closing && closing > now) {
          // Live until closing time today
          pickupEnd = closing;
          logger.log('Offer will be live until closing time:', pickupEnd);
        } else {
          // Fallback if closing unknown/past: default to +2 hours
          pickupEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000);
          logger.log('Using fallback: Offer will be live for 2 hours until', pickupEnd);
        }
      }

      // Images are library URLs only (custom uploads removed)
      // Prefer imageFiles, but fall back to selectedLibraryImage if needed
      let processedImages: string[] = imageFiles.filter((img): img is string => typeof img === 'string');
      if (processedImages.length === 0 && selectedLibraryImage) {
        processedImages = [selectedLibraryImage];
      }
      logger.log('CreateOffer image selection debug:', {
        imageFiles,
        selectedLibraryImage,
        processedImages
      });

      // Ensure at least one image is selected
      if (processedImages.length === 0) {
        setFormErrors(prev => ({ ...prev, images: 'Please choose an image from library' }));
        toast.error('Please choose an image for the offer');
        setIsSubmitting(false);
        return;
      }

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
        // Log partner info for debugging
        logger.log('Partner info:', {
          id: partner.id,
          user_id: partner.user_id,
          status: partner.status,
          business_name: partner.business_name
        });

        // Check current auth user
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        logger.log('Current auth user:', {
          id: currentUser?.id,
          email: currentUser?.email
        });

        // Verify partner_id matches user_id
        if (partner.user_id !== currentUser?.id) {
          logger.error('MISMATCH: Partner user_id does not match current user!');
          toast.error('Authentication error: Please log out and log back in');
          return;
        }

  // Determine status
        const offerStatus = isScheduled ? 'SCHEDULED' : 'ACTIVE';

        // Create offer with only columns that exist in the table
        // Note: scheduled_publish_at and auto_expire_in don't exist in offers table
        const insertData = {
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
        };

        logger.log('Creating offer with data:', insertData);

        const { data, error } = await supabase
          .from('offers')
          .insert(insertData)
          .select()
          .single();

        if (error) {
          logger.error('Offer creation error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw new Error(`Failed to create offer: ${error.message}`);
        }

        logger.log('Offer created successfully:', data);
  toast.success(isScheduled ? t('partner.dashboard.toast.offerScheduled') : t('partner.dashboard.toast.offerCreated'));
        setIsCreateDialogOpen(false);
        setImageFiles([]);
        setFormErrors({});
        setAutoExpire6h(true);
        setIsScheduled(false);
        setScheduledPublishAt('');
        setSelectedLibraryImage(null);
        loadPartnerData();
      }
    } catch (error) {
      logger.error('Error creating offer:', error);
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

      // Images are library URLs only (custom uploads removed)
      let processedImages = imageFiles.filter((img): img is string => typeof img === 'string');
      if (processedImages.length === 0 && selectedLibraryImage) {
        processedImages = [selectedLibraryImage];
      }
      logger.log('EditOffer image selection debug:', {
        imageFiles,
        selectedLibraryImage,
        processedImages
      });

      // Use processed images if new ones were selected, otherwise keep existing
      const imageUrls = (processedImages.length > 0)
        ? processedImages
        : (editingOffer.images || []);

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
      logger.error('Error updating offer:', error);
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
      logger.error('Error refreshing quantity:', error);
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

        if (!partner || partner.status !== 'APPROVED') {
          toast.error(t('partner.dashboard.pending.afterApproval'));
          return;
        }

      // Pickup times are determined server-side when duplicating; no need to precompute here

        // Prefer server-side duplicate to keep logic simple and consistent
        await duplicateOffer(oldOffer.id, partner.id);
        toast.success(t('partner.dashboard.toast.offerCreated'));
        await loadPartnerData();
      } catch (error) {
        logger.error('Error creating new offer:', error);
        
        // Check if error is about slot limits
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('maximum') || errorMessage.includes('slots') || errorMessage.includes('slot limit')) {
          // Open purchase dialog with clear message
          setIsPurchaseSlotDialogOpen(true);
          toast.error(
            `🚫 All listing slots are in use!`,
            { 
              duration: 6000,
              description: errorMessage
            }
          );
        } else {
          toast.error(t('partner.dashboard.toast.offerCreateFailed'));
        }
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
    logger.error('Error marking as picked up:', error);
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

  const handleConfirmNoShow = async (reservation: Reservation) => {
    if (processingIds.has(reservation.id)) return;
    
    if (!confirm('Confirm this customer did not show up? (Penalty will be kept)')) return;
    
    try {
      setProcessingIds(prev => new Set(prev).add(reservation.id));
      // Optimistically remove
      setReservations(prev => prev.filter(r => r.id !== reservation.id));
      
      const result = await partnerConfirmNoShow(reservation.id);
      
      if (result.success) {
        toast.success('No-show confirmed');
        await loadPartnerData();
      } else {
        const errorMsg = result.message || 'Unknown error';
        logger.error('Confirm no-show failed:', errorMsg);
        toast.error(`Failed: ${errorMsg}`);
        await loadPartnerData();
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      logger.error('Error confirming no-show:', error);
      toast.error(`Error: ${errorMsg}`);
      await loadPartnerData();
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(reservation.id); return s; });
    }
  };

  const handleForgiveCustomer = async (reservation: Reservation) => {
    if (processingIds.has(reservation.id)) return;
    
    if (!confirm('Forgive this customer and remove their penalty?')) return;
    
    try {
      setProcessingIds(prev => new Set(prev).add(reservation.id));
      // Optimistically remove
      setReservations(prev => prev.filter(r => r.id !== reservation.id));
      
      const result = await partnerForgiveCustomer(reservation.id);
      
      if (result.success) {
        toast.success('Customer forgiven - penalty removed');
        await loadPartnerData();
      } else {
        const errorMsg = result.message || 'Unknown error';
        logger.error('Forgive customer failed:', errorMsg);
        toast.error(`Failed: ${errorMsg}`);
        await loadPartnerData();
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      logger.error('Error forgiving customer:', error);
      toast.error(`Error: ${errorMsg}`);
      await loadPartnerData();
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
      logger.error('Error purchasing slot:', error);
      toast.error(t('partner.points.purchaseFailed'));
    } finally {
      setIsPurchasing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-[#EFFFF8] to-[#C9F9E9]">
        <header className="bg-white border-b border-[#E8F9F4] sticky top-0 z-50 shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <Skeleton className="h-10 w-48" />
          </div>
        </header>
        <div className="container mx-auto px-4 py-8">
          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Active Reservations Skeleton */}
          <Card className="mb-8">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
          {/* Offers Table Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#EFFFF8] to-[#C9F9E9]" style={{ fontFamily: 'Inter, Poppins, sans-serif' }}>
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-[#E8F9F4] sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="leading-tight">
              <h1 className="text-lg md:text-xl font-extrabold bg-gradient-to-r from-[#00C896] to-[#009B77] text-transparent bg-clip-text">
                {partner?.business_name}
              </h1>
              <p className="text-[11px] md:text-xs text-neutral-500">{t('partner.dashboard.title')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            {/* Elegant Wallet Button - Always visible */}
            {partnerPoints && (
              <button
                onClick={() => setIsPurchaseSlotDialogOpen(true)}
                className="group shrink-0 relative h-11 md:h-12 px-4 md:px-5 rounded-2xl bg-gradient-to-br from-[#00C896] via-[#00B588] to-[#009B77] shadow-lg hover:shadow-2xl active:scale-[0.98] transition-all duration-300 overflow-hidden"
              >
                {/* Shine effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                
                {/* Content */}
                <div className="relative flex items-center gap-2.5 md:gap-3">
                  {/* Wallet Icon in elegant container */}
                  <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm">
                    <Wallet className="w-4 h-4 md:w-[18px] md:h-[18px] text-white drop-shadow-md" strokeWidth={2.5} />
                  </div>
                  
                  {/* Balance and Label */}
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-xs md:text-sm font-bold text-white drop-shadow-sm tracking-wide">
                      {partnerPoints.balance} ₾
                    </span>
                    <span className="text-[10px] md:text-xs text-white/90 font-medium">
                      Wallet
                    </span>
                  </div>
                  
                  {/* Slots badge - desktop only */}
                  <div className="hidden md:flex items-center gap-1 ml-1 px-2.5 py-1 rounded-lg bg-white/15 backdrop-blur-sm">
                    <span className="text-[10px] font-semibold text-white/95">{partnerPoints.offer_slots}</span>
                    <span className="text-[9px] text-white/80">slots</span>
                  </div>
                </div>
              </button>
            )}
            
            {/* Combined Menu - All options in one dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 h-9 w-9 md:h-10 md:w-10 rounded-full border-2 border-gray-200 hover:border-[#00C896] hover:bg-gray-50 transition-all"
                >
                  <User className="w-4 h-4 md:w-5 md:h-5 text-gray-700" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg">
                <DropdownMenuLabel className="font-semibold text-gray-900">
                  {partner?.business_name}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Customer View Options */}
                <DropdownMenuItem onClick={() => navigate('/my-picks')} className="cursor-pointer py-2.5 focus:bg-gray-50">
                  <Star className="w-4 h-4 mr-3 text-gray-600" />
                  <span className="text-sm font-medium">{t('header.myPicks')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/favorites')} className="cursor-pointer py-2.5 focus:bg-gray-50">
                  <Heart className="w-4 h-4 mr-3 text-gray-600" />
                  <span className="text-sm font-medium">Favorites</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer py-2.5 focus:bg-gray-50">
                  <UserCircle className="w-4 h-4 mr-3 text-gray-600" />
                  <span className="text-sm font-medium">{t('header.profile')}</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                {/* Partner Options */}
                <DropdownMenuItem onClick={() => navigate('/')} className="cursor-pointer py-2.5 focus:bg-gray-50">
                  <Home className="w-4 h-4 mr-3 text-gray-600" />
                  <span className="text-sm font-medium">{t('partner.dashboard.customerView')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsEditProfileOpen(true)}
                  className="cursor-pointer py-2.5 focus:bg-gray-50"
                >
                  <Edit className="w-4 h-4 mr-3 text-gray-600" />
                  <span className="text-sm font-medium">{t('partner.dashboard.editProfile')}</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                {/* Language Submenu */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer py-2.5">
                    <Languages className="w-4 h-4 mr-3 text-gray-600" />
                    <span className="text-sm font-medium">Language</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => setLanguage('en')} className="cursor-pointer">
                      🇬🇧 English {language === 'en' && <DropdownMenuShortcut>✓</DropdownMenuShortcut>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLanguage('ka')} className="cursor-pointer">
                      🇬🇪 ქართული {language === 'ka' && <DropdownMenuShortcut>✓</DropdownMenuShortcut>}
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer py-2.5 text-red-600 focus:bg-red-50 focus:text-red-700"
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  <span className="text-sm font-medium">{t('partner.dashboard.signOut')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Pending Status - Full Component */}
        {isPending && partner && (
          <PendingPartnerStatus
            businessName={partner.business_name}
            applicationDate={partner.created_at}
          />
        )}

        {/* Main Dashboard - Only show when approved */}
        {!isPending && (
          <>
            {/* Enhanced Stats Cards */}
            <EnhancedStatsCards
              stats={{
                activeOffers: stats.activeOffers,
                reservationsToday: stats.reservationsToday,
                itemsPickedUp: stats.itemsPickedUp,
                revenue: analytics.revenue,
                usedSlots: stats.activeOffers,
                totalSlots: partnerPoints?.offer_slots || 0,
              }}
              activeView={activeView}
              onCardClick={setActiveView}
              className="mb-6 md:mb-8"
            />

            {/* Action Buttons - Hidden, but Dialogs kept for functionality via QuickActions */}
            <div className="hidden flex-col sm:flex-row gap-3 md:gap-4 mb-6 md:mb-8">
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) {
              setImageFiles([]);
              setFormErrors({});
              setAutoExpire6h(true);
              setSelectedLibraryImage(null);
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
            <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto rounded-3xl">
              <DialogHeader className="pb-3">
                <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-teal-600" />
                  Create New Offer
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500">Fill in the details for your offer</DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateOffer} className="space-y-4">
                {/* Basic Details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <span className="text-base">📝</span>
                    <span>Basic Details</span>
                  </div>

                  <div>
                    <Label htmlFor="title" className="text-sm text-gray-600">
                      Title / დასახელება
                    </Label>
                    <Input
                      id="title"
                      name="title"
                      required
                      placeholder="e.g., Fresh Croissants"
                      className="mt-1.5 rounded-xl border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                    />
                    {formErrors.title && <p className="text-red-500 text-sm mt-1">{formErrors.title}</p>}
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-sm text-gray-600">
                      Description / აღწერა
                    </Label>
                    <Textarea
                      id="description"
                      name="description"
                      required
                      placeholder="Describe your offer..."
                      className="mt-1.5 min-h-[80px] rounded-xl border-gray-200 focus:border-teal-500 focus:ring-teal-500 resize-none"
                    />
                    {formErrors.description && <p className="text-red-500 text-sm mt-1">{formErrors.description}</p>}
                  </div>
                </div>

                {/* Pricing & Quantity */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <span className="text-base">💰</span>
                    <span>Pricing & Quantity</span>
                  </div>

                  {/* Quantity */}
                  <div>
                    <Label htmlFor="quantity" className="text-sm text-gray-600">Quantity *</Label>
                    <Input
                      id="quantity"
                      name="quantity"
                      type="number"
                      required
                      min="1"
                      placeholder="10"
                      className="mt-1.5 rounded-xl border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                    />
                    {formErrors.quantity && <p className="text-red-500 text-sm mt-1">{formErrors.quantity}</p>}
                  </div>

                  {/* Prices - Side by Side */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="original_price" className="text-sm text-gray-600">Original Price (₾)</Label>
                      <Input
                        id="original_price"
                        name="original_price"
                        type="number"
                        step="0.01"
                        required
                        placeholder="10.00"
                        className="mt-1.5 rounded-xl border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                      />
                      {formErrors.original_price && <p className="text-red-500 text-sm mt-1">{formErrors.original_price}</p>}
                    </div>

                    <div>
                      <Label htmlFor="smart_price" className="text-sm text-gray-600">Smart Price (₾)</Label>
                      <Input
                        id="smart_price"
                        name="smart_price"
                        type="number"
                        step="0.01"
                        required
                        placeholder="6.00"
                        className="mt-1.5 rounded-xl border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                      />
                      {formErrors.smart_price && <p className="text-red-500 text-sm mt-1">{formErrors.smart_price}</p>}
                    </div>
                  </div>

                  {/* 24-Hour Business Auto-Expire Checkbox */}
                  {is24HourBusiness && (
                    <div className="flex items-center space-x-2 p-2.5 bg-blue-50 rounded-lg border border-blue-200">
                      <Checkbox
                        id="auto_expire_6h"
                        checked={autoExpire6h}
                        onCheckedChange={(checked) => {
                          setAutoExpire6h(checked as boolean);
                          setFormErrors({});
                        }}
                      />
                      <Label htmlFor="auto_expire_6h" className="text-xs cursor-pointer text-gray-700">
                        Auto-expire in 12 hours
                      </Label>
                    </div>
                  )}
                </div>

                {/* Choose Image */}
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Product Image</Label>
                  <button
                    type="button"
                    onClick={() => setShowImageModal(true)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-medium text-sm transition-all duration-300 hover:shadow-lg"
                  >
                    📷 Choose Image
                  </button>
                  {selectedLibraryImage && (
                    <div className="relative w-full h-32 rounded-xl overflow-hidden border-2 border-teal-500">
                      <img
                        src={selectedLibraryImage}
                        alt="Selected"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 bg-teal-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                        ✓ Selected
                      </div>
                    </div>
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

                {/* Offer Scheduling - Compact */}
                {isScheduled && (
                  <div className="space-y-2">
                    <Label htmlFor="scheduled_publish_at" className="text-sm text-gray-600">
                      Publish At (optional)
                    </Label>
                    <Input
                      id="scheduled_publish_at"
                      type="datetime-local"
                      value={scheduledPublishAt}
                      onChange={(e) => setScheduledPublishAt(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      required={isScheduled}
                      className="rounded-xl border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                    />
                  </div>
                )}

                <div className="flex items-center space-x-2 p-2.5 bg-gray-50 rounded-lg">
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
                  <Label htmlFor="is_scheduled" className="text-xs cursor-pointer text-gray-700">
                    Schedule for later
                  </Label>
                </div>

                {/* Action Buttons - Sticky Footer */}
                <div className="sticky bottom-0 bg-white pt-4 pb-2 -mx-6 px-6 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                      className="rounded-xl border-gray-300 hover:bg-gray-50"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-1.5"></div>
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-1.5" />
                          Create Offer
                        </>
                      )}
                    </Button>
                  </div>
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
                  {isProcessingQR && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span className="text-blue-700 font-medium">Processing QR code...</span>
                    </div>
                  )}
                  <QRScanner
                    onScan={async (code) => {
                      // Use ref for immediate synchronous check to prevent race conditions
                      if (isProcessingQRRef.current) {
                        logger.log('⏸️ Already processing a QR code, ignoring...');
                        toast.info('Please wait, processing previous scan...');
                        return;
                      }

                      // Set ref immediately (synchronous) to block other scans
                      isProcessingQRRef.current = true;
                      setIsProcessingQR(true);
                      logger.log('🔄 Starting QR validation process...');
                      
                      try {
                        // Clean and normalize the scanned code
                        const cleanCode = code.trim();
                        logger.log('📋 QR Code received:', cleanCode);
                        setQrInput(cleanCode);

                        // Automatically validate and mark as picked up
                        logger.log('🔍 Validating QR code:', cleanCode);
                        const result = await validateQRCode(cleanCode, true);
                        logger.log('📊 Validation result:', result);

                        if (result.valid && result.reservation) {
                          logger.log('✅ QR validation successful!');
                          setQrInput('');
                          setQrScannerOpen(false);
                          toast.success(t('partner.dashboard.toast.pickupConfirmed'));
                          setLastQrResult('success');
                          await loadPartnerData(); // Refresh dashboard
                        } else {
                          logger.error('❌ QR validation failed:', result.error);
                          toast.error(result.error || 'Invalid QR code');
                          setLastQrResult('error');
                        }
                      } catch (error) {
                        logger.error('💥 Error validating QR code:', error);
                        toast.error(`Failed to validate QR code: ${error instanceof Error ? error.message : 'Unknown error'}`);
                        setLastQrResult('error');
                      } finally {
                        // Reset processing flag - scanner is already stopped
                        setTimeout(() => {
                          isProcessingQRRef.current = false;
                          setIsProcessingQR(false);
                          logger.log('🏁 QR processing complete, ready for next scan');
                        }, 500); // 0.5 second delay (scanner stops immediately anyway)
                      }
                    }}
                    onError={(error) => {
                      logger.error('📷 QR Scanner error:', error);
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

        {/* Content sections controlled by clickable stats cards */}

          {activeView === 'reservations' && (
            <div>
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
              onConfirmNoShow={handleConfirmNoShow}
              onForgiveCustomer={handleForgiveCustomer}
              processingIds={processingIds}
            />
          </div>
        )}
            </div>
          )}

          {activeView === 'offers' && (
            <div>
              {isPending ? (
                <Card className="mb-6 md:mb-8 rounded-2xl border-[#E8F9F4] shadow-lg opacity-60">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
                      📦 Your Offers
                      <Lock className="w-5 h-5 text-gray-400" />
                    </CardTitle>
                    <CardDescription className="text-sm md:text-base">
                      This section will be available after approval
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 md:py-12">
                      <Lock className="w-16 h-16 md:w-20 md:h-20 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 mb-2 text-sm md:text-base">{t('partner.dashboard.pending.offersDisabled')}</p>
                      <p className="text-xs md:text-sm text-gray-400">{t('partner.dashboard.pending.createReach')}</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <PartnerOffers
                  offers={offers}
                  onToggleOffer={handleToggleOffer}
                  onEditOffer={openEditDialog}
                  onDeleteOffer={handleDeleteOffer}
                  onRefreshQuantity={handleRefreshQuantity}
                  onCloneOffer={handleCreateNewFromOld}
                  processingIds={processingIds}
                />
              )}
            </div>
          )}

          {activeView === 'analytics' && (
            <div>
        {/* Partner Analytics */}
            <Card className="mb-6 md:mb-8 rounded-2xl border-[#E8F9F4] shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
                  📊 {t('Business Analytics')}
                </CardTitle>
                <CardDescription className="text-sm md:text-base">
                  {t('Insights into your performance, top items, and peak hours')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PartnerAnalytics
                  offers={offers}
                  allReservations={allReservations}
                  revenue={analytics.revenue}
                />
              </CardContent>
            </Card>
            </div>
          )}

          {activeView === 'today' && (
            <div>
        {/* Today's Performance - Items Picked Up */}
            <Card className="mb-6 md:mb-8 rounded-2xl border-[#E8F9F4] shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
                  ✅ Today's Performance
                </CardTitle>
                <CardDescription className="text-sm md:text-base">
                  Items picked up and completed reservations for today
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                  <p className="text-4xl font-bold text-gray-900 mb-2">{stats.itemsPickedUp}</p>
                  <p className="text-gray-600">Items picked up today</p>
                </div>
              </CardContent>
            </Card>
            </div>
          )}

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
          </>
        )}
      </div>

      {/* Floating Action Button (Mobile) */}
      {!isPending && (
        <button
          onClick={() => setIsCreateDialogOpen(true)}
          disabled={isPending}
          className="md:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-[#00C896] to-[#009B77] hover:from-[#00B588] hover:to-[#008866] text-white shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Create new offer"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Edit Offer Dialog - Minimalistic & Compact */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto rounded-3xl">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Edit className="w-5 h-5 text-teal-600" />
              Edit Offer
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">Update your offer details</DialogDescription>
          </DialogHeader>
          {editingOffer && (
            <form onSubmit={handleEditOffer} className="space-y-4">
              {/* Basic Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <span className="text-base">📝</span>
                  <span>Basic Details</span>
                </div>

                <div>
                  <Label htmlFor="edit_title" className="text-sm text-gray-600">
                    Title / დასახელება
                  </Label>
                  <Input
                    id="edit_title"
                    name="title"
                    required
                    defaultValue={editingOffer.title}
                    className="mt-1.5 rounded-xl border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <Label htmlFor="edit_description" className="text-sm text-gray-600">
                    Description / აღწერა
                  </Label>
                  <Textarea
                    id="edit_description"
                    name="description"
                    required
                    defaultValue={editingOffer.description}
                    className="mt-1.5 min-h-[80px] rounded-xl border-gray-200 focus:border-teal-500 focus:ring-teal-500 resize-none"
                  />
                </div>
              </div>

              {/* Pricing & Quantity */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <span className="text-base">💰</span>
                  <span>Pricing & Quantity</span>
                </div>

                {/* Quantity */}
                <div>
                  <Label htmlFor="edit_quantity" className="text-sm text-gray-600">Quantity *</Label>
                  <Input
                    id="edit_quantity"
                    name="quantity"
                    type="number"
                    required
                    min="1"
                    defaultValue={editingOffer.quantity_total}
                    className="mt-1.5 rounded-xl border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                  />
                </div>

                {/* Prices - Side by Side */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="edit_original_price" className="text-sm text-gray-600">Original Price (₾)</Label>
                    <Input
                      id="edit_original_price"
                      name="original_price"
                      type="number"
                      step="0.01"
                      required
                      defaultValue={editingOffer.original_price}
                      className="mt-1.5 rounded-xl border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit_smart_price" className="text-sm text-gray-600">Smart Price (₾)</Label>
                    <Input
                      id="edit_smart_price"
                      name="smart_price"
                      type="number"
                      step="0.01"
                      required
                      defaultValue={editingOffer.smart_price}
                      className="mt-1.5 rounded-xl border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Current Image Preview - Compact */}
              {editingOffer.images && editingOffer.images.length > 0 && (
                <div>
                  <Label className="text-sm text-gray-600 mb-2 block">Current Image</Label>
                  <div className="relative w-full h-32 rounded-xl overflow-hidden border-2 border-gray-200">
                    <img
                      src={resolveOfferImageUrl(editingOffer.images[0], editingOffer.category)}
                      alt="Current offer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Choose Image Button */}
              <button
                type="button"
                onClick={() => setShowImageModal(true)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-medium text-sm transition-all duration-300 hover:shadow-lg"
              >
                📷 Choose New Image
              </button>

              {selectedLibraryImage && (
                <div className="relative w-full h-32 rounded-xl overflow-hidden border-2 border-teal-500">
                  <img
                    src={selectedLibraryImage}
                    alt="Selected"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-teal-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                    ✓ New image
                  </div>
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

              {/* Action Buttons - Sticky Footer */}
              <div className="sticky bottom-0 bg-white pt-4 pb-2 -mx-6 px-6 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditDialogOpen(false);
                      setSelectedLibraryImage(null);
                      setImageFiles([]);
                    }}
                    className="rounded-xl border-gray-300 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    <CheckCircle className="w-4 h-4 mr-1.5" />
                    Update Offer
                  </Button>
                </div>
              </div>
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
            setFormErrors({});
          }}
          onScanQR={() => setQrScannerOpen(true)}
        />
      )}

      {/* Dialogs - Always available */}
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
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader className="pb-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 mx-auto mb-4">
              <Wallet className="w-8 h-8 text-orange-600" />
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900 text-center mb-2">
              🚀 Need More Listing Slots?
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 text-center px-2">
              You've reached your listing limit. Purchase additional slots to create more offers and grow your business!
            </DialogDescription>
          </DialogHeader>

          {partnerPoints && (
            <div className="space-y-5 pt-2">
              {/* Current Status - Clean Card */}
              <div className="bg-gradient-to-br from-teal-50 to-teal-100/30 rounded-2xl p-5 border border-teal-200/60">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-teal-700 mb-1.5 font-medium">Current Balance</p>
                    <p className="text-3xl font-bold text-teal-600">{partnerPoints.balance} pts</p>
                  </div>
                  <div>
                    <p className="text-xs text-teal-700 mb-1.5 font-medium">Current Slots</p>
                    <p className="text-3xl font-bold text-teal-600">{partnerPoints.offer_slots}</p>
                  </div>
                </div>
              </div>

              {/* Next Slot Cost - Prominent */}
              <div className="flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-gray-200">
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-0.5">Next Slot Cost</p>
                  <p className="text-xs text-gray-500">Price increases with each slot</p>
                </div>
                <div className="text-3xl font-bold text-gray-900">{(partnerPoints.offer_slots - 3) * 50} pts</div>
              </div>

              {/* Insufficient Balance Alert - Only show when needed */}
              {partnerPoints.balance < (partnerPoints.offer_slots - 3) * 50 && (
                <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-2xl border border-orange-200">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-900 mb-1">Insufficient Balance</p>
                    <p className="text-xs text-orange-700">You need more points to purchase this slot</p>
                  </div>
                  <button
                    onClick={() => {
                      setIsPurchaseSlotDialogOpen(false);
                      setIsBuyPointsModalOpen(true);
                    }}
                    className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 rounded-xl transition-all"
                  >
                    Buy Points
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-6 border-t border-gray-100 mt-6">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => setIsPurchaseSlotDialogOpen(false)}
                className="rounded-xl border-gray-300"
              >
                {t('partner.points.cancel')}
              </Button>
              <Button
                onClick={handlePurchaseSlot}
                disabled={isPurchasing || !partnerPoints || partnerPoints.balance < (partnerPoints.offer_slots - 3) * 50}
                className="rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white"
              >
                {isPurchasing ? t('partner.points.purchasing') : t('partner.points.confirmPurchase')}
              </Button>
            </div>
          </div>
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



