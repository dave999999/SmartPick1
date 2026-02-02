# SmartPick Admin Dashboard - Full Implementation Plan
**Date:** February 3, 2026  
**Status:** Phase 1 Complete (6/15 modules) | Phase 2-3 In Progress

---

## 🎯 OBJECTIVE
Build a **production-grade admin dashboard** with full operational control, deep analytics, real-time visibility, and scalable permissions for SmartPick - a discount reservation app.

---

## ✅ PHASE 1: COMPLETED MODULES (6/15)

### 1. Dashboard Home ✅
- **Status:** Live with real data (commit 98ece3d)
- **Features:**
  - Real-time KPIs (GMV, Revenue, Active Users, Pickup Rate)
  - Quick stats (New Users, Active Partners, Pending Tickets, Expiring Offers)
  - Live activity feed (last 5 reservations)
  - Auto-refresh every 30 seconds
- **Database Queries:** ✅ All using real schema

### 2. User Management ✅
- **File:** `src/pages/admin/UserManagement.tsx` (395 lines)
- **Hook:** `src/hooks/admin/useUsers.ts` (373 lines)
- **Features:**
  - User list with filters (status, role, ban status)
  - Search by name/email
  - View user profile
  - Ban/unban with reason
  - Adjust points manually
  - View reservation history
  - No-show tracking
  - Penalty management
- **Permissions:** ADMIN, SUPER_ADMIN, SUPPORT_AGENT (read-only)

### 3. Support Tickets ✅
- **File:** `src/pages/admin/SupportTickets.tsx` (518 lines)
- **Hook:** `src/hooks/admin/useSupportTickets.ts` (322 lines)
- **Features:**
  - Ticket list with status/priority filters
  - SLA tracking (urgent 30min, high 2h, medium 8h, low 24h)
  - Assign tickets to agents
  - Priority management
  - Internal notes
  - Conversation thread (ticket_messages table)
  - Auto-flagging for SLA breach
- **Database:** ⚠️ Migration created but NOT deployed to Supabase
- **Permissions:** ADMIN, SUPPORT_AGENT

### 4. Partner Management ✅
- **File:** `src/pages/admin/PartnerManagement.tsx` (605 lines)
- **Hook:** `src/hooks/admin/usePartners.ts` (420 lines)
- **Features:**
  - Partner list with status filters (PENDING, APPROVED, REJECTED, SUSPENDED)
  - Approve/reject with notes
  - Suspend/reactivate partners
  - View partner profile + offer performance
  - Dynamic stats (total offers, active offers, completed reservations, revenue)
  - Search by business name/email
- **Schema:** ✅ Fully aligned with database (commit b8f1233)
- **Permissions:** ADMIN, OPS_ADMIN

### 5. Offer Management ✅
- **File:** `src/pages/admin/OfferManagement.tsx` (664 lines)
- **Hook:** `src/hooks/admin/useOffers.ts` (379 lines)
- **Features:**
  - Offer list with status filters (ACTIVE, EXPIRED, SOLD_OUT, CANCELLED)
  - Emergency pause/resume
  - Extend expiration
  - Delete offers
  - View offer details + reservation funnel
  - Category filter
  - Price range filter (smart_price)
- **Schema:** ✅ Fully aligned (commit 94bb3ca)
- **Permissions:** ADMIN, OPS_ADMIN

### 6. Reservation Monitoring ✅
- **File:** `src/pages/admin/ReservationMonitoring.tsx` (790 lines)
- **Hook:** `src/hooks/admin/useReservations.ts` (398 lines)
- **Features:**
  - Real-time reservation feed
  - Countdown timers (updates every second)
  - Urgency levels (critical <15min, warning <1h, normal >1h)
  - Extend reservation (add time)
  - Force complete
  - Cancel with reason
  - No-show marking
  - Auto-refresh every 30 seconds
- **Schema:** ✅ Fully aligned (customer_id, qr_code, status uppercase)
- **Issues:** 🐛 Status filter using lowercase 'active' instead of 'ACTIVE'
- **Permissions:** ADMIN, OPS_ADMIN

---

## 🚧 PHASE 2: MISSING CRITICAL MODULES (4/15)

