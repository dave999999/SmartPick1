import { PageShell } from '@/components/layout/PageShell';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Printer, Shield, Lock, Eye, FileText, Mail, ChevronRight, AlertCircle } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { SEO } from '@/components/SEO';

export default function Privacy() {
  // FIXED: Static date instead of dynamic date for legal compliance
  const LAST_UPDATED = 'January 21, 2025';
  const VERSION = '1.0';

  const [activeSection, setActiveSection] = useState('');

  // Track scroll position for active section highlighting
  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('section[id]');
      let currentSection = '';

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 150 && rect.bottom >= 150) {
          currentSection = section.id;
        }
      });

      setActiveSection(currentSection);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // Account for sticky header
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: elementPosition - offset,
        behavior: 'smooth'
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const tableOfContents = [
    { id: 'introduction', title: '1. Introduction', icon: Shield },
    { id: 'data-controller', title: '2. Data Controller', icon: FileText },
    { id: 'data-collect', title: '3. Data We Collect', icon: Eye },
    { id: 'data-use', title: '4. How We Use Your Data', icon: Lock },
    { id: 'legal-bases', title: '5. Legal Bases for Processing', icon: FileText },
    { id: 'cookies', title: '6. Cookies and Similar Technologies', icon: AlertCircle },
    { id: 'sharing', title: '7. Sharing of Personal Data', icon: Shield },
    { id: 'transfers', title: '8. International Transfers', icon: Shield },
    { id: 'retention', title: '9. Data Retention', icon: Lock },
    { id: 'rights', title: '10. Your Rights', icon: Shield },
    { id: 'security', title: '11. Security', icon: Lock },
    { id: 'third-party', title: '12. Third-Party Links', icon: AlertCircle },
    { id: 'changes', title: '13. Changes to this Policy', icon: FileText },
    { id: 'contact', title: '14. Contact', icon: Mail },
  ];

  return (
    <PageShell maxWidth="max-w-7xl">
      <SEO
        title="Privacy Policy - SmartPick | Data Protection & Your Rights"
        description="Learn how SmartPick protects your personal data. Comprehensive privacy policy covering data collection, usage, GDPR rights, and cookie management in Georgia."
        keywords="SmartPick privacy, data protection, GDPR, personal data, cookies, user rights, privacy policy Georgia"
        canonical="https://smartpick.ge/privacy"
      />

      {/* Back Button */}
      <div className="mb-4 md:mb-6">
        <Link to="/">
          <Button variant="ghost" className="mb-4 hover:bg-teal-50">
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Back to Home</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </Link>
      </div>

      <div className="grid lg:grid-cols-4 gap-6 md:gap-8">
        {/* Sticky Table of Contents - Left Sidebar */}
        <aside className="lg:col-span-1 hidden lg:block">
          <Card className="sticky top-4 shadow-lg border-teal-100">
            <CardHeader className="pb-4 px-4">
              <CardTitle className="text-base md:text-lg font-bold text-gray-900 flex items-center gap-2">
                <Shield className="h-5 w-5 text-teal-600" />
                Quick Navigation
              </CardTitle>
              <CardDescription className="text-xs">
                Version {VERSION}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <nav className="space-y-1" aria-label="Privacy policy sections">
                {tableOfContents.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all duration-200 flex items-center gap-2 ${
                        activeSection === item.id
                          ? 'bg-teal-50 text-teal-700 font-medium border-l-2 border-teal-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="text-xs truncate">{item.title}</span>
                      {activeSection === item.id && (
                        <ChevronRight className="h-3 w-3 ml-auto" />
                      )}
                    </button>
                  );
                })}
              </nav>

              <Separator className="my-4" />

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={handlePrint}
                >
                  <Printer className="mr-2 h-3.5 w-3.5" />
                  Print Policy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={handlePrint}
                >
                  <Download className="mr-2 h-3.5 w-3.5" />
                  Download PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Data Rights Card */}
          <Card className="mt-4 shadow-lg border-amber-200 bg-amber-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-amber-900 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Your Data Rights
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-amber-800 mb-3">
                You have the right to access, correct, or delete your personal data.
              </p>
              <Button
                size="sm"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs"
                onClick={() => scrollToSection('rights')}
              >
                Learn About Your Rights
              </Button>
            </CardContent>
          </Card>
        </aside>

        {/* Main Content */}
        <article className="lg:col-span-3 prose prose-slate max-w-none bg-white rounded-xl shadow-lg p-4 md:p-6 lg:p-8 print:shadow-none">
          {/* Header */}
          <div className="not-prose mb-6 md:mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-teal-100 rounded-lg">
                <Lock className="h-6 w-6 text-teal-700" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-0">SmartPick – Privacy Policy</h1>
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    Version {VERSION}
                  </Badge>
                  <span className="text-sm text-gray-600">Last updated: {LAST_UPDATED}</span>
                </div>
              </div>
            </div>

            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-900">
                This privacy policy explains how we collect, use, and protect your personal information in compliance with Georgian data protection laws and GDPR principles.
              </AlertDescription>
            </Alert>
          </div>

          {/* Section 1: Introduction */}
          <section id="introduction" className="mb-8 scroll-mt-20">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="h-6 w-6 text-teal-600" />
              1. Introduction
            </h2>
            <p className="text-gray-900 mb-4">
              This Privacy Policy explains how SmartPick ("we", "us", "our") collects, uses and protects your personal data when you use our website, mobile experience and related services ("Platform").
            </p>
            <p className="text-gray-900 mb-4">
              We process personal data in accordance with the legislation of Georgia and, where applicable, other data protection laws.
            </p>
            <div className="bg-teal-50 border-l-4 border-teal-600 p-4 my-4">
              <p className="text-gray-900 font-medium mb-2">Important Note</p>
              <p className="text-gray-900 text-sm">
                By using SmartPick, you agree to the practices described in this Privacy Policy. If you do not agree, please do not use our services.
              </p>
            </div>
          </section>

          {/* Section 2: Data Controller */}
          <section id="data-controller" className="mb-8 scroll-mt-20">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Data Controller</h2>
            <p className="text-gray-900 mb-2">The data controller for SmartPick is:</p>
            <Card className="not-prose border-gray-200 bg-gray-50">
              <CardContent className="pt-6">
                <ul className="list-none pl-0 text-gray-900 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="font-semibold min-w-[80px]">Entity:</span>
                    <span>IE Davit Batumashvili</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold min-w-[80px]">Email:</span>
                    <a href="mailto:davitbatumashvili@gmail.com" className="text-teal-600 hover:underline">
                      davitbatumashvili@gmail.com
                    </a>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold min-w-[80px]">Website:</span>
                    <a href="https://www.smartpick.ge" className="text-teal-600 hover:underline">
                      www.smartpick.ge
                    </a>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </section>

          {/* Section 3: Data We Collect */}
          <section id="data-collect" className="mb-8 scroll-mt-20">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Data We Collect</h2>
            <p className="text-gray-900 mb-4">We may collect the following categories of data:</p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1. Account and Identification Data</h3>
            <ul className="list-disc pl-6 text-gray-900 space-y-2 mb-4">
              <li>Name and surname</li>
              <li>Email address</li>
              <li>Phone number</li>
              <li>Password (stored in hashed form via our authentication provider)</li>
              <li>Age confirmation (e.g. that you are over 18, required for alcohol-related offers)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.2. Usage Data</h3>
            <ul className="list-disc pl-6 text-gray-900 space-y-2 mb-4">
              <li>Log data such as IP address, device information, browser type, date and time of access</li>
              <li>Pages visited, actions performed within the Platform</li>
              <li>Clicks on offers, reservations made, cancellations, etc.</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.3. Reservation and Transaction Data</h3>
            <ul className="list-disc pl-6 text-gray-900 space-y-2 mb-4">
              <li>Offers you reserve, Partner locations and pickup times</li>
              <li>SmartPoints balance and activity</li>
              <li>Payment-related metadata (e.g. transaction IDs, payment status) received from payment providers.</li>
            </ul>
            <Alert className="border-green-200 bg-green-50 not-prose">
              <Lock className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-sm text-green-900">
                <strong>Security Note:</strong> We do not store full card numbers or CVV codes on our servers. All payment data is handled securely by certified payment providers.
              </AlertDescription>
            </Alert>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">3.4. Partner Data</h3>
            <p className="text-gray-900 mb-4">For Partners and their staff, we may collect:</p>
            <ul className="list-disc pl-6 text-gray-900 space-y-2 mb-4">
              <li>Contact details (name, email, phone)</li>
              <li>Business details (trade name, address, banking details for payouts)</li>
              <li>Access credentials to the Partner dashboard.</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.5. Communication Data</h3>
            <ul className="list-disc pl-6 text-gray-900 space-y-2">
              <li>Messages or emails you send to us</li>
              <li>Support requests, feedback, complaints</li>
            </ul>
          </section>

          {/* Section 4: How We Use Your Data */}
          <section id="data-use" className="mb-8 scroll-mt-20">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. How We Use Your Data</h2>
            <p className="text-gray-900 mb-4">We use personal data for the following purposes:</p>
            <div className="grid md:grid-cols-2 gap-4 not-prose mb-4">
              {[
                'Create and manage your SmartPick account',
                'Provide our reservation and SmartPoints services',
                'Process payments via third-party providers',
                'Communicate about reservations and account status',
                'Show relevant offers and improve user experience',
                'Maintain platform security and integrity',
                'Comply with legal obligations (accounting, anti-fraud)',
                'Conduct analytics with anonymized data',
              ].map((purpose, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="mt-0.5">
                    <div className="h-2 w-2 bg-teal-600 rounded-full"></div>
                  </div>
                  <span className="text-sm text-gray-900">{purpose}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-900 text-sm italic">
              We may also use aggregated or anonymized data for analytics, which no longer identifies you personally.
            </p>
          </section>

          {/* Section 5: Legal Bases */}
          <section id="legal-bases" className="mb-8 scroll-mt-20">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Legal Bases for Processing</h2>
            <p className="text-gray-900 mb-4">We process personal data based on one or more of the following legal grounds:</p>
            <div className="space-y-4 not-prose">
              {[
                { title: 'Performance of a contract', desc: 'To provide the SmartPick service you signed up for' },
                { title: 'Legitimate interests', desc: 'To improve our Platform, prevent abuse, and ensure security' },
                { title: 'Legal obligations', desc: 'To comply with applicable laws and regulations' },
                { title: 'Consent', desc: 'For certain marketing communications or optional features, where required' },
              ].map((basis, index) => (
                <div key={index} className="flex gap-3 p-4 border-l-4 border-teal-600 bg-teal-50 rounded-r-lg">
                  <FileText className="h-5 w-5 text-teal-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900">{basis.title}</p>
                    <p className="text-sm text-gray-900">{basis.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 6: Cookies */}
          <section id="cookies" className="mb-8 scroll-mt-20">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Cookies and Similar Technologies</h2>
            <p className="text-gray-900 mb-4">SmartPick may use cookies and similar technologies to:</p>
            <ul className="list-disc pl-6 text-gray-900 space-y-2 mb-4">
              <li>Keep you logged in</li>
              <li>Remember your preferences</li>
              <li>Analyze traffic and usage patterns</li>
              <li>Support functionality such as language settings and session management</li>
            </ul>
            <Alert className="border-amber-200 bg-amber-50 not-prose">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-900">
                <strong>Cookie Management:</strong> You can manage cookie settings in your browser. Disabling some cookies may affect certain features of the Platform.
              </AlertDescription>
            </Alert>
          </section>

          {/* Section 7: Sharing */}
          <section id="sharing" className="mb-8 scroll-mt-20">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Sharing of Personal Data</h2>
            <p className="text-gray-900 mb-4">We may share your personal data with:</p>
            <ul className="list-disc pl-6 text-gray-900 space-y-2 mb-4">
              <li>Partner businesses, to the extent necessary to fulfill your reservation (e.g. your name, reservation ID and pickup time)</li>
              <li>Payment service providers (such as Unipay or banks) that process card transactions on our behalf</li>
              <li>Cloud hosting, analytics and communication service providers that support the operation of the Platform</li>
              <li>Professional advisers (such as lawyers or accountants) where necessary</li>
              <li>Authorities or regulators, if required by law or to protect our rights and the rights of others</li>
            </ul>
            <div className="bg-green-50 border-l-4 border-green-600 p-4 my-4">
              <p className="text-green-900 font-semibold text-lg mb-0">
                We do not sell your personal data.
              </p>
            </div>
          </section>

          {/* Section 8: International Transfers */}
          <section id="transfers" className="mb-8 scroll-mt-20">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. International Transfers</h2>
            <p className="text-gray-900">
              Some of our service providers may be located outside of Georgia. In such cases, we will take reasonable steps to ensure that your data is protected with appropriate safeguards and that transfers comply with applicable law.
            </p>
          </section>

          {/* Section 9: Data Retention */}
          <section id="retention" className="mb-8 scroll-mt-20">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Data Retention</h2>
            <p className="text-gray-900 mb-4">We keep your personal data for as long as necessary to:</p>
            <ul className="list-disc pl-6 text-gray-900 space-y-2 mb-4">
              <li>Provide the SmartPick service</li>
              <li>Maintain your account</li>
              <li>Fulfill legal and accounting obligations (typically 7 years for financial records)</li>
              <li>Resolve disputes and enforce our agreements</li>
            </ul>
            <p className="text-gray-900">
              When data is no longer needed, we will delete or anonymize it, unless we are legally required to keep it longer.
            </p>
          </section>

          {/* Section 10: Your Rights */}
          <section id="rights" className="mb-8 scroll-mt-20">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="h-6 w-6 text-teal-600" />
              10. Your Rights
            </h2>
            <p className="text-gray-900 mb-4">Depending on applicable law, you may have the right to:</p>
            <div className="grid md:grid-cols-2 gap-4 not-prose mb-6">
              {[
                { title: 'Access', desc: 'Request a copy of your personal data' },
                { title: 'Rectification', desc: 'Correct inaccurate or incomplete data' },
                { title: 'Erasure', desc: 'Request deletion of your data where applicable' },
                { title: 'Restriction', desc: 'Limit how we process your data' },
                { title: 'Portability', desc: 'Receive your data in a machine-readable format' },
                { title: 'Objection', desc: 'Object to certain processing activities' },
                { title: 'Withdraw Consent', desc: 'Withdraw consent where processing is based on it' },
                { title: 'Complain', desc: 'Lodge a complaint with a data protection authority' },
              ].map((right, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg hover:border-teal-300 transition-colors">
                  <h4 className="font-semibold text-gray-900 mb-1">{right.title}</h4>
                  <p className="text-sm text-gray-600">{right.desc}</p>
                </div>
              ))}
            </div>
            <Card className="not-prose border-teal-200 bg-teal-50">
              <CardContent className="pt-6">
                <p className="text-gray-900 font-medium mb-3 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-teal-600" />
                  To exercise your rights, please contact us at:
                </p>
                <div className="flex flex-wrap gap-2">
                  <a href="mailto:privacy@smartpick.ge" className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-800 font-medium">
                    privacy@smartpick.ge
                  </a>
                  <span className="text-gray-500">or</span>
                  <a href="mailto:davitbatumashvili@gmail.com" className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-800 font-medium">
                    davitbatumashvili@gmail.com
                  </a>
                </div>
                <Separator className="my-4" />
                <div className="flex gap-3">
                  <Button
                    size="sm"
                    className="bg-teal-600 hover:bg-teal-700"
                    asChild
                  >
                    <a href="mailto:privacy@smartpick.ge?subject=Data Access Request">
                      Request My Data
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-teal-600 text-teal-700 hover:bg-teal-50"
                    asChild
                  >
                    <a href="mailto:privacy@smartpick.ge?subject=Account Deletion Request">
                      Delete My Account
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section 11: Security */}
          <section id="security" className="mb-8 scroll-mt-20">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Security</h2>
            <p className="text-gray-900 mb-4">
              We take reasonable technical and organizational measures to protect your personal data against unauthorized access, loss, misuse or alteration. These measures include:
            </p>
            <div className="grid md:grid-cols-3 gap-4 not-prose mb-4">
              {[
                { icon: Lock, text: 'Encryption in transit (HTTPS/TLS)' },
                { icon: Shield, text: 'Secure authentication systems' },
                { icon: Lock, text: 'Regular security audits' },
                { icon: Shield, text: 'Access controls and monitoring' },
                { icon: Lock, text: 'Data backup and recovery' },
                { icon: Shield, text: 'Employee training' },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Icon className="h-5 w-5 text-teal-600 flex-shrink-0" />
                    <span className="text-sm text-gray-900">{item.text}</span>
                  </div>
                );
              })}
            </div>
            <Alert className="border-red-200 bg-red-50 not-prose">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-sm text-red-900">
                However, no system is completely secure and we cannot guarantee absolute security. Please contact us immediately if you suspect unauthorized access to your account.
              </AlertDescription>
            </Alert>
          </section>

          {/* Section 12: Third-Party Links */}
          <section id="third-party" className="mb-8 scroll-mt-20">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Third-Party Links</h2>
            <p className="text-gray-900">
              The Platform may contain links to third-party websites or services. This Privacy Policy applies only to SmartPick. We are not responsible for the privacy practices or content of third-party sites. Please review their privacy policies before providing any personal information.
            </p>
          </section>

          {/* Section 13: Changes */}
          <section id="changes" className="mb-8 scroll-mt-20">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Changes to this Privacy Policy</h2>
            <p className="text-gray-900 mb-4">
              We may update this Privacy Policy from time to time. The latest version will always be available on our website. Significant changes may be communicated via email or in-app notifications.
            </p>
            <p className="text-gray-900">
              Your continued use of SmartPick after changes means you accept the updated Privacy Policy. We encourage you to review this policy periodically.
            </p>
          </section>

          {/* Section 14: Contact */}
          <section id="contact" className="mb-8 scroll-mt-20">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Contact</h2>
            <p className="text-gray-900 mb-4">
              If you have any questions about this Privacy Policy or how we handle your data, please contact us at:
            </p>
            <Card className="not-prose border-gray-200">
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 mb-1">Email</p>
                      <a
                        href="mailto:privacy@smartpick.ge"
                        className="text-sm text-teal-600 hover:text-teal-700 hover:underline break-all"
                      >
                        privacy@smartpick.ge
                      </a>
                      <br />
                      <a
                        href="mailto:davitbatumashvili@gmail.com"
                        className="text-sm text-teal-600 hover:text-teal-700 hover:underline break-all"
                      >
                        davitbatumashvili@gmail.com
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 mb-1">Phone</p>
                      <a
                        href="tel:+995557737399"
                        className="text-sm text-teal-600 hover:text-teal-700 hover:underline"
                      >
                        +995 557 737 399
                      </a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Footer Notes */}
          <div className="not-prose mt-12 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between flex-wrap gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-teal-600" />
                <span>Version {VERSION} • Last updated: {LAST_UPDATED}</span>
              </div>
              <div className="flex gap-4">
                <Link to="/terms" className="text-teal-600 hover:text-teal-700 hover:underline">
                  Terms & Conditions
                </Link>
                <Link to="/contact" className="text-teal-600 hover:text-teal-700 hover:underline">
                  Contact Support
                </Link>
              </div>
            </div>
          </div>
        </article>
      </div>

      <Footer />
    </PageShell>
  );
}

