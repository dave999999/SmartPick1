import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { FileText, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';

interface TermsAcceptanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
  alreadyAccepted?: boolean; // If true, shows read-only view without Accept button
}

export function TermsAcceptanceDialog({ open, onOpenChange, onAccept, alreadyAccepted = false }: TermsAcceptanceDialogProps) {
  const { t } = useI18n();
  
  const handleAccept = () => {
    onAccept();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-gradient-to-br from-white via-slate-50 to-gray-50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-gray-900">
            <FileText className="h-5 w-5 text-teal-600" />
            {t('terms.dialog.title')}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {t('terms.dialog.description')}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="terms" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 bg-white border border-gray-200">
            <TabsTrigger value="terms" className="flex items-center gap-2 data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700">
              <FileText className="h-4 w-4" />
              {t('terms.tab.terms')}
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2 data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700">
              <Shield className="h-4 w-4" />
              {t('terms.tab.privacy')}
            </TabsTrigger>
          </TabsList>

          {/* Terms Content */}
          <TabsContent value="terms" className="mt-4">
            <div className="h-[50vh] overflow-y-auto pr-4 bg-white rounded-lg border border-gray-200 p-4">
              <div className="space-y-4 text-sm text-gray-900">
                <Alert className="border-teal-200 bg-teal-50">
                  <AlertCircle className="h-4 w-4 text-teal-600" />
                  <AlertDescription className="text-sm text-gray-900">
                    <strong>{t('terms.welcome.title')} 👋</strong> {t('terms.welcome.description')}
                  </AlertDescription>
                </Alert>

                <div>
                  <h3 className="font-semibold text-base mb-2 text-gray-900">{t('terms.howItWorks.title')}</h3>
                  <ul className="list-disc pl-5 space-y-2 text-gray-900">
                    <li>
                      <strong>🎯 {t('terms.smartPoints.title')}</strong> {t('terms.smartPoints.description')}
                    </li>
                    <li>
                      <strong>📦 {t('terms.reservations.title')}</strong> {t('terms.reservations.description')}
                    </li>
                    <li>
                      <strong>🍺 {t('terms.alcohol.title')}</strong> {t('terms.alcohol.description')}
                    </li>
                    <li>
                      <strong>💳 {t('terms.payment.title')}</strong> {t('terms.payment.description')}
                    </li>
                    <li>
                      <strong>⏰ {t('terms.pickup.title')}</strong> {t('terms.pickup.description')}
                    </li>
                    <li>
                      <strong>🔐 {t('terms.account.title')}</strong> {t('terms.account.description')}
                    </li>
                    <li>
                      <strong>🤝 {t('terms.partners.title')}</strong> {t('terms.partners.description')}
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-base mb-2 text-gray-900">{t('terms.goodToKnow.title')}</h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg border border-gray-200">
                      <p className="font-semibold text-gray-900 mb-1">✨ {t('terms.cancellation.title')}</p>
                      <p className="text-gray-900 text-xs">
                        {t('terms.cancellation.description')}
                      </p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg border border-gray-200">
                      <p className="font-semibold text-gray-900 mb-1">🎮 {t('terms.fairPlay.title')}</p>
                      <p className="text-gray-900 text-xs">
                        {t('terms.fairPlay.description')}
                      </p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg border border-gray-200">
                      <p className="font-semibold text-gray-900 mb-1">⚖️ {t('terms.responsibility.title')}</p>
                      <p className="text-gray-900 text-xs">
                        {t('terms.responsibility.description')}
                      </p>
                    </div>
                  </div>
                </div>

                <Alert className="border-blue-200 bg-blue-50">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-xs text-gray-900">
                    <strong>{t('terms.version')}</strong> • {t('terms.lastUpdated')}
                    <br />
                    <Link to="/terms" target="_blank" className="text-teal-600 hover:underline font-medium">
                      {t('terms.readFull')}
                    </Link>
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </TabsContent>

          {/* Privacy Content */}
          <TabsContent value="privacy" className="mt-4">
            <div className="h-[50vh] overflow-y-auto pr-4 bg-white rounded-lg border border-gray-200 p-4">
              <div className="space-y-4 text-sm text-gray-900">
                <Alert className="border-green-200 bg-green-50">
                  <Shield className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-sm text-gray-900">
                    <strong>{t('privacy.title')} 🔒</strong> {t('privacy.description')}
                  </AlertDescription>
                </Alert>

                <div>
                  <h3 className="font-semibold text-base mb-2 text-gray-900">{t('privacy.collect.title')}</h3>
                  <ul className="list-disc pl-5 space-y-2 text-gray-900">
                    <li>
                      <strong>👤 {t('privacy.profile.title')}</strong> {t('privacy.profile.description')}
                    </li>
                    <li>
                      <strong>📱 {t('privacy.usage.title')}</strong> {t('privacy.usage.description')}
                    </li>
                    <li>
                      <strong>🎫 {t('privacy.history.title')}</strong> {t('privacy.history.description')}
                    </li>
                    <li>
                      <strong>💳 {t('privacy.payment.title')}</strong> {t('privacy.payment.description')}
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-base mb-2 text-gray-900">{t('privacy.useFor.title')}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      t('privacy.use.manageAccount'),
                      t('privacy.use.processReservations'),
                      t('privacy.use.handlePayments'),
                      t('privacy.use.sendNotifications'),
                      t('privacy.use.improveService'),
                      t('privacy.use.ensureSecurity'),
                      t('privacy.use.legalCompliance'),
                      t('privacy.use.analytics'),
                    ].map((purpose) => (
                      <div key={purpose} className="flex items-center gap-2 text-xs text-gray-900">
                        <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
                        <span>{purpose}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-base mb-2 text-gray-900">{t('privacy.rights.title')}</h3>
                  <div className="space-y-2">
                    <div className="p-3 bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg border border-gray-200">
                      <p className="font-semibold text-gray-900 mb-1 text-xs">{t('privacy.rights.access.title')}</p>
                      <p className="text-gray-700 text-xs">{t('privacy.rights.access.description')}</p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg border border-gray-200">
                      <p className="font-semibold text-gray-900 mb-1 text-xs">{t('privacy.rights.rectification.title')}</p>
                      <p className="text-gray-700 text-xs">{t('privacy.rights.rectification.description')}</p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg border border-gray-200">
                      <p className="font-semibold text-gray-900 mb-1 text-xs">{t('privacy.rights.object.title')}</p>
                      <p className="text-gray-700 text-xs">{t('privacy.rights.object.description')}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-base mb-2 text-gray-900">{t('privacy.sharing.title')}</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-900 text-xs">
                    <li>{t('privacy.sharing.partners')}</li>
                    <li>{t('privacy.sharing.payment')}</li>
                    <li>{t('privacy.sharing.cloud')}</li>
                    <li>{t('privacy.sharing.authorities')}</li>
                  </ul>
                  <div className="mt-3 p-2 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-green-800 font-semibold text-sm flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      {t('privacy.noSell')}
                    </p>
                  </div>
                </div>

                <Alert className="border-blue-200 bg-blue-50">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-xs text-gray-900">
                    <strong>{t('privacy.version')}</strong> • {t('privacy.lastUpdated')}
                    <br />
                    <Link to="/privacy" target="_blank" className="text-teal-600 hover:underline font-medium">
                      {t('privacy.readFull')}
                    </Link>
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 bg-white/60 backdrop-blur-sm rounded-b-lg px-6 py-4">
          {!alreadyAccepted ? (
            <>
              <div className="flex-1 text-xs text-gray-700">
                {t('terms.accept.description')}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  {t('terms.accept.cancel')}
                </Button>
                <Button
                  onClick={handleAccept}
                  className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {t('terms.accept.button')}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex-1 text-xs text-green-700 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {t('terms.accepted.message')}
              </div>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('terms.accepted.close')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
