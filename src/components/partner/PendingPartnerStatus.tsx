import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, ShoppingBag, Package, TrendingUp, AlertCircle, PlayCircle } from 'lucide-react';
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
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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
      <Alert className="mb-6 border-yellow-200 bg-yellow-50">
        <Clock className="h-5 w-5 text-yellow-600" />
        <AlertDescription className="ml-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-yellow-800">
                {t('Application Under Review')}
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                {t('Your partner application is being reviewed by our team. This typically takes 24-48 hours.')}
              </p>
            </div>
            <Badge variant="outline" className="ml-4 border-yellow-400 text-yellow-700 whitespace-nowrap">
              {t('Pending')}
            </Badge>
          </div>
        </AlertDescription>
      </Alert>

      {/* Timeline Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('Approval Timeline')}
          </CardTitle>
          <CardDescription>
            {t('Track the status of your application for')} <strong>{businessName}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Step 1: Submitted */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-green-800">{t('Application Submitted')}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(appDate)}
                </p>
              </div>
            </div>

            {/* Step 2: Under Review */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600 animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-yellow-800">{t('Under Review')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('Estimated completion')}: {formatDate(minApprovalDate)} - {formatDate(maxApprovalDate)}
                </p>
              </div>
            </div>

            {/* Step 3: Approval Pending */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-600">{t('Approval & Dashboard Access')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('Once approved, you\'ll receive an email and can start creating offers')}
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

      {/* Help Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {t('Need Help?')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t('If you have questions about your application or need assistance, please contact our support team.')}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => window.open('mailto:support@smartpick.ge')}>
              {t('Email Support')}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => window.open('tel:+995XXXXXXXXX')}>
              {t('Call Support')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

