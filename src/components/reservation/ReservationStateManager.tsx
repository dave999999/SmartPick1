/**
 * ReservationStateManager - Central state manager for post-reservation UX
 * Orchestrates: floating card, navigation, QR sheet, mini bubble, live GPS
 */

import { useState, useEffect, useCallback } from 'react';
import { Reservation } from '@/lib/types';
import { FloatingReservationCard } from './FloatingReservationCard';
import { NavigationTopBar } from './NavigationTopBar';
import { QRBottomSheet } from './QRBottomSheet';
import { MiniBubble } from './MiniBubble';
import { calculateDistance } from '@/lib/maps/distance';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface ReservationStateManagerProps {
  reservation: Reservation | null;
  userLocation: { lat: number; lng: number } | null;
  onNavigationStart: (reservation: Reservation) => void;
  onNavigationStop: () => void;
  onCancelReservation: (reservationId: string) => void;
  onReservationExpired: () => void;
}

type ViewState = 'card' | 'navigation' | 'qr' | 'minimized' | 'none';

export function ReservationStateManager({
  reservation,
  userLocation,
  onNavigationStart,
  onNavigationStop,
  onCancelReservation,
  onReservationExpired,
}: ReservationStateManagerProps) {
  const [viewState, setViewState] = useState<ViewState>('none');
  const [distance, setDistance] = useState<number | undefined>();
  const [eta, setEta] = useState<number | undefined>();
  const [isNavigating, setIsNavigating] = useState(false);

  // Show card when reservation is created
  useEffect(() => {
    if (reservation && viewState === 'none') {
      setViewState('card');
      toast.success('🎉 Reservation confirmed! You are all set.');
    }
  }, [reservation]);

  // Calculate distance and ETA
  useEffect(() => {
    if (!reservation?.partner || !userLocation) return;

    const partnerLat = reservation.partner.latitude;
    const partnerLng = reservation.partner.longitude;

    if (!partnerLat || !partnerLng) return;

    const distanceKm = calculateDistance(
      { lat: userLocation.lat, lng: userLocation.lng },
      { lat: partnerLat, lng: partnerLng }
    );

    // Convert to meters
    const distanceMeters = distanceKm * 1000;
    setDistance(distanceMeters);

    // Calculate ETA (assuming 5 km/h walking speed)
    const etaMinutes = Math.ceil((distanceKm / 5) * 60);
    setEta(etaMinutes);
  }, [reservation, userLocation]);

  // Check for expiration
  useEffect(() => {
    if (!reservation) return;

    const checkExpiration = () => {
      const now = new Date();
      const expires = new Date(reservation.expires_at);

      if (expires.getTime() <= now.getTime()) {
        logger.log('Reservation expired');
        toast.error('⏰ Your reservation has expired.');
        setViewState('none');
        onReservationExpired();
      }
    };

    checkExpiration();
    const interval = setInterval(checkExpiration, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [reservation, onReservationExpired]);

  // Navigation handlers
  const handleNavigate = useCallback(() => {
    if (!reservation) return;
    
    setViewState('navigation');
    setIsNavigating(true);
    onNavigationStart(reservation);
    logger.log('Navigation started');
  }, [reservation, onNavigationStart]);

  const handleStopNavigation = useCallback(() => {
    setViewState('card');
    setIsNavigating(false);
    onNavigationStop();
    logger.log('Navigation stopped');
  }, [onNavigationStop]);

  // QR handlers
  const handleViewQR = useCallback(() => {
    setViewState('qr');
  }, []);

  const handleCloseQR = useCallback(() => {
    setViewState('card');
  }, []);

  const handleMinimize = useCallback(() => {
    setViewState('minimized');
  }, []);

  const handleMinimizedClick = useCallback(() => {
    setViewState('qr');
  }, []);

  // Cancel handler
  const handleCancel = useCallback(() => {
    if (!reservation) return;
    onCancelReservation(reservation.id);
    setViewState('none');
  }, [reservation, onCancelReservation]);

  // Close card
  const handleCloseCard = useCallback(() => {
    setViewState('minimized');
  }, []);

  if (!reservation) return null;

  return (
    <>
      {/* Floating Confirmation Card */}
      {viewState === 'card' && (
        <FloatingReservationCard
          reservation={reservation}
          distance={distance}
          eta={eta}
          onNavigate={handleNavigate}
          onViewQR={handleViewQR}
          onMinimize={handleMinimize}
          onClose={handleCloseCard}
          onCancel={() => onCancelReservation(reservation.id)}
        />
      )}

      {/* Navigation Top Bar */}
      <NavigationTopBar
        isActive={isNavigating}
        partnerName={reservation.partner?.business_name || 'Partner'}
        distance={distance}
        eta={eta}
        onClose={handleStopNavigation}
      />

      {/* QR Bottom Sheet */}
      <QRBottomSheet
        isOpen={viewState === 'qr'}
        reservation={reservation}
        onClose={handleCloseQR}
        onMinimize={handleMinimize}
        onCancel={handleCancel}
        canCancel={true}
      />

      {/* Mini Bubble (when minimized) */}
      <MiniBubble
        isVisible={viewState === 'minimized'}
        onClick={handleMinimizedClick}
        expiresAt={reservation.expires_at}
      />
    </>
  );
}