### 7. Analytics Module ❌ NOT IMPLEMENTED
- **Route:** `/admin/analytics`
- **Current State:** Redirects to Dashboard Home
- **Required Features:**
  - **Growth Metrics:**
    - Daily Active Users (DAU)
    - Weekly Active Users (WAU)
    - Monthly Active Users (MAU)
    - User retention cohorts (Day 1, Day 7, Day 30)
    - User signup trends (30-day chart)
  - **Reservation Metrics:**
    - Reservation volume trends
    - Pickup rate by time of day
    - Average time to pickup
    - Expiration rate
    - No-show rate by user/partner
  - **Revenue Metrics:**
    - GMV trends (daily/weekly/monthly)
    - Commission revenue trends
    - Average order value (AOV)
    - Revenue per partner
  - **Geo Analytics:**
    - Reservation heatmap by city
    - Partner distribution
    - Top cities by GMV
  - **Behavioral Analytics:**
    - Most popular categories
    - Peak reservation times
    - Average reservations per user
    - Partner performance benchmarks
- **Charts Needed:**
  - Line charts (trends over time)
  - Bar charts (comparisons)
  - Pie charts (category distribution)
  - Heatmaps (geo data)
  - Tables (top performers)
- **Filters:** Date range, city, category, partner
- **Export:** CSV/PDF reports
- **Permissions:** ADMIN, SUPER_ADMIN, FINANCE

### 8. Revenue Module ❌ NOT IMPLEMENTED
- **Route:** `/admin/revenue`
- **Current State:** Redirects to Dashboard Home
- **Required Features:**
  - **Financial Overview:**
    - Total GMV (lifetime)
    - Total commission earned (15%)
    - Pending payouts to partners
    - Average commission per transaction
  - **Revenue Breakdown:**
    - Revenue by partner (sortable table)
    - Revenue by category
    - Revenue by city
    - Revenue trends (daily/weekly/monthly charts)
  - **Commission Tracking:**
    - Paid vs unpaid commissions
    - Payment history log
    - Mark payments as sent
    - Generate payment batch
  - **Financial Reports:**
    - Monthly revenue report
    - Partner payout statements
    - Tax reporting data
  - **Reconciliation:**
    - Match reservations to payments
    - Identify discrepancies
    - Refund tracking
- **Database Tables Needed:**
  - `partner_payouts` (id, partner_id, amount, period_start, period_end, status, paid_at)
  - `refunds` (id, reservation_id, amount, reason, status, processed_at)
- **Permissions:** ADMIN, SUPER_ADMIN, FINANCE

### 9. Fraud Prevention Module ❌ NOT IMPLEMENTED
- **Route:** `/admin/fraud`
- **Current State:** Redirects to Dashboard Home
- **Required Features:**
  - **User Abuse Detection:**
    - Multiple no-shows (>3 in 7 days)
    - Rapid account creation (same device/IP)
    - Points manipulation attempts
    - Multiple accounts from same device
    - Reservation hoarding (reserve many, pickup few)
  - **Partner Abuse Detection:**
    - Fake offer posting
    - Consistent poor quality
    - QR code sharing/reuse
    - Pricing manipulation
    - Quantity manipulation
  - **Automated Actions:**
    - Auto-ban users with 5+ no-shows
    - Flag suspicious partners for review
    - Temporary account suspension
    - Point deduction for violations
  - **Manual Review Queue:**
    - Flagged accounts list
    - Evidence timeline
    - Admin decision (approve/ban/warn)
    - Appeal process
  - **Fraud Analytics:**
    - Fraud rate trends
    - Top fraud patterns
    - Financial impact of fraud
- **Database Tables Needed:**
  - `fraud_flags` (id, entity_type, entity_id, flag_type, reason, evidence, status, reviewed_by, reviewed_at)
- **Permissions:** ADMIN, SUPER_ADMIN

