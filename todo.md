# SmartPick Customer Homepage Improvements - Implementation Plan

## Overview
Enhance the customer homepage with penalty system, improved reservations, map features, and UX improvements while preserving all admin and partner functionality.

## Files to Modify/Create

### 1. Database Schema Changes
- **File**: `add-penalty-columns.sql`
- **Purpose**: Add penalty_until and penalty_count columns to users table
- **Status**: Not Started

### 2. Type Definitions
- **File**: `src/lib/types.ts`
- **Purpose**: Add penalty fields to User interface
- **Status**: Not Started

### 3. API Functions
- **File**: `src/lib/api.ts`
- **Purpose**: Add penalty check, update reservation logic for 3-unit max
- **Status**: Not Started

### 4. Enhanced Reservation Modal
- **File**: `src/components/ReservationModal.tsx` (NEW)
- **Purpose**: Create enhanced modal with quantity selector, image, countdown, penalty check
- **Status**: Not Started

### 5. Map Component Improvements
- **File**: `src/components/OfferMap.tsx`
- **Purpose**: Add realtime updates, list-map sync, Near Me button, color-coded markers, legend
- **Status**: Not Started

### 6. Customer Homepage
- **File**: `src/pages/Index.tsx`
- **Purpose**: Integrate new reservation modal, add UX enhancements for expiring offers
- **Status**: Not Started

### 7. Reserve Offer Page
- **File**: `src/pages/ReserveOffer.tsx`
- **Purpose**: Update to enforce 3-unit max and penalty checks
- **Status**: Not Started

### 8. Notification Service (Optional)
- **File**: `src/lib/notifications.ts` (NEW)
- **Purpose**: Browser push notifications
- **Status**: Optional - Skip if time constrained

## Implementation Order
1. Database schema (SQL)
2. Type definitions
3. API functions for penalty system
4. Enhanced reservation modal component
5. Map improvements
6. Homepage integration
7. Reserve offer page updates
8. (Optional) Notifications

## Constraints
- DO NOT modify admin or partner dashboards
- Keep all existing routing and authentication
- Preserve all existing data structures
- Use existing tech stack only