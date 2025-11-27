import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Offer, Reservation, Partner } from '@/lib/types';
import { offerDataSchema, validateData, getValidationErrorMessage } from '@/lib/schemas';
import {
  getPartnerByUserId,
  getPartnerById,
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
import { approveForgivenessRequest, denyForgivenessRequest } from '@/lib/api/partners';
import { supabase } from '@/lib/supabase';
import { checkServerRateLimit } from '@/lib/rateLimiter-server';
import { DEFAULT_24H_OFFER_DURATION_HOURS } from '@/lib/constants';
import ImageLibraryModal from '@/components/ImageLibraryModal';
import { AnnouncementPopup } from '@/components/AnnouncementPopup';
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
import { Plus, CheckCircle, QrCode, LogOut, Lock, User, Home, Wallet, Camera, Edit, Star, Heart, UserCircle, Languages } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TelegramConnect } from '@/components/TelegramConnect';
import QRScanner from '@/components/QRScanner';
import EditPartnerProfile from '@/components/partner/EditPartnerProfile';
import EnhancedStatsCards from '@/components/partner/EnhancedStatsCards';
import QuickActions from '@/components/partner/QuickActions';
import EnhancedActiveReservations from '@/components/partner/EnhancedActiveReservations';
import ForgivenessRequests from '@/components/partner/ForgivenessRequests';
import QRScanFeedback from '@/components/partner/QRScanFeedback';
import CreateOfferWizard from '@/components/partner/CreateOfferWizard';
import { useI18n } from '@/lib/i18n';
import { BuyPartnerPointsModal } from '@/components/BuyPartnerPointsModal';
import PendingPartnerStatus from '@/components/partner/PendingPartnerStatus';
import PartnerAnalytics from '@/components/partner/PartnerAnalytics';
import PartnerOffers from '@/components/partner/PartnerOffers';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/lib/logger';
import PartnerOnboardingTour from '@/components/partner/PartnerOnboardingTour';
// (Language switch removed from this page — language control moved to Index header)

