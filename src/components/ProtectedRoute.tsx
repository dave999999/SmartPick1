import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getCurrentUser } from '@/lib/api';
import { logger } from '@/lib/logger';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute - Redirects to home with auth modal if user is not authenticated
 */
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    
    const checkAuth = async () => {
      try {
        const { user } = await getCurrentUser();
        if (!cancelled) {
          setIsAuthenticated(!!user);
          if (!user) {
            logger.log('🔒 Protected route access denied - user not authenticated', { path: location.pathname });
          }
        }
      } catch (error) {
        logger.error('Error checking authentication:', error);
        if (!cancelled) {
          setIsAuthenticated(false);
        }
      }
    };

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-white via-[#F0FFF9] to-[#E0F9F0]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to home with state indicating auth modal should open
  if (!isAuthenticated) {
    return <Navigate to="/" state={{ openAuth: true, from: location.pathname }} replace />;
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
};
