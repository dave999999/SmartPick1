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

// =====================================================
// NEW: BAN MANAGEMENT TYPES
// =====================================================

export interface UserBan {
  id: string;
  user_id: string;
  banned_by: string;
  reason: string;
  ban_type: 'PERMANENT' | 'TEMPORARY';
  expires_at?: string;
  internal_notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    name: string;
    email: string;
  };
  admin?: {
    name: string;
    email: string;
  };
}

// =====================================================
// NEW: FLAGGED CONTENT TYPES
// =====================================================

export interface FlaggedContent {
  id: string;
  content_type: 'OFFER' | 'PARTNER' | 'USER';
  content_id: string;
  flagged_by?: string;
  flag_source: 'USER' | 'SYSTEM_AUTO';
  flag_reason: string;
  description?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
  reviewed_by?: string;
  reviewed_at?: string;
  admin_notes?: string;
  resolution_action?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  reporter?: {
    name: string;
    email: string;
  };
}

// =====================================================
// ENHANCED: AUDIT LOG WITH ANOMALY DETECTION
// =====================================================

export interface EnhancedAuditLog extends AuditLog {
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  is_suspicious: boolean;
  anomaly_score?: number; // 0.00 to 1.00
}

export interface AnomalyDetection {
  anomaly_type: string;
  user_id: string;
  count: number;
  description: string;
}

// =====================================================
// NEW: POINT PURCHASE DETAILS (For clickable modal)
// =====================================================

export interface BuyerPurchaseDetail {
  user_id: string;
  user_name: string;
  user_email: string;
  purchase_date: string;
  points_purchased: number;
  amount_paid_gel: number;
  transaction_id: string;
}

export interface BuyerSummary {
  user_id: string;
  user_name: string;
  user_email: string;
  total_points_purchased: number;
  total_gel_spent: number;
  total_purchases: number;
  last_purchase_date: string;
}

// =====================================================
// NEW: USER CLAIMED POINTS DETAILS
// =====================================================

export interface ClaimedPointsDetail {
  claim_date: string;
  points_claimed: number;
  claim_source: 'ACHIEVEMENT' | 'REFERRAL' | 'BONUS' | 'REWARD' | 'OTHER';
  source_description: string;
  transaction_id: string;
}

// =====================================================
// NEW: USER POINTS SUMMARY (For Users tab)
// =====================================================

export interface UserPointsSummary {
  user_id: string;
  name: string;
  email: string;
  role: string;
  is_banned: boolean;
  current_points: number;
  total_purchased: number;
  total_claimed: number;
  total_gel_spent: number;
  created_at: string;
  last_login?: string;
}

// Analytics types
// CORRECTED: Revenue = Point Purchases (not reservation prices)
// UPDATED: Now uses GEL currency (100 points = 1 GEL)
export interface RevenueStats {
  total_revenue: number; // In GEL (Georgian Lari), not points
  total_point_purchases: number; // Number of purchase transactions
  total_points_sold: number; // Total points sold
  average_purchase_value: number; // Average GEL per purchase
  unique_buyers: number; // Unique customers who bought points
}

export interface UserGrowthData {
  date: string;
  new_users: number;
  cumulative_users: number;
}

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

// =====================================================
// NEW: DAILY REVENUE VIEW
// =====================================================

export interface DailyRevenueSummary {
  revenue_date: string;
  purchase_count: number;
  total_points_sold: number;
  total_revenue_gel: number;
  avg_purchase_gel: number;
  unique_buyers: number;
  buyer_names?: string; // Comma-separated list of buyers
}
