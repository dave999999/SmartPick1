import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Offer, Reservation, Partner } from '@/lib/types';
import { extractErrorMessage } from '@/lib/utils/errors';
import { calculatePickupEndTime, is24HourBusiness } from '@/lib/utils/businessHours';
import {
  getPartnerByUserId,
  getPartnerById,
  getPartnerOffers,
  getPartnerReservations,
  getPartnerStats,
  updateOffer,
  deleteOffer,
  markAsPickedUp,
  getCurrentUser,
  signOut,
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
import { AnnouncementPopup } from '@/components/AnnouncementPopup';
import { FloatingBottomNav } from '@/components/FloatingBottomNav';
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
import { toast } from 'sonner';
import { Plus, QrCode, LogOut, Lock, User, Home, Wallet, Edit, Star, Heart, UserCircle, Languages } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TelegramConnect } from '@/components/TelegramConnect';
import EditPartnerProfile from '@/components/partner/EditPartnerProfile';
import EnhancedStatsCards from '@/components/partner/EnhancedStatsCards';
import QuickActions from '@/components/partner/QuickActions';
import EnhancedActiveReservations from '@/components/partner/EnhancedActiveReservations';
import PenaltyForgivenessTab from '@/components/partner/PenaltyForgivenessTab';
import CreateOfferWizard from '@/components/partner/CreateOfferWizard';
import { useI18n } from '@/lib/i18n';
import { BuyPartnerPointsModal } from '@/components/BuyPartnerPointsModal';
import PendingPartnerStatus from '@/components/partner/PendingPartnerStatus';
import PartnerAnalytics from '@/components/partner/PartnerAnalytics';
import PartnerOffers from '@/components/partner/PartnerOffers';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/lib/logger';
import PartnerOnboardingTour from '@/components/partner/PartnerOnboardingTour';
import { PartnerDashboardRedesigned } from '@/components/partner/PartnerDashboardRedesigned';
import { QRScannerDialog } from '@/components/partner/QRScannerDialog';
import { PurchaseSlotDialog } from '@/components/partner/PurchaseSlotDialog';
import { EditOfferDialog } from '@/components/partner/EditOfferDialog';
import { useOfferActions } from '@/hooks/useOfferActions';
import { useReservationActions } from '@/hooks/useReservationActions';
// (Language switch removed from this page — language control moved to Index header)

