import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Reservation } from '@/lib/types';
import { getCustomerReservations, userCancelReservationWithSplit, generateQRCodeDataURL, getCurrentUser } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, X } from 'lucide-react';
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
import QRCodeModal from '@/components/reservations/QRCodeModal';
import CountdownBar from '@/components/reservations/CountdownBar';
import PartnerBlock from '@/components/reservations/PartnerBlock';
import PenaltyModal from '@/components/PenaltyModal';

export default function ReservationDetail() {
  const { id } = useParams<{ id: string }>();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const navigate = useNavigate();
  const { t } = useI18n();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [routeProfile, setRouteProfile] = useState<'driving' | 'walking' | 'cycling'>('driving');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [penaltyModalOpen, setPenaltyModalOpen] = useState(false);
  const [userPenaltyInfo, setUserPenaltyInfo] = useState<{penaltyCount: number; penaltyUntil: string | null; isBanned: boolean}>({penaltyCount: 0, penaltyUntil: null, isBanned: false});

  const loadReservation = async () => {
    try {
      const { user } = await getCurrentUser();
      if (!user) {
        navigate('/');
        return;
      }

      setIsAdmin(user.role === 'ADMIN');
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
  // Hide partner contact info from UI (new design)
  // No phone/email on this page per new design
  const partnerPhone = '';
  const partnerEmail = '';
  
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
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl sm:text-2xl">{reservation.offer?.title}</CardTitle>
                <CardDescription className="text-sm sm:text-base">{reservation.partner?.business_name}</CardDescription>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge className={`${statusColorMap[reservation.status] || 'bg-gray-400'} text-white`}>{reservation.status}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 sm:space-y-6">
            {/* Map preview in rounded container - FIRST */}
            {reservation.partner?.latitude && reservation.partner?.longitude && (
              <div className="rounded-xl overflow-hidden shadow border">
                {/* Route profile toggle */}
                <div className="px-3 sm:px-4 py-2.5 border-b bg-gray-50">
                  <div className="grid grid-cols-3 gap-1 rounded-md overflow-hidden">
                    {(['driving','walking','cycling'] as const).map(p => (
                      <button
                        key={p}
                        className={`${routeProfile===p ? 'bg-white border border-gray-300' : 'bg-gray-100 border border-transparent'} px-3 py-2 text-sm`}
                        onClick={() => setRouteProfile(p)}
                      >{p.charAt(0).toUpperCase()+p.slice(1)}</button>
                    ))}
                  </div>
                </div>
                <div className="h-64 sm:h-72 w-full">
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

            {/* Get Directions button */}
            {partnerLat && partnerLng && (
              <Button variant="outline" className="w-full" onClick={() => {
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${partnerLat},${partnerLng}`, '_blank');
              }}>
                {t('button.getDirections')}
              </Button>
            )}

            {/* Product details and QR code in one section */}
            <div className="border rounded-xl p-4 sm:p-5 bg-white shadow-sm">
              {/* Partner/Product block */}
              <PartnerBlock
                partnerName={reservation.partner?.business_name || ''}
                productImage={(reservation.offer as any)?.image_url}
                price={Number(reservation.total_price) || 0}
                quantity={reservation.quantity}
              />

              {/* QR code - smaller, clickable */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-start gap-4">
                  <div 
                    onClick={() => setQrModalOpen(true)}
                    className="flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 cursor-pointer hover:opacity-80 transition"
                  >
                    <img src={qrCodeUrl} className="w-full h-full object-contain border rounded" alt="QR Code" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-700 mb-1">Scan to pickup</div>
                    <div className="text-xs text-gray-500 font-mono break-all mb-2">{reservation.qr_code}</div>
                    <CountdownBar expiresAt={reservation.expires_at} />
                  </div>
                </div>
                <p className="mt-3 text-center text-xs sm:text-sm text-gray-600">Show this QR code when you arrive at the location.</p>
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
    </div>
  );
}
