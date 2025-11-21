import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail } from '../lib/api/email-verification';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Mail, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      await sendPasswordResetEmail(email);
      setIsSuccess(true);
      toast.success('Password reset email sent! Check your inbox.');
    } catch (error) {
      if (error instanceof Error && error.message.includes('Rate limit')) {
        toast.error(error.message);
      } else {
        toast.error('Failed to send reset email. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-cyan-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-none">
          <CardHeader className="text-center bg-gradient-to-br from-teal-400 via-emerald-400 to-cyan-400 text-white rounded-t-xl pb-8 pt-10">
            <div className="mx-auto mb-4 w-20 h-20 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center ring-2 ring-white/30 shadow-xl">
              <Mail className="w-10 h-10 text-white drop-shadow-lg" />
            </div>
            <CardTitle className="text-3xl font-bold drop-shadow-md">📧 Check Your Email</CardTitle>
            <CardDescription className="text-white/95 text-base mt-2">
              We've sent a password reset link to <strong className="text-white">{email}</strong>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 pt-6 pb-6">
            <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border-2 border-teal-200 rounded-xl p-5 space-y-3">
              <p className="text-sm text-teal-900 font-semibold">
                <strong>Next steps:</strong>
              </p>
              <ol className="text-sm text-teal-800 list-decimal list-inside space-y-2 ml-2">
                <li>Check your email inbox (and spam folder)</li>
                <li>Click the reset link in the email</li>
                <li>Create your new password</li>
              </ol>
              <p className="text-xs text-teal-700 mt-3 flex items-center gap-1">
                ⏱️ The link expires in 30 minutes for security.
              </p>
            </div>

            <Button
              onClick={() => navigate('/')}
              className="w-full h-12 bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 hover:from-teal-600 hover:via-emerald-600 hover:to-cyan-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Back to Home
            </Button>

            <div className="text-center">
              <button
                onClick={() => setIsSuccess(false)}
                className="text-sm text-muted-foreground hover:underline"
              >
                Didn't receive the email? Try again
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-cyan-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-none">
        <CardHeader className="text-center bg-gradient-to-br from-teal-400 via-emerald-400 to-cyan-400 text-white rounded-t-xl pb-8 pt-10 relative overflow-hidden">
          {/* Decorative animated gradient circles */}
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-gradient-to-br from-white/20 to-emerald-300/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-gradient-to-tr from-cyan-300/20 to-white/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          
          <div className="mx-auto mb-4 w-20 h-20 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center ring-2 ring-white/30 shadow-xl relative z-10">
            <Mail className="w-10 h-10 text-white drop-shadow-lg" />
          </div>
          <CardTitle className="text-3xl font-bold drop-shadow-md relative z-10">Forgot Password?</CardTitle>
          <CardDescription className="text-white/95 text-base mt-2 relative z-10">
            No worries! Enter your email and we'll send you a reset link. ✨
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-gray-700">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="h-12 rounded-xl border-2 border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white hover:border-teal-300 transition-colors"
              />
            </div>

            <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border-2 border-teal-200 rounded-xl p-4">
              <p className="text-xs text-teal-700 flex items-center gap-2">
                🔒 For security, you can only request 3 reset emails per 15 minutes.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-13 bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 hover:from-teal-600 hover:via-emerald-600 hover:to-cyan-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-base relative overflow-hidden group"
              disabled={isLoading}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <span className="relative z-10">{isLoading ? '📧 Sending...' : '✨ Send Reset Link'}</span>
            </Button>

            <div className="text-center pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/')}
                className="text-sm text-teal-600 hover:text-teal-700 hover:bg-teal-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