### 10. Moderation Module ❌ NOT IMPLEMENTED
- **Route:** `/admin/moderation`
- **Current State:** Redirects to Dashboard Home
- **Required Features:**
  - **Content Moderation:**
    - Review reported offers
    - Review reported partners
    - Review user-submitted content
    - Offensive content detection
  - **Moderation Queue:**
    - Pending reviews list
    - Auto-flagged content
    - User reports
    - Priority levels
  - **Actions:**
    - Approve content
    - Reject with reason
    - Edit content
    - Ban user/partner
    - Issue warning
  - **Moderation Log:**
    - All moderation actions
    - Moderator assignments
    - Decision history
  - **Auto-Moderation Rules:**
    - Keyword blacklist
    - Image content scanning
    - Duplicate offer detection
- **Database Tables Needed:**
  - `moderation_queue` (id, content_type, content_id, reason, reporter_id, status, assigned_to, resolved_at)
  - `moderation_log` (id, action, entity_type, entity_id, reason, admin_id, timestamp)
- **Permissions:** ADMIN, SUPPORT_AGENT

---

## 🔔 PHASE 3: COMMUNICATION & MONITORING (4/15)

### 11. Notifications Module ❌ NOT IMPLEMENTED
- **Route:** `/admin/notifications`
- **Current State:** Redirects to Dashboard Home
- **Required Features:**
  - **Push Notification Management:**
    - Create targeted campaigns
    - Schedule notifications
    - Audience targeting (all users, specific segment, individual)
    - Template library
  - **Notification Types:**
    - Marketing campaigns
    - Offer alerts
    - System announcements
    - Emergency alerts
  - **Delivery Tracking:**
    - Sent count
    - Delivered count
    - Opened count
    - Click-through rate
  - **FCM Integration:**
    - Token management
    - Send test notifications
    - Batch sending
    - Delivery status
  - **Automation Rules:**
    - New offer alerts (auto-send to nearby users)
    - Reservation reminders (15min before pickup)
    - No-show warnings
    - Re-engagement campaigns
- **Database Tables Needed:**
  - `notification_campaigns` (id, title, message, image, target_audience, scheduled_at, sent_at, delivered_count)
  - `notification_logs` (id, campaign_id, user_id, delivered_at, opened_at, clicked_at)
- **Permissions:** ADMIN, SUPER_ADMIN

### 12. Messages Module ❌ NOT IMPLEMENTED
- **Route:** `/admin/messages`
- **Current State:** Redirects to Dashboard Home
- **Required Features:**
  - **Admin-to-User Messaging:**
    - Send direct messages to users
    - View conversation history
    - Mark as resolved
  - **Admin-to-Partner Messaging:**
    - Send messages to partners
    - Bulk messaging
    - Templates for common scenarios
  - **Inbox Management:**
    - Unread messages
    - Assigned conversations
    - Search by user/partner
  - **Quick Replies:**
    - Predefined responses
    - Message templates
- **Database Tables Needed:**
  - `admin_messages` (id, from_admin_id, to_user_id, to_partner_id, message, read_at, resolved_at)
- **Permissions:** ADMIN, SUPPORT_AGENT

### 13. Live Activity Monitor ❌ NOT IMPLEMENTED
- **Route:** `/admin/live`
- **Current State:** Redirects to Dashboard Home
- **Required Features:**
  - **Real-Time Events Stream:**
    - User signups (real-time)
    - New offers posted
    - Reservations created
    - Pickups completed
    - Cancellations
    - Partner approvals
    - System errors
  - **Live Metrics:**
    - Current active users
    - Current online partners
    - Reservations in progress
    - Server response times
  - **Event Filtering:**
    - Filter by event type
    - Filter by user/partner
    - Search by keyword
  - **Real-Time Alerts:**
    - Spike in cancellations
    - Unusual activity patterns
    - System errors
- **Technology:** Supabase Realtime subscriptions
- **Permissions:** ADMIN, OPS_ADMIN

### 14. System Health Monitor ❌ NOT IMPLEMENTED
- **Route:** `/admin/health`
- **Current State:** Redirects to Dashboard Home
- **Required Features:**
  - **Server Health:**
    - API response times
    - Error rate
    - Request volume
    - Database query performance
  - **Database Metrics:**
    - Connection pool status
    - Slow queries
    - Table sizes
    - Index usage
  - **External Services:**
    - Supabase status
    - Firebase FCM status
    - Vercel deployment status
    - Error tracking (Sentry)
  - **Performance Metrics:**
    - Average page load time
    - API endpoint latency
    - Database query time
  - **Alerts & Incidents:**
    - Active incidents
    - Incident history
    - Uptime percentage
