import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Reservation } from '@/lib/types';
import { getCustomerReservations, cancelReservation, generateQRCodeDataURL, getCurrentUser } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, MapPin, Clock, Phone, Mail } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function ReservationDetail() {
  const { id } = useParams<{ id: string }>();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const navigate = useNavigate();
  const { t } = useI18n();

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
      console.error('Error loading reservation:', error);
      toast.error(t('toast.failedLoadReservation'));
    }
  };

  const updateTimeRemaining = () => {
    if (!reservation) return;

    const now = new Date();
    const expires = new Date(reservation.expires_at);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) {
      setTimeRemaining(t('timer.expired'));
      return;
    }

    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
  };

  const handleCancel = async () => {
  if (!reservation) return;
  if (!confirm(t('confirm.cancelReservation'))) return;

    try {
      await cancelReservation(reservation.id);
      toast.success(t('toast.reservationCancelled'));
      navigate('/my-picks');
    } catch (error) {
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
  const partnerPhone = reservation.partner?.phone || reservation.partner?.contact?.phone || '';
  const partnerEmail = reservation.partner?.email || reservation.partner?.contact?.email || '';
  
  // Get partner coordinates for directions
  const partnerLat = reservation.partner?.latitude || reservation.partner?.location?.latitude;
  const partnerLng = reservation.partner?.longitude || reservation.partner?.location?.longitude;

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
              <Badge
                variant={reservation.status === 'ACTIVE' ? 'default' : 'secondary'}
                className={reservation.status === 'ACTIVE' ? 'bg-mint-600' : ''}
              >
                {reservation.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* QR Code */}
            {reservation.status === 'ACTIVE' && (
              <div className="bg-white p-6 rounded-lg border-2 border-mint-200 text-center">
                <p className="text-sm text-gray-600 mb-4">{t('qr.showAtPickup')}</p>
                {qrCodeUrl && (
                  <img src={qrCodeUrl} alt="QR Code" className="mx-auto w-64 h-64" />
                )}
                <p className="mt-4 text-lg font-mono font-bold text-gray-900">{reservation.qr_code}</p>
              </div>
            )}

            {/* Countdown Timer */}
            {reservation.status === 'ACTIVE' && (
              <div className="bg-coral-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-600 mb-1">{t('timer.timeRemaining')}</p>
                <p className="text-4xl font-bold text-coral-600">{timeRemaining}</p>
                <p className="text-xs text-gray-500 mt-1">{t('timer.waiting')}</p>
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

            {/* Location */}
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

            {/* Contact */}
            {(partnerPhone || partnerEmail) && (
              <div className="border-t pt-4">
                <p className="font-medium text-gray-700 mb-2">{t('contact.partner')}</p>
                <div className="space-y-2">
                  {partnerPhone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{partnerPhone}</span>
                    </div>
                  )}
                  {partnerEmail && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span>{partnerEmail}</span>
                    </div>
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
                Cancel Reservation
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}