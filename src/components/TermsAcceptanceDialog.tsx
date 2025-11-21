import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { FileText, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TermsAcceptanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
  alreadyAccepted?: boolean; // If true, shows read-only view without Accept button
}

export function TermsAcceptanceDialog({ open, onOpenChange, onAccept, alreadyAccepted = false }: TermsAcceptanceDialogProps) {
  const handleAccept = () => {
    onAccept();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5 text-teal-600" />
            Terms & Conditions and Privacy Policy
          </DialogTitle>
          <DialogDescription>
            Please read and accept our terms to create your account
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="terms" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="terms" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Terms & Conditions
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Privacy Policy
            </TabsTrigger>
          </TabsList>

          {/* Terms Content */}
          <TabsContent value="terms" className="flex-1 mt-4 min-h-0">
            <ScrollArea className="h-[50vh] pr-4">
              <div className="space-y-4 text-sm">
                <Alert className="border-teal-200 bg-teal-50">
                  <AlertCircle className="h-4 w-4 text-teal-600" />
                  <AlertDescription>
                    <strong>Summary:</strong> By using SmartPick, you agree to our terms. SmartPoints have no cash value, reservations may be non-refundable, and you must be 18+ to use our service.
                  </AlertDescription>
                </Alert>

                <div>
                  <h3 className="font-semibold text-base mb-2">Key Points:</h3>
                  <ul className="list-disc pl-5 space-y-2 text-gray-700">
                    <li>
                      <strong>SmartPoints:</strong> Virtual loyalty units with <strong className="text-red-600">no cash value</strong> outside SmartPick. Cannot be withdrawn or transferred.
                    </li>
                    <li>
                      <strong>Reservations:</strong> Generally non-refundable once confirmed, except when Partner cancels or cannot provide the product.
                    </li>
                    <li>
                      <strong>Age Requirement:</strong> You must be <Badge variant="destructive" className="inline-flex mx-1">18+</Badge> to create an account. ID verification required for alcohol.
                    </li>
                    <li>
                      <strong>Payment:</strong> Reserve with SmartPoints online, but final payment for products is made at Partner location.
                    </li>
                    <li>
                      <strong>No-shows:</strong> If you miss pickup time, SmartPoints won't be refunded.
                    </li>
                    <li>
                      <strong>Account Security:</strong> You're responsible for keeping login credentials secure.
                    </li>
                    <li>
                      <strong>Partner Products:</strong> SmartPick connects you with Partners but doesn't prepare food or assume liability for product quality.
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-base mb-2">Important Policies:</h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-semibold text-gray-900 mb-1">Cancellations</p>
                      <p className="text-gray-600 text-xs">
                        Some offers allow cancellation before a deadline, others are non-cancellable. Check each offer's specific rules before reserving.
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-semibold text-gray-900 mb-1">Acceptable Use</p>
                      <p className="text-gray-600 text-xs">
                        Do not use the Platform for illegal purposes, misuse promotions, or attempt to interfere with security.
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-semibold text-gray-900 mb-1">Liability</p>
                      <p className="text-gray-600 text-xs">
                        Platform provided "as is". SmartPick is not liable for indirect damages or issues caused by Partners/third parties.
                      </p>
                    </div>
                  </div>
                </div>

                <Alert className="border-blue-200 bg-blue-50">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-xs">
                    <strong>Version 1.0</strong> • Last updated: January 15, 2025
                    <br />
                    <Link to="/terms" target="_blank" className="text-teal-600 hover:underline font-medium">
                      Read full Terms & Conditions →
                    </Link>
                  </AlertDescription>
                </Alert>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Privacy Content */}
          <TabsContent value="privacy" className="flex-1 mt-4 min-h-0">
            <ScrollArea className="h-[50vh] pr-4">
              <div className="space-y-4 text-sm">
                <Alert className="border-green-200 bg-green-50">
                  <Shield className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <strong>Summary:</strong> We collect your account info, usage data, and reservation details. We protect your data with encryption and don't sell it. You have rights to access, correct, and delete your data.
                  </AlertDescription>
                </Alert>

                <div>
                  <h3 className="font-semibold text-base mb-2">What We Collect:</h3>
                  <ul className="list-disc pl-5 space-y-2 text-gray-700">
                    <li>
                      <strong>Account Data:</strong> Name, email, phone, password (hashed), age confirmation
                    </li>
                    <li>
                      <strong>Usage Data:</strong> IP address, device info, pages visited, actions performed
                    </li>
                    <li>
                      <strong>Reservation Data:</strong> Offers reserved, pickup times, SmartPoints activity
                    </li>
                    <li>
                      <strong>Payment Metadata:</strong> Transaction IDs from providers (we DON'T store card numbers)
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-base mb-2">How We Use Your Data:</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      'Manage your account',
                      'Process reservations',
                      'Handle payments',
                      'Send notifications',
                      'Improve service',
                      'Ensure security',
                      'Legal compliance',
                      'Analytics (anonymized)',
                    ].map((purpose) => (
                      <div key={purpose} className="flex items-center gap-2 text-xs text-gray-700">
                        <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
                        <span>{purpose}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-base mb-2">Your Rights:</h3>
                  <div className="space-y-2">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-semibold text-gray-900 mb-1 text-xs">Access & Portability</p>
                      <p className="text-gray-600 text-xs">Request a copy of your data in machine-readable format</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-semibold text-gray-900 mb-1 text-xs">Rectification & Erasure</p>
                      <p className="text-gray-600 text-xs">Correct inaccurate data or request deletion where applicable</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-semibold text-gray-900 mb-1 text-xs">Object & Restrict</p>
                      <p className="text-gray-600 text-xs">Object to certain processing or request restriction</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-base mb-2">Data Sharing:</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700 text-xs">
                    <li>Partners (only what's needed for your reservation)</li>
                    <li>Payment providers (Unipay, banks)</li>
                    <li>Cloud hosting & analytics services</li>
                    <li>Authorities (if required by law)</li>
                  </ul>
                  <p className="mt-2 text-green-700 font-semibold text-sm">
                    ✓ We do NOT sell your personal data
                  </p>
                </div>

                <Alert className="border-blue-200 bg-blue-50">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-xs">
                    <strong>Version 1.0</strong> • Last updated: January 21, 2025
                    <br />
                    <Link to="/privacy" target="_blank" className="text-teal-600 hover:underline font-medium">
                      Read full Privacy Policy →
                    </Link>
                  </AlertDescription>
                </Alert>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-3 pt-4 border-t">
          {!alreadyAccepted ? (
            <>
              <div className="flex-1 text-xs text-gray-600">
                By clicking "I Accept", you agree to our Terms & Conditions and Privacy Policy
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAccept}
                  className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  I Accept
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex-1 text-xs text-green-700 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                You have already accepted these terms
              </div>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
