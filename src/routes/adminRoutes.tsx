/**
 * Admin Routes Configuration
 * Defines all admin dashboard routes with lazy loading
 */

import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { DashboardHome } from '@/pages/admin/DashboardHome';

// Lazy load heavy components
const UserManagement = lazy(() => import('@/pages/admin/UserManagement'));
const PartnerManagement = lazy(() => import('@/pages/admin/PartnerManagement'));
const OfferManagement = lazy(() => import('@/pages/admin/OfferManagement'));
const ReservationMonitoring = lazy(() => import('@/pages/admin/ReservationMonitoring'));
const SupportTickets = lazy(() => import('@/pages/admin/SupportTickets'));
const FraudPrevention = lazy(() => import('@/pages/admin/FraudPrevention'));
const ModerationPanel = lazy(() => import('@/pages/admin/ModerationPanel'));
const AnalyticsDashboard = lazy(() => import('@/pages/admin/AnalyticsDashboard'));
const RevenueDashboard = lazy(() => import('@/pages/admin/RevenueDashboard'));
const NotificationsPanel = lazy(() => import('@/pages/admin/NotificationsPanel'));
const MessagesPanel = lazy(() => import('@/pages/admin/MessagesPanel'));
const LiveActivity = lazy(() => import('@/pages/admin/LiveActivity'));
const SystemHealth = lazy(() => import('@/pages/admin/SystemHealth'));
const SystemSettings = lazy(() => import('@/pages/admin/SystemSettings'));
const AuditLog = lazy(() => import('@/pages/admin/AuditLog'));

export const adminRoutes: RouteObject = {
  path: '/admin',
  element: <AdminLayout />,
  children: [
    {
      index: true,
      element: <DashboardHome />,
    },
    {
      path: 'users',
      element: <UserManagement />,
    },
    {
      path: 'partners',
      element: <PartnerManagement />,
    },
    {
      path: 'offers',
      element: <OfferManagement />,
    },
    {
      path: 'reservations',
      element: <ReservationMonitoring />,
    },
    {
      path: 'support',
      element: <SupportTickets />,
    },
    {
      path: 'fraud',
      element: <FraudPrevention />,
    },
    {
      path: 'moderation',
      element: <ModerationPanel />,
    },
    {
      path: 'analytics',
      element: <AnalyticsDashboard />,
    },
    {
      path: 'revenue',
      element: <RevenueDashboard />,
    },
    {
      path: 'notifications',
      element: <NotificationsPanel />,
    },
    {
      path: 'messages',
      element: <MessagesPanel />,
    },
    {
      path: 'live',
      element: <LiveActivity />,
    },
    {
      path: 'health',
      element: <SystemHealth />,
    },
    {
      path: 'settings',
      element: <SystemSettings />,
    },
    {
      path: 'audit',
      element: <AuditLog />,
    },
  ],
};
