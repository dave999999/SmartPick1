import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { resolveOfferImageUrl } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Clock, QrCode, Download, Star, MapPin, Phone, Mail, XCircle, X, Bell, BellOff } from 'lucide-react';
import { getCurrentUser, getCustomerReservations, generateQRCodeDataURL, subscribeToReservations, cancelReservation, cleanupOldHistory, clearAllHistory } from '@/lib/api';
import type { Reservation, User } from '@/lib/types';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { useI18n } from '@/lib/i18n';
import { TelegramConnect } from '@/components/TelegramConnect';
import { usePickupReminders } from '@/hooks/usePickupReminders';

export default function MyPicks() {
  const [user, setUser] = useState<User | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQRCode, setShowQRCode] = useState<string | null>(null);
  const [qrCodeData, setQRCodeData] = useState<string>('');
  const [showRating, setShowRating] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [timers, setTimers] = useState<Record<string, string>>({});
  const [showClearHistoryDialog, setShowClearHistoryDialog] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const navigate = useNavigate();
  const { t } = useI18n();
  const { permission, requestPermission, scheduleMultipleReminders, hasPermission } = usePickupReminders();

  useEffect(() => {
    loadUserAndReservations();
    
    // Set up timer updates every second
    const timerInterval = setInterval(updateTimers, 1000);
    
    return () => {
      clearInterval(timerInterval);
    };
  }, []);

  useEffect(() => {
    if (user) {
      // Set up real-time subscription for reservations
      const subscription = subscribeToReservations(user.id, (payload) => {
        console.log('Real-time reservation update:', payload);
        loadReservations();
      });

      return () => {
        if (subscription && typeof subscription.unsubscribe === 'function') {
          subscription.unsubscribe();
        }
      };
    }
  }, [user]);

  const loadUserAndReservations = async () => {
    try {
      setLoading(true);
      const { user: currentUser } = await getCurrentUser();
      
      if (!currentUser) {
        toast.error(t('toast.signInToViewPicks'));
        navigate('/');
        return;
      }

      setUser(currentUser);
      await loadReservations(currentUser.id);
    } catch (error) {
      console.error('Error loading user and reservations:', error);
  toast.error(t('toast.failedLoadPicks'));
    } finally {
      setLoading(false);
    }
  };

  const loadReservations = async (userId?: string) => {
    try {
      const userIdToUse = userId || user?.id;
      if (!userIdToUse) return;

      // Auto-cleanup old history items (10+ days old)
      await cleanupOldHistory(userIdToUse);

      const reservationsData = await getCustomerReservations(userIdToUse);
      setReservations(reservationsData);

      // Schedule pickup reminders for active reservations
      if (hasPermission) {
        scheduleMultipleReminders(reservationsData);
      }
    } catch (error) {
      console.error('Error loading reservations:', error);
  toast.error(t('toast.failedLoadReservations'));
    }
  };

  // Request notification permission and schedule reminders
  const handleEnableReminders = async () => {
    const granted = await requestPermission();
    if (granted) {
      toast.success('Pickup reminders enabled!');
      scheduleMultipleReminders(reservations);
    } else {
      toast.error('Notification permission denied');
    }
  };

  const updateTimers = () => {
    const newTimers: Record<string, string> = {};
    
    reservations.forEach((reservation) => {
      if (reservation.status === 'ACTIVE' && reservation.expires_at) {
        const expiresAt = new Date(reservation.expires_at);
        const now = new Date();
        const timeLeft = expiresAt.getTime() - now.getTime();
        
          if (timeLeft > 0) {
          const hours = Math.floor(timeLeft / (1000 * 60 * 60));
          const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
          
          newTimers[reservation.id] = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
          newTimers[reservation.id] = t('timer.expired');
        }
      }
    });
    
    setTimers(newTimers);
  };

  const handleShowQR = async (reservation: Reservation) => {
    try {
      const qrUrl = await generateQRCodeDataURL(reservation.qr_code);
      setQRCodeData(qrUrl);
      setShowQRCode(reservation.id);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error(t('toast.failedGenerateQr'));
    }
  };

  const handleCancel = async (reservationId: string) => {
  if (!confirm(t('confirm.cancelReservation'))) return;
    
    try {
      await cancelReservation(reservationId);
  toast.success(t('toast.reservationCancelled'));
      loadReservations(); // Refresh the list
    } catch (error) {
      console.error('Error canceling reservation:', error);
  toast.error(t('toast.failedCancelReservation'));
    }
  };

  const handleGetDirections = (reservation: Reservation) => {
    const lat = reservation.partner?.latitude;
    const lng = reservation.partner?.longitude;
    
    if (!lat || !lng) {
      toast.error(t('toast.locationNotAvailable'));
      return;
    }

    // Open in Google Maps
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  const handleRemove = async (reservationId: string) => {
  if (!confirm(t('confirm.removeReservation'))) return;

    try {
      await cancelReservation(reservationId);
  toast.success(t('toast.reservationRemoved'));
      loadReservations(); // Refresh the list
    } catch (error) {
      console.error('Error removing reservation:', error);
  toast.error(t('toast.failedRemoveReservation'));
    }
  };

  const handleClearHistory = async () => {
    if (!user?.id) return;

    try {
      setClearingHistory(true);
      await clearAllHistory(user.id);
      toast.success('History cleared successfully');
      setShowClearHistoryDialog(false);
      loadReservations(); // Refresh the list
    } catch (error) {
      console.error('Error clearing history:', error);
      toast.error('Failed to clear history');
    } finally {
      setClearingHistory(false);
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt).getTime() < new Date().getTime();
  };

  const handleRatePartner = async () => {
    if (!showRating) return;

    try {
      setSubmittingRating(true);
      
      const reservation = reservations.find(r => r.id === showRating);
      if (!reservation) return;

      // Here you would typically save the rating to your database
      // For now, we'll just show a success message
  toast.success(t('toast.ratingThanks'));
      
      setShowRating(null);
      setRating(5);
      setComment('');
    } catch (error) {
      console.error('Error submitting rating:', error);
  toast.error(t('toast.failedSubmitRating'));
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleDownloadReceipt = (reservation: Reservation) => {
    try {
      const doc = new jsPDF();
      
  // Add title
  doc.setFontSize(20);
  doc.text(t('receipt.title'), 20, 30);
      
      // Add reservation details
      doc.setFontSize(12);
  doc.text(`${t('receipt.reservationId')}: ${reservation.id}`, 20, 50);
  doc.text(`${t('receipt.partner')}: ${reservation.partner?.business_name || t('fallback.unknownPartner')}`, 20, 65);
  doc.text(`${t('receipt.item')}: ${reservation.offer?.title || t('fallback.unknown')}`, 20, 80);
  doc.text(`${t('receipt.quantity')}: ${reservation.quantity}`, 20, 95);
  doc.text(`${t('receipt.totalPrice')}: $${reservation.total_price?.toFixed(2) || '0.00'}`, 20, 110);
  doc.text(`${t('receipt.pickupDate')}: ${reservation.picked_up_at ? new Date(reservation.picked_up_at).toLocaleDateString() : 'N/A'}`, 20, 125);
  doc.text(`${t('receipt.status')}: ${reservation.status}`, 20, 140);
      
      // Add partner contact info if available
      if (reservation.partner) {
        doc.text(t('receipt.partnerContact'), 20, 160);
        if (reservation.partner.email) {
          doc.text(`${t('receipt.email')} ${reservation.partner.email}`, 20, 175);
        }
        if (reservation.partner.phone) {
          doc.text(`${t('receipt.phone')} ${reservation.partner.phone}`, 20, 190);
        }
      }
      
      // Save the PDF
  doc.save(`smartpick-receipt-${reservation.id}.pdf`);
  toast.success(t('toast.receiptDownloaded'));
    } catch (error) {
      console.error('Error generating receipt:', error);
      toast.error('Failed to generate receipt');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">{t('status.ACTIVE')}</Badge>;
      case 'PICKED_UP':
        return <Badge className="bg-blue-100 text-blue-800">{t('status.PICKED_UP')}</Badge>;
      case 'EXPIRED':
        return <Badge className="bg-gray-100 text-gray-800">{t('status.EXPIRED')}</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-red-100 text-red-800">{t('status.CANCELLED')}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const activeReservations = reservations.filter(r => r.status === 'ACTIVE');
  const historyReservations = reservations.filter(r => ['PICKED_UP', 'EXPIRED', 'CANCELLED'].includes(r.status));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-mint-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your picks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                className="h-11"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Smart Picks</h1>
                <p className="text-gray-600">Your reservations and pickup history</p>
              </div>
            </div>

            {/* Pickup Reminders Button */}
            {activeReservations.length > 0 && (
              <>
                {!hasPermission ? (
                  <Button
                    variant="outline"
                    size="default"
                    className="h-11 gap-2"
                    onClick={handleEnableReminders}
                  >
                    <Bell className="h-4 w-4" />
                    Enable Pickup Reminders
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                    <Bell className="h-4 w-4" />
                    <span className="font-medium">Reminders Active</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">
              Active Picks ({activeReservations.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              History ({historyReservations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeReservations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No Active Picks
                  </h3>
                  <p className="text-gray-600 mb-6 text-center">
                    You don't have any active reservations. Browse offers to make your first pick!
                  </p>
                  <Button onClick={() => navigate('/')} className="bg-mint-600 hover:bg-mint-700">
                    Browse Offers
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeReservations.map((reservation) => (
                  <Card 
                    key={reservation.id} 
                    className="relative cursor-pointer transition-all hover:shadow-md active:scale-[0.99]"
                    onClick={() => navigate(`/reservation/${reservation.id}`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {reservation.offer?.images?.[0] && (
                            <img
                              src={resolveOfferImageUrl(reservation.offer.images[0])}
                              alt={reservation.offer.title}
                              className="w-12 h-12 rounded-lg object-cover"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg'; }}
                            />
                          )}
                          <div>
                            <CardTitle className="text-lg">
                              {reservation.offer?.title || 'Unknown Item'}
                            </CardTitle>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="link" className="p-0 h-auto text-sm text-gray-600 hover:text-mint-600">
                                  {reservation.partner?.business_name || 'Unknown Partner'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <div className="space-y-3">
                                  <h4 className="font-semibold">{reservation.partner?.business_name}</h4>
                                  {reservation.partner?.address && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                      <MapPin className="h-4 w-4" />
                                      {reservation.partner.address}
                                    </div>
                                  )}
                                  {reservation.partner?.phone && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                      <Phone className="h-4 w-4" />
                                      {reservation.partner.phone}
                                    </div>
                                  )}
                                  {reservation.partner?.email && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                      <Mail className="h-4 w-4" />
                                      {reservation.partner.email}
                                    </div>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                        {getStatusBadge(reservation.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Quantity:</span>
                          <p className="font-medium">{reservation.quantity}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Total:</span>
                          <p className="font-medium">{formatPrice(reservation.total_price || 0)}</p>
                        </div>
                      </div>
                      
                      {timers[reservation.id] && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm font-medium text-yellow-800">
                              Time remaining: {timers[reservation.id]}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 flex-wrap">
                        {timers[reservation.id] && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 w-full">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-yellow-600" />
                              <span className="text-sm font-medium text-yellow-800">
                                Time remaining: {timers[reservation.id]}
                              </span>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShowQR(reservation);
                            }}
                            className="h-11 bg-mint-600 hover:bg-mint-700 flex-1 sm:flex-none"
                          >
                            <QrCode className="h-4 w-4 mr-2" />
                            Show QR
                          </Button>
                          {reservation.status === 'ACTIVE' && (
                            <>
                              <Button
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancel(reservation.id);
                                }}
                                className="h-11 flex-1 sm:flex-none"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancel
                              </Button>
                              <Button
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleGetDirections(reservation);
                                }}
                                className="h-11 flex-1 sm:flex-none"
                              >
                                <MapPin className="h-4 w-4 mr-2" />
                                Get Directions
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {historyReservations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No History Yet
                  </h3>
                  <p className="text-gray-600 text-center">
                    Your pickup history will appear here once you start using SmartPick.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex justify-end mb-4">
                  <Button
                    variant="destructive"
                    onClick={() => setShowClearHistoryDialog(true)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Clear All History
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {historyReservations.map((reservation) => (
                  <Card 
                    key={reservation.id} 
                    className="relative cursor-pointer transition-all hover:shadow-md active:scale-[0.99]"
                    onClick={() => navigate(`/reservation/${reservation.id}`)}
                  >
                    <CardHeader className="pb-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2 hover:bg-red-50 text-red-600 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(reservation.id);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {reservation.offer?.images?.[0] && (
                            <img
                              src={resolveOfferImageUrl(reservation.offer.images[0])}
                              alt={reservation.offer.title}
                              className="w-12 h-12 rounded-lg object-cover"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg'; }}
                            />
                          )}
                          <div>
                            <CardTitle className="text-lg">
                              {reservation.offer?.title || 'Unknown Item'}
                            </CardTitle>
                            <CardDescription>
                              {reservation.partner?.business_name || 'Unknown Partner'}
                            </CardDescription>
                          </div>
                        </div>
                        {getStatusBadge(reservation.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Quantity:</span>
                          <p className="font-medium">{reservation.quantity}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Total:</span>
                          <p className="font-medium">{formatPrice(reservation.total_price || 0)}</p>
                        </div>
                      </div>
                      
                      {reservation.picked_up_at && (
                        <div className="text-sm">
                          <span className="text-gray-500">Picked up:</span>
                          <p className="font-medium">{formatDateTime(reservation.picked_up_at)}</p>
                        </div>
                      )}

                      <div className="flex gap-2 flex-wrap">
                        {reservation.status === 'PICKED_UP' && (
                          <>
                            <Button
                              variant="outline"
                              onClick={() => setShowRating(reservation.id)}
                              className="h-11 flex-1 sm:flex-none"
                            >
                              <Star className="h-4 w-4 mr-2" />
                              Rate
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleDownloadReceipt(reservation)}
                              className="h-11 flex-1 sm:flex-none"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Receipt
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Notification Settings */}
        {user && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📲 Notification Settings
              </CardTitle>
              <CardDescription>
                Get instant Telegram notifications about your orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TelegramConnect userId={user.id} userType="customer" />
            </CardContent>
          </Card>
        )}
      </div>

      {/* QR Code Dialog */}
      <Dialog open={!!showQRCode} onOpenChange={() => setShowQRCode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code for Pickup</DialogTitle>
            <DialogDescription>
              Show this QR code to the partner for quick pickup verification.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-6">
            {qrCodeData && (
              <img src={qrCodeData} alt="QR Code" className="w-64 h-64" />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Rating Dialog */}
      <Dialog open={!!showRating} onOpenChange={() => setShowRating(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rate Your Experience</DialogTitle>
            <DialogDescription>
              How was your experience with this partner?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Rating</label>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`p-1 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                  >
                    <Star className="h-6 w-6 fill-current" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Comment (Optional)</label>
              <Textarea
                placeholder="Share your experience..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="mt-2"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowRating(null)}
                className="h-11 flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRatePartner}
                disabled={submittingRating}
                className="h-11 flex-1 bg-mint-600 hover:bg-mint-700"
              >
                {submittingRating ? 'Submitting...' : 'Submit Rating'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear History Confirmation Dialog */}
      <Dialog open={showClearHistoryDialog} onOpenChange={setShowClearHistoryDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clear All History?</DialogTitle>
            <DialogDescription>
              This will permanently delete all your picked up, expired, and cancelled reservations from your history.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowClearHistoryDialog(false)}
              className="h-11 flex-1"
              disabled={clearingHistory}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearHistory}
              disabled={clearingHistory}
              className="h-11 flex-1 bg-red-600 hover:bg-red-700"
            >
              {clearingHistory ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Clearing...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Clear History
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
