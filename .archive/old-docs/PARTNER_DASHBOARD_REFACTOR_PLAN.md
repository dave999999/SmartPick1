# PartnerDashboard Refactoring Plan

## 🎯 Current State
- **1,844 lines** of code
- Multiple large functions inline
- Some dead code and debug statements
- Duplicate view rendering logic
- Complex form handling inline

## 📋 Cleanup Tasks

### 1. Remove Dead Code ✅
- [ ] Remove empty useEffect (line 161-162)
- [ ] Remove debug console.logs
- [ ] Remove unnecessary comments
- [ ] Fix incorrect pricing calculation (line 1797)
- [ ] Remove duplicate view rendering

### 2. Extract Utilities ✅
- [ ] Move `extractErrorMessage` to utils file
- [ ] Move date/time calculations to utils
- [ ] Extract QR validation logic

### 3. Create New Components ✅
- [ ] `OfferEditDialog` - Edit offer form (lines 1538-1735)
- [ ] `PurchaseSlotDialog` - Slot purchase UI (lines 1751-1825)
- [ ] `QRScannerDialog` - QR scanning logic (lines 1292-1382)
- [ ] `DashboardHeader` - Header with wallet and menu (lines 1064-1213)
- [ ] `DashboardContent` - Main content switcher (lines 1383-1532)

### 4. Create Custom Hooks ✅
- [ ] `usePartnerDashboardData` - Consolidate data loading
- [ ] `useOfferActions` - Handle create/edit/delete/toggle
- [ ] `useReservationActions` - Handle pickup/no-show/forgive
- [ ] `useQRValidation` - QR code validation logic

### 5. Simplify State Management ✅
- [ ] Group related state into objects
- [ ] Remove duplicate state tracking
- [ ] Use Zustand stores created earlier

## 📊 Target State
- **~400-500 lines** main file
- **10+ smaller components** (50-150 lines each)
- **4-5 custom hooks** for logic
- **Clean, maintainable code**

## 🔧 Implementation Order
1. Phase 1: Remove dead code (Quick wins)
2. Phase 2: Extract utilities
3. Phase 3: Create dialog components
4. Phase 4: Create custom hooks
5. Phase 5: Simplify main component
