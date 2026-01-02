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
import { ArrowLeft, Store, AlertCircle, MapPin, Navigation, Eye, EyeOff, Shield, CheckCircle2, Clock, Check, Loader2, Star, TrendingUp, Users, Zap, Save } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useI18n } from '@/lib/i18n';
import { checkServerRateLimit } from '@/lib/rateLimiter-server';
import { logger } from '@/lib/logger';
import { TelegramConnect } from '@/components/TelegramConnect';
import { GooglePlacesAutocomplete } from '@/components/partner/GooglePlacesAutocomplete';

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
    { 
      number: 1, 
      title: t('partner.step.account'), 
      icon: Shield,
      description: 'Create your secure account',
      color: 'from-indigo-500 to-purple-600'
    },
    { 
      number: 2, 
      title: t('partner.step.location'), 
      icon: MapPin,
      description: 'Where is your business?',
      color: 'from-emerald-500 to-teal-600'
    },
    { 
      number: 3, 
      title: t('partner.step.business'), 
      icon: Store,
      description: 'Tell us about your business',
      color: 'from-amber-500 to-orange-600'
    },
    { 
      number: 4, 
      title: t('partner.step.contact'), 
      icon: Zap,
      description: 'How can customers reach you?',
      color: 'from-blue-500 to-indigo-600'
    },
  ];

  // Address autocomplete
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [addressAutoDetected, setAddressAutoDetected] = useState(false);
  const addressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save draft
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Step completion tracking
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Form data - MUST be declared before hooks that use it
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
            .maybeSingle();
          
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

  // Auto-save draft functionality
  const saveDraft = useCallback(async () => {
    if (!existingUserId || isUserLoggedIn) return;
    
    setIsSaving(true);
    try {
      const draftData = {
        ...formData,
        currentStep,
        acceptedTerms,
        open24h,
        lastModified: new Date().toISOString(),
      };
      localStorage.setItem(`partner_draft_${existingUserId}`, JSON.stringify(draftData));
      setLastSaved(new Date());
    } catch (error) {
      logger.error('Failed to save draft:', error);
    } finally {
      setIsSaving(false);
    }
  }, [formData, currentStep, acceptedTerms, open24h, existingUserId, isUserLoggedIn]);

  // Trigger auto-save on form changes
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      saveDraft();
    }, 3000); // Save 3 seconds after last change

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [formData, saveDraft]);

  // Check for existing draft on mount
  useEffect(() => {
    if (existingUserId && isUserLoggedIn) {
      const savedDraft = localStorage.getItem(`partner_draft_${existingUserId}`);
      if (savedDraft) {
        try {
          const draftData = JSON.parse(savedDraft);
          const draftAge = Date.now() - new Date(draftData.lastModified).getTime();
          // Only restore if draft is less than 7 days old
          if (draftAge < 7 * 24 * 60 * 60 * 1000) {
            setFormData(draftData);
            setCurrentStep(draftData.currentStep || 2);
            setAcceptedTerms(draftData.acceptedTerms || false);
            setOpen24h(draftData.open24h || false);
            toast.info('Previous draft restored', {
              description: 'Your previous application has been restored.',
            });
          }
        } catch (error) {
          logger.error('Failed to restore draft:', error);
        }
      }
    }
  }, [existingUserId, isUserLoggedIn]);

  // Mark step as completed when valid
  const markStepCompleted = useCallback((step: number) => {
    setCompletedSteps(prev => new Set([...prev, step]));
  }, []);

  // Check if current step is valid
  const isStepValid = useCallback((step: number): boolean => {
    switch(step) {
      case 1:
        return !!(formData.email && formData.password && formData.confirmPassword && 
                 formData.password === formData.confirmPassword && 
                 validateEmail(formData.email) && 
                 passwordStrength === 'strong');
      case 2:
        return !!(formData.address && formData.city && formData.latitude && formData.longitude);
      case 3:
        return !!(formData.business_name && formData.business_type && formData.description && 
                 (open24h || (formData.opening_hours && formData.closing_hours)));
      case 4:
        return !!(formData.phone && acceptedTerms);
      default:
        return false;
    }
  }, [formData, passwordStrength, acceptedTerms, open24h]);

  // Update completed steps when form changes
  useEffect(() => {
    if (isStepValid(currentStep)) {
      markStepCompleted(currentStep);
    }
  }, [currentStep, isStepValid, markStepCompleted]);

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
      logger.debug('Validation errors:', errors);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/20">
      {/* Success Modal - Enhanced */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex justify-center mb-4 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full animate-pulse"></div>
              </div>
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/50 relative z-10 animate-bounce">
                <CheckCircle2 aria-hidden="true" className="w-12 h-12 text-white" />
              </div>
            </div>
            <DialogTitle className="text-center text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              {t('partner.dialog.submittedTitle')}
            </DialogTitle>
            <DialogDescription className="text-center text-base pt-4 space-y-4">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-200">
                <p className="text-emerald-900 font-semibold mb-2">🎉 {t('partner.dialog.submittedDescription')}</p>
                <p className="text-sm text-emerald-700">Application ID: <span className="font-mono font-bold">P2026-{Math.floor(Math.random() * 10000).toString().padStart(4, '0')}</span></p>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-left">
                <p className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  What happens next?
                </p>
                <ol className="text-sm text-blue-800 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">1.</span>
                    <span>Review by our team (~24 hours)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">2.</span>
                    <span>Email notification with decision</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">3.</span>
                    <span>Access your partner dashboard</span>
                  </li>
                </ol>
              </div>

              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                <p className="text-sm text-amber-900">
                  💡 <strong>Pro Tip:</strong> Set up Telegram notifications after approval to get instant alerts for new orders!
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-6">
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="flex-1"
            >
              Go to Home
            </Button>
            <Button
              onClick={() => navigate('/partner')}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
            >
              Check Status
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header with Enhanced Progress - Professional Design */}
      <header className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 shadow-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Top Row - Title and Stats */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Store className="w-6 h-6" />
                Partner Registration
              </h1>
              <p className="text-emerald-50 text-sm mt-1">Join 500+ partners in Tbilisi</p>
            </div>
            <div className="flex items-center gap-3">
              {isSaving && (
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
                  <Loader2 className="w-3 h-3 text-white animate-spin" />
                  <span className="text-xs text-white">Saving...</span>
                </div>
              )}
              {lastSaved && !isSaving && (
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
                  <Check className="w-3 h-3 text-emerald-200" />
                  <span className="text-xs text-white">Auto-saved</span>
                </div>
              )}
            </div>
          </div>

          {/* Step Indicators - Enhanced Design */}
          <div className="flex items-center justify-between relative">
            {/* Progress Line */}
            <div className="absolute top-5 left-0 right-0 h-1 bg-white/20 rounded-full" style={{ left: '32px', right: '32px' }}>
              <div 
                className="h-full bg-white rounded-full transition-all duration-500 ease-out shadow-lg shadow-white/30"
                style={{ width: `${((isUserLoggedIn ? currentStep - 1 : currentStep) / (isUserLoggedIn ? 3 : totalSteps)) * 100}%` }}
              />
            </div>

            {/* Step Circles */}
            {steps.map((step) => {
              if (isUserLoggedIn && step.number === 1) return null;
              
              const displayStep = isUserLoggedIn ? step.number - 1 : step.number;
              const isActive = displayStep === (isUserLoggedIn ? currentStep - 1 : currentStep);
              const isCompleted = completedSteps.has(step.number) || displayStep < (isUserLoggedIn ? currentStep - 1 : currentStep);
              const Icon = step.icon;
              
              return (
                <div key={step.number} className="flex flex-col items-center relative z-10">
                  <div 
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isActive 
                        ? 'bg-white text-emerald-600 shadow-xl shadow-white/50 scale-110' 
                        : isCompleted
                        ? 'bg-white text-emerald-600 shadow-lg'
                        : 'bg-white/20 text-white/60 backdrop-blur-sm'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-6 h-6" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="mt-2 text-center hidden sm:block">
                    <p className={`text-xs font-semibold ${
                      isActive ? 'text-white' : 'text-white/70'
                    }`}>
                      {step.title}
                    </p>
                    <p className="text-[10px] text-white/50 mt-0.5">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile Step Counter */}
          <div className="sm:hidden mt-4 text-center">
            <span className="text-xs font-medium text-white/90">
              Step {isUserLoggedIn ? currentStep - 1 : currentStep} of {isUserLoggedIn ? 3 : totalSteps}: {steps[currentStep - 1]?.title}
            </span>
          </div>
        </div>
      </header>

      {/* Demo Mode Alert */}
      {isDemoMode && (
        <div className="container mx-auto px-4 pt-6 max-w-4xl">
          <Alert className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 shadow-sm">
            <AlertCircle aria-hidden="true" className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900 font-medium">
              <strong>Demo Mode:</strong> Partner applications require Supabase configuration.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Application Form */}
      <div className="container mx-auto px-4 py-4 pb-32 max-w-4xl">
        <Card className="shadow-2xl border-0 overflow-hidden bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-6">

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Step 1: Account Creation Section */}
              {currentStep === 1 && (
              <div className="space-y-4 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200 shadow-sm">
                <div className="flex items-center gap-3 pb-3 border-b border-indigo-200">
                  <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                    <Shield aria-hidden="true" className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{t('partner.section.account')}</h3>
                    <p className="text-xs text-gray-600">Secure your account credentials</p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm font-semibold text-gray-700">{t('partner.form.email')} *</Label>
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
                    className={`mt-2 h-11 text-sm bg-white border-2 transition-all ${
                      fieldErrors.email 
                        ? 'border-red-500 focus:border-red-500' 
                        : !emailError && formData.email && validateEmail(formData.email)
                        ? 'border-emerald-500 bg-emerald-50/30 focus:border-emerald-500'
                        : 'border-gray-300 focus:border-emerald-500'
                    }`}
                  />
                  {isCheckingEmail && (
                    <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {t('partner.emailChecking')}
                    </p>
                  )}
                  {(emailError || fieldErrors.email) && (
                    <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 animate-in slide-in-from-top-1">
                      <AlertCircle aria-hidden="true" className="w-3 h-3" />
                      {emailError || fieldErrors.email}
                    </p>
                  )}
                  {!emailError && !fieldErrors.email && formData.email && validateEmail(formData.email) && !isCheckingEmail && (
                    <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1 animate-in slide-in-from-top-1">
                      <CheckCircle2 aria-hidden="true" className="w-3 h-3" />
                      Email is available
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password" className="text-sm font-semibold text-gray-700">Password *</Label>
                  <div className="relative mt-2">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      placeholder="Min 8 chars, 1 number, 1 uppercase"
                      required
                      minLength={8}
                      className={`h-11 pr-10 border-2 transition-all ${
                        fieldErrors.password
                          ? 'border-red-500 focus:border-red-500'
                          : passwordStrength === 'strong'
                          ? 'border-emerald-500 bg-emerald-50/30 focus:border-emerald-500'
                          : 'border-gray-300 focus:border-emerald-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff aria-hidden="true" className="w-4 h-4" /> : <Eye aria-hidden="true" className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 animate-in slide-in-from-top-1">
                      <AlertCircle aria-hidden="true" className="w-3 h-3" />
                      {fieldErrors.password}
                    </p>
                  )}
                  {passwordStrength && !fieldErrors.password && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              passwordStrength === 'weak' 
                                ? 'bg-red-500' 
                                : passwordStrength === 'medium' 
                                ? 'bg-yellow-500' 
                                : 'bg-emerald-500'
                            }`}
                            style={{
                              width: passwordStrength === 'weak' ? '33%' : passwordStrength === 'medium' ? '66%' : '100%'
                            }}
                          />
                        </div>
                        <span className={`text-xs font-semibold ${
                          passwordStrength === 'weak' 
                            ? 'text-red-600' 
                            : passwordStrength === 'medium' 
                            ? 'text-yellow-600' 
                            : 'text-emerald-600'
                        }`}>
                          {getPasswordStrengthText()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700">Confirm Password *</Label>
                  <div className="relative mt-2">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange('confirmPassword', e.target.value)}
                      placeholder="Re-enter your password"
                      required
                      minLength={8}
                      className={`h-11 pr-10 border-2 transition-all ${
                        fieldErrors.confirmPassword
                          ? 'border-red-500 focus:border-red-500'
                          : formData.confirmPassword && formData.password === formData.confirmPassword
                          ? 'border-emerald-500 bg-emerald-50/30 focus:border-emerald-500'
                          : 'border-gray-300 focus:border-emerald-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff aria-hidden="true" className="w-4 h-4" /> : <Eye aria-hidden="true" className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 animate-in slide-in-from-top-1">
                      <AlertCircle aria-hidden="true" className="w-3 h-3" />
                      {fieldErrors.confirmPassword}
                    </p>
                  )}
                  {!fieldErrors.confirmPassword && formData.confirmPassword && formData.password === formData.confirmPassword && (
                    <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1 animate-in slide-in-from-top-1">
                      <CheckCircle2 aria-hidden="true" className="w-3 h-3" />
                      Passwords match
                    </p>
                  )}
                </div>
              </div>
              )}

              {/* Step 2: Location Section */}
              {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 -m-6 mb-4 p-6 rounded-t-2xl">
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
                    <MapPin aria-hidden="true" className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{t('partner.section.location')}</h3>
                    <p className="text-xs text-gray-600">Help customers find you easily</p>
                  </div>
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="address" className="text-sm font-semibold text-gray-700">Street Address *</Label>
                    {addressAutoDetected && (
                      <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium bg-emerald-50 px-2 py-0.5 rounded-full animate-in fade-in">
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
                    className={`h-11 border-2 transition-all ${
                      fieldErrors.address 
                        ? 'border-red-500 focus:border-red-500' 
                        : formData.address
                        ? 'border-emerald-500 bg-emerald-50/30 focus:border-emerald-500'
                        : 'border-gray-300 focus:border-emerald-500'
                    }`}
                  />
                  {fieldErrors.address && (
                    <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 animate-in slide-in-from-top-1">
                      <AlertCircle aria-hidden="true" className="w-3 h-3" />
                      {fieldErrors.address}
                    </p>
                  )}

                  {showAddressSuggestions && addressSuggestions.length > 0 && (
                    <div
                      className="absolute z-50 w-full mt-2 bg-white border-2 border-emerald-500 rounded-xl shadow-2xl max-h-60 overflow-y-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {addressSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="px-4 py-3 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                          onClick={() => handleSelectAddressSuggestion(suggestion)}
                        >
                          <p className="text-sm text-gray-900">{suggestion.display_name}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {isLoadingAddress && (
                    <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {t('partner.addressSearching')}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="city" className="text-sm font-semibold text-gray-700">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="e.g., Tbilisi"
                    required
                    className={`mt-2 h-11 border-2 transition-all ${
                      fieldErrors.city 
                        ? 'border-red-500 focus:border-red-500' 
                        : formData.city
                        ? 'border-emerald-500 bg-emerald-50/30 focus:border-emerald-500'
                        : 'border-gray-300 focus:border-emerald-500'
                    }`}
                  />
                  {fieldErrors.city && (
                    <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 animate-in slide-in-from-top-1">
                      <AlertCircle aria-hidden="true" className="w-3 h-3" />
                      {fieldErrors.city}
                    </p>
                  )}
                </div>

                {/* Map Section - Enhanced */}
                <div className="space-y-3 p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200 shadow-inner">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      Drag marker to adjust location
                    </Label>
                    <Button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      size="sm"
                      className="h-9 bg-white hover:bg-gray-50 text-emerald-600 border-2 border-emerald-500 shadow-md hover:shadow-lg transition-all font-semibold"
                    >
                      <Navigation aria-hidden="true" className="w-4 h-4 mr-1.5" />
                      My Location
                    </Button>
                  </div>
                  
                  <div className="w-full h-[420px] md:h-[480px] rounded-xl overflow-hidden border-2 border-gray-300 shadow-xl relative">
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
                    <p className="text-xs text-red-600 flex items-center gap-1 animate-in slide-in-from-top-1">
                      <AlertCircle aria-hidden="true" className="w-3 h-3" />
                      {fieldErrors.location}
                    </p>
                  )}
                </div>
              </div>
              )}

              {/* Step 3: Business Information */}
              {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 -m-6 mb-4 p-6 rounded-t-2xl">
                  <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg">
                    <Store aria-hidden="true" className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{t('partner.section.business')}</h3>
                    <p className="text-xs text-gray-600">Tell customers about your business</p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="business_name" className="text-sm font-semibold text-gray-700">
                    Business Name * 
                    <span className="text-xs text-gray-500 font-normal ml-2">
                      (Search on Google Maps for auto-fill)
                    </span>
                  </Label>
                  <div className="mt-2">
                    <GooglePlacesAutocomplete
                      value={formData.business_name}
                      onChange={(name) => handleChange('business_name', name)}
                      onPlaceSelected={(place) => {
                        // Auto-fill business information from Google Maps
                        handleChange('business_name', place.name);
                        handleChange('address', place.address);
                        handleChange('contact_phone', place.phone || formData.contact_phone);
                        
                        // Update location on map
                        if (place.lat && place.lng) {
                          setSelectedLocation({
                            lat: place.lat,
                            lng: place.lng
                          });
                          setFormData(prev => ({
                            ...prev,
                            location_lat: place.lat,
                            location_lng: place.lng
                          }));
                        }
                        
                        // Show success toast
                        toast.success('Business information loaded from Google Maps', {
                          description: 'Address and location have been auto-filled'
                        });
                      }}
                      placeholder="e.g., Fresh Bakery, Georgian Bread, My Restaurant"
                      error={fieldErrors.business_name}
                    />
                  </div>
                </div>

                {/* Business Type - Enhanced Icon Buttons */}
                <div>
                  <Label className="text-xs font-semibold text-slate-700 mb-3 block">Business Type *</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {BUSINESS_TYPES.map((type) => {
                      const isSelected = formData.business_type === type.value;
                      const isPopular = type.value === 'CAFE' || type.value === 'RESTAURANT';
                      
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => {
                            handleChange('business_type', type.value);
                            if (fieldErrors.business_type) {
                              setFieldErrors(prev => ({ ...prev, business_type: '' }));
                            }
                          }}
                          className={`relative p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-2 group ${
                            isSelected
                              ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-lg shadow-emerald-200/50 scale-105'
                              : 'border-gray-200 bg-white hover:border-emerald-300 hover:shadow-md hover:scale-102'
                          }`}
                        >
                          {isPopular && (
                            <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
                              ⭐ Popular
                            </div>
                          )}
                          <span className={`text-3xl transition-transform duration-300 ${
                            isSelected ? 'scale-110' : 'group-hover:scale-110'
                          }`}>
                            {type.emoji}
                          </span>
                          <span className={`text-sm font-medium transition-colors ${
                            isSelected ? 'text-emerald-700' : 'text-gray-700 group-hover:text-emerald-600'
                          }`}>
                            {type.label}
                          </span>
                          {isSelected && (
                            <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1 shadow-lg">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {fieldErrors.business_type && (
                    <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                      <AlertCircle aria-hidden="true" className="w-3 h-3" />
                      {fieldErrors.business_type}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm font-semibold text-gray-700">Business Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Tell us about your business..."
                    rows={3}
                    required
                    className={`mt-2 border-2 transition-all resize-none ${
                      fieldErrors.description 
                        ? 'border-red-500 focus:border-red-500' 
                        : formData.description
                        ? 'border-emerald-500 bg-emerald-50/30 focus:border-emerald-500'
                        : 'border-gray-300 focus:border-emerald-500'
                    }`}
                  />
                  {fieldErrors.description && (
                    <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 animate-in slide-in-from-top-1">
                      <AlertCircle aria-hidden="true" className="w-3 h-3" />
                      {fieldErrors.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1.5">{formData.description.length}/500 characters</p>
                </div>

                {/* Business Hours */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-200">
                  <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                    <Clock aria-hidden="true" className="w-4 h-4 text-blue-600" />
                    Business Hours
                  </Label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="opening_hours" className="text-xs font-medium text-gray-700 mb-1.5 block">
                        Opening Time {!open24h && '*'}
                      </Label>

                      <Select
                        value={formData.opening_hours}
                        onValueChange={(value) => handleChange('opening_hours', value)}
                        disabled={open24h}
                      >
                        <SelectTrigger className={`h-11 bg-white border-2 ${
                          fieldErrors.opening_hours 
                            ? 'border-red-500' 
                            : formData.opening_hours
                            ? 'border-emerald-500'
                            : 'border-gray-300'
                        } ${open24h ? 'opacity-50 cursor-not-allowed' : ''}`}>
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
                        <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 animate-in slide-in-from-top-1">
                          <AlertCircle aria-hidden="true" className="w-3 h-3" />
                          {fieldErrors.opening_hours}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="closing_hours" className="text-xs font-medium text-gray-700 mb-1.5 block">
                        Closing Time {!open24h && '*'}
                      </Label>

                      <Select
                        value={formData.closing_hours}
                        onValueChange={(value) => handleChange('closing_hours', value)}
                        disabled={open24h}
                      >
                        <SelectTrigger className={`h-11 bg-white border-2 ${
                          fieldErrors.closing_hours 
                            ? 'border-red-500' 
                            : formData.closing_hours
                            ? 'border-emerald-500'
                            : 'border-gray-300'
                        } ${open24h ? 'opacity-50 cursor-not-allowed' : ''}`}>
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
                        <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 animate-in slide-in-from-top-1">
                          <AlertCircle aria-hidden="true" className="w-3 h-3" />
                          {fieldErrors.closing_hours}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 24-Hour Checkbox */}
                  <div className="flex items-center space-x-3 mt-4 p-3 bg-white rounded-lg border border-gray-200">
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
                    <Label htmlFor="open_24h" className="text-sm font-medium text-gray-700 cursor-pointer flex-1">
                      My business operates 24 hours a day
                    </Label>
                  </div>
                </div>

                {/* Pickup Instructions */}
                <div>
                  <Label htmlFor="pickup_notes" className="text-sm font-semibold text-gray-700">Pickup Instructions (Optional)</Label>
                  <Textarea
                    id="pickup_notes"
                    value={formData.pickup_notes}
                    onChange={(e) => handleChange('pickup_notes', e.target.value)}
                    placeholder="e.g., Enter through the side door, ring the bell twice..."
                    rows={2}
                    className="mt-2 border-2 border-gray-300 focus:border-emerald-500 transition-all resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                    💡 Help customers find your pickup location easily
                  </p>
                </div>
              </div>
              )}

              {/* Step 4: Contact Information */}
              {currentStep === 4 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 -m-6 mb-4 p-6 rounded-t-2xl">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{t('partner.section.contact')}</h3>
                    <p className="text-xs text-gray-600">How customers can reach you</p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+995 XXX XXX XXX"
                    required
                    className={`mt-2 h-11 border-2 transition-all ${
                      fieldErrors.phone 
                        ? 'border-red-500 focus:border-red-500' 
                        : formData.phone
                        ? 'border-emerald-500 bg-emerald-50/30 focus:border-emerald-500'
                        : 'border-gray-300 focus:border-emerald-500'
                    }`}
                  />
                  {fieldErrors.phone && (
                    <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 animate-in slide-in-from-top-1">
                      <AlertCircle aria-hidden="true" className="w-3 h-3" />
                      {fieldErrors.phone}
                    </p>
                  )}
                </div>

                {/* Telegram Notifications - Only show if user is logged in */}
                {isUserLoggedIn && existingUserId && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-200">
                    <Label className="text-sm font-semibold text-gray-900 mb-3 block">Telegram Notifications (optional)</Label>
                    {/* Debug: Show userId being used */}
                    {import.meta.env.DEV && (
                      <div className="text-[10px] text-gray-600 mb-3 p-2 bg-white rounded border border-gray-200">
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
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
                    <p className="text-sm text-blue-900 flex items-start gap-2">
                      <span className="text-lg">💡</span>
                      <span>
                        <strong>Telegram notifications</strong> can be set up after your account is created. You'll find this option in your partner dashboard.
                      </span>
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="whatsapp" className="text-sm font-semibold text-gray-700">WhatsApp (optional)</Label>
                  <Input
                    id="whatsapp"
                    type="tel"
                    value={formData.whatsapp}
                    onChange={(e) => handleChange('whatsapp', e.target.value)}
                    placeholder="+995 XXX XXX XXX"
                    className="mt-2 h-11 border-2 border-gray-300 focus:border-emerald-500 transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1.5">Optional: For customer support via WhatsApp</p>
                </div>

                {/* Terms and Conditions */}
                <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200">
                  <div className="flex items-start space-x-3">
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
                      <Label htmlFor="terms" className="text-sm font-medium text-gray-700 cursor-pointer leading-relaxed">
                        I agree to the SmartPick Terms of Service and Privacy Policy. I understand that my application will be reviewed by the admin team before approval. *
                      </Label>
                      {fieldErrors.terms && (
                        <p className="text-xs text-red-600 mt-2 flex items-center gap-1 animate-in slide-in-from-top-1">
                          <AlertCircle aria-hidden="true" className="w-3 h-3" />
                          {fieldErrors.terms}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              )}

            </form>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Buttons - Enhanced Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t-2 border-emerald-200 shadow-2xl p-4 z-[9999] animate-in slide-in-from-bottom-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex gap-3">
            {currentStep > 1 && (
              <Button
                type="button"
                onClick={handlePrevStep}
                variant="outline"
                className="flex-1 h-12 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 font-bold text-base rounded-xl transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
              >
                ← Back
              </Button>
            )}

            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={handleNextStep}
                className="flex-1 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-base shadow-lg hover:shadow-xl hover:shadow-emerald-200/50 transition-all rounded-xl relative overflow-hidden group active:scale-[0.98]"
              >
                <span className="relative z-10">Next →</span>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting || isDemoMode || !isStepValid(4)}
                onClick={handleSubmit}
                className="flex-1 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-base shadow-lg hover:shadow-xl hover:shadow-emerald-200/50 transition-all rounded-xl disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Account...
                  </span>
                ) : (
                  <span className="relative z-10 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Submit Application
                  </span>
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            )}

            <Button
              type="button"
              onClick={() => navigate('/')}
              variant="outline"
              className={`h-12 border-2 border-red-200 hover:border-red-300 hover:bg-red-50 text-red-600 font-bold text-base shadow-sm hover:shadow-md transition-all rounded-xl active:scale-[0.98] ${currentStep === 1 ? 'flex-1' : 'px-6'}`}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

