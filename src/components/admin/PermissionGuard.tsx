/**
 * Permission Guard Component
 * Conditionally renders children based on permission check
 * 
 * Usage:
 * <PermissionGuard permission="users:ban">
 *   <BanButton />
 * </PermissionGuard>
 */

import { useAdminAuth } from '@/hooks/admin/useAdminAuth';
import { Permission } from '@/lib/admin/permissions';
import { ReactNode } from 'react';

interface PermissionGuardProps {
  permission: Permission | Permission[];
  requireAll?: boolean; // If true, requires ALL permissions. If false, requires ANY
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGuard({
  permission,
  requireAll = false,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { hasPermission } = useAdminAuth();

  const permissions = Array.isArray(permission) ? permission : [permission];

  const hasAccess = requireAll
    ? permissions.every(p => hasPermission(p))
    : permissions.some(p => hasPermission(p));

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Higher-order component for permission protection
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: Permission | Permission[],
  requireAll = false
) {
  return function PermissionProtectedComponent(props: P) {
    return (
      <PermissionGuard permission={permission} requireAll={requireAll}>
        <Component {...props} />
      </PermissionGuard>
    );
  };
}
