import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Mail, CheckCircle } from 'lucide-react';

export const VerifyRequested = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">📧 Verification Email Sent!</CardTitle>
          <CardDescription>
            We've sent a verification email to your inbox.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
            <div className="flex items-start space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-900">Check your email</p>
                <p className="text-xs text-green-700">Look for an email from SmartPick (no-reply@smartpick.ge)</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-900">Click the verification link</p>
                <p className="text-xs text-green-700">The link is valid for 30 minutes</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-900">Start using SmartPick!</p>
                <p className="text-xs text-green-700">Once verified, you can make reservations and earn points</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-900">
              <strong>💡 Tip:</strong> Check your spam/junk folder if you don't see the email within 5 minutes.
            </p>
          </div>

          <Button
            onClick={() => navigate('/')}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            Go to Homepage
          </Button>

          <div className="text-center">
            <button
              onClick={() => navigate('/contact')}
              className="text-sm text-muted-foreground hover:underline"
            >
              Didn't receive the email? Contact support
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
