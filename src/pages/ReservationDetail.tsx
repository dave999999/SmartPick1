import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Reservation } from '@/lib/types';
import { getCustomerReservations, userCancelReservationWithSplit, generateQRCodeDataURL, getCurrentUser } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
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
import QRCodeCard from '@/components/reservations/QRCodeCard';
import PartnerBlock from '@/components/reservations/PartnerBlock';

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
    'CANCELLED': 'bg-orange-500'
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
            {/* Partner/Product block */}
            <PartnerBlock
              partnerName={reservation.partner?.business_name || ''}
              productImage={(reservation.offer as any)?.image_url}
              price={Number(reservation.total_price) || 0}
              quantity={reservation.quantity}
            />

            {/* QR card with countdown inside the partner section area */}
            <div>
              <QRCodeCard qrCodeUrl={qrCodeUrl} code={reservation.qr_code} expiresAt={reservation.expires_at} />
              <p className="mt-2 text-center text-sm sm:text-base text-gray-600">Show this QR code when you arrive at the location.</p>
            </div>
            {/* Map preview in rounded container */}
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
                      <Polyline positions={routePoints} pathOptions={{ color: '#2563eb', weight: 4 }} />
                    ) : userLocation ? (
                      <Polyline positions={[userLocation, [reservation.partner.latitude, reservation.partner.longitude]]} pathOptions={{ color: '#2563eb', weight: 4 }} />
                    ) : null}
                  </MapContainer>
                </div>
                {(distanceKm !== null || etaMinutes !== null) && (
                  <div className="px-4 py-2 text-sm text-gray-700 border-t bg-white">
                    {distanceKm !== null && <span>{distanceKm.toFixed(1)} km</span>}
                    {distanceKm !== null && etaMinutes !== null && <span> • </span>}
                    {etaMinutes !== null && <span>ETA {etaMinutes} min</span>}
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

      {/* QR modal handled inside QRCodeCard */}
    </div>
  );
}
