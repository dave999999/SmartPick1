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

const Revenue = lazy(() => import('@/pages/admin/Revenue').catch(err => {
  logger.error('Failed to load Revenue', err);
  return { default: () => <div>Failed to load Revenue</div> };
}));

const LiveActivity = lazy(() => import('@/pages/admin/LiveActivity').catch(err => {
  logger.error('Failed to load LiveActivity', err);
  return { default: () => <div>Failed to load Live Activity</div> };
}));

const SystemHealth = lazy(() => import('@/pages/admin/SystemHealth').catch(err => {
  logger.error('Failed to load SystemHealth', err);
  return { default: () => <div>Failed to load System Health</div> };
}));

const FraudPrevention = lazy(() => import('@/pages/admin/FraudPrevention').catch(err => {
  logger.error('Failed to load FraudPrevention', err);
  return { default: () => <div>Failed to load Fraud Prevention</div> };
}));

const ModerationPanel = lazy(() => import('@/pages/admin/ModerationPanel').catch(err => {
  logger.error('Failed to load ModerationPanel', err);
  return { default: () => <div>Failed to load Moderation</div> };
}));

const NotificationsPanel = lazy(() => import('@/pages/admin/NotificationsPanel').catch(err => {
  logger.error('Failed to load NotificationsPanel', err);
  return { default: () => <div>Failed to load Notifications</div> };
}));

const MessagesPanel = lazy(() => import('@/pages/admin/MessagesPanel').catch(err => {
  logger.error('Failed to load MessagesPanel', err);
  return { default: () => <div>Failed to load Messages</div> };
}));

const SystemSettings = lazy(() => import('@/pages/admin/SystemSettings').catch(err => {
  logger.error('Failed to load SystemSettings', err);
  return { default: () => <div>Failed to load Settings</div> };
}));

const AuditLog = lazy(() => import('@/pages/admin/AuditLog').catch(err => {
  logger.error('Failed to load AuditLog', err);
  return { default: () => <div>Failed to load Audit Log</div> };
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
            <Route path="revenue" element={<Revenue />} />
            <Route path="live" element={<LiveActivity />} />
            <Route path="health" element={<SystemHealth />} />
            <Route path="fraud" element={<FraudPrevention />} />
            <Route path="moderation" element={<ModerationPanel />} />
            <Route path="notifications" element={<NotificationsPanel />} />
            <Route path="messages" element={<MessagesPanel />} />
            <Route path="settings" element={<SystemSettings />} />
            <Route path="audit" element={<AuditLog />} />
            
            {/* Redirect any unknown routes to dashboard home */}
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </Suspense>
      </AdminLayout>
    </AdminAuthProvider>
  );
}

