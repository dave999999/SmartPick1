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
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-gradient-to-br from-white via-slate-50 to-gray-50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-gray-900">
            <FileText className="h-5 w-5 text-teal-600" />
            Terms & Conditions and Privacy Policy
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Please read and accept our terms to create your account
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="terms" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 bg-white border border-gray-200">
            <TabsTrigger value="terms" className="flex items-center gap-2 data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700">
              <FileText className="h-4 w-4" />
              Terms & Conditions
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2 data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700">
              <Shield className="h-4 w-4" />
              Privacy Policy
            </TabsTrigger>
          </TabsList>

          {/* Terms Content */}
          <TabsContent value="terms" className="mt-4">
            <div className="h-[50vh] overflow-y-auto pr-4 bg-white rounded-lg border border-gray-200 p-4">
              <div className="space-y-4 text-sm text-gray-900">
                <Alert className="border-teal-200 bg-teal-50">
                  <AlertCircle className="h-4 w-4 text-teal-600" />
                  <AlertDescription className="text-sm">
                    <strong>Welcome! 👋</strong> SmartPick connects you with local partners offering great deals. SmartPoints are our loyalty currency (no cash value), reservations work on a trust system, and alcohol purchases require age verification at pickup.
                  </AlertDescription>
                </Alert>

                <div>
                  <h3 className="font-semibold text-base mb-2 text-gray-900">How SmartPick Works:</h3>
                  <ul className="list-disc pl-5 space-y-2 text-gray-900">
                    <li>
                      <strong>🎯 SmartPoints:</strong> Think of these as your loyalty currency within SmartPick. They help you reserve great deals but can't be exchanged for cash or transferred to others. They're yours to enjoy on our platform!
                    </li>
                    <li>
                      <strong>📦 Reservations:</strong> When you reserve an offer, you're committing to pick it up. We generally can't refund SmartPoints if you change your mind, but don't worry - if a Partner cancels or can't fulfill your order, you'll get your points back.
                    </li>
                    <li>
                      <strong>🍺 Alcohol Purchases:</strong> You can use SmartPick at any age, but for alcohol orders, <strong>you must be <Badge variant="default" className="inline-flex mx-1 bg-amber-500">18+</Badge></strong> and show valid ID at pickup. Partners are required to verify your age - it's the law!
                    </li>
                    <li>
                      <strong>💳 How Payment Works:</strong> You reserve offers with SmartPoints online, but you'll pay the partner directly when you pick up your order. SmartPoints just lock in your spot!
                    </li>
                    <li>
                      <strong>⏰ Pickup Times:</strong> Please arrive during your reservation window. If you don't show up, we can't refund your SmartPoints - partners prepare your order expecting you!
                    </li>
                    <li>
                      <strong>🔐 Your Account:</strong> Keep your password safe! You're responsible for any activity on your account, so treat it like your wallet.
                    </li>
                    <li>
                      <strong>🤝 Partner Responsibilities:</strong> SmartPick connects you with local businesses, but we don't make the food or control product quality. If there's an issue, talk to the partner first - they want to make it right!
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-base mb-2 text-gray-900">Good to Know:</h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg border border-gray-200">
                      <p className="font-semibold text-gray-900 mb-1">✨ Cancellation Flexibility</p>
                      <p className="text-gray-900 text-xs">
                        Each offer has its own cancellation rules - some let you cancel before a deadline, others are final once reserved. We show this clearly on each offer so you know before you commit.
                      </p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg border border-gray-200">
                      <p className="font-semibold text-gray-900 mb-1">🎮 Fair Play</p>
                      <p className="text-gray-900 text-xs">
                        Please use SmartPick honestly - no gaming the system, creating fake accounts, or anything illegal. We built this on trust, and we protect that for everyone's benefit.
                      </p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg border border-gray-200">
                      <p className="font-semibold text-gray-900 mb-1">⚖️ Our Responsibility</p>
                      <p className="text-gray-900 text-xs">
                        We work hard to keep SmartPick running smoothly, but we're a platform connecting you with partners. We can't control everything that happens, so while we'll always try to help, we can't be held responsible for partner-related issues.
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
            </div>
          </TabsContent>

          {/* Privacy Content */}
          <TabsContent value="privacy" className="mt-4">
            <div className="h-[50vh] overflow-y-auto pr-4 bg-white rounded-lg border border-gray-200 p-4">
              <div className="space-y-4 text-sm text-gray-900">
                <Alert className="border-green-200 bg-green-50">
                  <Shield className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-sm">
                    <strong>Your Privacy Matters 🔒</strong> We collect only what we need to make SmartPick work for you - your account details, reservation activity, and app usage. Your data is encrypted and safe with us. Most importantly: <strong>we'll never sell your personal information.</strong>
                  </AlertDescription>
                </Alert>

                <div>
                  <h3 className="font-semibold text-base mb-2 text-gray-900">What We Collect (and Why):</h3>
                  <ul className="list-disc pl-5 space-y-2 text-gray-900">
                    <li>
                      <strong>👤 Your Profile:</strong> Name, email, phone, and password (encrypted!) so you can log in and partners know who you are at pickup.
                    </li>
                    <li>
                      <strong>📱 App Usage:</strong> Your IP address, device type, and what pages you visit - this helps us fix bugs, improve the app, and keep things secure.
                    </li>
                    <li>
                      <strong>🎫 Reservation History:</strong> Which offers you reserve, when you pick them up, and your SmartPoints activity - so we can show your history and prevent misuse.
                    </li>
                    <li>
                      <strong>💳 Payment Info:</strong> Just transaction IDs from payment providers. <strong className="text-green-600">We never see or store your card numbers!</strong> That's handled by secure payment partners.
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-base mb-2 text-gray-900">What We Do With It:</h3>
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
                      <div key={purpose} className="flex items-center gap-2 text-xs text-gray-900">
                        <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
                        <span>{purpose}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-base mb-2 text-gray-900">Your Rights:</h3>
                  <div className="space-y-2">
                    <div className="p-3 bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg border border-gray-200">
                      <p className="font-semibold text-gray-900 mb-1 text-xs">Access & Portability</p>
                      <p className="text-gray-700 text-xs">Request a copy of your data in machine-readable format</p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg border border-gray-200">
                      <p className="font-semibold text-gray-900 mb-1 text-xs">Rectification & Erasure</p>
                      <p className="text-gray-700 text-xs">Correct inaccurate data or request deletion where applicable</p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg border border-gray-200">
                      <p className="font-semibold text-gray-900 mb-1 text-xs">Object & Restrict</p>
                      <p className="text-gray-700 text-xs">Object to certain processing or request restriction</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-base mb-2 text-gray-900">Who Sees Your Data:</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-900 text-xs">
                    <li><strong>Partners</strong> - Only your name and reservation details (they need to prepare your order!)</li>
                    <li><strong>Payment Processors</strong> - Secure services like Unipay that handle transactions</li>
                    <li><strong>Cloud Services</strong> - Where we safely store and process data (all encrypted)</li>
                    <li><strong>Authorities</strong> - Only if legally required (like a court order)</li>
                  </ul>
                  <div className="mt-3 p-2 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-green-800 font-semibold text-sm flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      We will NEVER sell your data to advertisers or third parties. Period.
                    </p>
                  </div>
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
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 bg-white/60 backdrop-blur-sm rounded-b-lg px-6 py-4">
          {!alreadyAccepted ? (
            <>
              <div className="flex-1 text-xs text-gray-700">
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