export default function PartnerDashboard() {
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
  const [activeView, setActiveView] = useState('slots');
  const [isLoading, setIsLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({}); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOnboardingTour, setShowOnboardingTour] = useState(false);
  // Auto-expiration for 24h businesses: 12 hours by spec
  const [autoExpire6h, setAutoExpire6h] = useState(true);
  const navigate = useNavigate();

  // Action hooks
  const offerActions = useOfferActions(partner, loadPartnerData);
  const reservationActions = useReservationActions(loadPartnerData);
  // Admin impersonation support: if localStorage has impersonate_partner_id we load that partner instead
  const impersonatePartnerId = typeof window !== 'undefined' ? localStorage.getItem('impersonate_partner_id') : null;
  const isImpersonating = !!impersonatePartnerId;

  // Check if partner is pending - case insensitive
  const isPending = partner?.status?.toUpperCase() === 'PENDING';
  
  // Check if partner operates 24 hours
  const is24HourBusiness = partner?.open_24h === true;

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
      const pickupEnd: Date = calculatePickupEndTime(partner, shouldAutoExpire);

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
        // Verify partner authentication
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        // Verify partner_id matches user_id
        if (partner.user_id !== currentUser?.id) {
          logger.error('MISMATCH: Partner user_id does not match current user!');
          toast.error('Authentication error: Please log out and log back in');
          return;
        }

        // Create offer with validated data
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
      
      {/* Header - Compact Mobile Design */}
      <header className="bg-white/98 backdrop-blur-sm border-b border-emerald-100/50 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="flex flex-col min-w-0">
              <h1 className="text-base sm:text-lg md:text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-transparent bg-clip-text truncate leading-tight" style={{ fontWeight: 700 }}>
                {partner?.business_name}
              </h1>
              <p className="text-[10px] sm:text-xs text-gray-500 font-normal leading-tight" style={{ fontWeight: 400 }}>{t('partner.dashboard.title')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Compact Wallet Card */}
            {partnerPoints && (
              <button
                onClick={() => setIsPurchaseSlotDialogOpen(true)}
                className="group shrink-0 relative px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/50 hover:border-emerald-300 hover:shadow-md active:scale-[0.98] transition-all duration-200"
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Icon */}
                  <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                    <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" strokeWidth={2.5} />
                  </div>
                  
                  {/* Content */}
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-1">
                      <span className="text-sm sm:text-base font-bold text-gray-900 leading-tight">
                        {partnerPoints.balance}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-600">SP</span>
                    </div>
                    <span className="text-[10px] sm:text-xs text-gray-600 font-medium leading-tight">
                      {partnerPoints.offer_slots} slots
                    </span>
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
                  className="shrink-0 h-8 w-8 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl bg-white border border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all"
                >
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
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
          <QRScannerDialog 
            open={qrScannerOpen} 
            onOpenChange={setQrScannerOpen}
            onSuccess={loadPartnerData}
          />

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
              onMarkAsPickedUp={(r) => reservationActions.handleMarkAsPickedUp(r, (id) => setReservations(prev => prev.filter(res => res.id !== id)))}
              onConfirmNoShow={handleConfirmNoShow}
              onForgiveCustomer={handleForgiveCustomer}
              processingIds={processingIds}
            />
            
            {/* Penalty Forgiveness Requests */}
            {partner?.id && <PenaltyForgivenessTab partnerId={partner.id} />}
          </div>
        )}
            </div>
          )}

          {activeView === 'slots' && (
            <div>
              {isPending ? (
                <Card className="mb-6 md:mb-8 rounded-2xl border-[#E8F9F4] shadow-lg opacity-60">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
                      📦 Your Offer Slots
                      <Lock className="w-5 h-5 text-gray-400" />
                    </CardTitle>
                    <CardDescription className="text-sm md:text-base">
                      Manage your offers and slots - available after approval
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
                <PartnerDashboardRedesigned
                  partner={partner!}
                  offers={offers}
                  pointBalance={partnerPoints?.balance || 0}
                  onCreateOffer={() => setIsCreateDialogOpen(true)}
                  onScanQR={() => setQrScannerOpen(true)}
                  onEditOffer={openEditDialog}
                  onToggleOffer={handleToggleOffer}
                  onDeleteOffer={handleDeleteOffer}
                  onRefreshQuantity={handleRefreshQuantity}
                  onCloneOffer={handleCreateNewFromOld}
                  processingIds={processingIds}
                />
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
                <PartnerDashboardRedesigned
                  partner={partner!}
                  offers={offers}
                  pointBalance={partnerPoints?.balance || 0}
                  onCreateOffer={() => setIsCreateDialogOpen(true)}
                  onScanQR={() => setQrScannerOpen(true)}
                  onEditOffer={openEditDialog}
                  onToggleOffer={offerActions.handleToggleOffer}
                  onDeleteOffer={offerActions.handleDeleteOffer}
                  onRefreshQuantity={(offerId) => offerActions.handleRefreshQuantity(offerId, offers)}
                  onCloneOffer={offerActions.handleDuplicateOffer}
                  processingIds={offerActions.processingIds}
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
      <EditOfferDialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setEditingOffer(null);
        }}
        offer={editingOffer}
        partner={partner}
        autoExpire6h={autoExpire6h}
        onSuccess={loadPartnerData}
      />

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
      <PurchaseSlotDialog 
        open={isPurchaseSlotDialogOpen}
        onOpenChange={setIsPurchaseSlotDialogOpen}
        partnerPoints={partnerPoints}
        isPurchasing={isPurchasing}
        onPurchase={handlePurchaseSlot}
        onBuyPoints={() => setIsBuyPointsModalOpen(true)}
      />

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



