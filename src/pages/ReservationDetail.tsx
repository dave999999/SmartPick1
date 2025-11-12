import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Reservation } from '@/lib/types';
import { getCustomerReservations, userCancelReservationWithSplit, generateQRCodeDataURL, getCurrentUser } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, MapPin, Clock, Phone, Mail, X, Crosshair } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { logger } from '@/lib/logger';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
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

// Helper component to imperatively recenter map
function RecenterOnUser({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position);
    }
  }, [position, map]);
  return null;
}

export default function ReservationDetail() {
  const { id } = useParams<{ id: string }>();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [remainRatio, setRemainRatio] = useState<number>(1); // 1.0 at start → 0.0 at end
  const [borderColor, setBorderColor] = useState<string>('#16a34a'); // default green
  const [showQrSection, setShowQrSection] = useState<boolean>(false);
  const [qrModalOpen, setQrModalOpen] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const navigate = useNavigate();
  const { t } = useI18n();

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadReservation();
  }, [id]);

  useEffect(() => {
    if (reservation) {
      const interval = setInterval(() => {
        updateTimeRemaining();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [reservation]);

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
      
      // Generate QR code
      const qrUrl = await generateQRCodeDataURL(found.qr_code);
      setQrCodeUrl(qrUrl);
    } catch (error) {
      logger.error('Error loading reservation:', error);
      toast.error(t('toast.failedLoadReservation'));
    }
  };

  // Geolocation watch for live user tracking
  useEffect(() => {
    if (!reservation) return;
    if (!('geolocation' in navigator)) {
      logger.warn('Geolocation not supported');
      return;
    }
    // Start watching user position
    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        const newLoc: [number, number] = [latitude, longitude];
        setUserLocation(newLoc);
      },
      err => {
        logger.error('Geolocation error', err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000
      }
    );
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [reservation]);

  // Fetch route from OSRM when userLocation or partner changes
  useEffect(() => {
    const partnerLat = reservation?.partner?.latitude || reservation?.partner?.location?.latitude;
    const partnerLng = reservation?.partner?.longitude || reservation?.partner?.location?.longitude;
    if (!reservation || !userLocation || !partnerLat || !partnerLng) return;

    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${userLocation[1]},${userLocation[0]};${partnerLng},${partnerLat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        if (data?.routes?.[0]) {
          const route = data.routes[0];
          const coords: [number, number][] = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
          setRoutePoints(coords);
          setDistanceKm(route.distance ? route.distance / 1000 : null);
          setEtaMinutes(route.duration ? Math.round(route.duration / 60) : null);
        }
      } catch (e) {
        logger.error('Failed to fetch route', e);
      }
    };
    fetchRoute();
  }, [userLocation, reservation]);

  const updateTimeRemaining = () => {
    if (!reservation) return;

    const now = new Date();
    const expires = new Date(reservation.expires_at);
    const created = new Date(reservation.created_at);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) {
      setTimeRemaining(t('timer.expired'));
      setRemainRatio(0);
      setBorderColor('#dc2626');
      return;
    }

    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);

    // Compute remaining ratio between created_at and expires_at
    const total = Math.max(1, expires.getTime() - created.getTime());
    const remain = Math.max(0, diff);
    const r = Math.min(1, Math.max(0, remain / total));
    setRemainRatio(r);

    // Map to color: green → yellow → orange → red
    const color = r >= 0.6 ? '#16a34a' : r >= 0.35 ? '#eab308' : r >= 0.15 ? '#f97316' : '#dc2626';
    setBorderColor(color);
  };

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

  // Get pickup times - support both flat and nested structures
  const pickupStart = reservation.offer?.pickup_start || reservation.offer?.pickup_window?.start || '';
  const pickupEnd = reservation.offer?.pickup_end || reservation.offer?.pickup_window?.end || '';
  
  // Get partner address and contact - support both flat and nested structures
  const partnerAddress = reservation.partner?.address || reservation.partner?.location?.address || '';
  // Hide partner contact info from non-admins
  const partnerPhone = isAdmin ? (reservation.partner?.phone || reservation.partner?.contact?.phone || '') : '';
  const partnerEmail = isAdmin ? (reservation.partner?.email || reservation.partner?.contact?.email || '') : '';
  
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
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/my-picks')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('button.backToMyPicks')}
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{reservation.offer?.title}</CardTitle>
                <CardDescription>{reservation.partner?.business_name}</CardDescription>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge className={`${statusColorMap[reservation.status] || 'bg-gray-400'} text-white`}>{reservation.status}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Top Map with circular progress overlay */}
            {reservation.status === 'ACTIVE' && reservation.partner?.latitude && reservation.partner?.longitude && (
              <div className="relative w-full overflow-hidden rounded-xl border">
                <div className="h-72 w-full">
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
                    {routePoints.length > 0 && (
                      <Polyline positions={routePoints} pathOptions={{ color: '#2563eb', weight: 5 }} />
                    )}
                  </MapContainer>
                </div>

                {/* Circular progress ring overlay */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-[-56px] sm:bottom-[-64px]">
                  <div className="relative bg-white shadow-lg rounded-full w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
                    {/* Background ring */}
                    {(() => {
                      const radius = 80; // visual radius in px for SVG viewBox
                      const circumference = 2 * Math.PI * radius;
                      const offset = circumference * (1 - remainRatio);
                      return (
                        <svg width="180" height="180" viewBox="0 0 200 200" className="absolute">
                          <circle cx="100" cy="100" r="80" stroke="#e5e7eb" strokeWidth="14" fill="none" />
                          <circle
                            cx="100"
                            cy="100"
                            r="80"
                            stroke={borderColor}
                            strokeWidth="14"
                            strokeLinecap="round"
                            fill="none"
                            strokeDasharray={`${circumference}`}
                            strokeDashoffset={`${offset}`}
                            transform="rotate(-90 100 100)"
                          />
                        </svg>
                      );
                    })()}

                    <div className="text-center px-4">
                      <div className="text-3xl sm:text-4xl font-extrabold text-gray-900 tabular-nums">{timeRemaining}</div>
                      <div className="text-[11px] text-gray-500 mt-1">{t('timer.waiting')}</div>
                      <Button size="sm" variant="outline" className="mt-2 h-8 text-xs" onClick={() => setQrModalOpen(true)}>
                        Show QR
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pickup window under overlay */}
            {reservation.status === 'ACTIVE' && (
              <div className="mt-16 text-center">
                <div className="text-xs text-gray-600">Pickup Window</div>
                <div className="text-sm text-gray-900 font-medium">
                  {pickupStart ? new Date(pickupStart).toLocaleTimeString() : '--'} – {pickupEnd ? new Date(pickupEnd).toLocaleTimeString() : '--'}
                </div>
              </div>
            )}

            {/* Partner Info Card (modern) */}
            {reservation.partner && (
              <div className="rounded-xl border bg-white shadow-sm p-4">
                <div className="flex items-center gap-3">
                  {/* Avatar or initials */}
                  <div className="w-10 h-10 rounded-full bg-mint-100 text-mint-800 flex items-center justify-center font-semibold">
                    {(reservation.partner.business_name || 'P')
                      .split(' ')
                      .slice(0, 2)
                      .map(w => w[0])
                      .join('')}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{reservation.partner.business_name}</div>
                    <div className="text-xs text-gray-500">
                      {distanceKm !== null ? `${distanceKm.toFixed(2)} km` : '—'} • {etaMinutes !== null ? `${etaMinutes} min` : '—'}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {/* Keep phone/email visibility consistent with existing isAdmin gating */}
                  <Button asChild variant="outline" className="h-9 text-xs">
                    <a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${partnerLat},${partnerLng}`}>Directions</a>
                  </Button>
                  {partnerPhone && (
                    <Button asChild variant="outline" className="h-9 text-xs">
                      <a href={`tel:${partnerPhone}`}>Call</a>
                    </Button>
                  )}
                  {partnerEmail && (
                    <Button asChild variant="outline" className="h-9 text-xs">
                      <a href={`mailto:${partnerEmail}`}>Message</a>
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Reservation Details */}
            <div className="space-y-3">
                <div className="flex justify-between">
                <span className="text-gray-600">{t('label.quantity')}</span>
                <span className="font-medium">{reservation.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('label.totalPrice')}</span>
                <span className="font-bold text-mint-600 text-xl">{reservation.total_price} GEL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('label.reservedAt')}</span>
                <span className="font-medium">
                  {new Date(reservation.created_at).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Pickup Window */}
            {pickupStart && pickupEnd && (
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 text-gray-700 mb-2">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">{t('label.pickupWindow')}</span>
                </div>
                <p className="text-gray-600">
                  {new Date(pickupStart).toLocaleTimeString()} - {new Date(pickupEnd).toLocaleTimeString()}
                </p>
              </div>
            )}

            {/* Location & Directions (kept) */}
            {reservation.partner && (
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 text-gray-700 mb-2">
                  <MapPin className="w-5 h-5" />
                  <span className="font-medium">{t('label.pickupLocation')}</span>
                </div>
                <p className="font-medium">{reservation.partner.business_name}</p>
                {partnerAddress && (
                  <p className="text-gray-600">{partnerAddress}</p>
                )}
                {partnerLat && partnerLng && (
                  <Button variant="outline" className="mt-3 w-full" onClick={() => {
                    window.open(`https://www.google.com/maps/search/?api=1&query=${partnerLat},${partnerLng}`, '_blank');
                  }}>
                    {t('button.getDirections')}
                  </Button>
                )}
              </div>
            )}


            {/* Contact (kept admin-only visibility) */}
            {isAdmin && (partnerPhone || partnerEmail) && (
              <div className="border-t pt-4">
                <p className="font-medium text-gray-700 mb-2">{t('contact.partner')}</p>
                <div className="space-y-3">
                  {partnerPhone && (
                    <Button asChild className="w-full justify-center bg-mint-600 hover:bg-mint-700 text-white">
                      <a href={`tel:${partnerPhone}`} className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4" /> {partnerPhone}
                      </a>
                    </Button>
                  )}
                  {partnerEmail && (
                    <Button asChild variant="outline" className="w-full justify-center">
                      <a href={`mailto:${partnerEmail}`} className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4" /> {partnerEmail}
                      </a>
                    </Button>
                  )}
                </div>
              </div>
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

      {/* QR Fullscreen Modal */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-sm p-6 flex flex-col items-center">
            <button
              onClick={() => setQrModalOpen(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            {qrCodeUrl && (
              <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
            )}
            <div className="mt-4 text-center">
              <p className="text-sm font-medium text-gray-700">{reservation.partner?.business_name}</p>
              <p className="mt-1 font-mono text-xs tracking-wider text-gray-900">{reservation.qr_code}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
