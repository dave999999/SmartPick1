import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase, isDemoMode } from '@/lib/supabase';
import { toast } from 'sonner';
import { ArrowLeft, Store, AlertCircle, MapPin, Navigation, Eye, EyeOff, Shield, CheckCircle2, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useI18n } from '@/lib/i18n';
import { checkServerRateLimit } from '@/lib/rateLimiter-server';
import { logger } from '@/lib/logger';

const BUSINESS_TYPES = [
  { value: 'BAKERY', label: 'Bakery', emoji: '🥐' },
  { value: 'CAFE', label: 'Cafe', emoji: '☕' },
  { value: 'RESTAURANT', label: 'Restaurant', emoji: '🍽️' },
  { value: 'FAST_FOOD', label: 'Fast Food', emoji: '🍔' },
  { value: 'ALCOHOL', label: 'Alcohol', emoji: '🍷' },
  { value: 'GROCERY', label: 'Grocery', emoji: '🛒' },
];

// Custom marker icon
const customIcon = L.divIcon({
  className: 'custom-location-marker',
  html: `
    <div style="
      background-color: #10B981;
      width: 40px;
      height: 40px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 4px solid white;
      box-shadow: 0 3px 10px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        transform: rotate(45deg);
        color: white;
        font-weight: bold;
        font-size: 20px;
      ">📍</div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

interface LocationMarkerProps {
  position: [number, number];
  setPosition: (pos: [number, number]) => void;
}

function LocationMarker({ position, setPosition }: LocationMarkerProps) {
  const markerRef = useRef<L.Marker>(null);

  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return (
    <Marker
      position={position}
      icon={customIcon}
      draggable={true}
      ref={markerRef}
      eventHandlers={{
        dragend() {
          const marker = markerRef.current;
          if (marker) {
            const pos = marker.getLatLng();
            setPosition([pos.lat, pos.lng]);
          }
        },
      }}
    />
  );
}

interface AddressSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    city?: string;
    town?: string;
    village?: string;
  };
}

export default function PartnerApplication() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [markerPosition, setMarkerPosition] = useState<[number, number]>([41.7151, 44.8271]);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [emailError, setEmailError] = useState<string>('');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [open24h, setOpen24h] = useState(false);

  // Form validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const totalSteps = 4;
  const steps = [
    { number: 1, title: t('partner.step.account'), icon: '🔐' },
    { number: 2, title: t('partner.step.location'), icon: '📍' },
    { number: 3, title: t('partner.step.business'), icon: '🏪' },
    { number: 4, title: t('partner.step.contact'), icon: '📞' },
  ];

  // Address autocomplete
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [addressAutoDetected, setAddressAutoDetected] = useState(false);
  const addressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [formData, setFormData] = useState({
    // Account fields
    email: '',
    password: '',
    confirmPassword: '',

    // Business fields
    business_name: '',
    business_type: '',
    description: '',
    opening_hours: '',
    closing_hours: '',
    pickup_notes: '',
    address: '',
    city: 'Tbilisi',
    latitude: 41.7151,
    longitude: 44.8271,
    phone: '',
    telegram: '',
    whatsapp: '',
    open_24h: false,
  });

  // Reverse geocoding: map position -> address
  const reverseGeocode = useCallback(async (lat: number, lon: number) => {
    try {
      // Use Nominatim reverse geocoding (free service)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        logger.error('Reverse geocoding failed:', response.statusText);
        return;
      }

      const data = await response.json();

      if (data && data.display_name) {
        const addressText = data.address?.road || data.address?.suburb || data.display_name;
        const cityText = data.address?.city || data.address?.town || data.address?.village || formData.city;

        setFormData(prev => ({
          ...prev,
          address: addressText,
          city: cityText,
        }));

        setAddressAutoDetected(true);

        setTimeout(() => {
          setAddressAutoDetected(false);
        }, 3000);
      }
    } catch (error) {
      logger.error('Error reverse geocoding:', error);
    }
  }, [formData.city]);

  const handleMapPositionChange = (pos: [number, number]) => {
    setMarkerPosition(pos);
    setFormData(prev => ({
      ...prev,
      latitude: pos[0],
      longitude: pos[1],
    }));

    reverseGeocode(pos[0], pos[1]);
  };

  const handleUseCurrentLocation = () => {
    if ('geolocation' in navigator) {
  toast.loading(t('partner.toast.gettingLocation'));
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos: [number, number] = [position.coords.latitude, position.coords.longitude];
          setMarkerPosition(pos);
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }));

          reverseGeocode(position.coords.latitude, position.coords.longitude);

          toast.dismiss();
          toast.success(t('partner.toast.locationUpdated'));
        },
        (error) => {
          toast.dismiss();
          toast.error(t('partner.toast.locationFailed'));
          logger.error('Geolocation error:', error);
        }
      );
    } else {
  toast.error(t('partner.toast.geoUnsupported'));
    }
  };

  const searchAddress = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      return;
    }

    setIsLoadingAddress(true);

    try {
      // Using geocode.maps.co (free alternative to Nominatim with better CORS support)
      const response = await fetch(
        `https://geocode.maps.co/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        logger.error('Address search failed:', response.statusText);
        setIsLoadingAddress(false);
        return;
      }

      const data: AddressSuggestion[] = await response.json();

      if (data && data.length > 0) {
        setAddressSuggestions(data);
        setShowAddressSuggestions(true);
      } else {
  setAddressSuggestions([]);
  setShowAddressSuggestions(false);
  toast.error(t('partner.toast.noAddresses'));
      }
    } catch (error) {
      logger.error('Error searching address:', error);
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
    } finally {
      setIsLoadingAddress(false);
    }
  }, []);

  const handleAddressChange = (value: string) => {
    setFormData(prev => ({ ...prev, address: value }));
    setAddressAutoDetected(false);

    if (addressTimeoutRef.current) {
      clearTimeout(addressTimeoutRef.current);
    }

    addressTimeoutRef.current = setTimeout(() => {
      searchAddress(value);
    }, 400);
  };

  const handleSelectAddressSuggestion = (suggestion: AddressSuggestion) => {
    const lat = parseFloat(suggestion.lat);
    const lon = parseFloat(suggestion.lon);

    const addressText = suggestion.address?.road || suggestion.display_name;
    const cityText = suggestion.address?.city || suggestion.address?.town || suggestion.address?.village || formData.city;

    setFormData(prev => ({
      ...prev,
      address: addressText,
      city: cityText,
      latitude: lat,
      longitude: lon,
    }));

    setMarkerPosition([lat, lon]);
    setShowAddressSuggestions(false);
    setAddressSuggestions([]);
  };

  const calculatePasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) return 'weak';
    if (strength <= 4) return 'medium';
    return 'strong';
  };

  const handlePasswordChange = (password: string) => {
    setFormData(prev => ({ ...prev, password }));
    if (password.length > 0) {
      setPasswordStrength(calculatePasswordStrength(password));
    } else {
      setPasswordStrength(null);
    }

    if (fieldErrors.password) {
      setFieldErrors(prev => ({ ...prev, password: '' }));
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const checkEmailExists = async (email: string) => {
    if (!validateEmail(email)) {
  setEmailError(t('partner.error.invalidEmail'));
      return;
    }

    setIsCheckingEmail(true);
    setEmailError('');

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .single();

      const { data: partnerData } = await supabase
        .from('partners')
        .select('email')
        .eq('email', email)
        .single();

      if (userData || partnerData) {
  setEmailError(t('partner.error.emailExists'));
      }
    } catch (error) {
      logger.error('Error checking email:', error);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleEmailBlur = () => {
    if (formData.email && !isDemoMode) {
      checkEmailExists(formData.email);
    }
  };

  const validatePassword = (password: string): boolean => {
    if (password.length < 8) return false;
    if (!/\d/.test(password)) return false;
    if (!/[A-Z]/.test(password)) return false;
    return true;
  };

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      // Account Creation
      if (!formData.email) {
        errors.email = t('partner.error.required');
      } else if (!validateEmail(formData.email)) {
        errors.email = t('partner.error.invalidEmail');
      } else if (emailError) {
        errors.email = emailError;
      }

      if (!formData.password) {
        errors.password = t('partner.error.required');
      } else if (!validatePassword(formData.password)) {
        errors.password = t('partner.error.passwordWeak');
      }

      if (!formData.confirmPassword) {
        errors.confirmPassword = t('partner.error.required');
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match.';
      }
    } else if (step === 2) {
      // Location
      if (!formData.address) {
        errors.address = t('partner.error.required');
      }

      if (!formData.city) {
        errors.city = t('partner.error.required');
      }

      if (!formData.latitude || !formData.longitude) {
        errors.location = 'Please set your location on the map.';
      }
    } else if (step === 3) {
      // Business Information
      if (!formData.business_name) {
        errors.business_name = t('partner.error.required');
      }

      if (!formData.business_type) {
        errors.business_type = 'Please select a business type.';
      }

      if (!formData.description) {
        errors.description = t('partner.error.required');
      }

      const isOpen24h = open24h === true || formData.open_24h === true;

      if (!isOpen24h) {
        if (!formData.opening_hours) {
          errors.opening_hours = 'Please select opening hours.';
        }

        if (!formData.closing_hours) {
          errors.closing_hours = 'Please select closing hours.';
        } else if (
          formData.opening_hours &&
          formData.closing_hours <= formData.opening_hours
        ) {
          errors.closing_hours = 'Closing time must be later than opening time.';
        }
      } else {
        formData.opening_hours = '00:00';
        formData.closing_hours = '23:59';
      }
    } else if (step === 4) {
      // Contact Information
      if (!formData.phone) {
        errors.phone = t('partner.error.required');
      }

      if (!acceptedTerms) {
        errors.terms = 'Please accept the terms and conditions.';
      }
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.error('Please complete all required fields before continuing.');
      return false;
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.email) {
      errors.email = t('partner.error.required');
    } else if (!validateEmail(formData.email)) {
      errors.email = t('partner.error.invalidEmail');
    } else if (emailError) {
      errors.email = emailError;
    }

    if (!formData.password) {
      errors.password = t('partner.error.required');
    } else if (!validatePassword(formData.password)) {
      errors.password = t('partner.error.passwordWeak');
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = t('partner.error.required');
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (!formData.business_name) {
      errors.business_name = t('partner.error.required');
    }

    if (!formData.business_type) {
      errors.business_type = 'Please select a business type.';
    }

    if (!formData.description) {
      errors.description = t('partner.error.required');
    }

    const isOpen24h = open24h === true || formData.open_24h === true;

    if (!isOpen24h) {
      if (!formData.opening_hours) {
        errors.opening_hours = 'Please select opening hours.';
      }

      if (!formData.closing_hours) {
        errors.closing_hours = 'Please select closing hours.';
      } else if (
        formData.opening_hours &&
        formData.closing_hours <= formData.opening_hours
      ) {
        errors.closing_hours = 'Closing time must be later than opening time.';
      }
    } else {
      formData.opening_hours = '00:00';
      formData.closing_hours = '23:59';
    }

    if (!formData.address) {
      errors.address = t('partner.error.required');
    }

    if (!formData.city) {
      errors.city = t('partner.error.required');
    }

    if (!formData.phone) {
      errors.phone = t('partner.error.required');
    }

    if (!formData.latitude || !formData.longitude) {
      errors.location = 'Please set your location on the map.';
    }

    if (!acceptedTerms) {
      errors.terms = 'Please accept the terms and conditions.';
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.error('Please complete all required fields before applying.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isDemoMode) {
      toast.error('Demo mode: Please configure Supabase to submit applications');
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Rate limit check for partner applications (3 per day)
      const rateLimitCheck = await checkServerRateLimit('partner_application', formData.email);
      if (!rateLimitCheck.allowed) {
        toast.error(t('errors.rateLimitExceeded') || 'Too many applications submitted. Please try again tomorrow.');
        setIsSubmitting(false);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            role: 'PARTNER',
            name: formData.business_name,
          },
          emailRedirectTo: undefined, // Don't use Supabase's built-in email verification
        },
      });

      if (authError) {
        logger.error('Auth error:', authError);
        if (authError.message.includes('already registered') ||
            authError.message.includes('duplicate') ||
            authError.message.includes('already exists')) {
          toast.error(t('partner.error.emailExists'));
          setEmailError(t('partner.error.emailExists'));
          return;
        }
        toast.error(`Account creation failed: ${authError.message}`);
        return;
      }

      // Send verification email via Edge Function for partner signups
      if (authData?.user) {
        try {
          await supabase.functions.invoke('send-verification-email', {
            body: {
              email: formData.email,
              name: formData.business_name,
              userId: authData.user.id,
            },
          });
        } catch (emailError) {
          logger.warn('Failed to send partner verification email:', emailError);
        }
      }

      if (!authData.user) {
        logger.error('No user data returned from auth.signUp');
        toast.error('Failed to create account. Please try again.');
        return;
      }

      logger.log('User account created successfully:', authData.user.id);

      // Verify session is established after signup
      if (!authData.session) {
        logger.error('No session after signup - signing in manually');
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (signInError || !signInData.session) {
          logger.error('Failed to sign in after signup:', signInError);
          toast.error('Account created but failed to sign in. Please sign in manually.');
          return;
        }

        logger.log('Successfully signed in after signup');
      }

      // Small delay to ensure session is fully propagated
      await new Promise(resolve => setTimeout(resolve, 500));

      const partnerData = {
        user_id: authData.user.id,
        business_name: formData.business_name || '',
        business_type: formData.business_type || 'RESTAURANT',
        description: formData.description || '',
        business_hours: open24h ? null : {
          open: formData.opening_hours,
          close: formData.closing_hours
        },
        address: formData.address || '',
        city: formData.city || 'Tbilisi',
        latitude: formData.latitude || 0,
        longitude: formData.longitude || 0,
        phone: formData.phone || '',
        email: formData.email || '',
        telegram: formData.telegram || '',
        whatsapp: formData.whatsapp || '',
        images: [],
        status: 'PENDING',
      };

      logger.log('Creating partner application with data:', partnerData);

      // Verify we have an active session before inserting
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        logger.error('No active session found before partner insert');
        toast.error('Authentication error. Please try signing in and applying again.');
        return;
      }
      logger.log('Active session confirmed, user ID:', session.user.id);

      try {
        const { data: partnerResult, error: partnerError } = await supabase
          .from('partners')
          .insert(partnerData)
          .select()
          .single();

        if (partnerError) {
          logger.error('Supabase partner insert error:', partnerError);

          if (partnerError.message?.includes('duplicate') ||
              partnerError.message?.includes('already exists') ||
              partnerError.code === '23505') {
            toast.error('A partner application already exists for this email. Please log in instead.');
          } else {
            toast.error(`Failed to submit application: ${partnerError.message}`);
          }
          return;
        }

        if (partnerResult && partnerResult.id) {
          logger.log('Partner application created successfully:', partnerResult);
          toast.success('✅ Your partner application has been submitted!');

          setShowSuccessModal(true);

          setTimeout(() => {
            navigate('/');
          }, 4000);
        } else {
          logger.error('Partner application returned no data:', partnerResult);
          toast.error('Failed to submit partner application. Please contact support.');
        }
      } catch (insertError: unknown) {
        logger.error('Exception during partner insert:', insertError);
        toast.error(`Failed to submit application: ${insertError instanceof Error ? insertError.message : 'Unknown error'}`);
      }
    } catch (error: unknown) {
      logger.error('Error submitting application:', error);
      toast.error(`Failed to submit application: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getPasswordStrengthColor = () => {
    if (!passwordStrength) return '';
    switch (passwordStrength) {
      case 'weak': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'strong': return 'bg-green-500';
    }
  };

  const getPasswordStrengthText = () => {
    if (!passwordStrength) return '';
    switch (passwordStrength) {
      case 'weak': return 'Weak';
      case 'medium': return 'Medium';
      case 'strong': return 'Strong';
    }
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setShowAddressSuggestions(false);
    };

    if (showAddressSuggestions) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showAddressSuggestions]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">{t('partner.dialog.submittedTitle')}</DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              ✅ {t('partner.dialog.submittedDescription')}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('mypicks.backToHome')}
          </Button>
        </div>
      </header>

      {/* Demo Mode Alert */}
      {isDemoMode && (
        <div className="container mx-auto px-4 pt-4">
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong>Demo Mode:</strong> Partner applications require Supabase configuration.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Application Form */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Store className="w-8 h-8 text-[#4CC9A8]" />
              <div>
                <CardTitle className="text-3xl">{t('partner.becomeTitle')}</CardTitle>
                <CardDescription className="text-base mt-1">
                  Join our platform to reach more customers with smart-time offers
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Progress Indicator */}
            <div className="mb-8">
              {/* Mobile: Simple step counter */}
              <div className="block md:hidden text-center mb-6">
                <div className="flex justify-center items-center gap-2 mb-2">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold bg-[#4CC9A8] text-white ring-4 ring-[#4CC9A8]/30">
                    {steps[currentStep - 1].icon}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-[#4CC9A8] mb-1">{steps[currentStep - 1].title}</h3>
                <p className="text-sm text-gray-600">
                  {t('partner.progress.step')} {currentStep} {t('partner.progress.of')} {totalSteps}
                </p>
              </div>

              {/* Desktop: Full horizontal stepper */}
              <div className="hidden md:block">
                <div className="flex items-center justify-between mb-4">
                  {steps.map((step, index) => (
                    <div key={step.number} className="flex items-center flex-1">
                      <div className="flex flex-col items-center flex-1">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all ${
                            currentStep > step.number
                              ? 'bg-green-500 text-white'
                              : currentStep === step.number
                              ? 'bg-[#4CC9A8] text-white ring-4 ring-[#4CC9A8]/30'
                              : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          {currentStep > step.number ? '✓' : step.icon}
                        </div>
                        <span className={`text-xs mt-2 font-medium text-center ${
                          currentStep === step.number ? 'text-[#4CC9A8]' : 'text-gray-500'
                        }`}>
                          {step.title}
                        </span>
                      </div>
                      {index < steps.length - 1 && (
                        <div className={`h-1 flex-1 mx-2 transition-all ${
                          currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
                <div className="text-center text-sm text-gray-600">
                  {t('partner.progress.step')} {currentStep} {t('partner.progress.of')} {totalSteps}
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Step 1: Account Creation Section */}
              {currentStep === 1 && (
              <div className="space-y-4 p-6 bg-[#E8F9F4] rounded-lg border-2 border-[#4CC9A8]/30">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-[#4CC9A8]" />
                  <h3 className="text-lg font-semibold text-gray-900">{t('partner.section.account')}</h3>
                </div>

                <div>
                  <Label htmlFor="email">{t('partner.form.email')} *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      handleChange('email', e.target.value);
                      setEmailError('');
                    }}
                    onBlur={handleEmailBlur}
                    placeholder="partner@example.com"
                    required
                    className={`bg-white ${fieldErrors.email ? 'border-red-500' : ''}`}
                  />
                  {isCheckingEmail && (
                    <p className="text-xs text-gray-500 mt-1">{t('partner.emailChecking')}</p>
                  )}
                  {(emailError || fieldErrors.email) && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {emailError || fieldErrors.email}
                    </p>
                  )}
                  {!emailError && !fieldErrors.email && formData.email && validateEmail(formData.email) && !isCheckingEmail && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {/* Simplified success text could be localized if needed */}
                      Email is available
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      placeholder="Min 8 chars, 1 number, 1 uppercase"
                      required
                      minLength={8}
                      className={`bg-white pr-10 ${fieldErrors.password ? 'border-red-500' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {fieldErrors.password}
                    </p>
                  )}
                  {passwordStrength && !fieldErrors.password && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${getPasswordStrengthColor()}`}
                            style={{
                              width: passwordStrength === 'weak' ? '33%' : passwordStrength === 'medium' ? '66%' : '100%'
                            }}
                          />
                        </div>
                        <span className="text-xs font-medium">{getPasswordStrengthText()}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange('confirmPassword', e.target.value)}
                      placeholder="Re-enter your password"
                      required
                      minLength={8}
                      className={`bg-white pr-10 ${fieldErrors.confirmPassword ? 'border-red-500' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {fieldErrors.confirmPassword}
                    </p>
                  )}
                  {!fieldErrors.confirmPassword && formData.confirmPassword && formData.password === formData.confirmPassword && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Passwords match
                    </p>
                  )}
                </div>
              </div>
              )}

              {/* Step 2: Location Section */}
              {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">📍</span>
                  <h3 className="text-lg font-semibold text-gray-900">{t('partner.section.location')}</h3>
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <Label htmlFor="address">Street Address *</Label>
                    {addressAutoDetected && (
                      <span className="text-xs text-[#4CC9A8] flex items-center gap-1">
                        📍 Auto-detected from map
                      </span>
                    )}
                  </div>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleAddressChange(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="e.g., 123 Rustaveli Avenue"
                    required
                    className={fieldErrors.address ? 'border-red-500' : ''}
                  />
                  {fieldErrors.address && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {fieldErrors.address}
                    </p>
                  )}

                  {showAddressSuggestions && addressSuggestions.length > 0 && (
                    <div
                      className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {addressSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="px-4 py-3 hover:bg-[#E8F9F4] cursor-pointer border-b border-gray-100 last:border-b-0"
                          onClick={() => handleSelectAddressSuggestion(suggestion)}
                        >
                          <p className="text-sm text-gray-900">{suggestion.display_name}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {isLoadingAddress && (
                    <p className="text-xs text-gray-500 mt-1">{t('partner.addressSearching')}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="e.g., Tbilisi"
                    required
                    className={fieldErrors.city ? 'border-red-500' : ''}
                  />
                  {fieldErrors.city && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {fieldErrors.city}
                    </p>
                  )}
                </div>

                {/* Map Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base">
                      <MapPin className="w-4 h-4 inline mr-2" />
                      Pin Your Location on Map
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleUseCurrentLocation}
                    >
                      <Navigation className="w-4 h-4 mr-2" />
                      Use My Location
                    </Button>
                  </div>

                  <Alert className="bg-[#E8F9F4] border-[#4CC9A8]/30">
                    <MapPin className="h-4 w-4 text-[#4CC9A8]" />
                    <AlertDescription className="text-gray-800">
                      <strong>Drag the pin to set your location precisely.</strong> Click anywhere on the map or drag the green marker.
                    </AlertDescription>
                  </Alert>

                  <div className="w-full h-[300px] md:h-[450px] rounded-lg overflow-hidden border-2 border-gray-300 shadow-md">
                    <MapContainer
                      center={markerPosition}
                      zoom={14}
                      style={{ height: '100%', width: '100%' }}
                      scrollWheelZoom={true}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        subdomains="abcd"
                        maxZoom={20}
                      />
                      <LocationMarker
                        position={markerPosition}
                        setPosition={handleMapPositionChange}
                      />
                    </MapContainer>
                  </div>

                  {/* Hidden lat/long fields */}
                  <input type="hidden" name="latitude" value={formData.latitude} />
                  <input type="hidden" name="longitude" value={formData.longitude} />

                  <p className="text-xs text-gray-500">
                    📍 Your coordinates update automatically when you move the pin.
                  </p>

                  {fieldErrors.location && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {fieldErrors.location}
                    </p>
                  )}
                </div>
              </div>
              )}

              {/* Step 3: Business Information */}
              {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🏪</span>
                  <h3 className="text-lg font-semibold text-gray-900">{t('partner.section.business')}</h3>
                </div>

                <div>
                  <Label htmlFor="business_name">Business Name *</Label>
                  <Input
                    id="business_name"
                    value={formData.business_name}
                    onChange={(e) => handleChange('business_name', e.target.value)}
                    placeholder="e.g., Fresh Bakery"
                    required
                    className={fieldErrors.business_name ? 'border-red-500' : ''}
                  />
                  {fieldErrors.business_name && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {fieldErrors.business_name}
                    </p>
                  )}
                </div>

                {/* Business Type - Icon Buttons */}
                <div>
                  <Label>Business Type *</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                    {BUSINESS_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => {
                          handleChange('business_type', type.value);
                          if (fieldErrors.business_type) {
                            setFieldErrors(prev => ({ ...prev, business_type: '' }));
                          }
                        }}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
                          formData.business_type === type.value
                            ? 'border-[#4CC9A8] bg-[#E8F9F4] text-[#4CC9A8] font-semibold shadow-md'
                            : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-3xl">{type.emoji}</span>
                        <span className="text-sm">{type.label}</span>
                      </button>
                    ))}
                  </div>
                  {fieldErrors.business_type && (
                    <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {fieldErrors.business_type}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Business Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Tell us about your business..."
                    rows={4}
                    required
                    className={fieldErrors.description ? 'border-red-500' : ''}
                  />
                  {fieldErrors.description && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {fieldErrors.description}
                    </p>
                  )}
                </div>

                {/* Business Hours */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="opening_hours" className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#4CC9A8]" />
                      Opening Hours {!open24h && '*'}
                    </Label>

                    <Select
                      value={formData.opening_hours}
                      onValueChange={(value) => handleChange('opening_hours', value)}
                      disabled={open24h}
                    >
                      <SelectTrigger className={fieldErrors.opening_hours ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select opening time" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        {[...Array(48)].map((_, i) => {
                          const hours = Math.floor(i / 2);
                          const minutes = i % 2 === 0 ? '00' : '30';
                          const label = `${hours.toString().padStart(2, '0')}:${minutes}`;
                          return (
                            <SelectItem key={label} value={label}>
                              {label}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>

                    {fieldErrors.opening_hours && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {fieldErrors.opening_hours}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="closing_hours" className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#4CC9A8]" />
                      Closing Hours {!open24h && '*'}
                    </Label>

                    <Select
                      value={formData.closing_hours}
                      onValueChange={(value) => handleChange('closing_hours', value)}
                      disabled={open24h}
                    >
                      <SelectTrigger className={fieldErrors.closing_hours ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select closing time" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        {[...Array(48)].map((_, i) => {
                          const hours = Math.floor(i / 2);
                          const minutes = i % 2 === 0 ? '00' : '30';
                          const label = `${hours.toString().padStart(2, '0')}:${minutes}`;
                          return (
                            <SelectItem key={label} value={label}>
                              {label}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>

                    {fieldErrors.closing_hours && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {fieldErrors.closing_hours}
                      </p>
                    )}
                  </div>
                </div>

                {/* 24-Hour Checkbox */}
                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <Checkbox
                    id="open_24h"
                    checked={open24h}
                    onCheckedChange={(checked) => {
                      setOpen24h(checked as boolean);
                      if (checked) {
                        setFieldErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.opening_hours;
                          delete newErrors.closing_hours;
                          return newErrors;
                        });
                      }
                    }}
                  />
                  <Label htmlFor="open_24h" className="text-sm cursor-pointer">
                    My business operates 24 hours
                  </Label>
                </div>

                {/* Pickup Instructions */}
                <div>
                  <Label htmlFor="pickup_notes">Pickup Instructions (Optional)</Label>
                  <Textarea
                    id="pickup_notes"
                    value={formData.pickup_notes}
                    onChange={(e) => handleChange('pickup_notes', e.target.value)}
                    placeholder="e.g., Enter through the side door, ring the bell twice..."
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Help customers find your pickup location easily
                  </p>
                </div>
              </div>
              )}

              {/* Step 4: Contact Information */}
              {currentStep === 4 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">📞</span>
                  <h3 className="text-lg font-semibold text-gray-900">{t('partner.section.contact')}</h3>
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+995 XXX XXX XXX"
                    required
                    className={fieldErrors.phone ? 'border-red-500' : ''}
                  />
                  {fieldErrors.phone && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {fieldErrors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="telegram">Telegram (optional)</Label>
                  <Input
                    id="telegram"
                    value={formData.telegram}
                    onChange={(e) => handleChange('telegram', e.target.value)}
                    placeholder="@yourbusiness"
                  />
                </div>

                <div>
                  <Label htmlFor="whatsapp">WhatsApp (optional)</Label>
                  <Input
                    id="whatsapp"
                    type="tel"
                    value={formData.whatsapp}
                    onChange={(e) => handleChange('whatsapp', e.target.value)}
                    placeholder="+995 XXX XXX XXX"
                  />
                </div>

                {/* Terms and Conditions */}
                <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => {
                    setAcceptedTerms(checked as boolean);
                    if (fieldErrors.terms) {
                      setFieldErrors(prev => ({ ...prev, terms: '' }));
                    }
                  }}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label htmlFor="terms" className="text-sm font-normal cursor-pointer">
                    I agree to the SmartPick Terms of Service and Privacy Policy. I understand that my application will be reviewed by the admin team before approval. *
                  </Label>
                  {fieldErrors.terms && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {fieldErrors.terms}
                    </p>
                  )}
                </div>
                </div>
              </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-4 pt-4">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevStep}
                    className="flex-1"
                  >
                    ← Back
                  </Button>
                )}

                {currentStep < totalSteps ? (
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    className="flex-1 bg-[#4CC9A8] hover:bg-[#3db891]"
                  >
                    Next →
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting || isDemoMode}
                    className="flex-1 bg-[#4CC9A8] hover:bg-[#3db891]"
                  >
                    {isSubmitting ? 'Creating Account...' : 'Submit Application'}
                  </Button>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate('/')}
                  className={currentStep === 1 ? 'flex-1' : ''}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

