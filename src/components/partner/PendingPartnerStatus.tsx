import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, ShoppingBag, Package, TrendingUp, AlertCircle, PlayCircle, Mail, Phone, FileText, Building2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface PendingPartnerStatusProps {
  businessName: string;
  applicationDate: string;
}

export default function PendingPartnerStatus({ businessName, applicationDate }: PendingPartnerStatusProps) {
  const { t } = useI18n();
  
  // Calculate expected approval time (24-48 hours)
  const appDate = new Date(applicationDate);
  const minApprovalDate = new Date(appDate.getTime() + 24 * 60 * 60 * 1000);
  const maxApprovalDate = new Date(appDate.getTime() + 48 * 60 * 60 * 1000);
  const now = new Date();
  const hoursElapsed = Math.floor((now.getTime() - appDate.getTime()) / (1000 * 60 * 60));
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  
  const getTimeRemaining = () => {
    const maxHours = 48;
    const remaining = Math.max(0, maxHours - hoursElapsed);
    if (remaining > 24) {
      return `${Math.floor(remaining / 24)} day${Math.floor(remaining / 24) !== 1 ? 's' : ''}`;
    }
    return `${remaining} hour${remaining !== 1 ? 's' : ''}`;
  };

  const tutorialSteps = [
    {
      icon: <PlayCircle className="h-5 w-5" />,
      title: t('Create Your First Offer'),
      description: t('Add food items with photos, set quantities and pickup windows'),
    },
    {
      icon: <Package className="h-5 w-5" />,
      title: t('Manage Reservations'),
      description: t('Track customer pickups and scan QR codes for verification'),
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      title: t('Monitor Performance'),
      description: t('View analytics on sales, popular items, and revenue trends'),
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Status Alert */}
      <Alert className="mb-6 border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50">
        <Clock className="h-5 w-5 text-yellow-600" />
        <AlertDescription className="ml-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1">
              <p className="font-semibold text-yellow-900 text-lg mb-1">
                🎉 Application Successfully Submitted!
              </p>
              <p className="text-sm text-yellow-800 mb-2">
                Your partner application for <strong>{businessName}</strong> is being reviewed by our team.
              </p>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-yellow-700">
                  ⏱️ Submitted: {formatDate(appDate)}
                </span>
                <span className="text-yellow-700">
                  ⏳ Est. review: {getTimeRemaining()}
                </span>
              </div>
            </div>
            <Badge variant="outline" className="self-start sm:self-center border-yellow-400 text-yellow-800 bg-yellow-100 px-3 py-1 whitespace-nowrap">
              <Clock className="w-3 h-3 mr-1 animate-pulse" />
              Pending Review
            </Badge>
          </div>
        </AlertDescription>
      </Alert>
      
      {/* Email Confirmation Notice */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 mb-1">
                📧 Confirmation Email Sent
              </p>
              <p className="text-sm text-blue-800">
                A confirmation email has been sent to your registered email address. 
                You'll receive another email once your application is approved (typically within 24-48 hours).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Application Review Process Card */}
      <Card className="mb-6 border-2">
        <CardHeader className="bg-gradient-to-r from-teal-50 to-emerald-50">
          <CardTitle className="flex items-center gap-2 text-teal-900">
            <FileText className="h-5 w-5" />
            Application Review Process
          </CardTitle>
          <CardDescription className="text-teal-700">
            Your application for <strong>{businessName}</strong> goes through 3 verification stages
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* Step 1: Document Review - Completed */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center ring-4 ring-green-50">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="w-0.5 h-12 bg-gradient-to-b from-green-200 to-yellow-200 ml-5 mt-2" />
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-green-800">1. Document Review</p>
                  <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">
                    ✓ Complete
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Business information and contact details verified
                </p>
                <p className="text-xs text-green-600 font-medium">
                  Completed: {formatDate(appDate)}
                </p>
              </div>
            </div>

            {/* Step 2: Business Verification - In Progress */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center ring-4 ring-yellow-50 animate-pulse">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="w-0.5 h-12 bg-gradient-to-b from-yellow-200 to-gray-200 ml-5 mt-2" />
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-yellow-800">2. Business Verification</p>
                  <Badge variant="outline" className="border-yellow-500 text-yellow-700 bg-yellow-50">
                    <Clock className="w-3 h-3 mr-1" />
                    In Progress
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Verifying business registration, address, and operating hours
                </p>
                <p className="text-xs text-yellow-600 font-medium">
                  Expected: {formatDate(minApprovalDate)} - {formatDate(maxApprovalDate)}
                </p>
              </div>
            </div>

            {/* Step 3: Final Approval - Pending */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center ring-4 ring-gray-50">
                  <Building2 className="h-6 w-6 text-gray-400" />
                </div>
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-600">3. Final Approval & Activation</p>
                  <Badge variant="outline" className="border-gray-400 text-gray-600 bg-gray-50">
                    Pending
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Dashboard access granted, welcome email sent with setup guide
                </p>
                <p className="text-xs text-gray-500">
                  You'll be notified via email when approved
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Preview Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('What to Expect')}</CardTitle>
          <CardDescription>
            {t('Get ready to manage your business on SmartPick')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {tutorialSteps.map((step, index) => (
            <div key={index} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/5 transition-colors">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                {step.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* What You Can Do Now */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            What You Can Do While Waiting
          </CardTitle>
          <CardDescription>
            Prepare for your launch on SmartPick
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg hover:border-teal-300 hover:bg-teal-50/50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                  <Package className="h-4 w-4 text-teal-600" />
                </div>
                <h3 className="font-semibold">Plan Your Offers</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Think about which items you'll list, pricing strategy, and pickup schedules
              </p>
            </div>
            
            <div className="p-4 border rounded-lg hover:border-purple-300 hover:bg-purple-50/50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-purple-600" />
                </div>
                <h3 className="font-semibold">Review Guidelines</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Familiarize yourself with our quality standards and best practices
              </p>
            </div>
            
            <div className="p-4 border rounded-lg hover:border-amber-300 hover:bg-amber-50/50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-amber-600" />
                </div>
                <h3 className="font-semibold">Set Up Operations</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Prepare your team for QR code scanning and pickup procedures
              </p>
            </div>
            
            <div className="p-4 border rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <ShoppingBag className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="font-semibold">Explore as Customer</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Browse offers from other partners to see what works well
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Need Help Card */}
      <Card className="border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-teal-900">
            <AlertCircle className="h-5 w-5" />
            Questions About Your Application?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-teal-800">
            Our support team is here to help! Whether you need to update information, check your status, or have questions about the process.
          </p>
          
          <div className="bg-white rounded-lg p-4 border border-teal-200">
            <p className="text-sm font-medium text-gray-700 mb-3">
              📋 <strong>Application ID:</strong> Check your confirmation email
            </p>
            <p className="text-sm font-medium text-gray-700 mb-3">
              ⏱️ <strong>Typical Review Time:</strong> 24-48 hours (business days)
            </p>
            <p className="text-sm font-medium text-gray-700">
              📧 <strong>Updates:</strong> You'll receive email notifications at each stage
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="flex-1 border-teal-300 hover:bg-teal-100 hover:border-teal-400" 
              onClick={() => window.open('mailto:partners@smartpick.ge?subject=Partner Application Inquiry')}
            >
              <Mail className="w-4 h-4 mr-2" />
              Email Support
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 border-teal-300 hover:bg-teal-100 hover:border-teal-400" 
              onClick={() => window.open('https://smartpick.ge/partner-faq', '_blank')}
            >
              <FileText className="w-4 h-4 mr-2" />
              Partner FAQ
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

