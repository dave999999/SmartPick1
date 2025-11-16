import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { getPartnerByUserId } from '@/lib/api';
import { applyReferralCode } from '@/lib/gamification-api';
import { checkRateLimit } from '@/lib/rateLimiter';
import { checkServerRateLimit, recordClientAttempt } from '@/lib/rateLimiter-server';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Mail, Clock, XCircle, Gift, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Turnstile } from '@marsidev/react-turnstile';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultTab?: 'signin' | 'signup';
}

export default function AuthDialog({ open, onOpenChange, onSuccess, defaultTab = 'signin' }: AuthDialogProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partnerStatus, setPartnerStatus] = useState<string | null>(null);

  // Sign In state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Sign Up state
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  
  // CAPTCHA state
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  // Check for referral code in URL on mount
  useEffect(() => {
    const refParam = searchParams.get('ref');
    if (refParam) {
      setReferralCode(refParam.toUpperCase());
      toast.success(`🎁 Referral code ${refParam.toUpperCase()} applied! You and your friend will get bonus points!`);
    }
  }, [searchParams]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPartnerStatus(null);

    // CAPTCHA is required for all sign-in attempts (Supabase requires it)
    if (!captchaToken) {
      setShowCaptcha(true);
      setError('Please complete the CAPTCHA verification');
      return;
    }

    // SERVER-SIDE Rate limiting: 5 attempts per 15 minutes
    // First check client-side for fast feedback
    const clientRateLimit = await checkRateLimit('login', signInEmail);
    if (!clientRateLimit.allowed) {
      setError(clientRateLimit.message || 'Too many login attempts. Please try again later.');
      toast.error(clientRateLimit.message, {
        icon: <Shield className="w-4 h-4" />,
      });
      return;
    }

    setIsLoading(true);

    // Then check server-side (authoritative)
    const serverRateLimit = await checkServerRateLimit('login', signInEmail);
    if (!serverRateLimit.allowed) {
      setIsLoading(false);
      setError(serverRateLimit.message || 'Too many login attempts. Please try again later.');
      toast.error(serverRateLimit.message, {
        icon: <Shield className="w-4 h-4" />,
      });
      recordClientAttempt('login', signInEmail); // Sync client cache
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInEmail,
        password: signInPassword,
        options: {
          captchaToken: captchaToken || undefined,
        },
      });

      if (error) throw error;

      if (data.user) {
        // CHECK IF USER IS BANNED FIRST
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('is_banned, role')
          .eq('id', data.user.id)
          .single();

        if (userError) {
          logger.error('Error checking ban status:', userError);
        }

        if (userData?.is_banned) {
          setError('Your account has been banned. Please contact support for more information.');
          await supabase.auth.signOut();
          setSignInEmail('');
          setSignInPassword('');
          return;
        }

        // Success - reset failed attempts and captcha
        setFailedAttempts(0);
        setCaptchaToken(null);
        setShowCaptcha(false);
        
        // Check if user is a partner
        const partner = await getPartnerByUserId(data.user.id);
        
        if (partner) {
          // Handle partner login based on status
          if (partner.status === 'APPROVED') {
            toast.success('Welcome back! Redirecting to Partner Dashboard...');
            onOpenChange(false);
            setTimeout(() => {
              navigate('/partner');
            }, 500);
            return;
          } else if (partner.status === 'PENDING') {
            setPartnerStatus('pending');
            setError('Your partner account is under review. We will notify you once approved.');
            // Sign out the user since they can't access partner dashboard yet
            await supabase.auth.signOut();
            return;
          } else if (partner.status === 'REJECTED' || partner.status === 'BLOCKED') {
            setPartnerStatus('rejected');
            setError('Your partner application was not approved. Please contact support for more information.');
            // Sign out the user
            await supabase.auth.signOut();
            return;
          }
        }
        
        // Regular customer login
        toast.success('Successfully signed in!');
        onOpenChange(false);
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      logger.error('Sign in error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in';
      setError(errorMessage);
      
      // Increment failed attempts and show CAPTCHA after 2 failures
      setFailedAttempts(prev => prev + 1);
      if (failedAttempts + 1 >= 2) {
        setShowCaptcha(true);
      }
      
      // Reset CAPTCHA token for retry
      setCaptchaToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Require CAPTCHA for signup
    if (!captchaToken) {
      setError('Please complete the CAPTCHA verification');
      setShowCaptcha(true);
      return;
    }

    // Validation
    if (!signUpName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (signUpPassword !== signUpConfirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (signUpPassword.length < 12) {
      setError('Password must be at least 12 characters with uppercase, lowercase, number, and symbol');
      return;
    }

    // Stronger password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
    if (!passwordRegex.test(signUpPassword)) {
      setError('Password must contain uppercase, lowercase, number, and special character');
      return;
    }

    // SERVER-SIDE Rate limiting: 3 attempts per hour
    // First check client-side for fast feedback
    const clientRateLimit = await checkRateLimit('signup', signUpEmail);
    if (!clientRateLimit.allowed) {
      setError(clientRateLimit.message || 'Too many signup attempts. Please try again later.');
      toast.error(clientRateLimit.message, {
        icon: <Shield className="w-4 h-4" />,
      });
      return;
    }

    setIsLoading(true);

    // Then check server-side (authoritative)
    const serverRateLimit = await checkServerRateLimit('signup', signUpEmail);
    if (!serverRateLimit.allowed) {
      setIsLoading(false);
      setError(serverRateLimit.message || 'Too many signup attempts. Please try again later.');
      toast.error(serverRateLimit.message, {
        icon: <Shield className="w-4 h-4" />,
      });
      recordClientAttempt('signup', signUpEmail); // Sync client cache
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: signUpEmail,
        password: signUpPassword,
        options: {
          data: {
            name: signUpName,
            role: 'CUSTOMER',
          },
          captchaToken: captchaToken,
        },
      });

      if (error) throw error;

      if (data.user) {
        // Apply referral code AFTER a short delay to let trigger complete
        if (referralCode.trim()) {
          // Wait for profile creation trigger to finish (up to 2s)
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const result = await applyReferralCode(data.user.id, referralCode.trim());
          if (result.success) {
            toast.success(`🎉 Account created! Welcome bonus: 100 points. Your friend received ${result.pointsAwarded} points!`);
          } else {
            // Still show success even if referral failed
            logger.warn('Referral code application failed:', result.error);
            toast.success('Account created successfully! Welcome bonus: 100 points');
          }
        } else {
          toast.success('Account created successfully! Welcome bonus: 100 points');
        }

        onOpenChange(false);
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      logger.error('Sign up error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create account';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;
    } catch (err) {
      logger.error('Google sign in error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in with Google';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
        {/* Header with Gradient Background */}
        <div className="bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600 px-6 pt-8 pb-6 text-center">
          <div className="flex justify-center mb-3">
            <img src="/icon1.png" alt="SmartPick" className="h-16 w-16" />
          </div>
          <DialogTitle className="text-2xl font-bold text-white mb-1">Welcome to SmartPick</DialogTitle>
          <DialogDescription className="text-teal-50 text-sm">
            Save food, save money, save the planet
          </DialogDescription>
        </div>

        <div className="px-6 py-6">
          {error && (
            <Alert variant={partnerStatus ? 'default' : 'destructive'} className={`mb-4 ${partnerStatus === 'pending' ? 'bg-yellow-50 border-yellow-200' : partnerStatus === 'rejected' ? 'bg-red-50 border-red-200' : 'bg-red-50 border-red-200'}`}>
              {partnerStatus === 'pending' ? (
                <Clock className="h-4 w-4 text-yellow-600" />
              ) : partnerStatus === 'rejected' ? (
                <XCircle className="h-4 w-4 text-red-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={partnerStatus === 'pending' ? 'text-yellow-900 text-sm' : partnerStatus === 'rejected' ? 'text-red-900 text-sm' : 'text-red-900 text-sm'}>
                {error}
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-xl mb-6">
              <TabsTrigger value="signin" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4 mt-0">
              {/* PROMINENT GOOGLE SIGN-IN */}
              <Button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full h-12 bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-200 hover:border-teal-500 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-300 group"
              >
                <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-gray-500 font-medium">Or sign in with email</span>
                </div>
              </div>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-sm font-medium text-gray-700">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="your@email.com"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-11 rounded-xl border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-sm font-medium text-gray-700">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-11 rounded-xl border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                  />
                </div>

                {/* CAPTCHA - Compact */}
                <div className="flex justify-center py-2">
                  <Turnstile
                    siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAACABKnWhPNRi7fs'}
                    onSuccess={(token) => {
                      setCaptchaToken(token);
                      setError(null);
                    }}
                    onExpire={() => setCaptchaToken(null)}
                    onError={() => {
                      setError('CAPTCHA verification failed. Please try again.');
                    }}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  disabled={isLoading || (showCaptcha && !captchaToken)}
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-0">
              {/* PROMINENT GOOGLE SIGN-UP */}
              <Button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full h-12 bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-200 hover:border-teal-500 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-300"
              >
                <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-gray-500 font-medium">Or create account with email</span>
                </div>
              </div>

              <form onSubmit={handleSignUp} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-name" className="text-sm font-medium text-gray-700">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-11 rounded-xl border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-email" className="text-sm font-medium text-gray-700">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-11 rounded-xl border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-password" className="text-sm font-medium text-gray-700">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••••••"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    minLength={12}
                    className="h-11 rounded-xl border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                  />
                  <p className="text-xs text-gray-500">
                    Min 12 characters with uppercase, lowercase, number & symbol
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-confirm-password" className="text-sm font-medium text-gray-700">Confirm Password</Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    placeholder="••••••••••••"
                    value={signUpConfirmPassword}
                    onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    minLength={12}
                    className="h-11 rounded-xl border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="referral-code" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Gift className="w-4 h-4 text-teal-500" />
                    Referral Code (Optional)
                  </Label>
                  <Input
                    id="referral-code"
                    type="text"
                    placeholder="FRIEND123"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    disabled={isLoading}
                    className="h-11 rounded-xl border-gray-200 focus:border-teal-500 focus:ring-teal-500 uppercase"
                    maxLength={6}
                  />
                  {referralCode && (
                    <div className="flex items-center gap-2 p-2 bg-teal-50 rounded-lg border border-teal-200">
                      <Gift className="w-4 h-4 text-teal-600 flex-shrink-0" />
                      <p className="text-xs text-teal-700 font-medium">
                        You and your friend will both get bonus points!
                      </p>
                    </div>
                  )}
                </div>

                {/* CAPTCHA - Compact */}
                <div className="flex justify-center py-2">
                  <Turnstile
                    siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAACABKnWhPNRi7fs'}
                    onSuccess={(token) => {
                      setCaptchaToken(token);
                      setError(null);
                    }}
                    onExpire={() => {
                      setCaptchaToken(null);
                      setError('CAPTCHA expired. Please verify again.');
                    }}
                    onError={() => {
                      setError('CAPTCHA verification failed. Please try again.');
                    }}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  disabled={isLoading || !captchaToken}
                >
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
