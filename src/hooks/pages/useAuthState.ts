/**
 * useAuthState - Authentication and onboarding state management
 * 
 * Manages user authentication state, auth dialogs, and onboarding flow.
 * Extracted from IndexRedesigned.tsx to improve maintainability.
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { User } from '@/lib/types';
import { getCurrentUser } from '@/lib/api-lite';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export interface AuthState {
  user: User | null;
  showAuthDialog: boolean;
  showOnboarding: boolean;
  defaultAuthTab: 'signin' | 'signup';
  setUser: (user: User | null) => void;
  setShowAuthDialog: (show: boolean) => void;
  setShowOnboarding: (show: boolean) => void;
  setDefaultAuthTab: (tab: 'signin' | 'signup') => void;
  checkUser: () => Promise<void>;
}

export function useAuthState(): AuthState {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [defaultAuthTab, setDefaultAuthTab] = useState<'signin' | 'signup'>('signin');

  // Check and load current user, including onboarding status
  const checkUser = async () => {
    const { user } = await getCurrentUser();
    setUser(user);
    
    // Check if user needs to see onboarding tutorial
    if (user) {
      logger.info('🔍 Checking onboarding status for user:', user.id);
      try {
        const { data: userData, error } = await supabase
          .from('users')
          .select('onboarding_completed')
          .eq('id', (user as any).id)
          .single();

        if (error) {
          logger.error('❌ Error checking onboarding status:', error);
          return;
        }

        // Show onboarding if not completed
        if (!userData?.onboarding_completed) {
          logger.info('🎓 User has not completed onboarding, showing dialog');
          setShowOnboarding(true);
        } else {
          logger.info('✅ User has completed onboarding');
        }
      } catch (error) {
        logger.error('❌ Exception checking onboarding status:', error);
      }
    }
  };

  // Listen for auth state changes (sign in, sign out, token refresh)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        checkUser();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle referral parameter in URL (?ref=ABC123)
  useEffect(() => {
    const refParam = searchParams.get('ref');
    if (refParam) {
      setDefaultAuthTab('signup');
      setShowAuthDialog(true);
      toast.success(`🎁 Welcome! Referral code ${refParam.toUpperCase()} is ready to use!`);
    }
  }, [searchParams]);

  // Handle redirect from protected routes - open auth modal if user was redirected
  useEffect(() => {
    const state = location.state as { openAuth?: boolean; from?: string } | null;
    if (state?.openAuth) {
      setShowAuthDialog(true);
      setDefaultAuthTab('signin');
      if (state.from) {
        logger.log('🔒 User redirected from protected route:', state.from);
        toast.info('Please sign in to continue');
      }
    }
  }, [location]);

  // Check user on mount
  useEffect(() => {
    checkUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    user,
    showAuthDialog,
    showOnboarding,
    defaultAuthTab,
    setUser,
    setShowAuthDialog,
    setShowOnboarding,
    setDefaultAuthTab,
    checkUser,
  };
}
