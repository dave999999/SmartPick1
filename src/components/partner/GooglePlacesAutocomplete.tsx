import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelected: (place: {
    name: string;
    address: string;
    lat: number;
    lng: number;
    phone?: string;
    website?: string;
    types?: string[];
  }) => void;
  placeholder?: string;
  className?: string;
  error?: string;
}

export function GooglePlacesAutocomplete({
  value,
  onChange,
  onPlaceSelected,
  placeholder = "Search for your business on Google Maps",
  className = "",
  error
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);

  useEffect(() => {
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      setGoogleLoaded(true);
      return;
    }

    // Check if script is already in DOM (from previous component mount)
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // Script exists, wait for it to load
      const checkLoaded = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          setGoogleLoaded(true);
          clearInterval(checkLoaded);
        }
      }, 100);
      
      return () => clearInterval(checkLoaded);
    }

    // Load Google Maps script
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Google Maps API key is missing');
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=ka`;
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleLoaded(true);
    script.onerror = () => console.error('Failed to load Google Maps script');
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!googleLoaded || !inputRef.current) return;

    try {
      // Initialize Google Places Autocomplete
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ['establishment'],
          componentRestrictions: { country: 'ge' }, // Restrict to Georgia
          fields: [
            'name',
            'formatted_address',
            'geometry',
            'formatted_phone_number',
            'website',
            'types',
            'place_id'
          ]
        }
      );

      // Listen for place selection
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        
        if (!place || !place.geometry || !place.geometry.location) {
          console.warn('No valid place selected', place);
          return;
        }

        setIsLoading(true);
        setIsSelected(true);

        const placeData = {
          name: place.name || '',
          address: place.formatted_address || '',
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          phone: place.formatted_phone_number,
          website: place.website,
          types: place.types
        };

        console.log('Place selected:', placeData);

        // Update the input value with the business name
        onChange(place.name || '');
        
        // Call the callback with full place data
        onPlaceSelected(placeData);
        
        setIsLoading(false);
      });
    } catch (err) {
      console.error('Error initializing Google Places Autocomplete:', err);
    }

    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [googleLoaded, onChange, onPlaceSelected]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setIsSelected(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`h-11 pl-10 pr-10 border-2 transition-all ${
            error
              ? 'border-red-500 focus:border-red-500'
              : isSelected
              ? 'border-emerald-500 bg-emerald-50/30 focus:border-emerald-500'
              : 'border-gray-300 focus:border-emerald-500'
          } ${className}`}
          disabled={isLoading || !googleLoaded}
        />
        <MapPin 
          className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
            isSelected ? 'text-emerald-500' : 'text-gray-400'
          }`}
          aria-hidden="true"
        />
        {isLoading && (
          <Loader2 
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 animate-spin" 
            aria-hidden="true"
          />
        )}
        {isSelected && !isLoading && (
          <CheckCircle2 
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" 
            aria-hidden="true"
          />
        )}
      </div>
      
      {!googleLoaded && (
        <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
          Loading Google Maps...
        </p>
      )}
      
      {isSelected && !isLoading && (
        <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1 animate-in slide-in-from-top-1">
          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
          Business found on Google Maps
        </p>
      )}
      
      {error && (
        <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 animate-in slide-in-from-top-1">
          <AlertCircle className="w-3 h-3" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
