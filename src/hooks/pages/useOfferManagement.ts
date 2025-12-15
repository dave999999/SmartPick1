/**
 * useOfferManagement - Offer selection and UI state management
 * 
 * Manages offer sheets, partner sheets, modals, and offer selection state.
 * Handles user interactions with offers and partners on the map/list.
 * Extracted from IndexRedesigned.tsx to improve maintainability.
 */

import { useState, useCallback } from 'react';
import { Offer, User } from '@/lib/types';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';

interface UseOfferManagementProps {
  user: User | null;
  setShowAuthDialog: (show: boolean) => void;
  setDefaultAuthTab: (tab: 'signin' | 'signup') => void;
  googleMap: google.maps.Map | null;
  activeReservation: any;
}

export interface OfferManagementState {
  selectedOffer: Offer | null;
  discoverSheetOpen: boolean;
  isSheetMinimized: boolean;
  selectedPartnerId: string | null;
  highlightedOfferId: string | null;
  showPartnerSheet: boolean;
  showNewReservationModal: boolean;
  reservationQuantity: number;
  setSelectedOffer: (offer: Offer | null) => void;
  setDiscoverSheetOpen: (open: boolean) => void;
  setIsSheetMinimized: (minimized: boolean) => void;
  setSelectedPartnerId: (id: string | null) => void;
  setHighlightedOfferId: (id: string | null) => void;
  setShowPartnerSheet: (show: boolean) => void;
  setShowNewReservationModal: (show: boolean) => void;
  setReservationQuantity: (quantity: number) => void;
  handleOfferClick: (offer: Offer) => void;
  handleMarkerClick: (partnerName: string, partnerAddress: string | undefined, partnerOffers: Offer[]) => void;
}

export function useOfferManagement({
  user,
  setShowAuthDialog,
  setDefaultAuthTab,
  googleMap,
  activeReservation,
}: UseOfferManagementProps): OfferManagementState {
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [discoverSheetOpen, setDiscoverSheetOpen] = useState(false);
  const [isSheetMinimized, setIsSheetMinimized] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [highlightedOfferId, setHighlightedOfferId] = useState<string | null>(null);
  const [showPartnerSheet, setShowPartnerSheet] = useState(false);
  const [showNewReservationModal, setShowNewReservationModal] = useState(false);
  const [reservationQuantity, setReservationQuantity] = useState(1);

  const { addRecentlyViewed } = useRecentlyViewed();

  // Handle offer click - open reservation modal or show auth dialog
  const handleOfferClick = useCallback((offer: Offer) => {
    // If user is not logged in, show auth dialog instead of opening offer
    if (!user) {
      setShowAuthDialog(true);
      setDefaultAuthTab('signin');
      return;
    }

    // User is logged in, proceed with opening offer
    setSelectedOffer(offer);
    setHighlightedOfferId(offer.id);
    setShowNewReservationModal(true);
    addRecentlyViewed(offer.id, 'offer');
  }, [user, addRecentlyViewed, setShowAuthDialog, setDefaultAuthTab]);

  // Handle map marker click - open partner sheet with offers
  const handleMarkerClick = useCallback((
    partnerName: string,
    partnerAddress: string | undefined,
    partnerOffers: Offer[]
  ) => {
    // Skip if active reservation exists - no partner sheet during navigation
    if (activeReservation) {
      return;
    }
    
    // If empty partner name, clear filters (map clicked on empty area)
    if (!partnerName || partnerOffers.length === 0) {
      setSelectedOffer(null);
      setShowPartnerSheet(false);
      return;
    }
    
    // Open partner sheet with partner's info and offers
    if (partnerOffers.length > 0) {
      const partnerId = partnerOffers[0]?.partner_id;
      if (partnerId) {
        setSelectedPartnerId(partnerId);
        setShowPartnerSheet(true);
        
        // Center map on partner
        if (googleMap && partnerOffers[0]?.partner?.location) {
          googleMap.panTo({
            lat: partnerOffers[0].partner.location.latitude,
            lng: partnerOffers[0].partner.location.longitude,
          });
          googleMap.setZoom(15);
        }
      }
    }
  }, [googleMap, activeReservation]);

  return {
    selectedOffer,
    discoverSheetOpen,
    isSheetMinimized,
    selectedPartnerId,
    highlightedOfferId,
    showPartnerSheet,
    showNewReservationModal,
    reservationQuantity,
    setSelectedOffer,
    setDiscoverSheetOpen,
    setIsSheetMinimized,
    setSelectedPartnerId,
    setHighlightedOfferId,
    setShowPartnerSheet,
    setShowNewReservationModal,
    setReservationQuantity,
    handleOfferClick,
    handleMarkerClick,
  };
}
