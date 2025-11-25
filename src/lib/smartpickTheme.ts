/**
 * SmartPick Premium Dark Design System
 * Soft Neon Dark theme with glass morphism
 */

export const smartpickColors = {
  // Backgrounds
  bg: '#05070C',            // app background
  surface1: '#0B0F16',      // large panels, bottom sheet base
  surface2: '#141923',      // cards, nested panels
  surfaceGlass: 'rgba(12,16,24,0.75)', // glass overlay
  
  // Borders
  borderSoft: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.14)',
  
  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#9FA8C3',
  textMuted: '#6D7488',
  
  // Accents
  accentOrange: '#FF8A30',
  accentOrangeSoft: 'rgba(255,138,48,0.35)',
  accentMint: '#38EBC1',
  accentMintSoft: 'rgba(56,235,193,0.35)',
  
  // Status
  danger: '#FF4D6A',
  success: '#3BE77A',
  
  // Shadows
  cardShadow: '0 18px 40px rgba(0,0,0,0.55)',
  glowOrange: '0 0 18px rgba(255,138,48,0.3)',
  glowMint: '0 0 26px rgba(56,235,193,0.55)',
};

export type SmartPickColors = typeof smartpickColors;