- **Integrations:** Vercel Analytics, Supabase Monitoring
- **Permissions:** ADMIN, SUPER_ADMIN

---

## ⚙️ PHASE 4: SYSTEM CONFIGURATION (2/15)

### 15. Settings Module ❌ NOT IMPLEMENTED
- **Route:** `/admin/settings`
- **Current State:** Redirects to Dashboard Home
- **Required Features:**
  - **App-Wide Settings:**
    - App name & branding
    - Default pickup window (1 hour)
    - Commission rate (15%)
    - Points exchange rate
    - Referral rewards
  - **City Management:**
    - Add/edit/delete cities
    - Enable/disable cities
    - Set geo-boundaries
  - **Category Management:**
    - Add/edit/delete offer categories
    - Category icons
    - Display order
  - **Feature Flags:**
    - Enable/disable features
    - A/B testing toggles
    - Maintenance mode
  - **Email Settings:**
    - SMTP configuration
    - Email templates
    - Sender addresses
  - **Payment Settings:**
    - Payout schedule
    - Minimum payout amount
    - Bank account details
- **Database Tables Needed:**
  - `app_settings` (key, value, type, updated_by, updated_at)
  - `cities` (id, name, country, enabled, geo_bounds)
  - `categories` (id, name, icon, display_order, enabled)
- **Permissions:** SUPER_ADMIN only

### 16. Audit Log ❌ NOT IMPLEMENTED
- **Route:** `/admin/audit`
- **Current State:** Redirects to Dashboard Home
- **Required Features:**
  - **Action Logging:**
    - All admin actions (ban, approve, delete, edit)
    - Who performed action
    - When it happened
    - What changed (before/after)
    - IP address & device
  - **Event Types:**
    - User management actions
    - Partner approvals
    - Offer deletions
    - Settings changes
    - Permission changes
    - Login/logout events
  - **Audit Search:**
    - Filter by admin user
    - Filter by action type
    - Filter by date range
    - Search by entity (user/partner/offer ID)
  - **Compliance:**
    - Export audit logs
    - Immutable records
    - Retention policy
- **Database Tables Needed:**
  - `audit_log` (id, admin_id, action, entity_type, entity_id, changes_json, ip_address, user_agent, timestamp)
- **Permissions:** SUPER_ADMIN only

---

## 🐛 CRITICAL BUGS TO FIX IMMEDIATELY

### BUG 1: Reservation Monitoring Status Filter 🔴
- **File:** `src/pages/admin/ReservationMonitoring.tsx:76`
- **Issue:** Status filter set to lowercase `'active'` but database uses uppercase `'ACTIVE'`
- **Fix:** Change `status: 'active'` to `status: 'ACTIVE'`
- **Impact:** Reservations tab shows empty because query returns no results

### BUG 2: Offers Tab Empty 🔴
- **File:** `src/pages/admin/OfferManagement.tsx` or `src/hooks/admin/useOffers.ts`
- **Issue:** Need to investigate - likely query issue
- **Action:** Check default filters and ensure queries match schema

### BUG 3: View Details Button Not Working 🟡
- **Files:** All management pages (Users, Partners, Offers, Reservations)
- **Issue:** "View Details" dropdown action likely missing navigation or dialog logic
- **Action:** Implement detail view dialog or navigate to detail page

---

## 📊 DATABASE SCHEMA ADDITIONS REQUIRED

### New Tables for Missing Modules:

