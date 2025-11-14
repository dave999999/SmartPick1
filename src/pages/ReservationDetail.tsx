import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Reservation } from '@/lib/types';
import { getCustomerReservations, userCancelReservationWithSplit, generateQRCodeDataURL, getCurrentUser } from '@/lib/api';
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

      const reservations = await getCustomerReservations(user.id);
      const found = reservations.find(r => r.id === id);
      
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
      loadReservation();
    }, 3000); // Poll every 3 seconds

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

  // Status color mapping
  const statusColorMap: Record<string, string> = {
    'ACTIVE': 'bg-green-600',
    'PICKED_UP': 'bg-gray-600',
    'EXPIRED': 'bg-red-600',
    'CANCELLED': 'bg-orange-500',
    'FAILED_PICKUP': 'bg-red-700'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <Button variant="ghost" onClick={() => navigate('/my-picks')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('button.backToMyPicks')}
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-2xl">
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg sm:text-xl mb-1">{reservation.offer?.title}</CardTitle>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-700">{reservation.partner?.business_name}</p>
                  {partnerAddress && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {partnerAddress}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <Badge className={`${statusColorMap[reservation.status] || 'bg-gray-400'} text-white text-xs`}>
                  {reservation.status}
                </Badge>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{Number(reservation.total_price).toFixed(2)} GEL</p>
                  <p className="text-xs text-gray-500">{reservation.quantity} × {(Number(reservation.total_price) / reservation.quantity).toFixed(2)} GEL</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 sm:space-y-6">
            {/* HERO: Status Badge + Countdown - Priority #1 */}
            {reservation.status === 'ACTIVE' && (
              <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-mint-50 rounded-xl p-5 border-2 border-green-200 shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>
                      <CheckCircle className="relative h-8 w-8 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-green-800">Ready to Pickup!</h3>
                      <p className="text-xs text-green-600 font-mono">ID: {reservation.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                  </div>
                </div>
                <CountdownBar expiresAt={reservation.expires_at} />
                <p className="text-xs text-green-700 text-center mt-2">
                  Expires: {new Date(reservation.expires_at).toLocaleString('en-GB', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    day: '2-digit',
                    month: 'short'
                  })}
                </p>
              </div>
            )}

            {/* PICKED_UP Status - Show completion message */}
            {reservation.status === 'PICKED_UP' && (
              <div className="bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 rounded-xl p-5 border-2 border-gray-300 shadow-md">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <CheckCircle className="h-10 w-10 text-gray-600" />
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-gray-800">Order Completed!</h3>
                    <p className="text-sm text-gray-600 mt-1">Successfully picked up</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 font-mono">ID: {reservation.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Picked up at: {reservation.picked_up_at ? new Date(reservation.picked_up_at).toLocaleString('en-GB') : 'Just now'}
                  </p>
                </div>
              </div>
            )}

            {/* Payment Information - Critical for new users */}
            {reservation.status === 'ACTIVE' && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-blue-900 mb-1.5 flex items-center gap-2">
                      💳 Payment at Pickup
                    </h4>
                    <p className="text-sm text-blue-800 mb-2">
                      Pay <span className="font-bold text-lg text-green-600">{Number(reservation.total_price).toFixed(2)} GEL</span>
                      {' '}(reserved price) when you collect your order
                    </p>
                    {reservation.offer?.original_price && (
                      <div className="flex items-center gap-2 text-xs text-blue-700">
                        <span className="line-through text-gray-500">
                          {Number(reservation.offer.original_price * reservation.quantity).toFixed(2)} GEL original
                        </span>
                        <Badge className="bg-green-500 text-white text-xs">
                          You save {(Number(reservation.offer.original_price * reservation.quantity) - Number(reservation.total_price)).toFixed(2)} GEL
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Map with Enhanced Navigation - Priority Position #2 */}
            {reservation.partner?.latitude && reservation.partner?.longitude && (
              <div className="rounded-xl overflow-hidden shadow-lg border-2 border-gray-200">
                <div 
                  className="h-64 sm:h-72 w-full cursor-pointer relative group"
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
                    {routePoints.length > 1 ? (
                      <Polyline 
                        positions={routePoints} 
                        pathOptions={{ 
                          color: '#2563eb', 
                          weight: 4,
                          opacity: 0.8,
                          dashArray: '10, 5',
                          className: 'animate-pulse'
                        }} 
                      />
                    ) : userLocation ? (
                      <Polyline 
                        positions={[userLocation, [reservation.partner.latitude, reservation.partner.longitude]]} 
                        pathOptions={{ 
                          color: '#2563eb', 
                          weight: 4,
                          opacity: 0.7,
                          dashArray: '10, 5'
                        }} 
                      />
                    ) : null}
                  </MapContainer>
                </div>
                {(distanceKm !== null || etaMinutes !== null) && (
                  <div className="px-4 py-2 text-sm border-t bg-gradient-to-r from-blue-50 to-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                      <span className="text-gray-700 font-medium">Live tracking</span>
                    </div>
                    <div className="text-gray-700">
                      {distanceKm !== null && <span className="font-semibold">{distanceKm.toFixed(1)} km</span>}
                      {distanceKm !== null && etaMinutes !== null && <span className="mx-1">•</span>}
                      {etaMinutes !== null && <span className="font-semibold">{etaMinutes} min</span>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* HERO: Large QR Code with 3-Step Guide */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 border-2 border-gray-200 shadow-lg">
              <div className="flex flex-col items-center">
                {/* Large QR Code */}
                <div 
                  onClick={() => setQrModalOpen(true)}
                  className="relative w-40 h-40 sm:w-48 sm:h-48 cursor-pointer group mb-5"
                >
                  <div className="absolute inset-0 bg-mint-500/20 rounded-2xl animate-pulse"></div>
                  <div className="relative w-full h-full bg-white rounded-2xl p-3 shadow-xl border-4 border-mint-200 group-hover:border-mint-400 transition-all group-hover:scale-105">
                    <img src={qrCodeUrl} className="w-full h-full object-contain" alt="QR Code" />
                  </div>
                  <div className="absolute -top-2 -right-2 bg-mint-500 text-white rounded-full p-2 shadow-lg">
                    <Eye className="h-4 w-4" />
                  </div>
                </div>

                {/* 3-Step Visual Guide */}
                <div className="w-full space-y-3 mb-4">
                  <h4 className="text-center font-bold text-gray-800 mb-3">How to Claim Your Order</h4>
                  
                  <div className="flex items-center gap-3 bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
                    <div className="flex items-center gap-2 flex-1">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-800">Arrive at partner location</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-purple-50 rounded-lg p-3 border border-purple-200">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
                    <div className="flex items-center gap-2 flex-1">
                      <QrCode className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-gray-800">Show this QR code to staff</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-green-50 rounded-lg p-3 border border-green-200">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CreditCard className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-gray-800">Pay reserved price & receive order</span>
                      </div>
                      <p className="text-xs text-green-700 font-semibold ml-6">
                        💰 Pay only {Number(reservation.total_price).toFixed(2)} GEL at pickup
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>



            {/* Actions */}
            {reservation.status === 'ACTIVE' && (
              <Button
                variant="outline"
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
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
            <img src={qrCodeUrl} className="w-full h-full object-contain rounded" alt="QR Code" />
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
