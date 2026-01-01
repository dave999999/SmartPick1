import { logger } from '@/lib/logger';
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // This page handles both:
    // 1. Email verification from confirmation link (email/password signup)
    // 2. OAuth callback redirects (Google Sign-In)
    // Supabase Auth automatically handles the token exchange via URL hash
    
    const checkVerification = async () => {
      try {
        // Wait a moment for Supabase to process the hash fragment
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check if user is authenticated after email confirmation or OAuth
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) throw error;
        
        if (user) {
          // User is authenticated - either via email verification or OAuth
          const isOAuth = user.app_metadata?.provider === 'google';
          const isEmailConfirmed = user.email_confirmed_at;
          
          if (isOAuth || isEmailConfirmed) {
            setStatus('success');
            setMessage(isOAuth 
              ? 'Successfully signed in with Google! Redirecting...'
              : 'Your email has been verified successfully! Redirecting...'
            );
            
            // Close auth dialog if still open and redirect
            setTimeout(() => {
              navigate('/', { replace: true });
            }, 1500);
          } else {
            setStatus('loading');
            setMessage('Verifying your email...');
          }
        } else {
          setStatus('loading');
          setMessage('Processing authentication...');
          
          // If still no user after 3 seconds, show error
          setTimeout(() => {
            setStatus('error');
            setMessage('Verification timeout. Please try again or contact support.');
          }, 3000);
        }
      } catch (error) {
        logger.error('Verification error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Verification failed. Please try again.');
      }
    };

    checkVerification();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === 'loading' && (
              <Loader2 className="w-16 h-16 text-green-600 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="w-16 h-16 text-green-600" />
            )}
            {status === 'error' && (
              <XCircle className="w-16 h-16 text-red-600" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {status === 'loading' && 'Verifying Your Email...'}
            {status === 'success' && '✅ Email Verified!'}
            {status === 'error' && '❌ Verification Failed'}
          </CardTitle>
          <CardDescription className="mt-2">
            {status === 'loading' && 'Please wait while we verify your email address.'}
            {status === 'success' && 'Your email has been successfully verified.'}
            {status === 'error' && 'We couldn\'t verify your email address.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-center">{message}</p>
          </div>

          {status === 'success' && (
            <div className="space-y-3">
              <Button
                onClick={() => navigate('/')}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Go to Homepage
              </Button>
              <Button
                onClick={() => navigate('/profile')}
                variant="outline"
                className="w-full"
              >
                View My Profile
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <Button
                onClick={() => navigate('/signup')}
                variant="outline"
                className="w-full"
              >
                Back to Signup
              </Button>
              <Button
                onClick={() => navigate('/contact')}
                variant="outline"
                className="w-full"
              >
                Contact Support
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
