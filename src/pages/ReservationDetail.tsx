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

  // Get partner address and contact - support both flat and nested structures
  const partnerAddress = reservation.partner?.address || reservation.partner?.location?.address || '';

  // Get partner coordinates for directions
  const partnerLat = reservation.partner?.latitude || reservation.partner?.location?.latitude;
  const partnerLng = reservation.partner?.longitude || reservation.partner?.location?.longitude;

  return (
    <div className="min-h-screen bg-gray-50 safe-area-top">
      <div className="container mx-auto px-4 py-4 max-w-2xl">
        <Card className="shadow-md relative">
          {/* Back Button - Top Left Corner */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/my-picks')}
            className="absolute -top-1 -left-1 z-10 hover:bg-gray-200/80 rounded-full bg-white/90 shadow-sm"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </Button>

          <CardContent className="pt-4 space-y-3">
            {/* HERO: Status Badge + Countdown - Compact */}
            {reservation.status === 'ACTIVE' && (
              <div className="bg-gradient-to-br from-green-50 to-mint-50 rounded-lg p-3 border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <div>
                      <h3 className="text-sm font-bold text-green-800">Ready to Pickup!</h3>
                      <p className="text-xs text-green-600 font-mono">ID: {reservation.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                  </div>
                </div>
                <CountdownBar expiresAt={reservation.expires_at} />
                <p className="text-xs text-green-700 text-center mt-1">
                  Expires: {new Date(reservation.expires_at).toLocaleString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: 'short'
                  })}
                </p>
              </div>
            )}

            {/* PICKED_UP Status - Compact */}
            {reservation.status === 'PICKED_UP' && (
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-300">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-6 w-6 text-gray-600" />
                  <h3 className="text-sm font-bold text-gray-800">Order Completed!</h3>
                </div>
                <p className="text-xs text-gray-500">
                  Picked up at: {reservation.picked_up_at ? new Date(reservation.picked_up_at).toLocaleString('en-GB') : 'Just now'}
                </p>
              </div>
            )}

            {/* HERO: Large QR Code with Compact 3-Step Guide - QR FIRST! */}
            {reservation.status === 'ACTIVE' && (
              <div className="bg-gradient-to-br from-white to-mint-50/30 rounded-lg p-4 border border-mint-200">
                <div className="flex flex-col items-center">
                  {/* Large QR Code */}
                  <div
                    onClick={() => setQrModalOpen(true)}
                    className="relative w-48 h-48 cursor-pointer group mb-4"
                  >
                    <div className="absolute inset-0 bg-mint-500/10 rounded-xl"></div>
                    <div className="relative w-full h-full bg-white rounded-xl p-2 shadow-lg border-2 border-mint-300 group-hover:border-mint-500 transition-all">
                      {qrCodeUrl ? (
                        <img src={qrCodeUrl} className="w-full h-full object-contain" alt="QR Code" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">Loading...</div>
                      )}
                    </div>
                    <div className="absolute -top-1 -right-1 bg-mint-500 text-white rounded-full p-1.5">
                      <Eye className="h-3 w-3" />
                    </div>
                  </div>

                  {/* Compact 3-Step Guide */}
                  <h4 className="text-sm font-bold text-gray-800 mb-2">How to Claim Your Order</h4>

                  <div className="w-full space-y-2">
                    <div className="flex items-center gap-2 bg-blue-50 rounded-lg p-2 border border-blue-200">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xs">1</div>
                      <MapPin className="h-3.5 w-3.5 text-blue-600" />
                      <span className="text-xs font-medium text-gray-800">Arrive at partner location</span>
                    </div>

                    <div className="flex items-center gap-2 bg-purple-50 rounded-lg p-2 border border-purple-200">
                      <div className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-xs">2</div>
                      <QrCode className="h-3.5 w-3.5 text-purple-600" />
                      <span className="text-xs font-medium text-gray-800">Show this QR code to staff</span>
                    </div>

                    <div className="flex items-center gap-2 bg-green-50 rounded-lg p-2 border border-green-200">
                      <div className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-xs">3</div>
                      <CreditCard className="h-3.5 w-3.5 text-green-600" />
                      <div className="flex-1">
                        <span className="text-xs font-medium text-gray-800 block">Pay {Number(reservation.total_price).toFixed(2)} GEL & collect</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Compact Map Preview */}
            {reservation.partner?.latitude && reservation.partner?.longitude && (
              <div className="rounded-lg overflow-hidden border border-gray-200">
                <div
                  className="h-40 w-full cursor-pointer relative"
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
                          weight: 3,
                          opacity: 0.7,
                          dashArray: '5, 3'
                        }}
                      />
                    )}
                  </MapContainer>
                </div>
                {(distanceKm !== null || etaMinutes !== null) && (
                  <div className="px-3 py-1.5 text-xs bg-blue-50 flex items-center justify-between border-t">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                      <span className="text-gray-700 font-medium">Live tracking</span>
                    </div>
                    <div className="text-gray-700 font-semibold">
                      {distanceKm !== null && <span>{distanceKm.toFixed(1)} km</span>}
                      {distanceKm !== null && etaMinutes !== null && <span className="mx-1">•</span>}
                      {etaMinutes !== null && <span>{etaMinutes} min</span>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cancel Button - Only for ACTIVE reservations */}
            {reservation.status === 'ACTIVE' && (
              <Button
                variant="outline"
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                onClick={handleCancel}
              >
                {t('button.cancelReservation')}
              </Button>
            )}

          </CardContent>
        </Card>
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
