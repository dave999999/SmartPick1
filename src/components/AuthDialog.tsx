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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to SmartPick</DialogTitle>
          <DialogDescription>
            Sign in to your account or create a new one
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant={partnerStatus ? 'default' : 'destructive'} className={partnerStatus === 'pending' ? 'bg-yellow-50 border-yellow-200' : partnerStatus === 'rejected' ? 'bg-red-50 border-red-200' : ''}>
            {partnerStatus === 'pending' ? (
              <Clock className="h-4 w-4 text-yellow-600" />
            ) : partnerStatus === 'rejected' ? (
              <XCircle className="h-4 w-4 text-red-600" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription className={partnerStatus === 'pending' ? 'text-yellow-900' : partnerStatus === 'rejected' ? 'text-red-900' : ''}>
              {error}
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="your@email.com"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="••••••••"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* CAPTCHA required for all sign-in attempts */}
              <div className="flex justify-center">
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
                className="w-full bg-mint-600 hover:bg-mint-700"
                disabled={isLoading || (showCaptcha && !captchaToken)}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <Mail className="mr-2 h-4 w-4" />
              Google
            </Button>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Full Name</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="John Doe"
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="your@email.com"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="••••••••"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground">
                  At least 6 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                <Input
                  id="signup-confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={signUpConfirmPassword}
                  onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="referral-code" className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-[#4CC9A8]" />
                  Referral Code (Optional)
                </Label>
                <Input
                  id="referral-code"
                  type="text"
                  placeholder="Enter referral code"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  disabled={isLoading}
                  className="uppercase"
                  maxLength={6}
                />
                {referralCode && (
                  <p className="text-xs text-[#4CC9A8] font-medium">
                    🎁 You and your friend will both get bonus points!
                  </p>
                )}
              </div>

              {/* CAPTCHA required for signup */}
              <div className="flex justify-center">
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
                className="w-full bg-mint-600 hover:bg-mint-700"
                disabled={isLoading || !captchaToken}
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <Mail className="mr-2 h-4 w-4" />
              Google
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
