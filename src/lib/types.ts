export type UserRole = 'CUSTOMER' | 'PARTNER' | 'ADMIN';
export type BusinessType = 'BAKERY' | 'RESTAURANT' | 'CAFE' | 'GROCERY' | 'FAST_FOOD' | 'ALCOHOL';
export type OfferStatus = 'ACTIVE' | 'EXPIRED' | 'PAUSED' | 'SOLD_OUT';
export type ReservationStatus = 'ACTIVE' | 'PICKED_UP' | 'CANCELLED' | 'EXPIRED';
export type PartnerStatus = 'PENDING' | 'APPROVED' | 'BLOCKED' | 'PAUSED';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  status?: 'ACTIVE' | 'DISABLED';
  penalty_until?: string | null;
  penalty_count?: number;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface Location {
  address: string;
  city: string;
  latitude: number;
  longitude: number;
}

export interface ContactInfo {
  phone: string;
  email: string;
  telegram?: string;
  whatsapp?: string;
}

export interface BusinessHours {
  [day: string]: {
    open: string;
    close: string;
  };
}

export interface Partner {
  id: string;
  user_id: string;
  business_name: string;
  business_type: BusinessType;
  description: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  phone: string;
  email: string;
  telegram?: string;
  whatsapp?: string;
  business_hours?: BusinessHours;
  status: PartnerStatus;
  images: string[];
  approved_for_upload?: boolean;
  created_at: string;
  updated_at: string;
  // For backward compatibility with nested location structure
  location?: Location;
  contact?: ContactInfo;
}

export interface Offer {
  id: string;
  partner_id: string;
  category: string;
  title: string;
  description: string;
  images: string[];
  original_price: number;
  smart_price: number;
  quantity_available: number;
  quantity_total: number;
  // Database structure uses flat fields
  pickup_start?: string;
  pickup_end?: string;
  // For backward compatibility with nested structure
  pickup_window?: {
    start: string;
    end: string;
  };
  status: OfferStatus;
  created_at: string;
  updated_at: string;
  expires_at: string;
  partner?: Partner;
}

export interface Reservation {
  id: string;
  offer_id: string;
  customer_id: string;
  partner_id: string;
  qr_code: string;
  quantity: number;
  total_price: number;
  status: ReservationStatus;
  created_at: string;
  updated_at: string;
  expires_at: string;
  picked_up_at?: string;
  offer?: Offer;
  partner?: Partner;
}

export interface CreateOfferDTO {
  title: string;
  description: string;
  category: string;
  images: File[];
  original_price: number;
  smart_price: number;
  quantity_total: number;
  pickup_window: {
    start: Date;
    end: Date;
  };
}

export interface OfferFilters {
  category?: string;
  business_type?: BusinessType;
  location?: {
    lat: number;
    lng: number;
  };
  radius?: number;
}

export interface PenaltyInfo {
  isUnderPenalty: boolean;
  penaltyUntil?: Date;
  remainingTime?: string;
  penaltyCount: number;
}