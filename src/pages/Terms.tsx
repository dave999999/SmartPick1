import { PageShell } from '@/components/layout/PageShell';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Printer, FileText, HelpCircle, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

// ✅ LEGAL VERSION CONTROL: Static date prevents misleading auto-updates
const TERMS_VERSION = '1.0';
const LAST_UPDATED = 'January 15, 2025';

export default function Terms() {
  const [acknowledged, setAcknowledged] = useState(false);

  const handlePrint = () => {
    window.print();
    toast.success('Opening print dialog...');
  };

  const handleDownload = () => {
    toast.info('PDF download feature coming soon', {
      description: 'For now, please use the Print option and save as PDF',
    });
  };

  const handleAcknowledge = () => {
    setAcknowledged(true);
    toast.success('Thank you for reviewing our Terms & Conditions', {
      description: 'You can now close this page',
    });
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <PageShell maxWidth="max-w-7xl">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-break-inside-avoid { break-inside: avoid; }
          body { background: white; }
        }
      `}</style>

      <div className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 no-print">
        <Link to="/">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Back to Home</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </Link>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="text-xs md:text-sm">
            <Printer className="mr-1 h-3 w-3 md:mr-2 md:h-4 md:w-4" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} className="text-xs md:text-sm">
            <Download className="mr-1 h-3 w-3 md:mr-2 md:h-4 md:w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6 md:gap-8">
        {/* Sticky Sidebar - Table of Contents */}
        <aside className="lg:col-span-1 no-print hidden lg:block">
          <div className="sticky top-4 bg-white rounded-xl shadow-lg p-4 md:p-6 border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center text-sm md:text-base">
              <FileText className="mr-2 h-4 w-4 md:h-5 md:w-5 text-teal-600" />
              Quick Navigation
            </h3>
            <nav className="space-y-1 text-sm max-h-[70vh] overflow-y-auto">
              <button onClick={() => scrollToSection('faq')} className="block w-full text-left px-3 py-2 rounded hover:bg-teal-50 text-gray-900 hover:text-teal-700 transition-colors">
                📋 FAQ
              </button>
              <button onClick={() => scrollToSection('introduction')} className="block w-full text-left px-3 py-2 rounded hover:bg-teal-50 text-gray-900 hover:text-teal-700 transition-colors">
                1. Introduction
              </button>
              <button onClick={() => scrollToSection('service')} className="block w-full text-left px-3 py-2 rounded hover:bg-teal-50 text-gray-900 hover:text-teal-700 transition-colors">
                2. Service Description
              </button>
              <button onClick={() => scrollToSection('smartpoints')} className="block w-full text-left px-3 py-2 rounded hover:bg-teal-50 text-gray-900 hover:text-teal-700 transition-colors">
                3. SmartPoints & Payments
              </button>
              <button onClick={() => scrollToSection('accounts')} className="block w-full text-left px-3 py-2 rounded hover:bg-teal-50 text-gray-900 hover:text-teal-700 transition-colors">
                4. User Accounts
              </button>
              <button onClick={() => scrollToSection('eligibility')} className="block w-full text-left px-3 py-2 rounded hover:bg-teal-50 text-gray-900 hover:text-teal-700 transition-colors">
                5. Eligibility & Alcohol
              </button>
              <button onClick={() => scrollToSection('partners')} className="block w-full text-left px-3 py-2 rounded hover:bg-teal-50 text-gray-900 hover:text-teal-700 transition-colors">
                6. Partner Responsibilities
              </button>
              <button onClick={() => scrollToSection('cancellations')} className="block w-full text-left px-3 py-2 rounded hover:bg-teal-50 text-gray-900 hover:text-teal-700 transition-colors">
                7. Cancellations & Refunds
              </button>
              <button onClick={() => scrollToSection('acceptable-use')} className="block w-full text-left px-3 py-2 rounded hover:bg-teal-50 text-gray-900 hover:text-teal-700 transition-colors">
                8. Acceptable Use
              </button>
              <button onClick={() => scrollToSection('ip')} className="block w-full text-left px-3 py-2 rounded hover:bg-teal-50 text-gray-900 hover:text-teal-700 transition-colors">
                9. Intellectual Property
              </button>
              <button onClick={() => scrollToSection('liability')} className="block w-full text-left px-3 py-2 rounded hover:bg-teal-50 text-gray-900 hover:text-teal-700 transition-colors">
                10. Liability & Disclaimers
              </button>
              <button onClick={() => scrollToSection('changes')} className="block w-full text-left px-3 py-2 rounded hover:bg-teal-50 text-gray-900 hover:text-teal-700 transition-colors">
                11. Changes to Terms
              </button>
              <button onClick={() => scrollToSection('governing-law')} className="block w-full text-left px-3 py-2 rounded hover:bg-teal-50 text-gray-900 hover:text-teal-700 transition-colors">
                12. Governing Law
              </button>
              <button onClick={() => scrollToSection('contact')} className="block w-full text-left px-3 py-2 rounded hover:bg-teal-50 text-gray-900 hover:text-teal-700 transition-colors">
                13. Contact
              </button>
            </nav>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="text-xs text-gray-500 space-y-1">
                <p><strong>Version:</strong> {TERMS_VERSION}</p>
                <p><strong>Last Updated:</strong></p>
                <p>{LAST_UPDATED}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <article className="lg:col-span-3 bg-white rounded-xl shadow-lg p-4 md:p-6 lg:p-8 border border-gray-200">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">SmartPick – Terms and Conditions</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className="text-xs">Version {TERMS_VERSION}</Badge>
              <span className="text-sm text-gray-600">Last updated: {LAST_UPDATED}</span>
            </div>
          </div>

          <Alert className="mb-8 border-teal-200 bg-teal-50">
            <AlertCircle className="h-4 w-4 text-teal-600" />
            <AlertDescription className="text-sm text-gray-900">
              <strong>Important:</strong> By using SmartPick, you agree to these Terms. Please read carefully before proceeding.
            </AlertDescription>
          </Alert>

          {/* FAQ Section */}
          <TooltipProvider>
            <section id="faq" className="mb-12 scroll-mt-4 print-break-inside-avoid">
              <Card className="bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-200">
                <CardContent className="pt-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                    <HelpCircle className="mr-2 h-6 w-6 text-teal-600" />
                    Frequently Asked Questions
                  </h2>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="refunds">
                      <AccordionTrigger className="text-left text-gray-900 hover:text-teal-700">
                        Can I get a refund if I cancel my reservation?
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-900">
                        It depends on the offer. Some reservations allow cancellation before a deadline, while others are non-cancellable. 
                        Check the offer details before reserving. See <button onClick={() => scrollToSection('cancellations')} className="text-teal-600 hover:underline font-semibold">Section 7</button> for full details.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="pickup">
                      <AccordionTrigger className="text-left text-gray-900 hover:text-teal-700">
                        What happens if I miss my pickup time?
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-900">
                        If you don't arrive within the specified pickup window, the Partner may treat the reservation as completed and is not obliged to refund SmartPoints. 
                        See <button onClick={() => scrollToSection('cancellations')} className="text-teal-600 hover:underline font-semibold">Section 7.3</button> for no-show policies.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="smartpoints">
                      <AccordionTrigger className="text-left text-gray-900 hover:text-teal-700">
                        What are SmartPoints and do they have cash value?
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-900">
                        SmartPoints are a virtual loyalty unit used to reserve offers. They have <strong>no cash value</strong> outside SmartPick and cannot be withdrawn or transferred. 
                        See <button onClick={() => scrollToSection('smartpoints')} className="text-teal-600 hover:underline font-semibold">Section 3</button> for complete details.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="payment">
                      <AccordionTrigger className="text-left text-gray-900 hover:text-teal-700">
                        Do I pay online or at the partner location?
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-900">
                        Unless stated otherwise, you reserve with SmartPoints online, but the <strong>final payment for the product is made directly at the Partner's location</strong> at the reserved price. 
                        See <button onClick={() => scrollToSection('smartpoints')} className="text-teal-600 hover:underline font-semibold">Section 3.3</button>.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="age">
                      <AccordionTrigger className="text-left text-gray-900 hover:text-teal-700">
                        Do I need to be 18+ to use SmartPick?
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-900">
                        No, SmartPick is available to all ages. However, if you want to claim offers containing <strong>alcoholic beverages</strong>, you must be at least <Badge variant="destructive" className="inline-flex mx-1">18 years old</Badge> and will need to show ID at pickup. 
                        See <button onClick={() => scrollToSection('eligibility')} className="text-teal-600 hover:underline font-semibold">Section 5</button>.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </section>

            <section id="introduction" className="mb-8 scroll-mt-4 print-break-inside-avoid">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-900 mb-4">
                These Terms and Conditions ("Terms") govern the use of the SmartPick website and mobile experience ("Platform"). By accessing or using SmartPick, you agree to be bound by these Terms. If you do not agree, please do not use the Platform.
              </p>
              <p className="text-gray-900">
                SmartPick is operated by an individual entrepreneur registered in Georgia (IE Davit Batumashvili). SmartPick connects customers with partner merchants such as bakeries, cafes, restaurants and other local businesses ("Partners"). SmartPick is not a restaurant, bakery or delivery service; we are a reservation and discount-offer platform.
              </p>
            </section>

            <section id="service" className="mb-8 scroll-mt-4 print-break-inside-avoid">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Service Description</h2>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">2.1. SmartPick provides:</h3>
              <ul className="list-disc pl-6 text-gray-900 space-y-2 mb-4">
                <li>A digital marketplace where Partners can publish limited-quantity offers for food, desserts, drinks (including coffee), and other products. <strong>Note:</strong> Alcoholic beverages require you to be <Badge variant="destructive" className="inline-flex ml-1">18+</Badge> and ID verification at pickup.</li>
                <li>A reservation mechanism where users can reserve these offers using{' '}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="font-semibold text-teal-700 cursor-help border-b border-dotted border-teal-400">SmartPoints</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Virtual loyalty units with no cash value outside SmartPick. See Section 3 for details.</p>
                    </TooltipContent>
                  </Tooltip>
                  {' '}or other methods specified on the Platform.
                </li>
                <li>Tools for Partners to manage their offers, reservations and basic analytics.</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">2.2. Unless explicitly stated otherwise, SmartPick itself does <strong>not</strong>:</h3>
              <ul className="list-disc pl-6 text-gray-900 space-y-2">
                <li>Prepare food or beverages;</li>
                <li>Deliver products;</li>
                <li>Act as a legal representative of any Partner;</li>
                <li>Assume responsibility for the quality, safety or compliance of the products provided by Partners.</li>
              </ul>
              <p className="text-gray-900 mt-4">
                All products are prepared, stored and handed over by the respective Partner in accordance with local laws and regulations.
              </p>
            </section>

            <section id="smartpoints" className="mb-8 scroll-mt-4 print-break-inside-avoid">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. SmartPoints and Payments</h2>
              
              <Alert className="mb-6 border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-gray-900">
                  <strong>Key Term:</strong> SmartPoints are virtual loyalty units, NOT electronic money or currency.
                </AlertDescription>
              </Alert>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1. SmartPoints are a virtual loyalty / utility unit used on the Platform to reserve Partner offers. SmartPoints:</h3>
              <ul className="list-disc pl-6 text-gray-900 space-y-2 mb-4">
                <li><strong className="text-red-600">Have no cash value</strong> outside the Platform;</li>
                <li>Are not electronic money, bank deposits or a financial instrument;</li>
                <li>Cannot be withdrawn as cash or transferred outside SmartPick.</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.2. Users may obtain SmartPoints in several ways, for example:</h3>
              <ul className="list-disc pl-6 text-gray-900 space-y-2 mb-4">
                <li>By purchasing SmartPoints through integrated payment providers (e.g. Unipay, Bank of Georgia or others in the future);</li>
                <li>Through promotional campaigns, bonuses or referral programs, as determined by SmartPick from time to time.</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.3. Reservation and On-site Purchase:</h3>
              <ul className="list-disc pl-6 text-gray-900 space-y-2 mb-4">
                <li>The user reserves a specific offer via SmartPick, often at a special or discounted price.</li>
                <li>The reservation is tied to a specific Partner location, pickup time window and conditions shown on the offer page.</li>
                <li>Unless stated otherwise, the <strong>final payment for the product itself is made directly at the Partner's physical location</strong>, at the reserved price.</li>
                <li>
                  <Alert className="mt-3 border-orange-200 bg-orange-50">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-sm text-gray-900">
                      <strong>Refund Policy:</strong> SmartPoints used for reservation are <strong className="text-red-600">generally non-refundable</strong> once the reservation is confirmed, <strong>except</strong> in the following specific cases:
                      <ul className="list-disc pl-6 mt-2 space-y-1">
                        <li>The Partner cancels the reservation due to stock issues or operational problems</li>
                        <li>The Partner cannot provide the reserved product at pickup time</li>
                        <li>The offer was misrepresented or significantly different from the description</li>
                        <li>Technical errors prevented proper reservation confirmation</li>
                        <li>SmartPick, at its sole discretion, decides to issue a refund or adjustment for customer service reasons</li>
                      </ul>
                      <p className="mt-2">User-initiated cancellations are subject to the specific cancellation policy displayed for each offer (see Section 7.1).</p>
                    </AlertDescription>
                  </Alert>
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.4. Payment Providers:</h3>
              <ul className="list-disc pl-6 text-gray-900 space-y-2">
                <li>Card payments for SmartPoints or other services may be processed by third-party payment providers (e.g. Unipay) in compliance with their own terms and privacy policies.</li>
                <li>SmartPick does not store full card numbers or sensitive payment details on its own servers; such data is handled by the payment providers.</li>
              </ul>
            </section>

            <section id="accounts" className="mb-8 scroll-mt-4 print-break-inside-avoid">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. User Accounts</h2>
              <p className="text-gray-900 mb-4">
                <strong>4.1.</strong> To use key features of SmartPick, you must create an account and provide accurate and complete information.
              </p>
              <p className="text-gray-900 mb-4">
                <strong>4.2.</strong> You are responsible for:
              </p>
              <ul className="list-disc pl-6 text-gray-900 space-y-2 mb-4">
                <li>Keeping your login credentials secure;</li>
                <li>All activities that occur under your account;</li>
                <li>Immediately notifying SmartPick if you suspect unauthorized use of your account.</li>
              </ul>
              <p className="text-gray-900">
                <strong>4.3.</strong> SmartPick reserves the right to suspend or terminate accounts that:
              </p>
              <ul className="list-disc pl-6 text-gray-900 space-y-2">
                <li>Violate these Terms;</li>
                <li>Use abusive, fraudulent or illegal behavior;</li>
                <li>Create operational or security risks for the Platform.</li>
              </ul>
            </section>

            <section id="eligibility" className="mb-8 scroll-mt-4 print-break-inside-avoid">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Eligibility and Alcohol-related Offers</h2>
              <p className="text-gray-900 mb-4">
                <strong>5.1.</strong> SmartPick is available to users of all ages for general offers. However, special restrictions apply to alcoholic beverages:
              </p>
              <Alert className="mb-4 border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-sm text-gray-900">
                  <strong>Alcohol Age Requirement:</strong> You must be at least <Badge variant="destructive" className="inline-flex mx-1">18 years old</Badge> to claim offers containing alcoholic beverages.
                </AlertDescription>
              </Alert>
              <p className="text-gray-900 mb-4">
                <strong>5.2.</strong> Some Partners may offer alcoholic beverages on the Platform. By reserving such offers, you confirm that:
              </p>
              <ul className="list-disc pl-6 text-gray-900 space-y-2 mb-4">
                <li>You are at least 18 years old;</li>
                <li>You will present a valid ID if requested by the Partner upon pickup.</li>
              </ul>
              <p className="text-gray-900">
                Partners have the right to refuse to hand over alcoholic products if you cannot verify your age or if they believe the handover would violate local law. SmartPoints or other amounts spent on the reservation may not be refunded in such cases, unless required by law or decided by SmartPick at its discretion.
              </p>
            </section>

            <section id="partners" className="mb-8 scroll-mt-4 print-break-inside-avoid">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Partner Responsibilities</h2>
              <p className="text-gray-900 mb-4">
                <strong>6.1.</strong> Each Partner is solely responsible for:
              </p>
              <ul className="list-disc pl-6 text-gray-900 space-y-2 mb-4">
                <li>The preparation, quality, labeling and safety of the products they offer;</li>
                <li>Compliance with food safety, alcohol regulations and any other applicable laws;</li>
                <li>Providing the reserved products at the agreed price and within the stated pickup time window.</li>
              </ul>
              <p className="text-gray-900">
                <strong>6.2.</strong> Any issues related to the physical product (e.g. taste, quality, freshness, allergies) should first be addressed directly with the Partner. SmartPick may assist in communication as a mediator but is not legally responsible for the outcome, except where required by applicable law.
              </p>
            </section>

            <section id="cancellations" className="mb-8 scroll-mt-4 print-break-inside-avoid">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Cancellations, No-shows and Refunds</h2>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">7.1. User Cancellations:</h3>
              <ul className="list-disc pl-6 text-gray-900 space-y-2 mb-4">
                <li>Some reservations may allow cancellation before a certain deadline; others may be non-cancellable. The specific rules for each offer will be shown in the app or on the website.</li>
                <li>If a reservation is cancellable, SmartPoints or payments may be returned according to the offer's rules.</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">7.2. Partner Cancellations:</h3>
              <p className="text-gray-900 mb-4">
                If a Partner cancels your reservation (for example due to stock issues or operational problems), SmartPick will normally return consumed SmartPoints or provide an equivalent adjustment.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">7.3. No-shows:</h3>
              <Alert className="mb-4 border-orange-200 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-sm text-gray-900">
                  <strong>Important:</strong> If you do not arrive to pick up your order within the specified time, the Partner may treat the reservation as completed and is not obliged to refund SmartPoints or provide the product.
                </AlertDescription>
              </Alert>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">7.4. Chargebacks and Payment Disputes:</h3>
              <p className="text-gray-900">
                Card payment disputes (chargebacks) are handled according to the rules of the relevant payment provider and card schemes. SmartPick may provide transaction information but is not the final decision-maker in such disputes.
              </p>
            </section>

            <section id="acceptable-use" className="mb-8 scroll-mt-4 print-break-inside-avoid">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Acceptable Use</h2>
              <p className="text-gray-900 mb-4">When using SmartPick, you agree that you will not:</p>
              <ul className="list-disc pl-6 text-gray-900 space-y-2">
                <li>Use the Platform for any illegal or fraudulent purpose;</li>
                <li>Misuse promotions, referral programs or SmartPoints in bad faith;</li>
                <li>Attempt to interfere with the security or proper functioning of the Platform;</li>
                <li>Copy, scrape or reverse engineer the Platform without written permission.</li>
              </ul>
            </section>

            <section id="ip" className="mb-8 scroll-mt-4 print-break-inside-avoid">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Intellectual Property</h2>
              <p className="text-gray-900">
                All rights to the SmartPick name, logo, design, software, databases and content (excluding Partner logos and trademarks, which remain their property) belong to SmartPick or its licensors. You may not use SmartPick branding or content without prior written consent.
              </p>
            </section>

            <section id="liability" className="mb-8 scroll-mt-4 print-break-inside-avoid">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Liability and Disclaimers</h2>
              <p className="text-gray-900 mb-4">
                <strong>10.1.</strong> The Platform is provided "as is" and "as available". We do not guarantee that SmartPick will be error-free or uninterrupted.
              </p>
              <p className="text-gray-900 mb-4">
                <strong>10.2.</strong> To the maximum extent permitted by law, SmartPick is not liable for:
              </p>
              <ul className="list-disc pl-6 text-gray-900 space-y-2 mb-4">
                <li>Indirect, incidental, special or consequential damages;</li>
                <li>Lost profits or data;</li>
                <li>Any issues caused by Partners, payment providers, internet providers or other third parties.</li>
              </ul>
              <p className="text-gray-900">
                <strong>10.3.</strong> Nothing in these Terms excludes or limits any liability that cannot be excluded under applicable law.
              </p>
            </section>

            <section id="changes" className="mb-8 scroll-mt-4 print-break-inside-avoid">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Changes to the Service and Terms</h2>
              <p className="text-gray-900">
                SmartPick may modify, suspend or discontinue parts of the Platform at any time. We may also update these Terms from time to time. The latest version will always be available on the website. Your continued use of the Platform after changes means you accept the updated Terms.
              </p>
            </section>

            <section id="governing-law" className="mb-8 scroll-mt-4 print-break-inside-avoid">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Governing Law and Dispute Resolution</h2>
              <p className="text-gray-900">
                These Terms are governed by the laws of Georgia. Any disputes that cannot be resolved amicably shall be submitted to the competent courts of Georgia, unless mandatory law requires otherwise.
              </p>
            </section>

            <section id="contact" className="mb-8 scroll-mt-4 print-break-inside-avoid">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Contact</h2>
              <p className="text-gray-900">
                If you have questions about these Terms, please contact us at:
              </p>
              <ul className="list-none pl-0 text-gray-900 space-y-1 mt-3">
                <li><strong>Email:</strong> <a href="mailto:support@smartpick.ge" className="text-teal-600 hover:underline">support@smartpick.ge</a> (or <a href="mailto:davitbatumashvili@gmail.com" className="text-teal-600 hover:underline">davitbatumashvili@gmail.com</a>)</li>
                <li><strong>Phone:</strong> <a href="tel:+995557737399" className="text-teal-600 hover:underline">+995 557 737 399</a></li>
              </ul>
            </section>
          </TooltipProvider>

          {/* Acknowledgment Section */}
          <div className="mt-12 pt-8 border-t border-gray-200 no-print">
            <Card className="bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {acknowledged ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    ) : (
                      <FileText className="h-6 w-6 text-teal-600" />
                    )}
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {acknowledged ? 'Thank you!' : 'Have you read these Terms?'}
                    </h3>
                    <p className="text-sm text-gray-900 mb-4">
                      {acknowledged 
                        ? 'You have acknowledged reading these Terms & Conditions. You can print or download them for your records.'
                        : 'By using SmartPick, you agree to these Terms. Click below to acknowledge that you have read and understood them.'
                      }
                    </p>
                    {!acknowledged && (
                      <Button onClick={handleAcknowledge} className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600">
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        I have read and understood these Terms
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </article>
      </div>

      <Footer />
    </PageShell>
  );
}

