import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { getPartnerByUserId } from '@/lib/api';
import { applyReferralCode } from '@/lib/gamification-api';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { checkRateLimit } from '@/lib/rateLimiter';
import { checkServerRateLimit, recordClientAttempt } from '@/lib/rateLimiter-server';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Mail, Clock, XCircle, Gift, Shield, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Turnstile } from '@marsidev/react-turnstile';
import { OnboardingDialog } from './OnboardingDialog';
import { TermsAcceptanceDialog } from './TermsAcceptanceDialog';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultTab?: 'signin' | 'signup';
}

export default function AuthDialog({ open, onOpenChange, onSuccess, defaultTab = 'signin' }: AuthDialogProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isOnline = useOnlineStatus();
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

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [newUserId, setNewUserId] = useState<string | null>(null);
  const [newUserName, setNewUserName] = useState<string>('');

  // Terms acceptance state
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);

  // Email verification state
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState('');

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

    if (!isOnline) {
      setError('No internet connection. Please check your network.');
      return;
    }

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
            setTimeout(() => {
              onOpenChange(false);
              setTimeout(() => {
                navigate('/partner');
              }, 100);
            }, 0);
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
        setTimeout(() => {
          onOpenChange(false);
          if (onSuccess) onSuccess();
        }, 0);
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

    if (!isOnline) {
      setError('No internet connection. Please check your network.');
      return;
    }

    // Validation
    if (!signUpName.trim()) {
      setError('Please enter your name');
      return;
    }

    // LEGAL REQUIREMENT: Check terms acceptance
    if (!termsAccepted) {
      setError('You must accept the Terms & Conditions and Privacy Policy to create an account');
      toast.error('Please accept the Terms & Conditions to continue', {
        icon: <FileText className="w-4 h-4" />,
      });
      return;
    }

    // Require CAPTCHA for signup
    if (!captchaToken) {
      setError('Please complete the CAPTCHA verification');
      setShowCaptcha(true);
      return;
    }

    if (signUpPassword !== signUpConfirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (signUpPassword.length < 12) {
      setError('Password must be at least 12 characters with uppercase, lowercase, and number');
      return;
    }

    // Stronger password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{12,}$/;
    if (!passwordRegex.test(signUpPassword)) {
      setError('Password must contain uppercase, lowercase, and number');
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
      // Step 1: Create user account WITHOUT sending verification email
      const { data, error } = await supabase.auth.signUp({
        email: signUpEmail,
        password: signUpPassword,
        options: {
          data: {
            name: signUpName,
            role: 'CUSTOMER',
            terms_accepted_at: new Date().toISOString(), // LEGAL: Record terms acceptance timestamp
          },
          captchaToken: captchaToken,
          emailRedirectTo: undefined, // Don't use Supabase's email verification
        },
      });

      if (error) throw error;

      if (data.user) {
        // Store terms acceptance in users table (in addition to metadata)
        // Wait for the trigger to create the user row first
        setTimeout(async () => {
          try {
            const { error: updateError } = await supabase
              .from('users')
              .update({
                terms_accepted_at: new Date().toISOString(),
                terms_version: '1.0', // Track which version they agreed to
              })
              .eq('id', data.user.id);
            
            if (updateError) {
              logger.warn('Failed to update terms acceptance:', updateError);
            }
          } catch (err) {
            // Non-critical - terms are already in user metadata
            logger.warn('Failed to update terms acceptance in users table:', err);
          }
        }, 1000); // Wait 1 second for trigger to complete

        // Step 2: Send verification email via Edge Function
        try {
          const { data: functionData, error: functionError } = await supabase.functions.invoke(
            'send-verification-email',
            {
              body: {
                email: signUpEmail,
                name: signUpName,
                userId: data.user.id,
              },
            }
          );

          if (functionError) {
            logger.error('Failed to send verification email:', functionError);
            toast.warning('Account created, but verification email failed. Please request a new one.', {
              duration: 8000,
            });
          }
        } catch (emailError) {
          logger.error('Error calling send-verification-email function:', emailError);
          toast.warning('Account created, but verification email failed. Please request a new one.', {
            duration: 8000,
          });
        }
        
        // Show email verification message prominently
        setConfirmationEmail(signUpEmail);
        setShowEmailConfirmation(true);
        
        toast.success(`📧 Account created! Please check ${signUpEmail} for a verification link.`, {
          duration: 8000,
          icon: <Mail className="w-4 h-4" />,
        });

        // Apply referral code AFTER a short delay to let trigger complete
        if (referralCode.trim()) {
          // Wait for profile creation trigger to finish (up to 2s)
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const result = await applyReferralCode(data.user.id, referralCode.trim());
          if (result.success) {
            if (result.flagged) {
              // Referral succeeded but was flagged for review
              toast.info(`Welcome bonus: 100 points. Referral is being reviewed for security.`, {
                duration: 5000,
              });
            } else {
              toast.success(`Welcome bonus: 100 points. Your friend received ${result.pointsAwarded} points!`);
            }
          } else {
            // Show specific error message from fraud detection
            logger.warn('Referral code application failed:', result.error);
            if (!result.error?.includes('limit') && !result.error?.includes('restricted') && !result.error?.includes('flagged')) {
              toast.info('Welcome bonus: 100 points', { duration: 4000 });
            }
          }
        } else {
          toast.info('Welcome bonus: 100 points added to your account!', { duration: 4000 });
        }

        // Don't close dialog - let user dismiss the confirmation message
        // Store user data for onboarding later (after email verification)
        setNewUserId(data.user.id);
        setNewUserName(signUpName);
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
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/verify-email`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
      
      // Show email confirmation message for OAuth signups too
      if (data) {
        toast.info('Please check your email to verify your account', {
          duration: 8000,
          icon: <Mail className="w-4 h-4" />,
        });
      }
    } catch (err) {
      logger.error('Google sign in error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in with Google';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-none shadow-2xl p-0 overflow-y-auto max-h-[90vh] flex flex-col bg-gradient-to-b from-white via-gray-50 to-white">
        {/* Header with Elegant Gradient Background */}
        <div className="bg-gradient-to-br from-teal-400 via-emerald-400 to-cyan-400 px-6 pt-8 pb-8 text-center relative overflow-hidden flex-shrink-0">
          {/* Decorative animated gradient circles */}
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-gradient-to-br from-white/20 to-emerald-300/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-gradient-to-tr from-cyan-300/20 to-white/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
          
          <div className="flex justify-center mb-5 relative">
            <div className="bg-white/30 backdrop-blur-md rounded-full p-4 shadow-2xl ring-2 ring-white/30">
              <img src="/icon1.png" alt="SmartPick" className="h-16 w-16 drop-shadow-lg" />
            </div>
          </div>
          <DialogTitle className="text-2xl sm:text-3xl font-extrabold text-white mb-2 tracking-tight drop-shadow-md">Welcome to SmartPick</DialogTitle>
          <DialogDescription className="text-white/95 text-sm sm:text-base font-medium drop-shadow-sm">
            Quality meals, incredible value ✨
          </DialogDescription>
        </div>

        <div className="px-6 py-7 overflow-y-auto flex-1">
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
            <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-teal-50 via-emerald-50 to-cyan-50 p-1.5 rounded-2xl mb-8 border border-teal-100 shadow-sm">
              <TabsTrigger 
                value="signin" 
                className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-teal-600 data-[state=active]:border data-[state=active]:border-teal-200 font-semibold transition-all duration-300 text-gray-600 hover:text-teal-600"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger 
                value="signup" 
                className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-teal-600 data-[state=active]:border data-[state=active]:border-teal-200 font-semibold transition-all duration-300 text-gray-600 hover:text-teal-600"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-5 mt-0">
              {/* PROMINENT GOOGLE SIGN-IN */}
              <Button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full h-13 bg-white hover:bg-gray-50 text-gray-800 border-2 border-gray-200 hover:border-teal-400 hover:shadow-lg rounded-2xl font-semibold shadow-md transition-all duration-300 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-teal-50/0 via-teal-50/50 to-teal-50/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <svg className="mr-3 h-5 w-5 transition-transform group-hover:scale-110 duration-300 relative z-10" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="relative z-10">Continue with Google</span>
              </Button>

              <div className="relative my-7">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gradient-to-r from-transparent via-gray-200 to-transparent" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-gradient-to-r from-gray-50 via-white to-gray-50 px-4 py-1 text-gray-500 font-medium rounded-full">Or sign in with email</span>
                </div>
              </div>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-sm font-semibold text-gray-700">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="your@email.com"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('signin-password')?.focus();
                      }
                    }}
                    required
                    disabled={isLoading}
                    className="h-12 rounded-xl border-2 border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white hover:border-teal-300 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signin-password" className="text-sm font-semibold text-gray-700">Password</Label>
                    <Link 
                      to="/forgot-password" 
                      className="text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline decoration-2 underline-offset-2 transition-all"
                      onClick={() => setTimeout(() => onOpenChange(false), 0)}
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="signin-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur(); // Dismiss keyboard
                      }
                    }}
                    required
                    disabled={isLoading}
                    className="h-12 rounded-xl border-2 border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white hover:border-teal-300 transition-colors"
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
                  className="w-full h-13 bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 hover:from-teal-600 hover:via-emerald-600 hover:to-cyan-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-base relative overflow-hidden group"
                  disabled={isLoading || (showCaptcha && !captchaToken) || !isOnline}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  <span className="relative z-10">{isLoading ? '🔄 Signing in...' : !isOnline ? '📡 Offline' : '✨ Sign In'}</span>
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-0">
              {showEmailConfirmation ? (
                /* EMAIL CONFIRMATION MESSAGE */
                <div className="py-8 px-4 text-center space-y-6">
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="absolute inset-0 bg-teal-400 blur-2xl opacity-40 rounded-full"></div>
                      <div className="relative bg-gradient-to-br from-teal-50 to-emerald-50 p-6 rounded-full border-4 border-teal-100">
                        <Mail className="w-16 h-16 text-teal-600" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold text-gray-900">
                      Check Your Email!
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      We've sent a verification link to
                    </p>
                    <p className="text-lg font-semibold text-teal-600 break-all px-4">
                      {confirmationEmail}
                    </p>
                  </div>

                  <Alert className="border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50">
                    <AlertCircle className="h-5 w-5 text-teal-600" />
                    <AlertDescription className="text-left text-sm text-gray-900">
                      <strong className="block mb-2">Next Steps:</strong>
                      <ol className="list-decimal list-inside space-y-1 text-xs">
                        <li>Open your email inbox</li>
                        <li>Find the email from SmartPick (check spam folder)</li>
                        <li>Click the verification link</li>
                        <li>You'll be redirected back to complete setup</li>
                      </ol>
                      <p className="mt-3 text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                        <strong>⚠️ Note:</strong> If no email arrives within 5 minutes, email verification might not be configured in Supabase settings. Contact support or sign in to continue.
                      </p>
                    </AlertDescription>
                  </Alert>

                  <div className="pt-4">
                    <Button
                      onClick={() => {
                        setTimeout(() => {
                          setShowEmailConfirmation(false);
                          onOpenChange(false);
                        }, 0);
                      }}
                      variant="outline"
                      className="w-full h-11 border-2 border-gray-200 hover:border-teal-400 hover:bg-teal-50 rounded-xl font-semibold transition-all"
                    >
                      Got it!
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* PROMINENT GOOGLE SIGN-UP */}
                  <Button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full h-13 bg-white hover:bg-gray-50 text-gray-800 border-2 border-gray-200 hover:border-teal-400 hover:shadow-lg rounded-2xl font-semibold shadow-md transition-all duration-300 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-teal-50/0 via-teal-50/50 to-teal-50/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                    <svg className="mr-3 h-5 w-5 transition-transform group-hover:scale-110 duration-300 relative z-10" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span className="relative z-10">Continue with Google</span>
                  </Button>

                  <div className="relative my-7">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gradient-to-r from-transparent via-gray-200 to-transparent" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-gradient-to-r from-gray-50 via-white to-gray-50 px-4 py-1 text-gray-500 font-medium rounded-full">Or create account with email</span>
                    </div>
                  </div>

                  <form onSubmit={handleSignUp} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-name" className="text-sm font-semibold text-gray-700">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    autoComplete="name"
                    placeholder="John Doe"
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('signup-email')?.focus();
                      }
                    }}
                    required
                    disabled={isLoading}
                    className="h-11 rounded-xl border-2 border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white hover:border-teal-300 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-email" className="text-sm font-semibold text-gray-700">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="your@email.com"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('signup-password')?.focus();
                      }
                    }}
                    required
                    disabled={isLoading}
                    className="h-11 rounded-xl border-2 border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white hover:border-teal-300 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-password" className="text-sm font-semibold text-gray-700">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••••••"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('signup-confirm-password')?.focus();
                      }
                    }}
                    required
                    disabled={isLoading}
                    minLength={12}
                    className="h-11 rounded-xl border-2 border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white hover:border-teal-300 transition-colors"
                  />
                  <p className="text-xs text-gray-500">
                    Min 12 characters with uppercase, lowercase, number
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-confirm-password" className="text-sm font-semibold text-gray-700">Confirm Password</Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••••••"
                    value={signUpConfirmPassword}
                    onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur(); // Dismiss keyboard before submit
                      }
                    }}
                    required
                    disabled={isLoading}
                    minLength={12}
                    className="h-11 rounded-xl border-2 border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white hover:border-teal-300 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="referral-code" className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
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
                    className="h-11 rounded-xl border-2 border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white hover:border-teal-300 transition-colors uppercase"
                    maxLength={6}
                  />
                  {referralCode && (
                    <div className="flex items-center gap-1.5 p-1.5 bg-teal-50 rounded-lg border border-teal-200">
                      <Gift className="w-3 h-3 text-teal-600 flex-shrink-0" />
                      <p className="text-[10px] text-teal-700 font-medium leading-tight">
                        You and your friend will both get bonus points!
                      </p>
                    </div>
                  )}
                </div>

                {/* LEGAL REQUIREMENT: Terms & Conditions Acceptance */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-start space-x-2.5 p-3 border-2 rounded-xl transition-colors" style={{
                    borderColor: termsAccepted ? 'rgb(20 184 166)' : error && !termsAccepted ? 'rgb(239 68 68)' : 'rgb(229 231 235)',
                    backgroundColor: termsAccepted ? 'rgb(240 253 250)' : error && !termsAccepted ? 'rgb(254 242 242)' : 'transparent'
                  }}>
                    <Checkbox
                      id="terms-acceptance"
                      checked={termsAccepted}
                      onCheckedChange={(checked) => {
                        // When user clicks checkbox to CHECK it, open the terms dialog automatically
                        if (checked && !termsAccepted) {
                          setShowTermsDialog(true);
                          // Don't set termsAccepted yet - wait for user to scroll and click Accept
                        } else if (!checked) {
                          // Allow unchecking
                          setTermsAccepted(false);
                        }
                        if (checked) setError(null);
                      }}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <label
                        htmlFor="terms-acceptance"
                        className="text-xs text-gray-700 cursor-pointer leading-relaxed"
                      >
                        I agree to the{' '}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setShowTermsDialog(true);
                          }}
                          className="text-teal-600 hover:text-teal-700 underline font-medium"
                        >
                          Terms & Conditions
                        </button>
                        {' '}and{' '}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setShowTermsDialog(true);
                          }}
                          className="text-teal-600 hover:text-teal-700 underline font-medium"
                        >
                          Privacy Policy
                        </button>
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <p className="text-[10px] text-gray-500 mt-1 leading-tight">
                        <Shield className="inline h-3 w-3 mr-0.5" />
                        You confirm you're 18+ and agree to our terms
                      </p>
                    </div>
                  </div>
                  {!termsAccepted && error && error.includes('Terms') && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      You must accept the terms to continue
                    </p>
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
                  className="w-full h-13 bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 hover:from-teal-600 hover:via-emerald-600 hover:to-cyan-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-base relative overflow-hidden group"
                  disabled={isLoading || !captchaToken || !isOnline || !termsAccepted}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  <span className="relative z-10">{isLoading ? '🎉 Creating account...' : !isOnline ? '📡 Offline' : '✨ Create Account'}</span>
                </Button>
              </form>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>

    {/* Onboarding Dialog - shown after successful signup */}
    {showOnboarding && (
      <OnboardingDialog
        open={showOnboarding}
        onComplete={() => {
          setShowOnboarding(false);
          setNewUserId(null);
          setNewUserName('');
          // Navigate to home to start browsing
          navigate('/');
          toast.success('🎉 You\'re all set! Start exploring offers now!');
        }}
        userName={newUserName}
      />
    )}

    {/* Terms Acceptance Dialog - shown when user clicks to read terms */}
    <TermsAcceptanceDialog
      open={showTermsDialog}
      onOpenChange={setShowTermsDialog}
      alreadyAccepted={termsAccepted}
      onAccept={() => {
        setTermsAccepted(true);
        setError(null);
        toast.success('Terms accepted! You can now create your account.', {
          icon: <FileText className="w-4 h-4" />,
        });
      }}
    />
    </>
  );
}
