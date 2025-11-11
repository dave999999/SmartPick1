import { useState, useEffect, useRef } from 'react';
import { Partner } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { logger } from '@/lib/logger';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, MapPin, Phone, Mail, Building2, Save, X } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface EditPartnerProfileProps {
  partner: Partner;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

// Custom map marker icon
const customIcon = L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="
      background: linear-gradient(135deg, #00C896 0%, #009B77 100%);
      border: 4px solid white;
      border-radius: 50% 50% 50% 0;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      width: 40px;
      height: 40px;
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

// Generate time options in 30-minute intervals (24-hour format)
const generateTimeOptions = (): string[] => {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const hourStr = hour.toString().padStart(2, '0');
      const minuteStr = minute.toString().padStart(2, '0');
      options.push(`${hourStr}:${minuteStr}`);
    }
  }
  return options;
};

export default function EditPartnerProfile({ partner, open, onOpenChange, onUpdate }: EditPartnerProfileProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [markerPosition, setMarkerPosition] = useState<[number, number]>([
    partner.latitude || 41.7151,
    partner.longitude || 44.8271,
  ]);
  const [formData, setFormData] = useState({
    business_name: partner.business_name || '',
    business_type: partner.business_type || 'RESTAURANT',
    phone: partner.phone || '',
    email: partner.email || '',
    address: partner.address || '',
    description: partner.description || '',
    opening_time: partner.opening_time || '',
    closing_time: partner.closing_time || '',
    open_24h: partner.open_24h || false,
    latitude: partner.latitude || 41.7151,
    longitude: partner.longitude || 44.8271,
  });

  useEffect(() => {
    if (partner) {
      setFormData({
        business_name: partner.business_name || '',
        business_type: partner.business_type || 'RESTAURANT',
        phone: partner.phone || '',
        email: partner.email || '',
        address: partner.address || '',
        description: partner.description || '',
        opening_time: partner.opening_time || '',
        closing_time: partner.closing_time || '',
        open_24h: partner.open_24h || false,
      });
    }
  }, [partner]);

  const handleMapPositionChange = (pos: [number, number]) => {
    setMarkerPosition(pos);
    setFormData({ ...formData, latitude: pos[0], longitude: pos[1] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate business hours if not 24/7
      if (!formData.open_24h) {
        if (!formData.opening_time || !formData.closing_time) {
          toast.error('Please set both opening and closing times');
          setIsSubmitting(false);
          return;
        }

        // Validate closing time is after opening time
        const [openHour, openMin] = formData.opening_time.split(':').map(Number);
        const [closeHour, closeMin] = formData.closing_time.split(':').map(Number);
        const openMinutes = openHour * 60 + openMin;
        const closeMinutes = closeHour * 60 + closeMin;

        if (closeMinutes <= openMinutes) {
          toast.error('Closing time must be after opening time');
          setIsSubmitting(false);
          return;
        }
      }

      const { error } = await supabase
        .from('partners')
        .update({
          business_name: formData.business_name,
          business_type: formData.business_type,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          description: formData.description,
          opening_time: formData.open_24h ? null : formData.opening_time,
          closing_time: formData.open_24h ? null : formData.closing_time,
          open_24h: formData.open_24h,
          latitude: formData.latitude,
          longitude: formData.longitude,
        })
        .eq('id', partner.id);

      if (error) throw error;

      toast.success('Profile updated successfully!');
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      logger.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      {/* Business Name */}
      <div className="space-y-2">
        <Label htmlFor="business_name" className="flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Business Name *
        </Label>
        <Input
          id="business_name"
          value={formData.business_name}
          onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
          required
          className="text-base" // Better for mobile
        />
      </div>

      {/* Business Type */}
      <div className="space-y-2">
        <Label htmlFor="business_type">Business Type *</Label>
        <select
          id="business_type"
          value={formData.business_type}
          onChange={(e) => setFormData({ ...formData, business_type: e.target.value as any })}
          className="w-full px-3 py-2 border rounded-md text-base"
          required
        >
          <option value="BAKERY">🥖 Bakery</option>
          <option value="RESTAURANT">🍽️ Restaurant</option>
          <option value="CAFE">☕ Cafe</option>
          <option value="GROCERY">🛒 Grocery</option>
          <option value="FAST_FOOD">🍔 Fast Food</option>
          <option value="ALCOHOL">🍷 Alcohol</option>
        </select>
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone" className="flex items-center gap-2">
          <Phone className="w-4 h-4" />
          Phone Number *
        </Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          required
          className="text-base"
        />
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email" className="flex items-center gap-2">
          <Mail className="w-4 h-4" />
          Email *
        </Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          className="text-base"
        />
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="address" className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Address *
        </Label>
        <Textarea
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          required
          className="text-base min-h-[80px]"
        />
      </div>

      {/* Interactive Map Section */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Business Location *
        </Label>
        <div className="w-full h-[300px] rounded-lg overflow-hidden border-2 border-gray-300">
          <MapContainer
            center={markerPosition}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            <LocationMarker position={markerPosition} setPosition={handleMapPositionChange} />
          </MapContainer>
        </div>
        <p className="text-xs text-gray-500">
          📍 Click or drag the pin to set your exact business location
        </p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Business Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Tell customers about your business..."
          className="text-base min-h-[100px]"
        />
      </div>

      {/* Operating Hours */}
      <div className="space-y-3 pt-4 border-t">
        <Label className="flex items-center gap-2 text-base font-semibold">
          <Clock className="w-4 h-4" />
          Operating Hours
        </Label>

        {/* 24/7 Checkbox */}
        <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
          <Checkbox
            id="open_24h"
            checked={formData.open_24h}
            onCheckedChange={(checked) => setFormData({ ...formData, open_24h: checked as boolean })}
          />
          <Label htmlFor="open_24h" className="text-sm cursor-pointer font-medium">
            Open 24 hours / 7 days
          </Label>
        </div>

        {/* Time dropdowns - only show if not 24/7 */}
        {!formData.open_24h && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="opening_time" className="text-sm">Opening Time</Label>
                <select
                  id="opening_time"
                  value={formData.opening_time}
                  onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-base bg-white"
                  required={!formData.open_24h}
                >
                  <option value="">Select time...</option>
                  {generateTimeOptions().map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="closing_time" className="text-sm">Closing Time</Label>
                <select
                  id="closing_time"
                  value={formData.closing_time}
                  onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-base bg-white"
                  required={!formData.open_24h}
                >
                  <option value="">Select time...</option>
                  {generateTimeOptions().map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-900">
                ℹ️ <strong>Important:</strong> Your offers will be automatically set to expire at your closing time.
              </p>
            </div>
          </>
        )}

        {/* Info for 24/7 businesses */}
        {formData.open_24h && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs text-green-900">
              ℹ️ <strong>24/7 Operation:</strong> Your offers will be live for 12 hours from creation.
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons - Mobile Optimized */}
      <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4 sticky bottom-0 bg-white pb-safe">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="w-full sm:w-auto"
          disabled={isSubmitting}
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button
          type="submit"
          className="w-full sm:w-auto bg-[#00C896] hover:bg-[#00B588]"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );

  // Use Sheet for mobile, Dialog for desktop
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Business Profile</SheetTitle>
            <SheetDescription>
              Update your business information and operating hours
            </SheetDescription>
          </SheetHeader>
          {formContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Business Profile</DialogTitle>
          <DialogDescription>
            Update your business information and operating hours
          </DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}

