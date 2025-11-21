import { PageShell } from '@/components/layout/PageShell';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MessageCircle, Send, CheckCircle2, Clock, HelpCircle, ExternalLink, Zap } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Turnstile } from '@marsidev/react-turnstile';
import { supabase } from '@/lib/supabase';

interface ContactFormData {
  fullName: string;
  email: string;
  phone: string;
  topic: string;
  message: string;
}

// Rate limiting: max 3 submissions per 15 minutes
const RATE_LIMIT_KEY = 'contact_form_submissions';
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

// Field length limits to prevent spam
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 100;
const MAX_PHONE_LENGTH = 20;
const MAX_MESSAGE_LENGTH = 2000;
const MIN_MESSAGE_LENGTH = 10;

function Contact() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ContactFormData>({
    fullName: '',
    email: '',
    phone: '',
    topic: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<ContactFormData>>({});
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [showCaptcha, setShowCaptcha] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [ticketId, setTicketId] = useState<string>('');

  const checkRateLimit = (): boolean => {
    const stored = localStorage.getItem(RATE_LIMIT_KEY);
    if (!stored) return true;

    try {
      const submissions: number[] = JSON.parse(stored);
      const now = Date.now();
      const recentSubmissions = submissions.filter(time => now - time < RATE_LIMIT_WINDOW);
      
      if (recentSubmissions.length >= RATE_LIMIT_MAX) {
        const oldestSubmission = Math.min(...recentSubmissions);
        const minutesLeft = Math.ceil((RATE_LIMIT_WINDOW - (now - oldestSubmission)) / 60000);
        toast.error(`Rate limit exceeded`, {
          description: `Please wait ${minutesLeft} minutes before submitting again.`,
        });
        return false;
      }
      
      // Clean up old submissions
      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(recentSubmissions));
      return true;
    } catch {
      return true;
    }
  };

  const recordSubmission = () => {
    const stored = localStorage.getItem(RATE_LIMIT_KEY);
    const submissions = stored ? JSON.parse(stored) : [];
    submissions.push(Date.now());
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(submissions));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<ContactFormData> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.length > MAX_NAME_LENGTH) {
      newErrors.fullName = `Name must be ${MAX_NAME_LENGTH} characters or less`;
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    } else if (formData.email.length > MAX_EMAIL_LENGTH) {
      newErrors.email = `Email must be ${MAX_EMAIL_LENGTH} characters or less`;
    }

    if (formData.phone && !/^[\d\s+()-]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format';
    } else if (formData.phone.length > MAX_PHONE_LENGTH) {
      newErrors.phone = `Phone must be ${MAX_PHONE_LENGTH} characters or less`;
    }

    if (!formData.topic) {
      newErrors.topic = 'Please select a topic';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < MIN_MESSAGE_LENGTH) {
      newErrors.message = `Message must be at least ${MIN_MESSAGE_LENGTH} characters`;
    } else if (formData.message.length > MAX_MESSAGE_LENGTH) {
      newErrors.message = `Message must be ${MAX_MESSAGE_LENGTH} characters or less`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getResponseTime = (topic: string): string => {
    const times: Record<string, string> = {
      'technical': '2-4 hours (urgent issues)',
      'reservation': '1-2 hours (same day)',
      'partnership': '24-48 hours',
      'general': '12-24 hours',
      'other': '24-48 hours',
    };
    return times[topic] || '24-48 hours';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    if (!captchaToken) {
      toast.error('Please complete the CAPTCHA verification');
      return;
    }

    if (!checkRateLimit()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate ticket ID
      const newTicketId = `SP${Date.now().toString(36).toUpperCase()}`;
      
      // Submit to Supabase
      const { error } = await supabase
        .from('contact_submissions')
        .insert({
          ticket_id: newTicketId,
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone || null,
          topic: formData.topic,
          message: formData.message,
          captcha_token: captchaToken,
          status: 'pending',
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Supabase error:', error);
        throw new Error('Failed to submit form');
      }

      // Record successful submission for rate limiting
      recordSubmission();

      // Show success dialog
      setTicketId(newTicketId);
      setShowSuccess(true);

      // Reset form
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        topic: '',
        message: '',
      });
      setErrors({});
      setCaptchaToken(null);
      setShowCaptcha(false);
      setTimeout(() => setShowCaptcha(true), 100);

    } catch (error) {
      console.error('Error submitting contact form:', error);
      toast.error('Failed to send message', {
        description: 'Please try again or contact us directly via email, phone, Telegram or WhatsApp.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToForm = () => {
    document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <PageShell maxWidth="max-w-7xl">
      <div className="mb-4 md:mb-6">
        <Link to="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Back to Home</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </Link>
      </div>

      {/* Urgent Help Banner */}
      <Alert className="mb-6 md:mb-8 border-orange-200 bg-gradient-to-r from-orange-50 to-red-50">
        <Zap className="h-4 w-4 md:h-5 md:w-5 text-orange-600" />
        <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
          <div className="flex-1">
            <strong className="text-orange-900 text-sm md:text-base">Partner with urgent issue?</strong>
            <p className="text-xs md:text-sm text-gray-700 mt-1">For immediate assistance with active reservations or technical problems, call us directly.</p>
          </div>
          <Button asChild variant="destructive" size="sm" className="w-full sm:w-auto">
            <a href="tel:+995557737399">
              <Phone className="mr-2 h-4 w-4" />
              Call Now: +995 557 737 399
            </a>
          </Button>
        </AlertDescription>
      </Alert>

      {/* FAQ Section */}
      <Card className="mb-6 md:mb-8 border-teal-200 shadow-lg">
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="text-lg md:text-2xl font-bold text-gray-900 flex items-center">
            <HelpCircle className="mr-2 h-5 w-5 md:h-6 md:w-6 text-teal-600" />
            Frequently Asked Questions
          </CardTitle>
          <CardDescription className="text-sm md:text-base">
            Quick answers to common questions. Can't find what you're looking for? <button onClick={scrollToForm} className="text-teal-600 hover:underline font-semibold">Contact us below</button>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="refunds">
              <AccordionTrigger className="text-left hover:text-teal-700">
                How do SmartPoints refunds work?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                SmartPoints are generally non-refundable once a reservation is confirmed, except when the Partner cancels, cannot provide the product, or in cases of technical errors. 
                <Link to="/terms#smartpoints" className="text-teal-600 hover:underline font-semibold ml-1">
                  Full refund policy <ExternalLink className="inline h-3 w-3" />
                </Link>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="pickup">
              <AccordionTrigger className="text-left hover:text-teal-700">
                What happens if I miss my pickup time?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                If you don't arrive within the specified pickup window, the Partner may mark the reservation as completed and SmartPoints won't be refunded. Always check your pickup time and set reminders! 
                <Link to="/terms#cancellations" className="text-teal-600 hover:underline font-semibold ml-1">
                  No-show policy <ExternalLink className="inline h-3 w-3" />
                </Link>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="smartpoints">
              <AccordionTrigger className="text-left hover:text-teal-700">
                What are SmartPoints and how do I buy them?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                SmartPoints are virtual loyalty units used to reserve offers. They have <strong>no cash value</strong> outside SmartPick. You can purchase them through Unipay or Bank of Georgia, or earn them through promotions and referrals. 
                <Link to="/terms#smartpoints" className="text-teal-600 hover:underline font-semibold ml-1">
                  Learn more <ExternalLink className="inline h-3 w-3" />
                </Link>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="payment">
              <AccordionTrigger className="text-left hover:text-teal-700">
                Do I pay online or at the partner location?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                You use SmartPoints to reserve online, but the <strong>final payment for the actual product is made at the Partner's location</strong> when you pick up, at the discounted/reserved price shown in the offer.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="partner">
              <AccordionTrigger className="text-left hover:text-teal-700">
                How can I become a Partner on SmartPick?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                We're always looking for great local businesses! Submit a partnership inquiry using the form below (select "Partnership / business inquiry" as your topic) and we'll get back to you within 24-48 hours with next steps.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="account">
              <AccordionTrigger className="text-left hover:text-teal-700">
                I forgot my password. How do I reset it?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                On the login page, click "Forgot Password?" and enter your email. We'll send you a password reset link. If you don't receive it within 5 minutes, check your spam folder or contact us for help.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="cancel">
              <AccordionTrigger className="text-left hover:text-teal-700">
                Can I cancel a reservation after booking?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                It depends on the specific offer. Some allow cancellation before a deadline, others are non-cancellable. Check the offer details carefully before reserving. 
                <Link to="/terms#cancellations" className="text-teal-600 hover:underline font-semibold ml-1">
                  Cancellation policy <ExternalLink className="inline h-3 w-3" />
                </Link>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="age">
              <AccordionTrigger className="text-left hover:text-teal-700">
                Do I need to be 18+ to use SmartPick?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                Yes, you must be at least 18 years old to create an account. Some offers (alcoholic beverages) require valid ID verification at pickup. 
                <Link to="/terms#eligibility" className="text-teal-600 hover:underline font-semibold ml-1">
                  Age requirements <ExternalLink className="inline h-3 w-3" />
                </Link>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
        {/* Contact Form - 2/3 width on desktop */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          <Card id="contact-form" className="shadow-lg scroll-mt-4">
            <CardHeader className="px-4 md:px-6">
              <CardTitle className="text-xl md:text-2xl font-bold text-gray-900">Contact & Support</CardTitle>
              <CardDescription className="text-sm md:text-base">
                Have a question about reservations, technical issues, or interested in partnering with us? Send us a message and we'll get back to you as soon as possible.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 md:px-6">
              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Your full name"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className={errors.fullName ? 'border-red-500' : ''}
                    disabled={isSubmitting}
                    maxLength={MAX_NAME_LENGTH}
                  />
                  {errors.fullName && <p className="text-sm text-red-500">{errors.fullName}</p>}
                  <p className="text-xs text-gray-500">{formData.fullName.length} / {MAX_NAME_LENGTH} characters</p>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={errors.email ? 'border-red-500' : ''}
                    disabled={isSubmitting}
                    maxLength={MAX_EMAIL_LENGTH}
                  />
                  {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                </div>

                {/* Phone Number (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                    Phone Number <span className="text-gray-400">(optional)</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+995 XXX XXX XXX"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={errors.phone ? 'border-red-500' : ''}
                    disabled={isSubmitting}
                    maxLength={MAX_PHONE_LENGTH}
                  />
                  {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
                </div>

                {/* Topic */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Topic <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.topic}
                    onValueChange={(value) => setFormData({ ...formData, topic: value })}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="topic" className={errors.topic ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select a topic" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">
                        <div className="flex items-center justify-between w-full">
                          <span>Technical issue</span>
                          <Badge variant="destructive" className="ml-2 text-xs">Urgent</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="reservation">
                        <div className="flex items-center justify-between w-full">
                          <span>Reservation problem</span>
                          <Badge variant="outline" className="ml-2 text-xs">Priority</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="partnership">Partnership / business inquiry</SelectItem>
                      <SelectItem value="general">General question</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.topic && <p className="text-sm text-red-500">{errors.topic}</p>}
                  {formData.topic && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Clock className="h-3 w-3" />
                      <span>Expected response time: <strong>{getResponseTime(formData.topic)}</strong></span>
                    </div>
                  )}
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-sm font-medium text-gray-700">
                    Message <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us more about your inquiry... Please include any relevant details like reservation IDs, error messages, or specific questions."
                    rows={6}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className={errors.message ? 'border-red-500' : ''}
                    disabled={isSubmitting}
                    maxLength={MAX_MESSAGE_LENGTH}
                  />
                  {errors.message && <p className="text-sm text-red-500">{errors.message}</p>}
                  <p className="text-xs text-gray-500">
                    {formData.message.length} / {MAX_MESSAGE_LENGTH} characters (min {MIN_MESSAGE_LENGTH})
                  </p>
                </div>

                {/* CAPTCHA */}
                {showCaptcha && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Verification <span className="text-red-500">*</span>
                    </Label>
                    <Turnstile
                      siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
                      onSuccess={setCaptchaToken}
                      onError={() => setCaptchaToken(null)}
                      onExpire={() => setCaptchaToken(null)}
                    />
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-semibold py-3"
                  disabled={isSubmitting || !captchaToken}
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Sending...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Contact Information Sidebar - 1/3 width on desktop */}
        <div className="space-y-4 md:space-y-6">
          {/* Primary Contact */}
          <Card className="shadow-lg">
            <CardHeader className="px-4 md:px-6 pb-3">
              <CardTitle className="text-base md:text-lg font-bold text-gray-900">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 px-4 md:px-6">
              <div className="flex items-start space-x-3">
                <Mail className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-1">Email</p>
                  <a
                    href="mailto:support@smartpick.ge"
                    className="text-sm text-teal-600 hover:text-teal-700 hover:underline break-all"
                  >
                    support@smartpick.ge
                  </a>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Phone className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
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
            </CardContent>
          </Card>

          {/* Quick Contact Channels */}
          <Card className="shadow-lg border-teal-200">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-gray-900">Quick Contact</CardTitle>
              <CardDescription>Reach us through your preferred channel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild variant="outline" className="w-full justify-start">
                <a href="https://t.me/smartpickge" target="_blank" rel="noopener noreferrer">
                  <Send className="mr-2 h-4 w-4 text-blue-500" />
                  Telegram Support
                  <ExternalLink className="ml-auto h-3 w-3" />
                </a>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <a href="https://wa.me/995557737399" target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4 text-green-500" />
                  WhatsApp
                  <ExternalLink className="ml-auto h-3 w-3" />
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Business Hours */}
          <Card className="shadow-lg bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-200">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-gray-900">Business Hours</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700 font-medium">Monday - Friday:</span>
                <span className="text-gray-900 font-semibold">9:00 - 18:00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700 font-medium">Saturday:</span>
                <span className="text-gray-900 font-semibold">10:00 - 16:00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700 font-medium">Sunday:</span>
                <span className="text-gray-600">Closed</span>
              </div>
              <div className="mt-4 pt-4 border-t border-teal-200">
                <p className="text-xs text-gray-600">
                  <Clock className="inline h-3 w-3 mr-1" />
                  Emergency support available 24/7 via phone for active reservations
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Legal Links */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-gray-900">Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to="/terms" className="block text-sm text-gray-700 hover:text-teal-600 transition-colors">
                Terms & Conditions <ExternalLink className="inline h-3 w-3 ml-1" />
              </Link>
              <Link to="/privacy" className="block text-sm text-gray-700 hover:text-teal-600 transition-colors">
                Privacy Policy <ExternalLink className="inline h-3 w-3 ml-1" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <DialogTitle className="text-center text-xl">Message Sent Successfully!</DialogTitle>
            <DialogDescription className="text-center space-y-4">
              <div className="rounded-lg bg-gray-50 p-4 mt-4">
                <p className="text-sm text-gray-600 mb-2">Your ticket number:</p>
                <p className="text-2xl font-bold text-gray-900 font-mono">#{ticketId}</p>
              </div>
              <p className="text-sm">
                We've sent a confirmation email to <strong>{formData.email}</strong>
              </p>
              <p className="text-sm text-gray-600">
                Expected response time: <strong>{getResponseTime(formData.topic)}</strong>
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setShowSuccess(false)}>
              Send Another
            </Button>
            <Button className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-500" onClick={() => navigate('/')}>
              Return Home
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </PageShell>
  );
}

export default Contact;
