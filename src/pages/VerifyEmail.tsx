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
    // Supabase Auth automatically handles email verification
    // This page is shown after user clicks the confirmation link in their email
    // The verification happens automatically via the URL hash
    
    const checkVerification = async () => {
      try {
        // Check if user is authenticated after email confirmation
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) throw error;
        
        if (user && user.email_confirmed_at) {
          setStatus('success');
          setMessage('Your email has been verified successfully! Redirecting...');
          setTimeout(() => navigate('/'), 2000);
        } else {
          setStatus('loading');
          setMessage('Verifying your email...');
        }
      } catch (error) {
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
