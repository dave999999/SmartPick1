import { MainCategory } from './categories';

export type UserRole = 'CUSTOMER' | 'PARTNER' | 'ADMIN';

// Updated to use the new 12-category system
export type BusinessType = MainCategory;

export type OfferStatus = 'ACTIVE' | 'EXPIRED' | 'PAUSED' | 'SOLD_OUT' | 'SCHEDULED';
export type ReservationStatus = 'ACTIVE' | 'PICKED_UP' | 'CANCELLED' | 'EXPIRED' | 'FAILED_PICKUP';
export type PartnerStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLOCKED' | 'PAUSED';

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
  penalty_warning_shown?: boolean; // Track if user has seen first-time warning
  onboarding_completed?: boolean; // Track if user has completed onboarding tutorial
  max_reservation_quantity?: number; // Progressive slot unlocking
  purchased_slots?: Array<{ date: string; slots: number; price: number }>; // JSONB array of slot purchase history
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
  // Optional flat-hour fields used in PartnerDashboard
  opening_time?: string; // e.g. "09:00"
  closing_time?: string; // e.g. "18:00"
  open_24h?: boolean;
  status: PartnerStatus;
  images: string[];
  approved_for_upload?: boolean;
  image_quota_used?: number; // Number of images currently uploaded
  image_quota_max?: number; // Maximum allowed images (default 15)
  cover_image_url?: string; // Cover photo for map cards and profile
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
  scheduled_publish_at?: string;
  partner?: Partner;
  // Admin moderation fields
  is_flagged?: boolean;
  // Auto-relist feature
  auto_relist_enabled?: boolean;
  last_relisted_at?: string;
  flagged_reason?: string;
  is_featured?: boolean;
  featured_until?: string;
  admin_notes?: string;
  // Popularity metrics
  reservation_count?: number;
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
  points_spent?: number;
  user_confirmed_pickup?: boolean;
  no_show?: boolean;
  forgiveness_requested?: boolean;
  forgiveness_request_reason?: string;
  forgiveness_requested_at?: string;
  forgiveness_approved?: boolean;
  forgiveness_denied?: boolean;
  forgiveness_handled_at?: string;
  offer?: Offer;
  partner?: Partner;
  customer?: { name?: string; email?: string; phone?: string };
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

// Gamification / Achievements
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type AchievementCategory = 'milestone' | 'social' | 'engagement' | 'savings';

export interface AchievementDefinitionType {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  category: AchievementCategory;
  tier: AchievementTier;
  requirement: {
    type: string; // reservations | money_saved | category | unique_partners | partner_loyalty | streak | referrals
    count?: number;
    amount?: number;
    days?: number;
    name?: string; // category name
  };
  reward_points: number;
  is_active?: boolean;
}

export interface UserAchievementType {
  id?: string; // row id (if exists)
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  is_new?: boolean;
  viewed_at?: string | null;
  achievement?: AchievementDefinitionType; // joined definition
}

// Re-export admin types
export * from './types/admin';