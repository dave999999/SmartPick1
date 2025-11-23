import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Reservation } from '@/lib/types';
import { getReservationById, userCancelReservationWithSplit, generateQRCodeDataURL, getCurrentUser } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, X, MapPin, QrCode, CheckCircle, CreditCard, Eye } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { logger } from '@/lib/logger';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import { supabase } from '@/lib/supabase';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon paths (prevent broken markers)
// Re-use pattern already present in other map components
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
});

// New compact UI components
import CountdownBar from '@/components/reservations/CountdownBar';
import PenaltyModal from '@/components/PenaltyModal';
import PickupSuccessModal from '@/components/PickupSuccessModal';

export default function ReservationDetail() {
  const { id } = useParams<{ id: string }>();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const navigate = useNavigate();
  const { t } = useI18n();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [routeProfile] = useState<'driving' | 'walking' | 'cycling'>('driving');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [penaltyModalOpen, setPenaltyModalOpen] = useState(false);
  const [userPenaltyInfo, setUserPenaltyInfo] = useState<{penaltyCount: number; penaltyUntil: string | null; isBanned: boolean}>({penaltyCount: 0, penaltyUntil: null, isBanned: false});
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [savedAmount, setSavedAmount] = useState(0);
  const [pointsEarned, setPointsEarned] = useState(0);

  const loadReservation = async () => {
    try {
      const { user } = await getCurrentUser();
      if (!user) {
        navigate('/');
        return;
      }

      if (!id) {
        toast.error(t('toast.reservationNotFound'));
        navigate('/my-picks');
        return;
      }

      let found = await getReservationById(id);
      
      // Retry once after a short delay if not found (race condition with RLS)
      if (!found) {
        logger.warn(`Reservation ${id} not found on first attempt, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 500));
        found = await getReservationById(id);
      }
      
      if (!found) {
        toast.error(t('toast.reservationNotFound'));
        navigate('/my-picks');
        return;
      }

      setReservation(found);
      const qrUrl = await generateQRCodeDataURL(found.qr_code);
      setQrCodeUrl(qrUrl);

      // Check if reservation failed and user has penalty
      if (found.status === 'FAILED_PICKUP' || (found.status === 'ACTIVE' && new Date(found.expires_at) < new Date())) {
        // Fetch user penalty info
        const { data: userData } = await supabase
          .from('users')
          .select('penalty_count, penalty_until, is_banned')
          .eq('id', user.id)
          .single();
        
        if (userData) {
          setUserPenaltyInfo({
            penaltyCount: userData.penalty_count || 0,
            penaltyUntil: userData.penalty_until,
            isBanned: userData.is_banned || false
          });
          setPenaltyModalOpen(true);
        }
      }
    } catch (error) {
      logger.error('Error loading reservation:', error);
      toast.error(t('toast.failedLoadReservation'));
    }
  };

  useEffect(() => {
    loadReservation();
  }, [id]);

  // Real-time subscription to reservation status changes
  useEffect(() => {
    if (!id) return;

    console.log('🔔 Setting up real-time subscription for reservation:', id);

    const channel = supabase
      .channel(`reservation-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reservations',
          filter: `id=eq.${id}`
        },
        (payload) => {
          console.log('🚨 REAL-TIME UPDATE RECEIVED:', payload);
          logger.info('Reservation updated:', payload);
          
          // Immediately update the local state with the new data
          if (payload.new) {
            console.log('📦 Updating reservation with new data:', payload.new);
            loadReservation();
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to reservation updates');
        }
      });

    return () => {
      console.log('🔌 Cleaning up subscription for reservation:', id);
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Polling fallback: Check for status updates every 3 seconds when ACTIVE
  useEffect(() => {
    if (!reservation || reservation.status !== 'ACTIVE') return;

    console.log('🔄 Starting polling for reservation status updates');
    const pollInterval = setInterval(() => {
      console.log('🔍 Polling for reservation updates...');
      loadReservation().catch(err => {
        // Silently handle polling errors to avoid console spam
        logger.debug('Polling error (expected if CORS issue):', err);
      });
    }, 5000); // Poll every 5 seconds (reduced frequency)

    return () => {
      console.log('⏹️ Stopping polling');
      clearInterval(pollInterval);
    };
  }, [reservation?.status]);

  // Detect when order is picked up and show success modal
  useEffect(() => {
    if (reservation && reservation.status === 'PICKED_UP') {
      console.log('🎉 Order picked up detected! Status:', reservation.status);
      const celebrationKey = `pickup-celebrated-${reservation.id}`;
      const alreadyCelebrated = localStorage.getItem(celebrationKey);
      
      if (!alreadyCelebrated) {
        console.log('🎊 Showing celebration modal for the first time');
        // Calculate savings
        const originalPrice = reservation.offer?.original_price || 0;
        const smartPrice = reservation.total_price;
        const saved = (originalPrice * reservation.quantity) - Number(smartPrice);
        setSavedAmount(saved);
        
        // Don't show points earned (user spent points on this order)
        setPointsEarned(0);
        
        // Show modal
        setSuccessModalOpen(true);
        
        // Mark as celebrated
        localStorage.setItem(celebrationKey, 'true');
      } else {
        console.log('✨ Celebration already shown for this reservation');
      }
    }
  }, [reservation]);

  // Watch user location for live map updates
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    let watchId: number | null = null;
    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserLocation([latitude, longitude]);
        },
        (err) => {
          logger.warn('Geolocation error', err);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      ) as unknown as number;
    } catch (e) {
      logger.warn('Geolocation not available', e);
    }
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, []);
  // No page-level countdown anymore; handled inside CountdownBar

  // Fetch route via Edge Function proxy when user or partner moves
  useEffect(() => {
    const partnerLat = reservation?.partner?.latitude || reservation?.partner?.location?.latitude;
    const partnerLng = reservation?.partner?.longitude || reservation?.partner?.location?.longitude;
    if (!reservation || !userLocation || !partnerLat || !partnerLng) return;

    let cancelled = false;
    const fetchRoute = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('route-proxy', {
          body: {
            from: { lat: userLocation[0], lng: userLocation[1] },
            to: { lat: partnerLat, lng: partnerLng },
            profile: routeProfile
          }
        }).catch(err => {
          // Silently catch CORS errors in production
          logger.warn('Route proxy unavailable, using straight line');
          return { data: null, error: err };
        });
        if (error) throw error;
        const coords = (data?.coordinates || []).map((c: [number, number]) => [c[1], c[0]] as [number, number]);
        if (!cancelled) {
          setRoutePoints(coords);
          setDistanceKm(data?.distance ? data.distance / 1000 : null);
          setEtaMinutes(data?.duration ? Math.round(data.duration / 60) : null);
        }
      } catch (e) {
        logger.warn('Route fetch failed (proxy). Falling back to straight line.', e);
        if (!cancelled) {
          setRoutePoints([]);
          setDistanceKm(null);
          setEtaMinutes(null);
        }
      }
    };
    fetchRoute();
    return () => { cancelled = true; };
  }, [userLocation, reservation, routeProfile]);

  const handleCancel = async () => {
    if (!reservation) return;
    if (!confirm(t('confirm.cancelReservationSplit'))) return;

    try {
      const result = await userCancelReservationWithSplit(reservation.id);
      if (result.success) {
        toast.success(result.message || t('toast.reservationCancelled'));
        navigate('/my-picks');
      } else {
        toast.error(t('toast.failedCancelReservation'));
      }
    } catch (error) {
      logger.error('Error cancelling reservation:', error);
      toast.error(t('toast.failedCancelReservation'));
    }
  };

  if (!reservation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">{t('offer.loading')}</p>
      </div>
    );
  }

  // Check if reservation data is complete (offer and partner must exist)
  if (!reservation.offer || !reservation.partner) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Incomplete Reservation Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">
              {!reservation.offer && !reservation.partner && "Offer and partner information is missing."}
              {!reservation.offer && reservation.partner && "Offer information is missing."}
              {reservation.offer && !reservation.partner && "Partner information is missing."}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              This is a temporary issue. Please try refreshing the page in a few seconds.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => loadReservation()} className="flex-1">
                Retry
              </Button>
              <Button variant="outline" onClick={() => navigate('/my-picks')} className="flex-1">
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get partner address and contact - support both flat and nested structures
  const partnerAddress = reservation.partner?.address || reservation.partner?.location?.address || '';

  // Get partner coordinates for directions
  const partnerLat = reservation.partner?.latitude || reservation.partner?.location?.latitude;
  const partnerLng = reservation.partner?.longitude || reservation.partner?.location?.longitude;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-gray-50 to-white">
      {/* Header with Back Button */}
      <div className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-3 max-w-2xl">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/my-picks')}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Your Reservation</h1>
              <p className="text-xs text-gray-500 font-mono">#{reservation.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
        {/* Status Card */}
        {reservation.status === 'ACTIVE' && (
          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-500 rounded-full">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-green-900">Ready to Pickup!</h3>
                  <p className="text-sm text-green-700">Your order is waiting for you</p>
                </div>
              </div>
              <CountdownBar expiresAt={reservation.expires_at} />
              <p className="text-xs text-green-700 text-center mt-2">
                Valid until {new Date(reservation.expires_at).toLocaleString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
            </CardContent>
          </Card>
        )}

        {reservation.status === 'PICKED_UP' && (
          <Card className="border-gray-200 bg-gradient-to-br from-gray-50 to-slate-50 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-500 rounded-full">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Order Completed!</h3>
                  <p className="text-sm text-gray-600">
                    Picked up {reservation.picked_up_at ? new Date(reservation.picked_up_at).toLocaleString('en-GB') : 'recently'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* QR Code Card */}
        {reservation.status === 'ACTIVE' && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <QrCode className="h-5 w-5 text-mint-600" />
                Your QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* QR Code Display */}
              <div className="flex justify-center">
                <div
                  onClick={() => setQrModalOpen(true)}
                  className="relative cursor-pointer group"
                >
                  <div className="w-64 h-64 bg-white rounded-2xl p-4 border-2 border-gray-200 group-hover:border-mint-500 transition-all shadow-lg group-hover:shadow-xl">
                    {qrCodeUrl ? (
                      <img src={qrCodeUrl} className="w-full h-full object-contain" alt="QR Code" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mint-500 mx-auto mb-2"></div>
                          <p className="text-sm">Loading...</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="absolute -top-2 -right-2 bg-mint-500 text-white rounded-full p-2 shadow-lg">
                    <Eye className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 text-center">How to Claim Your Order</h4>
                
                <div className="space-y-2">
                  <div className="flex items-start gap-3 bg-blue-50 rounded-xl p-3 border border-blue-100">
                    <div className="flex-shrink-0 w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm mt-0.5">1</div>
                    <div className="flex-1 pt-0.5">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-semibold text-gray-900">Go to partner</span>
                      </div>
                      <p className="text-xs text-gray-600">Navigate to {reservation.partner?.business_name}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-purple-50 rounded-xl p-3 border border-purple-100">
                    <div className="flex-shrink-0 w-7 h-7 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-sm mt-0.5">2</div>
                    <div className="flex-1 pt-0.5">
                      <div className="flex items-center gap-2 mb-1">
                        <QrCode className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-semibold text-gray-900">Show QR code</span>
                      </div>
                      <p className="text-xs text-gray-600">Present this code to staff at checkout</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-green-50 rounded-xl p-3 border border-green-100">
                    <div className="flex-shrink-0 w-7 h-7 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm mt-0.5">3</div>
                    <div className="flex-1 pt-0.5">
                      <div className="flex items-center gap-2 mb-1">
                        <CreditCard className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-semibold text-gray-900">Pay & collect</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Pay <span className="font-bold text-green-700">{Number(reservation.total_price).toFixed(2)} GEL</span> and enjoy your order
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Location Map Card */}
        {reservation.partner?.latitude && reservation.partner?.longitude && (
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-mint-600" />
                  Location
                </div>
                {(distanceKm !== null || etaMinutes !== null) && (
                  <div className="flex items-center gap-2 text-sm font-normal">
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                    <span className="text-blue-600 font-semibold">
                      {distanceKm !== null && <span>{distanceKm.toFixed(1)} km</span>}
                      {distanceKm !== null && etaMinutes !== null && <span className="mx-1">•</span>}
                      {etaMinutes !== null && <span>{etaMinutes} min</span>}
                    </span>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div
                className="h-64 w-full cursor-pointer relative group"
                onClick={() => {
                  if (partnerLat && partnerLng) {
                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${partnerLat},${partnerLng}`, '_blank');
                  }
                }}
              >
                <MapContainer
                  center={[reservation.partner.latitude, reservation.partner.longitude]}
                  zoom={15}
                  scrollWheelZoom={false}
                  className="h-full w-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[reservation.partner.latitude, reservation.partner.longitude]} />
                  {userLocation && <Marker position={userLocation} />}
                  {routePoints.length > 1 && (
                    <Polyline
                      positions={routePoints}
                      pathOptions={{
                        color: '#2563eb',
                        weight: 4,
                        opacity: 0.8
                      }}
                    />
                  )}
                </MapContainer>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none"></div>
              </div>
              
              {/* Partner Info */}
              <div className="p-4 bg-gray-50 border-t">
                <h4 className="font-semibold text-gray-900 mb-1">{reservation.partner?.business_name}</h4>
                <p className="text-sm text-gray-600 mb-3">{partnerAddress}</p>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    if (partnerLat && partnerLng) {
                      window.open(`https://www.google.com/maps/dir/?api=1&destination=${partnerLat},${partnerLng}`, '_blank');
                    }
                  }}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Get Directions
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cancel Button - Only for ACTIVE reservations */}
        {reservation.status === 'ACTIVE' && (
          <Button
            variant="outline"
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300 h-12 font-medium"
            onClick={handleCancel}
          >
            <X className="h-4 w-4 mr-2" />
            {t('button.cancelReservation')}
          </Button>
        )}
      </div>

      {/* QR modal - outside main container for proper z-index */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setQrModalOpen(false)}>
          <div className="relative bg-white rounded-xl p-3 sm:p-4 max-w-xs sm:max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setQrModalOpen(false)}
              className="absolute top-2 right-2 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"
              aria-label="Close"
            >
              <X size={20} />
            </button>
            {qrCodeUrl ? (
              <img src={qrCodeUrl} className="w-full h-full object-contain rounded" alt="QR Code" />
            ) : (
              <div className="w-full h-64 flex items-center justify-center text-gray-400">Loading QR Code...</div>
            )}
          </div>
        </div>
      )}

      {/* Penalty Modal */}
      <PenaltyModal 
        open={penaltyModalOpen}
        onClose={() => setPenaltyModalOpen(false)}
        penaltyCount={userPenaltyInfo.penaltyCount}
        penaltyUntil={userPenaltyInfo.penaltyUntil}
        isBanned={userPenaltyInfo.isBanned}
      />

      {/* Pickup Success Celebration Modal */}
      <PickupSuccessModal
        open={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        savedAmount={savedAmount}
        pointsEarned={pointsEarned}
        newAchievements={[
          // TODO: Fetch from gamification system
          // Example achievements:
          // { id: '1', title: 'First Pickup', description: 'Complete your first order', icon: '🏆', points: 50 },
          // { id: '2', title: 'Weekend Warrior', description: 'Order on a weekend', icon: '🎯', points: 25 }
        ]}
        availableRewardsCount={0} // TODO: Fetch from rewards system
      />
    </div>
  );
}
