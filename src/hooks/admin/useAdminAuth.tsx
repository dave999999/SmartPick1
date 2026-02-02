/**
 * Admin Authentication Hook
 * Manages admin session, role, and permissions
 */

import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { AdminRole, hasPermission, Permission } from '@/lib/admin/permissions';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  avatar?: string;
}

interface AdminAuthContextType {
  user: AdminUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  hasPermission: (permission: Permission) => boolean;
  logout: () => Promise<void>;
  checkAdminAccess: () => Promise<boolean>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
      } else {
        loadAdminUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadAdminUser(session.user);
      }
    } catch (error) {
      console.error('Session check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAdminUser = async (authUser: User) => {
    try {
      // Fetch user details from database
      const { data: userData, error } = await supabase
        .from('users')
        .select('id, email, name, role, avatar_url')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('Error fetching user data:', error);
        throw error;
      }

      console.log('User data loaded:', { email: userData.email, role: userData.role });

      // Check if user is admin (case-insensitive check)
      const userRole = userData.role?.toUpperCase();
      
      if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
        console.warn('User does not have admin role:', userRole);
        toast.error('Access denied: Admin privileges required');
        await supabase.auth.signOut();
        navigate('/');
        return;
      }
      
      console.log('Admin access granted for role:', userRole);

      // TODO: Get actual admin role from admin_users table
      // For now, default to ops_admin
      const adminRole = AdminRole.OPS_ADMIN;

      setUser({
        id: userData.id,
        email: userData.email,
        name: userData.name || 'Admin User',
        role: adminRole,
        avatar: userData.avatar_url,
      });
    } catch (error) {
      console.error('Load admin user error:', error);
      toast.error('Failed to load admin profile');
    }
  };

  const checkAdminAccessFn = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      // TODO: Add additional admin access checks
      // - Check if admin is active (not suspended)
      // - Check IP whitelist for sensitive operations
      // - Check 2FA status for super admin
      return true;
    } catch (error) {
      console.error('Admin access check error:', error);
      return false;
    }
  };

  const logoutFn = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out');
    }
  };

  const hasPermissionFn = (permission: Permission): boolean => {
    if (!user) return false;
    return hasPermission(user.role, permission);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        hasPermission: hasPermissionFn,
        logout: logoutFn,
        checkAdminAccess: checkAdminAccessFn,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
}

/**
 * Hook for requiring specific permission
 * Redirects to access denied if permission not granted
 */
export function useRequirePermission(permission: Permission) {
  const { hasPermission, loading } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !hasPermission(permission)) {
      toast.error('Access denied: Insufficient permissions');
      navigate('/admin');
    }
  }, [permission, hasPermission, loading, navigate]);

  return { hasPermission: hasPermission(permission), loading };
}

/**
 * Hook for requiring any of multiple permissions
 */
export function useRequireAnyPermission(permissions: Permission[]) {
  const { hasPermission, loading } = useAdminAuth();
  const navigate = useNavigate();
  const hasAny = permissions.some(p => hasPermission(p));

  useEffect(() => {
    if (!loading && !hasAny) {
      toast.error('Access denied: Insufficient permissions');
      navigate('/admin');
    }
  }, [permissions, hasAny, loading, navigate]);

  return { hasPermission: hasAny, loading };
}