const extractErrorMessage = (error: unknown, fallback = 'Unknown error') => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    const baseMessage = (error as { message?: string }).message;
    if (baseMessage) {
      return baseMessage;
    }

    if ('error' in error && typeof (error as { error?: { message?: string } }).error === 'object') {
      const nested = (error as { error?: { message?: string } }).error?.message;
      if (nested) {
        return nested;
      }
    }
  }

  return fallback;
};

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
  const [showOnboardingTour, setShowOnboardingTour] = useState(false);
  // Auto-expiration for 24h businesses: 12 hours by spec
  const [autoExpire6h, setAutoExpire6h] = useState(true);
  const navigate = useNavigate();
  // Admin impersonation support: if localStorage has impersonate_partner_id we load that partner instead
  const impersonatePartnerId = typeof window !== 'undefined' ? localStorage.getItem('impersonate_partner_id') : null;
  const isImpersonating = !!impersonatePartnerId;

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

  // Real-time subscription for new reservations
  useEffect(() => {
    if (!partner?.id) return;

    const channel = supabase
      .channel('partner-reservations')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reservations',
          filter: `partner_id=eq.${partner.id}`,
        },
        (payload) => {
          logger.log('🔴 New reservation created:', payload.new);
          
          // Add new reservation to the list if it's active
          const newReservation = payload.new as Reservation;
          if (newReservation.status === 'ACTIVE') {
            setReservations(prev => [newReservation, ...prev]);
            setAllReservations(prev => [newReservation, ...prev]);
            
            // Update stats - increment reservationsToday
            setStats(prev => ({
              ...prev,
              reservationsToday: prev.reservationsToday + 1,
            }));
            
            // Show toast notification
            toast.success('New reservation received!', {
              description: `${newReservation.quantity}x items reserved`,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reservations',
          filter: `partner_id=eq.${partner.id}`,
        },
        (payload) => {
          logger.log('🟡 Reservation updated:', payload.new);
          
          const updatedReservation = payload.new as Reservation;
          
          // Update in active reservations list
          setReservations(prev => {
            // If status changed from ACTIVE, remove from active list
            if (updatedReservation.status !== 'ACTIVE') {
              return prev.filter(r => r.id !== updatedReservation.id);
            }
            // Otherwise update the reservation
            return prev.map(r => r.id === updatedReservation.id ? updatedReservation : r);
          });
          
          // Update in all reservations list
          setAllReservations(prev => 
            prev.map(r => r.id === updatedReservation.id ? updatedReservation : r)
          );
          
          // Update stats if picked up
          if (updatedReservation.status === 'PICKED_UP') {
            setStats(prev => ({
              ...prev,
              itemsPickedUp: prev.itemsPickedUp + updatedReservation.quantity,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partner?.id]);

  // Pickup times are set automatically on submit; no UI auto-fill needed
  useEffect(() => {}, [isCreateDialogOpen, partner]);

  const loadPartnerData = async () => {
    try {
      setIsLoading(true);
      const { user } = await getCurrentUser();
      if (!user && !isImpersonating) {
        navigate('/');
        return;
      }

      let partnerData: Partner | null = null;
      if (isImpersonating && impersonatePartnerId) {
        partnerData = await getPartnerById(impersonatePartnerId);
      } else if (user) {
        partnerData = await getPartnerByUserId(user.id);
      }
      if (!partnerData) {
  toast.error(t('partner.dashboard.toast.partnerNotFound'));
        navigate('/partner/apply');
        return;
      }

      setPartner(partnerData);
      
      // Normalize status to uppercase for comparison
      const normalizedStatus = partnerData.status?.toUpperCase();
      
      // If partner is pending, only load basic data (no offers/reservations)
      if (!isImpersonating && normalizedStatus === 'PENDING') {
        setIsLoading(false);
        return;
      }

      // If approved, load full dashboard data
      if (normalizedStatus === 'APPROVED' || isImpersonating) {
        const [offersData, reservationsData, statsData, pointsData] = await Promise.all([
          getPartnerOffers(partnerData.id),
          getPartnerReservations(partnerData.id),
          getPartnerStats(partnerData.id),
          getPartnerPoints(partnerData.user_id),
        ]);

        setOffers(offersData);
        // In impersonation mode disallow mutating reservation quick actions - we still show active list
        setReservations(reservationsData.filter(r => r.status === 'ACTIVE'));
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

        // Show onboarding tour every time partner logs in, unless they opted out
        const tourOptedOut = localStorage.getItem(`partner_tour_opted_out_${partnerData.id}`);
        if (!isImpersonating && !tourOptedOut) {
          setTimeout(() => setShowOnboardingTour(true), 800);
        }
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

  // Wrapper for wizard submission
  const handleCreateOfferWizard = async (formData: FormData) => {
    await handleCreateOffer(formData);
  };

  const handleCreateOffer = async (formDataOrEvent: FormData | React.FormEvent<HTMLFormElement>) => {
    let formData: FormData;
    
    // Handle both FormData and form event
    if (formDataOrEvent instanceof FormData) {
      formData = formDataOrEvent;
    } else {
      formDataOrEvent.preventDefault();
      formData = new FormData(formDataOrEvent.currentTarget);
    }
    
    logger.log('🔥🔥🔥 CREATE OFFER BUTTON CLICKED 🔥🔥🔥');
    if (isImpersonating) {
      toast.error('Impersonation mode: Offer creation disabled');
      return;
    }

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

      // Validate form data with Zod schema for security
      const rawData = {
        title: (formData.get('title') as string)?.trim() || t('partner.dashboard.fallback.untitledOffer'),
        description: (formData.get('description') as string)?.trim() || "No description provided",
        original_price: parseFloat(formData.get('original_price') as string),
        smart_price: parseFloat(formData.get('smart_price') as string),
        quantity: parseInt(formData.get('quantity') as string),
        auto_expire_6h: formData.get('auto_expire_6h') ? true : false,
      };

      const validationResult = validateData(offerDataSchema, rawData);
      
      if (!validationResult.success) {
        const errorMsg = getValidationErrorMessage(validationResult.errors);
        toast.error(errorMsg);
        setFormErrors({ general: errorMsg });
        setIsSubmitting(false);
        return;
      }

      const { title, description, original_price: originalPrice, smart_price: smartPrice, quantity } = validationResult.data;

      // Compute pickup times automatically based on business hours
      const autoExpireValue = formData.get('auto_expire_6h');
      let shouldAutoExpire = autoExpire6h;
      if (typeof autoExpireValue === 'string') {
        shouldAutoExpire = autoExpireValue.toLowerCase() === 'true' || autoExpireValue === '1' || autoExpireValue.toLowerCase() === 'on';
        setAutoExpire6h(shouldAutoExpire);
      }

      const now = new Date();
      const pickupStart: Date = now;
      let pickupEnd: Date = now;

      logger.log('Creating offer with business settings:', {
        is24HourBusiness,
        autoExpire6h: shouldAutoExpire,
        opening_time: partner?.opening_time,
        closing_time: partner?.closing_time,
        open_24h: partner?.open_24h,
      });

      if (is24HourBusiness && shouldAutoExpire) {
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
      if (processedImages.length === 0) {
        const formImages = formData
          .getAll('images')
          .map((value) => (typeof value === 'string' ? value.trim() : ''))
          .filter((value): value is string => Boolean(value));
        if (formImages.length > 0) {
          processedImages = formImages;
          setImageFiles(formImages);
          setSelectedLibraryImage(formImages[0]);
        }
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
          status: 'ACTIVE',
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
        toast.success(t('partner.dashboard.toast.offerCreated'));
        setIsCreateDialogOpen(false);
        setImageFiles([]);
        setFormErrors({});
        setAutoExpire6h(true);
        setSelectedLibraryImage(null);
        loadPartnerData();
      }
    } catch (error) {
      logger.error('Error creating offer:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`${t('partner.dashboard.toast.offerCreateFailed')}: ${errorMessage}`);
      // Re-throw error so wizard knows not to close
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const exitImpersonation = () => {
    localStorage.removeItem('impersonate_partner_id');
    toast.success('Exited impersonation');
    navigate('/admin');
  };

  const handleEditOffer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingOffer) return;

    const formData = new FormData(e.currentTarget);

    try {
      // Validate form data with Zod schema for security
      const rawData = {
        title: (formData.get('title') as string)?.trim(),
        description: (formData.get('description') as string)?.trim(),
        original_price: parseFloat(formData.get('original_price') as string),
        smart_price: parseFloat(formData.get('smart_price') as string),
        quantity: parseInt(formData.get('quantity') as string),
        auto_expire_6h: autoExpire6h,
      };

      const validationResult = validateData(offerDataSchema, rawData);
      
      if (!validationResult.success) {
        const errorMsg = getValidationErrorMessage(validationResult.errors);
        toast.error(errorMsg);
        return;
      }

      const { title, description, original_price: originalPrice, smart_price: smartPrice, quantity } = validationResult.data;

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
      const pickupStart: Date = now;
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
  } catch (error) {
    logger.error('Error marking as picked up:', error);
    const errorMsg = extractErrorMessage(error);
    toast.error(`Failed to mark as picked up: ${errorMsg}`);
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
    } catch (error) {
      const errorMsg = extractErrorMessage(error);
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
    } catch (error) {
      const errorMsg = extractErrorMessage(error);
      logger.error('Error forgiving customer:', error);
      toast.error(`Error: ${errorMsg}`);
      await loadPartnerData();
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(reservation.id); return s; });
    }
  };

  const handleApproveForgivenessRequest = async (reservation: Reservation) => {
    if (processingIds.has(reservation.id)) return;
    
    try {
      setProcessingIds(prev => new Set(prev).add(reservation.id));
      
      const result = await approveForgivenessRequest(reservation.id);
      
      if (result.success) {
        toast.success(result.message);
        await loadPartnerData();
      } else {
        toast.error(result.message);
        await loadPartnerData();
      }
    } catch (error) {
      logger.error('Error approving forgiveness:', error);
      toast.error(`Failed to approve forgiveness request: ${extractErrorMessage(error)}`);
      await loadPartnerData();
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(reservation.id); return s; });
    }
  };

  const handleDenyForgivenessRequest = async (reservation: Reservation) => {
    if (processingIds.has(reservation.id)) return;
    
    if (!confirm('Deny this forgiveness request? The customer will need to use points or wait for penalty to expire.')) return;
    
    try {
      setProcessingIds(prev => new Set(prev).add(reservation.id));
      
      const result = await denyForgivenessRequest(reservation.id);
      
      if (result.success) {
        toast.success(result.message);
        await loadPartnerData();
      } else {
        toast.error(result.message);
        await loadPartnerData();
      }
    } catch (error) {
      logger.error('Error denying forgiveness:', error);
      toast.error(`Failed to deny forgiveness request: ${extractErrorMessage(error)}`);
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

    // New pricing: (slot_number - 9) * 100
    // 11th slot = 100, 12th = 200, 13th = 300, etc.
    const nextSlotCost = (partnerPoints.offer_slots - 9) * 100;

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
    <div className="min-h-screen bg-white safe-area-top" style={{ fontFamily: 'Inter, Poppins, sans-serif' }}>
      {/* Announcement Popup */}
      <AnnouncementPopup />
      
      {/* Header - Clean Modern Design */}
      <header className="bg-white/98 backdrop-blur-sm border-b border-emerald-100/50 sticky top-0 z-50 shadow-md">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col min-w-0">
                    <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-transparent bg-clip-text truncate" style={{ fontWeight: 700 }}>
                      {partner?.business_name}
                    </h1>
                    <p className="text-xs text-gray-600 font-normal" style={{ fontWeight: 400 }}>{t('partner.dashboard.title')}</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="font-semibold">{partner?.business_name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-3">
            {/* Modern Wallet Card */}
            {partnerPoints && (
              <button
                onClick={() => setIsPurchaseSlotDialogOpen(true)}
                className="group shrink-0 relative px-4 py-2.5 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/50 shadow-sm hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-100/50 active:scale-[0.98] transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
                    <Wallet className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  
                  {/* Content */}
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-bold text-gray-900">
                        {partnerPoints.balance}
                      </span>
                      <span className="text-xs font-semibold text-emerald-600">SP</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 font-medium">
                        {partnerPoints.offer_slots} slots
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            )}
            
            {/* Menu Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 h-10 w-10 rounded-xl bg-white border border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all"
                >
                  <User className="w-5 h-5 text-gray-700" />
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
                <DropdownMenuItem
                  onClick={() => setShowOnboardingTour(true)}
                  className="cursor-pointer py-2.5 focus:bg-gray-50"
                >
                  <QrCode className="w-4 h-4 mr-3 text-gray-600" />
                  <span className="text-sm font-medium">View Tutorial</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                {/* Language Selection - Top level for quick access */}
                <DropdownMenuLabel className="text-xs text-gray-500 font-normal px-2 py-1.5">
                  Language / ენა
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setLanguage('en')} className="cursor-pointer py-2.5 focus:bg-gray-50">
                  <Languages className="w-4 h-4 mr-3 text-gray-600" />
                  <span className="text-sm font-medium">🇬🇧 English</span>
                  {language === 'en' && <DropdownMenuShortcut className="text-emerald-600 font-bold">✓</DropdownMenuShortcut>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('ka')} className="cursor-pointer py-2.5 focus:bg-gray-50">
                  <Languages className="w-4 h-4 mr-3 text-gray-600" />
                  <span className="text-sm font-medium">🇬🇪 ქართული</span>
                  {language === 'ka' && <DropdownMenuShortcut className="text-emerald-600 font-bold">✓</DropdownMenuShortcut>}
                </DropdownMenuItem>
                
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
            {/* Enhanced Stats Cards - Compact 4-column design */}
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
              className="mb-4 sm:mb-5 md:mb-6"
            />

            {/* Quick Actions Bar - Always visible */}
            <div className="mb-6 md:mb-8">
              <QuickActions
                onNewOffer={() => setIsCreateDialogOpen(true)}
                onScanQR={() => setQrScannerOpen(true)}
              />
            </div>

            {/* Create Offer Wizard - Multi-step with auto-save */}
            <CreateOfferWizard
              open={isCreateDialogOpen}
              onClose={() => setIsCreateDialogOpen(false)}
              onSubmit={handleCreateOfferWizard}
              isSubmitting={isSubmitting}
              is24HourBusiness={is24HourBusiness}
              businessType={partner?.business_type || 'RESTAURANT'}
            />
          <Dialog open={qrScannerOpen} onOpenChange={setQrScannerOpen}>
            <DialogContent className="rounded-2xl max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-transparent bg-clip-text">
                  📱 {t('partner.dashboard.qr.validateTitle')}
                </DialogTitle>
                <DialogDescription className="text-base">{t('partner.dashboard.qr.descriptionPartner')}</DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="camera" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-gray-100">
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
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-6 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
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
          <div className="space-y-6 mb-6 md:mb-8">
            <EnhancedActiveReservations
              reservations={reservations}
              onMarkAsPickedUp={handleMarkAsPickedUp}
              onConfirmNoShow={handleConfirmNoShow}
              onForgiveCustomer={handleForgiveCustomer}
              processingIds={processingIds}
            />
            
            {/* Forgiveness Requests - Show all reservations that might have requests */}
            <ForgivenessRequests
              reservations={allReservations}
              onApprove={handleApproveForgivenessRequest}
              onDeny={handleDenyForgivenessRequest}
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
              <Card className="mb-6 rounded-xl border border-gray-200 shadow-sm bg-white">
                <CardHeader className="border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100">
                      <span className="text-2xl">📊</span>
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold text-gray-900">
                        {t('Business Analytics')}
                      </CardTitle>
                      <CardDescription className="text-sm text-gray-600 mt-1">
                        {t('Insights into your performance, top items, and peak hours')}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
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
              <Card className="mb-6 rounded-xl border border-gray-200 shadow-sm bg-white">
                <CardHeader className="border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100">
                      <CheckCircle className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold text-gray-900">
                        Today's Performance
                      </CardTitle>
                      <CardDescription className="text-sm text-gray-600 mt-1">
                        Items picked up and completed reservations for today
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="text-center py-12 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 mb-4">
                      <CheckCircle className="w-10 h-10 text-emerald-600" strokeWidth={2} />
                    </div>
                    <p className="text-5xl font-bold text-gray-900 mb-2">{stats.itemsPickedUp}</p>
                    <p className="text-gray-600 font-medium">Items picked up today</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Telegram Notifications Toggle */}
          {partner && (
            <div className="mb-6">
              <TelegramConnect userId={partner.user_id} userType="partner" />
            </div>
          )}
          </>
        )}
      </div>

      {/* Mobile bottom padding to prevent content from being hidden behind QuickActions bar */}
      {!isPending && <div className="h-24 md:hidden" />}

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
                      src={resolveOfferImageUrl(editingOffer.images[0], editingOffer.category, { width: 400, quality: 80 })}
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
              <ImageLibraryModal
                open={showImageModal}
                category={partner?.business_type || 'RESTAURANT'}
                onSelect={(url) => {
                  setSelectedLibraryImage(url);
                  setImageFiles([url]);
                }}
                onClose={() => setShowImageModal(false)}
              />

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

      {/* Partner Onboarding Tour */}
      {partner && (
        <PartnerOnboardingTour
          open={showOnboardingTour}
          onComplete={(dontShowAgain) => {
            setShowOnboardingTour(false);
            if (partner?.id && dontShowAgain) {
              localStorage.setItem(`partner_tour_opted_out_${partner.id}`, 'true');
              toast.success('✅ Tutorial preference saved');
            } else {
              toast.success('🎉 Tutorial complete! Ready to create your first offer?');
            }
          }}
          partnerName={partner.business_name}
        />
      )}
    </div>
  );
}



