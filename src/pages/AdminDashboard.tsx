/**
 * Admin Dashboard - Main Entry Point
 * 
 * This is the root component for the admin section. It sets up routing for all admin pages.
 * 
 * Route Structure:
 * /admin - Dashboard home with overview stats
 * /admin/users - User management (view, edit, ban/unban users)
 * /admin/support - Support ticket system
 * /admin/partners - Partner management and approval
 * /admin/offers - Offer management and moderation
 * /admin/reservations - Reservation monitoring
 * /admin/analytics - Analytics and reporting
 * /admin/reports - Report management
 * /admin/gamification - Gamification settings
 * /admin/settings - System settings
 * /admin/audit - Audit logs
 * /admin/maintenance - Maintenance mode
 * /admin/security - Security settings
 * /admin/notifications - Notification management
 */

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { DashboardHome } from '@/pages/admin/DashboardHome';
import { logger } from '@/lib/logger';
import { AdminAuthProvider } from '@/hooks/admin/useAdminAuth';

// Lazy load admin pages for code splitting
const UserManagement = lazy(() => import('@/pages/admin/UserManagement').catch(err => {
  logger.error('Failed to load UserManagement', err);
  return { default: () => <div>Failed to load User Management</div> };
}));

const SupportTickets = lazy(() => import('@/pages/admin/SupportTickets').catch(err => {
  logger.error('Failed to load SupportTickets', err);
  return { default: () => <div>Failed to load Support Tickets</div> };
}));

const PartnerManagement = lazy(() => import('@/pages/admin/PartnerManagement').catch(err => {
  logger.error('Failed to load PartnerManagement', err);
  return { default: () => <div>Failed to load Partner Management</div> };
}));

const OfferManagement = lazy(() => import('@/pages/admin/OfferManagement').catch(err => {
  logger.error('Failed to load OfferManagement', err);
  return { default: () => <div>Failed to load Offer Management</div> };
}));

const ReservationMonitoring = lazy(() => import('@/pages/admin/ReservationMonitoring').catch(err => {
  logger.error('Failed to load ReservationMonitoring', err);
  return { default: () => <div>Failed to load Reservation Monitoring</div> };
}));

const Analytics = lazy(() => import('@/pages/admin/Analytics').catch(err => {
  logger.error('Failed to load Analytics', err);
  return { default: () => <div>Failed to load Analytics</div> };
}));

// Loading component with spinner
const PageLoader = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
  </div>
);

export function AdminDashboard() {
  return (
    <AdminAuthProvider>
      <AdminLayout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route index element={<DashboardHome />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="support" element={<SupportTickets />} />
            <Route path="partners" element={<PartnerManagement />} />
            <Route path="offers" element={<OfferManagement />} />
            <Route path="reservations" element={<ReservationMonitoring />} />
            <Route path="analytics" element={<Analytics />} />
            
            {/* Redirect any unknown routes to dashboard home */}
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </Suspense>
      </AdminLayout>
    </AdminAuthProvider>
  );
}

