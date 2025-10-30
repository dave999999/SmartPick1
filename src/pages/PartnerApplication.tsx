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
import { ArrowLeft, Store, AlertCircle, MapPin, Navigation, Eye, EyeOff, Shield, CheckCircle2, Upload, X, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const BUSINESS_TYPES = ['BAKERY', 'RESTAURANT', 'CAFE', 'GROCERY'];

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [markerPosition, setMarkerPosition] = useState<[number, number]>([41.7151, 44.8271]);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string>('');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [open24h, setOpen24h] = useState(false);
  
  // Form validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
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

  // ✅ add this flag so the validator knows if it's 24h
  open_24h: false,
});


  // Reverse geocoding: map position -> address
  const reverseGeocode = useCallback(async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        console.error('Reverse geocoding failed:', response.statusText);
        return;
      }
      
      const data = await response.json();
      
      if (data && data.display_name) {
        // Extract road/street name if available, otherwise use display_name
        const addressText = data.address?.road || data.display_name;
        const cityText = data.address?.city || data.address?.town || data.address?.village || formData.city;
        
        setFormData(prev => ({
          ...prev,
          address: addressText,
          city: cityText,
        }));
        
        setAddressAutoDetected(true);
        
        // Clear the auto-detected flag after 3 seconds
        setTimeout(() => {
          setAddressAutoDetected(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  }, [formData.city]);

  const handleMapPositionChange = (pos: [number, number]) => {
    setMarkerPosition(pos);
    setFormData(prev => ({
      ...prev,
      latitude: pos[0],
      longitude: pos[1],
    }));
    
    // Trigger reverse geocoding
    reverseGeocode(pos[0], pos[1]);
  };

  const handleUseCurrentLocation = () => {
    if ('geolocation' in navigator) {
      toast.loading('Getting your location...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos: [number, number] = [position.coords.latitude, position.coords.longitude];
          setMarkerPosition(pos);
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }));
          
          // Trigger reverse geocoding
          reverseGeocode(position.coords.latitude, position.coords.longitude);
          
          toast.dismiss();
          toast.success('Location updated!');
        },
        (error) => {
          toast.dismiss();
          toast.error('Could not get your location. Please select manually on the map.');
          console.error('Geolocation error:', error);
        }
      );
    } else {
      toast.error('Geolocation is not supported by your browser');
    }
  };

  // Address autocomplete with debounce
  const searchAddress = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      return;
    }
    
    setIsLoadingAddress(true);
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=5`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        console.error('Address search failed:', response.statusText);
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
        toast.error('No matching addresses found');
      }
    } catch (error) {
      console.error('Error searching address:', error);
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
    } finally {
      setIsLoadingAddress(false);
    }
  }, []);

  const handleAddressChange = (value: string) => {
    setFormData(prev => ({ ...prev, address: value }));
    setAddressAutoDetected(false);
    
    // Clear existing timeout
    if (addressTimeoutRef.current) {
      clearTimeout(addressTimeoutRef.current);
    }
    
    // Debounce address search by 400ms
    addressTimeoutRef.current = setTimeout(() => {
      searchAddress(value);
    }, 400);
  };

  const handleSelectAddressSuggestion = (suggestion: AddressSuggestion) => {
    const lat = parseFloat(suggestion.lat);
    const lon = parseFloat(suggestion.lon);
    
    // Update address field
    const addressText = suggestion.address?.road || suggestion.display_name;
    const cityText = suggestion.address?.city || suggestion.address?.town || suggestion.address?.village || formData.city;
    
    setFormData(prev => ({
      ...prev,
      address: addressText,
      city: cityText,
      latitude: lat,
      longitude: lon,
    }));
    
    // Move map marker
    setMarkerPosition([lat, lon]);
    
    // Hide suggestions
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
    
    // Clear password error when user types
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
      setEmailError('Please enter a valid email address');
      return;
    }

    setIsCheckingEmail(true);
    setEmailError('');

    try {
      // Check in users table
      const { data: userData } = await supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .single();

      // Check in partners table
      const { data: partnerData } = await supabase
        .from('partners')
        .select('email')
        .eq('email', email)
        .single();

      if (userData || partnerData) {
        setEmailError('This email is already registered. Please log in instead.');
      }
    } catch (error) {
      console.error('Error checking email:', error);
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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      toast.error('Please upload a JPG or PNG image');
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    setLogoFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  // Enhanced form validation with field-level error tracking
const validateForm = (): boolean => {
  const errors: Record<string, string> = {};

  // Email validation
  if (!formData.email) {
    errors.email = 'Please fill out this field.';
  } else if (!validateEmail(formData.email)) {
    errors.email = 'Please enter a valid email address.';
  } else if (emailError) {
    errors.email = emailError;
  }

  // Password validation
  if (!formData.password) {
    errors.password = 'Please fill out this field.';
  } else if (!validatePassword(formData.password)) {
    errors.password = 'Password must be at least 8 characters with 1 number and 1 uppercase letter.';
  }

  // Confirm password validation
  if (!formData.confirmPassword) {
    errors.confirmPassword = 'Please fill out this field.';
  } else if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  // Business name validation
  if (!formData.business_name) {
    errors.business_name = 'Please fill out this field.';
  }

  // Business type validation
  if (!formData.business_type) {
    errors.business_type = 'Please fill out this field.';
  }

  // Description validation
  if (!formData.description) {
    errors.description = 'Please fill out this field.';
  }

  // Opening/Closing hours validation (only if not 24h)
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
  // ✅ 24-hour businesses skip validation and set safe defaults
  formData.opening_hours = '00:00';
  formData.closing_hours = '23:59';
}

  // Address validation
  if (!formData.address) {
    errors.address = 'Please fill out this field.';
  }

  // City validation
  if (!formData.city) {
    errors.city = 'Please fill out this field.';
  }

  // Phone validation
  if (!formData.phone) {
    errors.phone = 'Please fill out this field.';
  }

  // Latitude/Longitude validation (should always have values from map)
  if (!formData.latitude || !formData.longitude) {
    errors.location = 'Please set your location on the map.';
  }

  // Terms acceptance
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
      
      // Step 1: Create user account with PARTNER role
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            role: 'PARTNER',
            name: formData.business_name,
          },
        },
      });

      if (authError) {
        console.error('Auth error:', authError);
        // Handle duplicate email errors
        if (authError.message.includes('already registered') || 
            authError.message.includes('duplicate') ||
            authError.message.includes('already exists')) {
          toast.error('This email is already registered. Please log in instead.');
          setEmailError('This email is already registered. Please log in instead.');
          return;
        }
        toast.error(`Account creation failed: ${authError.message}`);
        return;
      }

      if (!authData.user) {
        console.error('No user data returned from auth.signUp');
        toast.error('Failed to create account. Please try again.');
        return;
      }

      console.log('User account created successfully:', authData.user.id);

      // Step 2: Upload logo if provided (check bucket existence first)
      let logoUrl = '';
      if (logoFile) {
        try {
          // Check if bucket exists
          const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
          
          if (bucketError) {
            console.warn('Could not check storage buckets:', bucketError);
          } else {
            const bucketExists = buckets?.some(bucket => bucket.name === 'partner-logos');
            
            if (!bucketExists) {
              console.warn('Bucket "partner-logos" not found. Skipping logo upload.');
              toast.warning('Logo upload skipped (storage not configured), continuing with registration...');
            } else {
              // Upload logo
              const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${logoFile.name.split('.').pop()}`;
              
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('partner-logos')
                .upload(fileName, logoFile, {
                  cacheControl: '31536000',
                  upsert: false,
                });

              if (uploadError) {
                console.error('Logo upload error:', uploadError);
                toast.warning('Logo upload failed, but continuing with registration...');
              } else if (uploadData) {
                const { data: { publicUrl } } = supabase.storage
                  .from('partner-logos')
                  .getPublicUrl(fileName);
                
                logoUrl = publicUrl;
                console.log('Logo uploaded successfully:', logoUrl);
              }
            }
          }
        } catch (logoError) {
          console.error('Logo upload error:', logoError);
          toast.warning('Logo upload failed, but continuing with registration...');
        }
      }

      // Step 3: Validate and prepare partner data with safe defaults
      const partnerData = {
        user_id: authData.user.id,
        business_name: formData.business_name || '',
        business_type: formData.business_type || 'RESTAURANT',
        description: formData.description || '',
        business_hours: open24h ? null : {
          open: formData.opening_hours,
          close: formData.closing_hours
        },
        open_24h: open24h,
        address: formData.address || '',
        city: formData.city || 'Tbilisi',
        latitude: formData.latitude || 0,
        longitude: formData.longitude || 0,
        phone: formData.phone || '',
        email: formData.email || '',
        telegram: formData.telegram || '',
        whatsapp: formData.whatsapp || '',
        logo_url: logoUrl || '',
        pickup_notes: formData.pickup_notes || '',
        status: 'PENDING',
      };

      console.log('Creating partner application with data:', partnerData);

      // Step 4: Insert partner record using Supabase JS client
      try {
        const { data: partnerResult, error: partnerError } = await supabase
          .from('partners')
          .insert(partnerData)
          .select()
          .single();

        if (partnerError) {
          console.error('Supabase partner insert error:', partnerError);
          console.error('Error details:', {
            message: partnerError.message,
            details: partnerError.details,
            hint: partnerError.hint,
            code: partnerError.code,
          });
          
          // Handle specific error cases
          if (partnerError.message?.includes('duplicate') || 
              partnerError.message?.includes('already exists') ||
              partnerError.code === '23505') {
            toast.error('A partner application already exists for this email. Please log in instead.');
          } else {
            toast.error(`Failed to submit application: ${partnerError.message}`);
          }
          return;
        }

        // Check if we got valid data back
        if (partnerResult && partnerResult.id) {
          console.log('Partner application created successfully:', partnerResult);
          toast.success('✅ Your partner application has been submitted and is pending admin review.');
          
          // Show success modal
          setShowSuccessModal(true);
          
          // Redirect to home after 3 seconds
          setTimeout(() => {
            navigate('/');
          }, 3000);
        } else {
          console.error('Partner application returned no data:', partnerResult);
          toast.error('Failed to submit partner application. Please contact support.');
        }
      } catch (insertError: unknown) {
        console.error('Exception during partner insert:', insertError);
        toast.error(`Failed to submit application: ${insertError instanceof Error ? insertError.message : 'Unknown error'}`);
      }
    } catch (error: unknown) {
      console.error('Error submitting application:', error);
      toast.error(`Failed to submit application: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user types
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

  // Close address suggestions when clicking outside
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
            <DialogTitle className="text-center text-2xl">Application Submitted!</DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              ✅ Your partner application has been submitted and is pending admin review.
              <br /><br />
              Please check your email to verify your account.
              <br /><br />
              Redirecting to home in 3 seconds...
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </header>

      {/* Demo Mode Alert */}
      {isDemoMode && (
        <div className="container mx-auto px-4 pt-4">
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong>Demo Mode:</strong> Partner applications require Supabase configuration. Please add your Supabase credentials to enable this feature.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Application Form */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Store className="w-8 h-8 text-mint-600" />
              <div>
                <CardTitle className="text-3xl">Become a SmartPick Partner</CardTitle>
                <CardDescription className="text-base mt-1">
                  Create your partner account and join our platform to reduce food waste
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Account Creation Section */}
              <div className="space-y-4 p-6 bg-mint-50 rounded-lg border-2 border-mint-200">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-mint-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Create Your Partner Account</h3>
                </div>
                
                <div>
                  <Label htmlFor="email">Email Address (Your Login ID) *</Label>
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
                    <p className="text-xs text-gray-500 mt-1">Checking email availability...</p>
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
                      Email is available
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    This email will be used to log in to your partner account
                  </p>
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
                      <p className="text-xs text-gray-500">
                        Requirements: Min 8 characters, 1 number, 1 uppercase letter
                      </p>
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
                  {!fieldErrors.confirmPassword && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
                  )}
                  {!fieldErrors.confirmPassword && formData.confirmPassword && formData.password === formData.confirmPassword && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Passwords match
                    </p>
                  )}
                </div>
              </div>

              {/* Business Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Business Information</h3>
                
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

                <div>
                  <Label htmlFor="business_type">Business Type *</Label>
                  <Select
                    value={formData.business_type}
                    onValueChange={(value) => handleChange('business_type', value)}
                  >
                    <SelectTrigger className={fieldErrors.business_type ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.business_type && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
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
  {/* Opening Hours */}
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

  {/* Closing Hours */}
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
                      // Clear hours errors when toggling
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

                <p className="text-xs text-gray-500 -mt-2">
                  {open24h 
                    ? 'Your business is set to operate 24/7. Opening and closing hours are disabled.' 
                    : 'Select when your business opens and closes each day.'}
                </p>

                {/* Logo Upload */}
                <div>
                  <Label htmlFor="logo">Business Logo (Optional)</Label>
                  <p className="text-xs text-gray-500 mb-2">JPG or PNG, max 2MB</p>
                  
                  {!logoPreview ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-mint-500 transition-colors">
                      <input
                        id="logo"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <label htmlFor="logo" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-600">Click to upload business logo</p>
                      </label>
                    </div>
                  ) : (
                    <div className="relative inline-block">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
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

              {/* Location with Map */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Business Location</h3>
                
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <Label htmlFor="address">Street Address *</Label>
                    {addressAutoDetected && (
                      <span className="text-xs text-mint-600 flex items-center gap-1">
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
                  
                  {/* Address Suggestions Dropdown */}
                  {showAddressSuggestions && addressSuggestions.length > 0 && (
                    <div 
                      className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {addressSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="px-4 py-3 hover:bg-mint-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          onClick={() => handleSelectAddressSuggestion(suggestion)}
                        >
                          <p className="text-sm text-gray-900">{suggestion.display_name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {isLoadingAddress && (
                    <p className="text-xs text-gray-500 mt-1">Searching addresses...</p>
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
                  
                  <Alert className="bg-mint-50 border-mint-200">
                    <MapPin className="h-4 w-4 text-mint-600" />
                    <AlertDescription className="text-mint-900">
                      <strong>Drag the pin to set your business location precisely.</strong> Click anywhere on the map or drag the green marker. The address will auto-update!
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
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <LocationMarker
                        position={markerPosition}
                        setPosition={handleMapPositionChange}
                      />
                    </MapContainer>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="latitude">Latitude *</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="0.000001"
                        value={formData.latitude.toFixed(6)}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                    <div>
                      <Label htmlFor="longitude">Longitude *</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="0.000001"
                        value={formData.longitude.toFixed(6)}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                  </div>
                  {fieldErrors.location && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {fieldErrors.location}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    📍 Coordinates are automatically updated when you move the marker
                  </p>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                
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

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || isDemoMode}
                  className="flex-1 bg-mint-600 hover:bg-mint-700"
                >
                  {isSubmitting ? 'Creating Account...' : 'Create Partner Account & Apply'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}