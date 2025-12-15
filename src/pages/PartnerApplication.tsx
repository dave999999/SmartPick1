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
import { TelegramConnect } from '@/components/TelegramConnect';

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
  const map = useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  // Pan map to marker position when it changes
  useEffect(() => {
    if (map && position) {
      map.setView(position, map.getZoom(), { animate: true });
    }
  }, [position, map]);

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
  
  // Track if user is already logged in
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [existingUserId, setExistingUserId] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

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

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          logger.log('User already logged in:', session.user.id);
          
          // Check if user is admin
          const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          if (profile?.role?.toUpperCase() === 'ADMIN') {
            toast.error(
              'Admin accounts cannot apply as partners',
              {
                description: 'Please use a different account or contact support to become a partner.',
                duration: 8000,
              }
            );
            navigate('/admin-dashboard');
            return;
          }
          
          // Check if user already has a partner application
          const { data: existingPartner } = await supabase
            .from('partners')
            .select('id, status')
            .eq('user_id', session.user.id)
            .single();
          
          if (existingPartner) {
            if (existingPartner.status === 'PENDING') {
              toast.info('You already have a pending partner application');
              navigate('/partner');
            } else if (existingPartner.status === 'APPROVED') {
              toast.info('You are already an approved partner');
              navigate('/partner');
            }
            return;
          }
          
          setIsUserLoggedIn(true);
          setExistingUserId(session.user.id);
          
          // Pre-fill email from authenticated user
          setFormData(prev => ({
            ...prev,
            email: session.user.email || '',
          }));
          
          // Skip to Step 2 (Location) for logged-in users
          setCurrentStep(2);
          
          toast.success('Welcome! Since you\'re already logged in, we\'ve skipped the account creation step.');
        }
      } catch (error) {
        logger.error('Error checking authentication:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    
    checkExistingAuth();
  }, [navigate]);

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
      // Use backend proxy to avoid CORS issues
      const response = await fetch(
        `/api/geocode/reverse?lat=${lat}&lon=${lon}`,
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
      // Use backend proxy for geocoding (avoids CORS issues)
      const response = await fetch(
        `/api/geocode/forward?address=${encodeURIComponent(query)}&limit=5`,
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

    // Update marker position on map
    setMarkerPosition([lat, lon]);

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

    if (step === 1 && !isUserLoggedIn) {
      // Account Creation (skip if user is already logged in)
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

    // Only validate email and password for new users (not logged in)
    if (!isUserLoggedIn) {
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
      const errorFields = Object.keys(errors).join(', ');
      toast.error(`Please complete all required fields: ${errorFields}`);
      console.log('Validation errors:', errors);
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

      let userId = existingUserId;
      
      // Only create account if user is NOT already logged in
      if (!isUserLoggedIn) {
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

        userId = authData.user.id;
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
      } else {
        // User is already logged in, use their existing ID
        logger.log('Using existing user ID for partner application:', userId);
      }

      // Small delay to ensure session is fully propagated
      await new Promise(resolve => setTimeout(resolve, 500));

      const partnerData = {
        user_id: userId,
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
                <CheckCircle2 aria-hidden="true" className="w-10 h-10 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">{t('partner.dialog.submittedTitle')}</DialogTitle>
            <DialogDescription className="text-center text-base pt-2 space-y-3">
              <span className="block">✅ {t('partner.dialog.submittedDescription')}</span>
              <span className="block text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                📱 <strong>Next Step:</strong> Set up Telegram notifications from your partner dashboard to receive instant alerts about new reservations!
              </span>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Header with Progress */}
      <header className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 shadow-lg">
        <div className="container mx-auto px-4 py-4 max-w-3xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-white">
              Partner Registration
            </span>
            <span className="text-xs font-medium text-white/90">
              Step {isUserLoggedIn ? currentStep - 1 : currentStep} of {isUserLoggedIn ? 3 : totalSteps}
            </span>
          </div>
          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-500 ease-out rounded-full shadow-lg"
              style={{ width: `${((isUserLoggedIn ? currentStep - 1 : currentStep) / (isUserLoggedIn ? 3 : totalSteps)) * 100}%` }}
            />
          </div>
        </div>
      </header>

      {/* Demo Mode Alert */}
      {isDemoMode && (
        <div className="container mx-auto px-4 pt-6">
          <Alert className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 shadow-sm">
            <AlertCircle aria-hidden="true" className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900 font-medium">
              <strong>Demo Mode:</strong> Partner applications require Supabase configuration.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Application Form */}
      <div className="container mx-auto px-4 py-4 pb-24 max-w-3xl">
        <Card className="shadow-xl border border-slate-700 overflow-hidden bg-slate-800">
          <CardContent className="pt-6">

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Step 1: Account Creation Section */}
              {currentStep === 1 && (
              <div className="space-y-3 p-4 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl border border-slate-700 shadow-sm">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-700">
                  <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                    <Shield aria-hidden="true" className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-xs font-bold text-white">{t('partner.section.account')}</h3>
                </div>

                <div>
                  <Label htmlFor="email" className="text-xs font-semibold text-slate-200">{t('partner.form.email')} *</Label>
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
                    className={`mt-1 h-9 text-sm bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500 ${fieldErrors.email ? 'border-red-500' : ''}`}
                  />
                  {isCheckingEmail && (
                    <p className="text-xs text-gray-500 mt-1">{t('partner.emailChecking')}</p>
                  )}
                  {(emailError || fieldErrors.email) && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle aria-hidden="true" className="w-3 h-3" />
                      {emailError || fieldErrors.email}
                    </p>
                  )}
                  {!emailError && !fieldErrors.email && formData.email && validateEmail(formData.email) && !isCheckingEmail && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle2 aria-hidden="true" className="w-3 h-3" />
                      {/* Simplified success text could be localized if needed */}
                      Email is available
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password" className="text-xs font-semibold text-slate-200">Password *</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      placeholder="Min 8 chars, 1 number, 1 uppercase"
                      required
                      minLength={8}
                      className={`bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500 pr-10 ${fieldErrors.password ? 'border-red-500' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff aria-hidden="true" className="w-4 h-4" /> : <Eye aria-hidden="true" className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle aria-hidden="true" className="w-3 h-3" />
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
                  <Label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-700">Confirm Password *</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange('confirmPassword', e.target.value)}
                      placeholder="Re-enter your password"
                      required
                      minLength={8}
                      className={`bg-white border-slate-300 focus:border-emerald-500 focus:ring-emerald-500 pr-10 ${fieldErrors.confirmPassword ? 'border-red-500' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff aria-hidden="true" className="w-4 h-4" /> : <Eye aria-hidden="true" className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle aria-hidden="true" className="w-3 h-3" />
                      {fieldErrors.confirmPassword}
                    </p>
                  )}
                  {!fieldErrors.confirmPassword && formData.confirmPassword && formData.password === formData.confirmPassword && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle2 aria-hidden="true" className="w-3 h-3" />
                      Passwords match
                    </p>
                  )}
                </div>
              </div>
              )}

              {/* Step 2: Location Section */}
              {currentStep === 2 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-700">
                  <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
                    <MapPin aria-hidden="true" className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-xs font-bold text-white">{t('partner.section.location')}</h3>
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <Label htmlFor="address" className="text-xs font-semibold text-slate-200">Street Address *</Label>
                    {addressAutoDetected && (
                      <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                        <MapPin aria-hidden="true" className="w-3 h-3" /> Auto-detected
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
                    className={`bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500 ${fieldErrors.address ? 'border-red-500' : ''}`}
                  />
                  {fieldErrors.address && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle aria-hidden="true" className="w-3 h-3" />
                      {fieldErrors.address}
                    </p>
                  )}

                  {showAddressSuggestions && addressSuggestions.length > 0 && (
                    <div
                      className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-600 rounded-xl shadow-xl max-h-60 overflow-y-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {addressSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="px-4 py-3 hover:bg-gradient-to-r hover:from-emerald-900/30 hover:to-teal-900/30 cursor-pointer border-b border-slate-700 last:border-b-0 transition-colors"
                          onClick={() => handleSelectAddressSuggestion(suggestion)}
                        >
                          <p className="text-sm text-slate-100">{suggestion.display_name}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {isLoadingAddress && (
                    <p className="text-xs text-gray-500 mt-1">{t('partner.addressSearching')}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="city" className="text-xs font-semibold text-slate-200">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="e.g., Tbilisi"
                    required
                    className={`mt-1 h-9 text-sm bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500 ${fieldErrors.city ? 'border-red-500' : ''}`}
                  />
                  {fieldErrors.city && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle aria-hidden="true" className="w-3 h-3" />
                      {fieldErrors.city}
                    </p>
                  )}
                </div>

                {/* Map Section */}
                <div className="space-y-2 p-3 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl border border-slate-700">
                  <div className="w-full h-[380px] md:h-[480px] rounded-lg overflow-hidden border border-slate-600 shadow-lg relative">
                    <Button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      className="absolute top-3 right-3 z-10 h-9 px-3 bg-white hover:bg-gray-50 text-emerald-600 border-2 border-emerald-500 shadow-lg hover:shadow-xl transition-all font-semibold"
                    >
                      <Navigation aria-hidden="true" className="w-4 h-4 mr-1.5" />
                      Use My Location
                    </Button>
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

                  {fieldErrors.location && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle aria-hidden="true" className="w-3 h-3" />
                      {fieldErrors.location}
                    </p>
                  )}
                </div>
              </div>
              )}

              {/* Step 3: Business Information */}
              {currentStep === 3 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-700">
                  <div className="p-1.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
                    <Store aria-hidden="true" className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-sm font-bold text-white">{t('partner.section.business')}</h3>
                </div>

                <div>
                  <Label htmlFor="business_name" className="text-xs font-semibold text-slate-200">Business Name *</Label>
                  <Input
                    id="business_name"
                    value={formData.business_name}
                    onChange={(e) => handleChange('business_name', e.target.value)}
                    placeholder="e.g., Fresh Bakery"
                    required
                    className={`mt-1 h-9 text-sm bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500 ${fieldErrors.business_name ? 'border-red-500' : ''}`}
                  />
                  {fieldErrors.business_name && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle aria-hidden="true" className="w-3 h-3" />
                      {fieldErrors.business_name}
                    </p>
                  )}
                </div>

                {/* Business Type - Icon Buttons */}
                <div>
                  <Label className="text-xs font-semibold text-slate-200">Business Type *</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1">
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
                        className={`p-2 rounded-lg border transition-all duration-300 flex flex-col items-center justify-center gap-1 ${
                          formData.business_type === type.value
                            ? 'border-emerald-500 bg-gradient-to-br from-emerald-900/40 to-teal-900/40 text-emerald-300 font-semibold shadow-lg scale-105'
                            : 'border-slate-600 bg-slate-800 hover:bg-slate-700 hover:border-slate-500 hover:shadow-md text-slate-300'
                        }`}
                      >
                        <span className="text-xl">{type.emoji}</span>
                        <span className="text-[10px] font-medium">{type.label}</span>
                      </button>
                    ))}
                  </div>
                  {fieldErrors.business_type && (
                    <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                      <AlertCircle aria-hidden="true" className="w-3 h-3" />
                      {fieldErrors.business_type}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description" className="text-xs font-semibold text-slate-200">Business Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Tell us about your business..."
                    rows={3}
                    required
                    className={`mt-1 h-9 text-sm bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500 ${fieldErrors.description ? 'border-red-500' : ''}`}
                  />
                  {fieldErrors.description && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle aria-hidden="true" className="w-3 h-3" />
                      {fieldErrors.description}
                    </p>
                  )}
                </div>

                {/* Business Hours */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="opening_hours" className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                      <Clock aria-hidden="true" className="w-4 h-4 text-emerald-600" />
                      Opening Hours {!open24h && '*'}
                    </Label>

                    <Select
                      value={formData.opening_hours}
                      onValueChange={(value) => handleChange('opening_hours', value)}
                      disabled={open24h}
                    >
                      <SelectTrigger className={`mt-1 h-9 text-sm bg-slate-900 border-slate-600 text-white ${fieldErrors.opening_hours ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder="Select opening time" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto bg-slate-900 border-slate-600 text-white">
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
                        <AlertCircle aria-hidden="true" className="w-3 h-3" />
                        {fieldErrors.opening_hours}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="closing_hours" className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                      <Clock aria-hidden="true" className="w-4 h-4 text-emerald-600" />
                      Closing Hours {!open24h && '*'}
                    </Label>

                    <Select
                      value={formData.closing_hours}
                      onValueChange={(value) => handleChange('closing_hours', value)}
                      disabled={open24h}
                    >
                      <SelectTrigger className={`mt-1 h-9 text-sm bg-slate-900 border-slate-600 text-white ${fieldErrors.closing_hours ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder="Select closing time" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto bg-slate-900 border-slate-600 text-white">
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
                        <AlertCircle aria-hidden="true" className="w-3 h-3" />
                        {fieldErrors.closing_hours}
                      </p>
                    )}
                  </div>
                </div>

                {/* 24-Hour Checkbox */}
                <div className="flex items-center space-x-2.5 p-3.5 bg-gradient-to-r from-slate-800/50 to-slate-900/50 rounded-xl border border-slate-700">
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
                  <Label htmlFor="open_24h" className="text-sm font-medium text-slate-200 cursor-pointer">
                    My business operates 24 hours
                  </Label>
                </div>

                {/* Pickup Instructions */}
                <div>
                  <Label htmlFor="pickup_notes" className="text-xs font-semibold text-slate-200">Pickup Instructions (Optional)</Label>
                  <Textarea
                    id="pickup_notes"
                    value={formData.pickup_notes}
                    onChange={(e) => handleChange('pickup_notes', e.target.value)}
                    placeholder="e.g., Enter through the side door, ring the bell twice..."
                    rows={2}
                    className="mt-1 text-sm bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                  <p className="text-xs text-slate-400 mt-1.5">
                    Help customers find your pickup location easily
                  </p>
                </div>
              </div>
              )}

              {/* Step 4: Contact Information */}
              {currentStep === 4 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-700">
                  <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                    <span className="text-base">📞</span>
                  </div>
                  <h3 className="text-sm font-bold text-white">{t('partner.section.contact')}</h3>
                </div>

                <div>
                  <Label htmlFor="phone" className="text-xs font-semibold text-slate-200">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+995 XXX XXX XXX"
                    required
                    className={`mt-1 h-9 text-sm bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500 ${fieldErrors.phone ? 'border-red-500' : ''}`}
                  />
                  {fieldErrors.phone && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle aria-hidden="true" className="w-3 h-3" />
                      {fieldErrors.phone}
                    </p>
                  )}
                </div>

                {/* Telegram Notifications - Only show if user is logged in */}
                {isUserLoggedIn && existingUserId && (
                  <div>
                    <Label className="text-xs font-semibold text-slate-200 mb-2 block">Telegram Notifications (optional)</Label>
                    {/* Debug: Show userId being used */}
                    {import.meta.env.DEV && (
                      <div className="text-[10px] text-slate-400 mb-1 p-2 bg-slate-800 rounded">
                        <p>🔍 Debug Info:</p>
                        <p>userId = {existingUserId}</p>
                        <p>isUUID = {/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(existingUserId)}</p>
                        <p>type = {typeof existingUserId}</p>
                      </div>
                    )}
                    <TelegramConnect userId={existingUserId} userType="partner" />
                  </div>
                )}
                
                {/* Show info message for non-logged-in users */}
                {!isUserLoggedIn && (
                  <div className="p-3 bg-blue-900/30 border border-blue-500/50 rounded-lg">
                    <p className="text-xs text-blue-200">
                      💡 <strong>Telegram notifications</strong> can be set up after your account is created. You'll find this option in your partner dashboard.
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="whatsapp" className="text-xs font-semibold text-slate-200">WhatsApp (optional)</Label>
                  <Input
                    id="whatsapp"
                    type="tel"
                    value={formData.whatsapp}
                    onChange={(e) => handleChange('whatsapp', e.target.value)}
                    placeholder="+995 XXX XXX XXX"
                    className="mt-1 h-9 text-sm bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>

                {/* Terms and Conditions */}
                <div className="flex items-start space-x-2 p-3 bg-gradient-to-r from-slate-800/50 to-slate-900/50 rounded-lg border border-slate-700">
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
                  <Label htmlFor="terms" className="text-xs font-medium text-slate-200 cursor-pointer leading-snug">
                    I agree to the SmartPick Terms of Service and Privacy Policy. I understand that my application will be reviewed by the admin team before approval. *
                  </Label>
                  {fieldErrors.terms && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle aria-hidden="true" className="w-3 h-3" />
                      {fieldErrors.terms}
                    </p>
                  )}
                </div>
                </div>
              </div>
              )}

            </form>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Buttons - Sticky at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-50 border-t-2 border-slate-300 shadow-2xl p-4 z-[9999]" style={{backgroundColor: '#f9fafb'}}>
        <div className="container mx-auto max-w-3xl">
          <div className="flex gap-3">
            {currentStep > 1 && (
              <Button
                type="button"
                onClick={handlePrevStep}
                className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 border-2 border-slate-300 font-bold text-base shadow-md hover:shadow-lg transition-all rounded-xl"
              >
                ← Back
              </Button>
            )}

            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={handleNextStep}
                className="flex-1 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-base shadow-lg hover:shadow-xl transition-all rounded-xl"
              >
                Next →
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting || isDemoMode}
                onClick={handleSubmit}
                className="flex-1 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-base shadow-lg hover:shadow-xl transition-all rounded-xl disabled:opacity-50"
              >
                {isSubmitting ? 'Creating Account...' : 'Submit Application'}
              </Button>
            )}

            <Button
              type="button"
              onClick={() => navigate('/')}
              className={`h-12 bg-red-50 hover:bg-red-100 text-red-600 border-2 border-red-300 hover:border-red-400 font-bold text-base shadow-md hover:shadow-lg transition-all rounded-xl ${currentStep === 1 ? 'flex-1' : 'px-6'}`}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

