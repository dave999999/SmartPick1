/**
 * Bottom Navigation Components - SmartPick Navigation System
 * 
 * Premium Apple-style floating 3D glass dock:
 * 
 * 1. BottomNavBar (NEW - RECOMMENDED)
 *    - VisionOS-inspired floating glass dock
 *    - Frosted glass with 3D cosmic orange bubble
 *    - Superellipse radius, 64px height
 *    - Also exported as BottomNavPremium for compatibility
 * 
 * 2. BottomNavStandard
 *    - Clean white design with subtle shadows
 *    - Universal appeal, works on all devices
 *    - 56px floating center button
 * 
 * 3. BottomNavMinimal
 *    - Flat, borderless, icon-only interface
 *    - Minimal visual weight for power users
 *    - 48px inline center button
 */

export { BottomNavBar, BottomNavPremium } from './BottomNavBar';
export { BottomNavStandard } from './BottomNavStandard';
export { BottomNavMinimal } from './BottomNavMinimal';

// Default export: New glass dock (recommended)
export { BottomNavBar as default } from './BottomNavBar';