```sql
-- Fraud Prevention
CREATE TABLE fraud_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type VARCHAR(50) NOT NULL, -- 'user' | 'partner' | 'reservation'
  entity_id UUID NOT NULL,
  flag_type VARCHAR(100) NOT NULL, -- 'multiple_no_shows' | 'suspicious_activity'
  reason TEXT NOT NULL,
  evidence JSONB,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'reviewed' | 'dismissed'
  severity VARCHAR(20) DEFAULT 'medium', -- 'low' | 'medium' | 'high' | 'critical'
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Moderation Queue
CREATE TABLE moderation_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_type VARCHAR(50) NOT NULL, -- 'offer' | 'partner' | 'user_content'
  content_id UUID NOT NULL,
  reason TEXT NOT NULL,
  reporter_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  assigned_to UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Moderation Log
CREATE TABLE moderation_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  reason TEXT,
  admin_id UUID REFERENCES users(id),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Campaigns
CREATE TABLE notification_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  image_url TEXT,
  target_audience JSONB, -- {type: 'all' | 'segment', filters: {...}}
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_count INT DEFAULT 0,
  opened_count INT DEFAULT 0,
  clicked_count INT DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Logs
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES notification_campaigns(id),
  user_id UUID REFERENCES users(id),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ
);

-- Admin Messages
CREATE TABLE admin_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_admin_id UUID REFERENCES users(id),
  to_user_id UUID REFERENCES users(id),
  to_partner_id UUID REFERENCES partners(id),
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partner Payouts
CREATE TABLE partner_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID REFERENCES partners(id),
  amount NUMERIC(10, 2) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'processing' | 'paid' | 'failed'
  paid_at TIMESTAMPTZ,
  payment_method VARCHAR(50),
  transaction_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Refunds
CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id UUID REFERENCES reservations(id),
  amount NUMERIC(10, 2) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected' | 'completed'
  processed_by UUID REFERENCES users(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- App Settings
CREATE TABLE app_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'string', -- 'string' | 'number' | 'boolean' | 'json'
  description TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  changes JSONB, -- {before: {...}, after: {...}}
  ip_address VARCHAR(45),
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🚀 IMPLEMENTATION PRIORITY

### IMMEDIATE (Next 2 Hours):
1. ✅ Fix Bug 1: Reservation status filter
2. ✅ Fix Bug 2: Offers tab query
3. ✅ Fix Bug 3: View Details actions
4. ✅ Test all 6 existing modules work correctly

### HIGH PRIORITY (Next 8 Hours):
5. ⚠️ Deploy Support Tickets migration to Supabase
6. 🔨 Build Analytics Module (most requested)
7. 🔨 Build Revenue Module (business critical)
8. 🔨 Build Live Activity Monitor (real-time ops)

### MEDIUM PRIORITY (Next 16 Hours):
9. 🔨 Build Fraud Prevention Module
10. 🔨 Build Moderation Module
11. 🔨 Build Settings Module
12. 🔨 Build Audit Log Module

### LOWER PRIORITY (Next 24 Hours):
13. 🔨 Build Notifications Module
14. 🔨 Build Messages Module
15. 🔨 Build System Health Monitor

---

## 📈 ESTIMATED EFFORT

| Module | Lines of Code | Hours | Status |
|--------|---------------|-------|---------|
| Analytics | ~800 | 6h | ❌ Not Started |
| Revenue | ~600 | 5h | ❌ Not Started |
| Live Activity | ~400 | 3h | ❌ Not Started |
| System Health | ~350 | 3h | ❌ Not Started |
| Fraud Prevention | ~700 | 5h | ❌ Not Started |
| Moderation | ~650 | 5h | ❌ Not Started |
| Notifications | ~750 | 6h | ❌ Not Started |
| Messages | ~500 | 4h | ❌ Not Started |
| Settings | ~600 | 5h | ❌ Not Started |
| Audit Log | ~450 | 4h | ❌ Not Started |
| **TOTAL** | **~5,800** | **46h** | **0/10 Complete** |

**Bug Fixes:** ~2 hours  
**Database Migrations:** ~2 hours  
**Testing & Integration:** ~8 hours  

**GRAND TOTAL:** ~58 hours of development work

---

## ✅ SUCCESS CRITERIA

Dashboard is considered complete when:
- [ ] All 16 modules are live and functional
- [ ] All routes navigate to correct pages
- [ ] All bugs fixed and data displays correctly
- [ ] All database migrations deployed
- [ ] All permissions working correctly
- [ ] Real-time features (Live Activity, countdown timers) working
- [ ] All CRUD operations functional
- [ ] Responsive design on desktop/tablet
- [ ] Production deployment successful
- [ ] User acceptance testing passed

---

**Created:** February 3, 2026  
**Last Updated:** February 3, 2026  
**Owner:** GitHub Copilot  
**Project:** SmartPick Admin Dashboard V2
