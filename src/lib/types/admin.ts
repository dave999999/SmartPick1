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

// REMOVED: PartnerPayout interface
// Platform doesn't handle partner payouts - users pay partners directly via reservations
// Platform revenue comes only from point purchases

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
// CORRECTED: Revenue = Point Purchases (not reservation prices)
export interface RevenueStats {
  total_revenue: number; // From point purchases only
  total_point_purchases: number; // Number of purchase transactions
  total_points_sold: number; // Total points sold
  average_purchase_value: number; // Average points per purchase
  unique_buyers: number; // Unique customers who bought points
}

export interface UserGrowthData {
  date: string;
  new_users: number;
  cumulative_users: number;
}

// CORRECTED: Partners don't generate platform revenue (users pay them directly)
// Already fixed above - this duplicate removed

// CORRECTED: Partners don't generate platform revenue (users pay them directly)
export interface TopPartner {
  partner_id: string;
  business_name: string;
  business_type: string;
  total_reservations: number;
  completed_reservations: number;
  completion_rate: number;
  total_offers: number;
  average_rating: number;
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
