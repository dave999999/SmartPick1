/**
 * usePartnerModals - Modal state management for partner dashboard
 * 
 * Centralized modal state for:
 * - Buy Points Modal
 * - Create Offer Wizard
 * - QR Scanner Dialog
 * - Edit Offer Dialog
 * 
 * Extracted from PartnerDashboardV3.tsx to simplify modal management.
 */

import { useState } from 'react';
import { Offer } from '@/lib/types';

export interface PartnerModalsState {
  showBuyPointsModal: boolean;
  showCreateWizard: boolean;
  showQRScanner: boolean;
  showGallery: boolean;
  showSettings: boolean;
  editingOffer: Offer | null;
  isSubmitting: boolean;
  openBuyPointsModal: () => void;
  closeBuyPointsModal: () => void;
  openCreateWizard: () => void;
  closeCreateWizard: () => void;
  openQRScanner: () => void;
  closeQRScanner: () => void;
  openGallery: () => void;
  closeGallery: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  openEditOffer: (offer: Offer) => void;
  closeEditOffer: () => void;
  setIsSubmitting: (submitting: boolean) => void;
}

export function usePartnerModals(): PartnerModalsState {
  const [showBuyPointsModal, setShowBuyPointsModal] = useState(false);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return {
    showBuyPointsModal,
    showCreateWizard,
    showQRScanner,
    showGallery,
    showSettings,
    editingOffer,
    isSubmitting,
    
    // Buy Points Modal
    openBuyPointsModal: () => setShowBuyPointsModal(true),
    closeBuyPointsModal: () => setShowBuyPointsModal(false),
    
    // Create Offer Wizard
    openCreateWizard: () => setShowCreateWizard(true),
    closeCreateWizard: () => setShowCreateWizard(false),
    
    // QR Scanner
    openQRScanner: () => setShowQRScanner(true),
    closeQRScanner: () => setShowQRScanner(false),
    
    // Gallery
    openGallery: () => setShowGallery(true),
    closeGallery: () => setShowGallery(false),
    
    // Settings
    openSettings: () => setShowSettings(true),
    closeSettings: () => setShowSettings(false),
    
    // Edit Offer
    openEditOffer: (offer: Offer) => setEditingOffer(offer),
    closeEditOffer: () => setEditingOffer(null),
    
    // Submitting state
    setIsSubmitting,
  };
}
