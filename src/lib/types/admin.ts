// =====================================================
// ADMIN-SPECIFIC TYPES
// Types for admin dashboard features
// =====================================================

export interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  admin?: {
    name: string;
    email: string;
  };
}

export interface OfferFlag {
  id: string;
  offer_id: string;
  reported_by?: string;
  reason: 'INAPPROPRIATE' | 'SPAM' | 'PRICING_ISSUE' | 'FAKE' | 'OTHER';
  description?: string;
  status: 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';
  reviewed_by?: string;
  reviewed_at?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  offer?: {
    title: string;
    partner: {
      business_name: string;
    };
  };
  reporter?: {
    name: string;
    email: string;
  };
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'INFO' | 'WARNING' | 'URGENT' | 'MAINTENANCE';
  target_audience: 'ALL' | 'CUSTOMERS' | 'PARTNERS';
  is_active: boolean;
  display_from: string;
  display_until?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: 'GENERAL' | 'CUSTOMERS' | 'PARTNERS' | 'TECHNICAL';
  display_order: number;
  is_published: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SystemLog {
  id: string;
  log_level: 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG';
  component: string;
  message: string;
  error_details?: Record<string, any>;
  user_id?: string;
  request_path?: string;
  http_method?: string;
  response_time_ms?: number;
  created_at: string;
}

export interface PartnerPayout {
  id: string;
  partner_id: string;
  period_start: string;
  period_end: string;
  total_revenue: number;
  commission_rate: number;
  commission_amount: number;
  payout_amount: number;
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'CANCELLED';
  payment_method?: string;
  payment_reference?: string;
  processed_by?: string;
  processed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  partner?: {
    business_name: string;
    business_type: string;
  };
}

export interface UserActivity {
  id: string;
  user_id?: string;
  activity_type: string;
  ip_address?: string;
  user_agent?: string;
  country_code?: string;
  city?: string;
  is_suspicious: boolean;
  suspicious_reason?: string;
  created_at: string;
  user?: {
    name: string;
    email: string;
  };
}

// Analytics types
export interface RevenueStats {
  total_revenue: number;
  total_reservations: number;
  total_pickups: number;
  average_order_value: number;
  completion_rate: number;
}

export interface UserGrowthData {
  date: string;
  new_users: number;
  cumulative_users: number;
}

export interface TopPartner {
  partner_id: string;
  business_name: string;
  total_revenue: number;
  total_items_sold: number;
  total_reservations: number;
}

export interface CategoryStats {
  category: string;
  total_offers: number;
  total_reservations: number;
  total_revenue: number;
}

// Admin dashboard summary
export interface AdminDashboardStats {
  totalUsers: number;
  totalPartners: number;
  totalOffers: number;
  totalReservations: number;
  totalRevenue: number;
  activeReservations: number;
  pendingPartnerApplications: number;
  flaggedOffers: number;
  bannedUsers: number;
  systemErrors: number;
}
