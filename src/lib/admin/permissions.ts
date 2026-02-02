/**
 * Admin Permission System
 * Role-based access control with 5 admin roles
 * 
 * Roles:
 * - super_admin: Full access (Super Admin)
 * - ops_admin: Operations (approve partners, ban users)
 * - support_agent: Support tickets, user queries
 * - finance: Analytics, revenue reports, exports
 * - partner_admin: Partner-specific operations
 */

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  OPS_ADMIN = 'ops_admin',
  SUPPORT_AGENT = 'support_agent',
  FINANCE = 'finance',
  PARTNER_ADMIN = 'partner_admin',
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  [AdminRole.SUPER_ADMIN]: 'Super Admin',
  [AdminRole.OPS_ADMIN]: 'Operations Admin',
  [AdminRole.SUPPORT_AGENT]: 'Support Agent',
  [AdminRole.FINANCE]: 'Finance & Analytics',
  [AdminRole.PARTNER_ADMIN]: 'Partner Admin',
};

/**
 * Permission definitions
 * Each permission maps to array of roles that have access
 */
export const PERMISSIONS = {
  // Dashboard
  'dashboard:view': [AdminRole.SUPPORT_AGENT, AdminRole.OPS_ADMIN, AdminRole.FINANCE, AdminRole.SUPER_ADMIN],

  // Users
  'users:view': [AdminRole.SUPPORT_AGENT, AdminRole.OPS_ADMIN, AdminRole.FINANCE, AdminRole.SUPER_ADMIN],
  'users:view_details': [AdminRole.SUPPORT_AGENT, AdminRole.OPS_ADMIN, AdminRole.FINANCE, AdminRole.SUPER_ADMIN],
  'users:edit': [AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'users:ban': [AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'users:ban_permanent': [AdminRole.SUPER_ADMIN],
  'users:unban': [AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'users:delete': [AdminRole.SUPER_ADMIN],
  'users:points_add': [AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'users:points_remove': [AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'users:export': [AdminRole.FINANCE, AdminRole.SUPER_ADMIN],

  // Partners
  'partners:view': [AdminRole.SUPPORT_AGENT, AdminRole.OPS_ADMIN, AdminRole.PARTNER_ADMIN, AdminRole.FINANCE, AdminRole.SUPER_ADMIN],
  'partners:view_details': [AdminRole.SUPPORT_AGENT, AdminRole.OPS_ADMIN, AdminRole.PARTNER_ADMIN, AdminRole.FINANCE, AdminRole.SUPER_ADMIN],
  'partners:approve': [AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'partners:reject': [AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'partners:edit': [AdminRole.OPS_ADMIN, AdminRole.PARTNER_ADMIN, AdminRole.SUPER_ADMIN],
  'partners:block': [AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'partners:block_permanent': [AdminRole.SUPER_ADMIN],
  'partners:unblock': [AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'partners:delete': [AdminRole.SUPER_ADMIN],
  'partners:commission_override': [AdminRole.SUPER_ADMIN],
  'partners:trust_score_adjust': [AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'partners:export': [AdminRole.FINANCE, AdminRole.SUPER_ADMIN],

  // Offers
  'offers:view': [AdminRole.SUPPORT_AGENT, AdminRole.OPS_ADMIN, AdminRole.PARTNER_ADMIN, AdminRole.SUPER_ADMIN],
  'offers:view_details': [AdminRole.SUPPORT_AGENT, AdminRole.OPS_ADMIN, AdminRole.PARTNER_ADMIN, AdminRole.SUPER_ADMIN],
  'offers:pause': [AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'offers:unpause': [AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'offers:flag': [AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'offers:delete': [AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'offers:export': [AdminRole.FINANCE, AdminRole.SUPER_ADMIN],

  // Reservations
  'reservations:view': [AdminRole.SUPPORT_AGENT, AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'reservations:view_details': [AdminRole.SUPPORT_AGENT, AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'reservations:extend': [AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'reservations:force_complete': [AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'reservations:cancel': [AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'reservations:export': [AdminRole.FINANCE, AdminRole.SUPER_ADMIN],

  // Support Tickets
  'tickets:view': [AdminRole.SUPPORT_AGENT, AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'tickets:view_details': [AdminRole.SUPPORT_AGENT, AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'tickets:assign': [AdminRole.SUPPORT_AGENT, AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'tickets:assign_self': [AdminRole.SUPPORT_AGENT, AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'tickets:reply': [AdminRole.SUPPORT_AGENT, AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'tickets:resolve': [AdminRole.SUPPORT_AGENT, AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'tickets:escalate': [AdminRole.SUPPORT_AGENT, AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'tickets:delete': [AdminRole.SUPER_ADMIN],

  // Fraud & Moderation
  'fraud:view': [AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'fraud:investigate': [AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'fraud:ban_cluster': [AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'moderation:view': [AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'moderation:action': [AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],

  // Analytics & Finance
  'analytics:view': [AdminRole.FINANCE, AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'analytics:export': [AdminRole.FINANCE, AdminRole.SUPER_ADMIN],
  'revenue:view': [AdminRole.FINANCE, AdminRole.SUPER_ADMIN],
  'revenue:view_detailed': [AdminRole.FINANCE, AdminRole.SUPER_ADMIN],
  'revenue:export': [AdminRole.FINANCE, AdminRole.SUPER_ADMIN],
  'financial:reports': [AdminRole.FINANCE, AdminRole.SUPER_ADMIN],

  // Notifications & Communication
  'notifications:view': [AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'notifications:send': [AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'notifications:broadcast': [AdminRole.SUPER_ADMIN],
  'automation:view': [AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'automation:create': [AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'automation:edit': [AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'automation:delete': [AdminRole.SUPER_ADMIN],

  // Monitoring
  'monitoring:view': [AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'monitoring:live': [AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'health:view': [AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],

  // System & Settings
  'settings:view': [AdminRole.OPS_ADMIN, AdminRole.SUPER_ADMIN],
  'settings:edit': [AdminRole.SUPER_ADMIN],
  'settings:maintenance': [AdminRole.SUPER_ADMIN],
  'audit:view': [AdminRole.FINANCE, AdminRole.SUPER_ADMIN],
  'audit:export': [AdminRole.SUPER_ADMIN],
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: AdminRole | string, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) {
    console.warn(`Permission "${permission}" not defined`);
    return false;
  }
  return allowedRoles.includes(role as AdminRole);
}

/**
 * Check if a role has ANY of the specified permissions
 */
export function hasAnyPermission(role: AdminRole | string, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Check if a role has ALL of the specified permissions
 */
export function hasAllPermissions(role: AdminRole | string, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: AdminRole): Permission[] {
  return Object.keys(PERMISSIONS).filter(permission =>
    hasPermission(role, permission as Permission)
  ) as Permission[];
}

/**
 * Role hierarchy for automatic permission checks
 * Higher roles inherit permissions from lower roles
 */
export const ROLE_HIERARCHY: Record<AdminRole, number> = {
  [AdminRole.SUPPORT_AGENT]: 1,
  [AdminRole.PARTNER_ADMIN]: 2,
  [AdminRole.FINANCE]: 3,
  [AdminRole.OPS_ADMIN]: 4,
  [AdminRole.SUPER_ADMIN]: 5,
};

/**
 * Check if role A is higher than role B in hierarchy
 */
export function isHigherRole(roleA: AdminRole, roleB: AdminRole): boolean {
  return ROLE_HIERARCHY[roleA] > ROLE_HIERARCHY[roleB];
}

/**
 * Safety restrictions - actions that require additional confirmation
 */
export const REQUIRES_CONFIRMATION = [
  'users:ban_permanent',
  'users:delete',
  'partners:block_permanent',
  'partners:delete',
  'partners:commission_override',
  'notifications:broadcast',
  'settings:edit',
  'settings:maintenance',
  'automation:delete',
] as const;

export function requiresConfirmation(permission: Permission): boolean {
  return REQUIRES_CONFIRMATION.includes(permission as any);
}

/**
 * Actions that require 2FA for Super Admins
 */
export const REQUIRES_2FA = [
  'users:delete',
  'partners:delete',
  'settings:maintenance',
  'audit:export',
] as const;

export function requires2FA(permission: Permission): boolean {
  return REQUIRES_2FA.includes(permission as any);
}

/**
 * Rate limits for sensitive actions (per hour)
 */
export const RATE_LIMITS: Record<string, number> = {
  'users:ban': 20,
  'partners:block': 10,
  'notifications:broadcast': 3,
  'users:points_add': 50,
  'users:points_remove': 50,
};

/**
 * IP whitelist requirements for financial operations
 */
export const REQUIRES_IP_WHITELIST = [
  'revenue:export',
  'financial:reports',
  'analytics:export',
  'audit:export',
] as const;

export function requiresIPWhitelist(permission: Permission): boolean {
  return REQUIRES_IP_WHITELIST.includes(permission as any);
}
