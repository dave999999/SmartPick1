# SmartPick Admin Dashboard - Implementation Plan

**Created:** February 3, 2026
**Architecture Reference:** [ADMIN_DASHBOARD_ARCHITECTURE.md](./ADMIN_DASHBOARD_ARCHITECTURE.md)

---

## 🎯 Implementation Strategy

### Approach: **Progressive Enhancement**
- Start with MVP features (4 weeks)
- Build horizontally (all modules at basic level) before vertically (advanced features)
- Test each module before moving to next
- Deploy incrementally (not big bang)

### Technical Stack
- **Framework:** React 18 + TypeScript
- **UI:** shadcn/ui components + Tailwind CSS
- **State:** Zustand stores + React Query for server state
- **Routing:** React Router v6
- **Forms:** React Hook Form + Zod validation
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Build:** Vite

---

## 📦 Component Structure

```
src/
├── pages/
│   └── admin/
│       ├── AdminDashboard.tsx          # Main layout & routing
│       ├── DashboardHome.tsx           # Overview page
│       ├── UserManagement.tsx          # User list & detail
│       ├── PartnerManagement.tsx       # Partner list & detail
│       ├── OfferManagement.tsx         # Offer list & detail
│       ├── ReservationMonitoring.tsx   # Reservation feed
│       ├── SupportTickets.tsx          # Ticket management ★NEW★
│       ├── AnalyticsDashboard.tsx      # Analytics & reports
│       └── SystemSettings.tsx          # Configuration
│
├── components/
│   └── admin/
│       ├── layout/
│       │   ├── AdminSidebar.tsx        # Navigation sidebar
│       │   ├── AdminHeader.tsx         # Top header with profile
│       │   └── AdminLayout.tsx         # Wrapper with sidebar+header
│       │
│       ├── dashboard/
│       │   ├── KPICard.tsx             # Reusable KPI widget
│       │   ├── ActivityFeed.tsx        # Real-time events
│       │   ├── QuickStats.tsx          # Mini stats row
│       │   └── LiveChart.tsx           # Line/bar charts
│       │
│       ├── users/
│       │   ├── UserTable.tsx           # User list table
│       │   ├── UserDetailCard.tsx      # User profile view
│       │   ├── BanUserDialog.tsx       # Ban confirmation modal
│       │   ├── AddPointsDialog.tsx     # Add/remove points
│       │   └── UserRiskBadge.tsx       # Risk indicator
│       │
│       ├── partners/
│       │   ├── PartnerTable.tsx        # Partner list table
│       │   ├── PartnerDetailCard.tsx   # Partner profile
│       │   ├── ApprovalDialog.tsx      # Approve/reject partner
│       │   ├── TrustScoreChart.tsx     # Trust score visualization
│       │   └── PartnerStatusBadge.tsx  # Status indicator
│       │
│       ├── offers/
│       │   ├── OfferTable.tsx          # Offer list with countdown
│       │   ├── OfferDetailCard.tsx     # Offer details
│       │   ├── FlagOfferDialog.tsx     # Flag for review
│       │   └── OfferStatusBadge.tsx    # Status indicator
│       │
│       ├── reservations/
│       │   ├── ReservationFeed.tsx     # Real-time list
│       │   ├── ReservationCard.tsx     # Single reservation view
│       │   ├── ExtendTimeDialog.tsx    # Extend pickup window
│       │   └── CountdownTimer.tsx      # Expiry countdown
│       │
│       ├── support/
│       │   ├── TicketTable.tsx         # Support ticket list ★NEW★
│       │   ├── TicketDetail.tsx        # Ticket conversation ★NEW★
│       │   ├── AssignTicketDialog.tsx  # Assign to agent ★NEW★
│       │   ├── SLAIndicator.tsx        # SLA color badge ★NEW★
│       │   └── TicketFilters.tsx       # Filter toolbar ★NEW★
│       │
│       ├── analytics/
│       │   ├── MetricCard.tsx          # Single metric display
│       │   ├── RevenueChart.tsx        # Revenue over time
│       │   ├── UserGrowthChart.tsx     # User signups
│       │   └── GeoTable.tsx            # City performance
│       │
│       └── shared/
│           ├── SearchBar.tsx           # Global search (Cmd+K)
│           ├── DateRangePicker.tsx     # Date filter
│           ├── StatusBadge.tsx         # Generic status badge
│           ├── ActionMenu.tsx          # Dropdown actions
│           ├── ConfirmDialog.tsx       # Generic confirmation
│           └── EmptyState.tsx          # No data placeholder
│
├── hooks/
│   └── admin/
│       ├── useAdminAuth.ts             # Admin authentication
│       ├── useUsers.ts                 # User data fetching
│       ├── usePartners.ts              # Partner data fetching
│       ├── useOffers.ts                # Offer data fetching
│       ├── useReservations.ts          # Reservation data
│       ├── useTickets.ts               # Support tickets ★NEW★
│       ├── useAnalytics.ts             # Analytics data
│       └── useAuditLog.ts              # Audit trail
│
├── stores/
│   └── adminStore.ts                   # Admin global state
│
└── lib/
    ├── admin/
    │   ├── permissions.ts              # Role-based access control
    │   ├── trust-score.ts              # Trust score calculations
    │   └── sla-calculator.ts           # SLA tracking ★NEW★
    │
    └── supabase/
        └── admin-queries.ts            # Supabase queries for admin
```

---

## 🚀 Implementation Phases

### **Phase 1: Foundation** (Week 1 - Days 1-7)

#### Day 1: Project Setup
- [x] Review architecture document
- [ ] Create implementation plan
- [ ] Setup directory structure
- [ ] Configure admin routing

**Files to Create:**
- `src/pages/admin/AdminDashboard.tsx` (main layout)
- `src/components/admin/layout/AdminLayout.tsx`
- `src/components/admin/layout/AdminSidebar.tsx`
- `src/components/admin/layout/AdminHeader.tsx`

**Tasks:**
1. Create admin route protection (require admin role)
2. Build sidebar with 7 groups from architecture
3. Build header with profile menu & search icon
4. Setup routing for all pages

---

#### Day 2-3: Authentication & Permissions
**Files to Create:**
- `src/hooks/admin/useAdminAuth.ts`
- `src/lib/admin/permissions.ts`
- `src/stores/adminStore.ts`

**Tasks:**
1. Create admin authentication hook
2. Implement role-based permission system (5 roles)
3. Add permission guards to routes
4. Add permission checks to UI elements
5. Test with different role levels

**Permission Matrix Implementation:**
```typescript
// permissions.ts
export const PERMISSIONS = {
  // Users
  'users:view': ['support_agent', 'ops_admin', 'finance', 'super_admin'],
  'users:edit': ['ops_admin', 'super_admin'],
  'users:ban': ['ops_admin', 'super_admin'],
  'users:delete': ['super_admin'],
  
  // Partners
  'partners:view': ['support_agent', 'ops_admin', 'finance', 'super_admin'],
  'partners:approve': ['ops_admin', 'super_admin'],
  'partners:block': ['ops_admin', 'super_admin'],
  
  // Support
  'tickets:view': ['support_agent', 'ops_admin', 'super_admin'],
  'tickets:assign': ['support_agent', 'ops_admin', 'super_admin'],
  'tickets:resolve': ['support_agent', 'ops_admin', 'super_admin'],
  
  // Finance
  'analytics:view': ['finance', 'super_admin'],
  'revenue:view': ['finance', 'super_admin'],
  'revenue:export': ['finance', 'super_admin'],
  
  // System
  'settings:view': ['ops_admin', 'super_admin'],
  'settings:edit': ['super_admin'],
  'audit:view': ['finance', 'super_admin'],
};

export function hasPermission(role: string, permission: string): boolean {
  return PERMISSIONS[permission]?.includes(role) ?? false;
}
```

---

#### Day 4-5: Dashboard Home
**Files to Create:**
- `src/pages/admin/DashboardHome.tsx`
- `src/components/admin/dashboard/KPICard.tsx`
- `src/components/admin/dashboard/ActivityFeed.tsx`
- `src/components/admin/dashboard/QuickStats.tsx`
- `src/hooks/admin/useAnalytics.ts`

**Tasks:**
1. Create 4 main KPI cards (GMV, Revenue, Active Users, Pickup Rate)
2. Build real-time activity feed (WebSocket)
3. Add quick stats row (new users today, active partners, pending tickets)
4. Add 2 charts (revenue 7 days, user signups 30 days)
5. Style with consistent spacing and colors

**KPI Card Example:**
```typescript
interface KPICardProps {
  title: string;
  value: string | number;
  change?: number; // percentage change
  trend?: 'up' | 'down';
  icon?: React.ReactNode;
  loading?: boolean;
}
```

---

#### Day 6-7: Global Search
**Files to Create:**
- `src/components/admin/shared/SearchBar.tsx`
- `src/hooks/admin/useGlobalSearch.ts`

**Tasks:**
1. Create global search modal (Cmd+K trigger)
2. Search across: users, partners, offers, tickets
3. Group results by entity type
4. Keyboard navigation (arrow keys, enter to navigate)
5. Show recent searches
6. Debounce search input (300ms)

---

### **Phase 2: User Management** (Week 2 - Days 8-14)

#### Day 8-9: User List View
**Files to Create:**
- `src/pages/admin/UserManagement.tsx`
- `src/components/admin/users/UserTable.tsx`
- `src/components/admin/users/UserRiskBadge.tsx`
- `src/hooks/admin/useUsers.ts`

**Tasks:**
1. Create user list table with filters (status, role, search)
2. Add pagination (50 users per page)
3. Add sorting (by name, email, created_at, penalty_count)
4. Add bulk actions (ban, export)
5. Show risk indicators (high no-show rate = red badge)
6. Add row actions (view, edit, ban)

**Table Columns:**
- Avatar + Name
- Email
- Role
- Status (Active/Banned badge)
- Points Balance
- Reservations Count
- No-Show Rate (with color coding)
- Last Active
- Actions

---

#### Day 10-11: User Detail View
**Files to Create:**
- `src/components/admin/users/UserDetailCard.tsx`
- `src/components/admin/users/BanUserDialog.tsx`
- `src/components/admin/users/AddPointsDialog.tsx`

**Tasks:**
1. Create user profile card (avatar, info, stats)
2. Show penalty history timeline
3. Show reservation history table (last 20)
4. Show point transaction history
5. Add action buttons (ban, add points, edit)
6. Implement ban dialog with reason + duration
7. Implement add/remove points dialog

---

#### Day 12-14: User Actions & Testing
**Tasks:**
1. Implement ban user functionality (with webhook to penalties table)
2. Implement unban user functionality
3. Implement add/remove points (with transaction log)
4. Implement edit user details (name, email, phone)
5. Test all permission levels
6. Test edge cases (ban already banned user, negative points)
7. Add audit logging for all actions

---

### **Phase 3: Partner Management** (Week 3 - Days 15-21)

#### Day 15-16: Partner List View
**Files to Create:**
- `src/pages/admin/PartnerManagement.tsx`
- `src/components/admin/partners/PartnerTable.tsx`
- `src/components/admin/partners/PartnerStatusBadge.tsx`
- `src/hooks/admin/usePartners.ts`

**Tasks:**
1. Create partner table with filters (status, city, business type)
2. Add pending applications tab (requires approval)
3. Add trust score column with color coding
4. Add performance metrics (total offers, pickup rate)
5. Add bulk approve/reject actions

**Table Columns:**
- Business Name + Logo
- City
- Business Type (category badge)
- Status (Pending/Approved/Blocked)
- Trust Score (0-100 with color)
- Total Offers
- Pickup Rate %
- Joined Date
- Actions

---

#### Day 17-18: Partner Detail View
**Files to Create:**
- `src/components/admin/partners/PartnerDetailCard.tsx`
- `src/components/admin/partners/ApprovalDialog.tsx`
- `src/components/admin/partners/TrustScoreChart.tsx`

**Tasks:**
1. Create partner profile (business info, contact, location)
2. Show trust score history chart (last 30 days)
3. Show offer statistics (total, active, expired)
4. Show revenue breakdown (GMV, commissions earned)
5. Show partner images gallery
6. Add approval workflow (approve/reject with reason)

---

#### Day 19-21: Partner Actions & Testing
**Tasks:**
1. Implement approve partner (send welcome email)
2. Implement reject partner (send rejection email with reason)
3. Implement block/unblock partner
4. Implement commission override (Super Admin only)
5. Implement trust score manual adjustment
6. Test approval workflow end-to-end
7. Add audit logging

---

### **Phase 4: Offer & Reservation Management** (Week 4 - Days 22-28)

#### Day 22-23: Offer Management
**Files to Create:**
- `src/pages/admin/OfferManagement.tsx`
- `src/components/admin/offers/OfferTable.tsx`
- `src/components/admin/offers/FlagOfferDialog.tsx`
- `src/hooks/admin/useOffers.ts`

**Tasks:**
1. Create offer table with real-time countdown timers
2. Add filters (status, category, partner, flagged, expiring soon)
3. Add flag offer functionality (with reason)
4. Add pause/unpause offer functionality
5. Add delete offer (emergency, with refunds)
6. Show reservation count per offer

---

#### Day 24-25: Reservation Monitoring
**Files to Create:**
- `src/pages/admin/ReservationMonitoring.tsx`
- `src/components/admin/reservations/ReservationFeed.tsx`
- `src/components/admin/reservations/ExtendTimeDialog.tsx`
- `src/components/admin/reservations/CountdownTimer.tsx`
- `src/hooks/admin/useReservations.ts`

**Tasks:**
1. Create real-time reservation feed (WebSocket)
2. Add countdown timers (color-coded: green >30min, orange 10-30min, red <10min)
3. Add extend time dialog (add 15/30/60 minutes)
4. Add force complete functionality
5. Add cancel reservation with refund option
6. Add filters (status, partner, expiring soon)

---

#### Day 26-28: Testing & Polish
**Tasks:**
1. Test all offer/reservation workflows
2. Test real-time updates (WebSocket connection)
3. Optimize performance (pagination, lazy loading)
4. Add skeleton loaders for all tables
5. Add error handling and retry logic
6. Add audit logging for all actions

---

### **Phase 5: Support Tickets System** ★NEW★ (Week 5 - Days 29-35)

#### Day 29-30: Database Setup
**SQL Migrations:**
```sql
-- Already exists: contact_submissions table
-- Add new columns:
ALTER TABLE contact_submissions
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS internal_notes TEXT,
ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ;

-- Create ticket_messages table for conversation
CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES contact_submissions(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id),
  sender_type VARCHAR(20), -- 'user' or 'admin'
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  attachments JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX idx_contact_submissions_sla ON contact_submissions(sla_due_at);
```

---

#### Day 31-32: Ticket List View
**Files to Create:**
- `src/pages/admin/SupportTickets.tsx`
- `src/components/admin/support/TicketTable.tsx`
- `src/components/admin/support/TicketFilters.tsx`
- `src/components/admin/support/SLAIndicator.tsx`
- `src/hooks/admin/useTickets.ts`
- `src/lib/admin/sla-calculator.ts`

**Tasks:**
1. Create ticket table with SLA indicators
2. Add smart views (unassigned, my tickets, SLA at risk, resolved today)
3. Add filters (status, priority, topic, assigned to)
4. Calculate SLA time remaining (color-coded badges)
5. Add bulk assign functionality
6. Show ticket age (e.g., "2h ago", "3 days ago")

**Table Columns:**
- Ticket ID (e.g., SP4523)
- Subject (topic + first 50 chars of message)
- Status (Pending/In Progress/Resolved)
- Priority (color-coded badge)
- SLA Indicator (green/yellow/red with time remaining)
- Assigned To (avatar + name or "Unassigned")
- Created (relative time)
- Actions

---

#### Day 33-34: Ticket Detail View
**Files to Create:**
- `src/components/admin/support/TicketDetail.tsx`
- `src/components/admin/support/AssignTicketDialog.tsx`

**Tasks:**
1. Create ticket detail page with conversation thread
2. Show user info sidebar (name, email, phone, reservation history)
3. Show related data (if ticket about reservation, show reservation details)
4. Add reply box (internal notes vs public reply)
5. Add file attachment support
6. Add assign ticket dialog (list of support agents)
7. Add status change dropdown (Pending → In Progress → Resolved)
8. Add auto-refresh (every 30 seconds for new messages)

---

#### Day 35: SLA & Automation
**Files to Create:**
- `src/lib/admin/ticket-automation.ts`

**Tasks:**
1. Calculate SLA due time on ticket creation
   - Urgent: 30 min
   - High: 2 hours
   - Medium: 8 hours
   - Low: 24 hours
2. Auto-escalate if SLA at risk (<10% time remaining)
3. Add Slack webhook for urgent tickets
4. Add email notification when ticket assigned
5. Add auto-close tickets resolved >7 days ago

---

### **Phase 6: Analytics Dashboard** (Week 6 - Days 36-42)

#### Day 36-37: Core Metrics
**Files to Create:**
- `src/pages/admin/AnalyticsDashboard.tsx`
- `src/components/admin/analytics/MetricCard.tsx`
- `src/components/admin/analytics/RevenueChart.tsx`

**Tasks:**
1. Create analytics layout with tabs (Overview, Users, Partners, Revenue)
2. Build GMV chart (7 days, 30 days, 90 days)
3. Build revenue breakdown (points purchased, commissions, refunds)
4. Build user acquisition funnel (visitors → signups → first reservation → retained)
5. Add date range picker (today, 7d, 30d, 90d, custom)

---

#### Day 38-39: Geo & Behavioral Analytics
**Files to Create:**
- `src/components/admin/analytics/GeoTable.tsx`
- `src/components/admin/analytics/UserGrowthChart.tsx`

**Tasks:**
1. Create geo analytics table (city breakdown)
2. Show user distribution by city
3. Show partner distribution by city
4. Show GMV by city
5. Create user growth chart (daily/weekly/monthly signups)
6. Create behavioral analytics (peak hours, favorite categories)

---

#### Day 40-42: Export & Reports
**Tasks:**
1. Implement CSV export for all tables
2. Implement PDF report generation (weekly summary)
3. Add scheduled reports (email to stakeholders every Monday)
4. Test with large datasets (10K+ users)
5. Optimize queries (use database views for aggregations)
6. Add caching (5-minute cache for analytics data)

---

### **Phase 7: System Settings** (Week 7 - Days 43-49)

#### Day 43-44: Settings UI
**Files to Create:**
- `src/pages/admin/SystemSettings.tsx`
- `src/components/admin/settings/SettingCard.tsx`

**Tasks:**
1. Create settings page with tabs (General, Pricing, Reservations, Penalties, Features)
2. Build editable setting cards
3. Add validation for each setting type
4. Add confirmation dialog for critical changes
5. Show current vs new value preview

---

#### Day 45-46: Settings Implementation
**Tasks:**
1. Implement general settings (app name, contact email, support phone)
2. Implement pricing settings (point packages, discounts)
3. Implement reservation settings (pickup window, max slots)
4. Implement penalty settings (offense durations, point lift costs)
5. Implement feature flags (enable/disable referrals, achievements)

---

#### Day 47-49: Audit Log & Testing
**Files to Create:**
- `src/hooks/admin/useAuditLog.ts`

**Tasks:**
1. Build audit log viewer (filterable by actor, event type, date)
2. Log all setting changes (who, what, when, why, IP)
3. Test all settings end-to-end
4. Test permission restrictions (only Super Admin can edit)
5. Add rollback functionality (revert to previous value)

---

### **Phase 8: Polish & Launch** (Week 8 - Days 50-56)

#### Day 50-51: Error Handling
**Tasks:**
1. Add error boundaries to all pages
2. Implement retry logic for failed API calls
3. Add toast notifications for success/error states
4. Add offline detection (show banner when no connection)
5. Add fallback UI for failed data loads

---

#### Day 52-53: Performance Optimization
**Tasks:**
1. Implement pagination for all tables (50 items per page)
2. Add virtualization for long lists (react-window)
3. Optimize images (lazy loading, compression)
4. Add React Query caching (5-minute default)
5. Measure and optimize bundle size (code splitting)

---

#### Day 54-55: Mobile Responsive
**Tasks:**
1. Test all pages on mobile devices
2. Make tables horizontally scrollable on mobile
3. Adjust sidebar to collapse on mobile
4. Test all dialogs/modals on small screens
5. Ensure touch targets are 44x44px minimum

---

#### Day 56: Documentation & Handoff
**Tasks:**
1. Create admin user guide (how to use each feature)
2. Document all keyboard shortcuts
3. Create troubleshooting guide (common issues)
4. Record demo video (15-minute walkthrough)
5. Conduct training session with operations team

---

## 🧪 Testing Strategy

### Unit Tests
- All utility functions (trust score, SLA calculator, permissions)
- All hooks (useUsers, usePartners, etc.)
- All form validations

### Integration Tests
- User ban flow (ban → email sent → audit logged)
- Partner approval flow (approve → welcome email → status updated)
- Ticket assignment flow (assign → notification sent → SLA updated)

### E2E Tests (Playwright)
- Admin login → view dashboard → navigate to users → ban user
- Admin login → view partners → approve partner → send email
- Admin login → view tickets → assign ticket → reply → resolve

### Performance Tests
- Load 10,000 users in table (measure render time)
- Real-time feed with 100 simultaneous reservations
- Analytics dashboard with 1 year of data

---

## 📊 Success Metrics

### Week 4 (MVP Launch)
- ✅ Operations team can approve 20+ partners/day
- ✅ Support team can resolve 50+ tickets/day
- ✅ 100% of daily operations done via admin panel (no SQL queries)
- ✅ All admin actions logged to audit trail

### Week 8 (Full Launch)
- ✅ Average ticket resolution time <4 hours
- ✅ Partner approval time <24 hours
- ✅ Admin panel load time <2 seconds
- ✅ 95%+ admin satisfaction score

---

## 🚨 Risk Mitigation

### Technical Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Real-time feed performance issues | High | Medium | Use pagination, limit to 100 items, add caching |
| Database query timeouts | High | Low | Add indexes, use read replicas, optimize queries |
| WebSocket connection drops | Medium | Medium | Auto-reconnect, show connection status, fallback to polling |

### Business Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Admins ban wrong users | High | Low | Confirmation dialog, 5-min undo window, audit trail |
| Settings misconfiguration | High | Low | Preview changes, require reason, rollback feature |
| Support ticket backlog | Medium | Medium | SLA alerts, auto-escalation, workload balancing |

---

## 📅 Timeline Summary

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Foundation | Week 1 | Admin layout, routing, auth, dashboard home |
| User Management | Week 2 | User list, detail, ban, points, testing |
| Partner Management | Week 3 | Partner list, detail, approval, testing |
| Offer & Reservations | Week 4 | Offer table, reservation feed, real-time updates |
| **MVP LAUNCH** | **End Week 4** | **Core admin operations functional** |
| Support Tickets | Week 5 | Ticket list, detail, SLA, assignment |
| Analytics | Week 6 | Dashboards, charts, geo analytics, exports |
| System Settings | Week 7 | Settings UI, audit log, feature flags |
| Polish & Launch | Week 8 | Error handling, performance, mobile, docs |
| **FULL LAUNCH** | **End Week 8** | **Complete admin dashboard live** |

---

## 🛠️ Development Guidelines

### Code Standards
- TypeScript strict mode enabled
- ESLint + Prettier configured
- 80%+ test coverage for business logic
- All components documented with JSDoc
- All API calls wrapped in try-catch
- All user actions logged to audit trail

### Component Patterns
```typescript
// Standard component structure
interface ComponentProps {
  // Props interface
}

export function Component({ prop1, prop2 }: ComponentProps) {
  // 1. Hooks
  const [state, setState] = useState();
  const { data } = useQuery();
  
  // 2. Event handlers
  const handleAction = () => {};
  
  // 3. Effects
  useEffect(() => {}, []);
  
  // 4. Early returns
  if (loading) return <Skeleton />;
  if (error) return <ErrorState />;
  if (!data) return <EmptyState />;
  
  // 5. Render
  return <div>...</div>;
}
```

### Git Workflow
- Feature branches: `admin/feature-name`
- Commit messages: `feat(admin): Add user ban functionality`
- PR reviews: Minimum 1 approval required
- Merge to `main`: Deploy to staging automatically
- Deploy to production: Manual approval

---

## 📞 Support & Resources

### Technical Questions
- Architecture Reference: `ADMIN_DASHBOARD_ARCHITECTURE.md`
- Supabase Docs: https://supabase.com/docs
- shadcn/ui Components: https://ui.shadcn.com

### Team Communication
- Daily standup: 10 AM (15 minutes)
- Weekly demo: Friday 4 PM (show progress to stakeholders)
- Slack channel: #admin-dashboard-dev

---

**Document Status:** ✅ COMPLETE
**Ready to Start:** Phase 1, Day 1 - Project Setup
**Next Step:** Create admin layout and routing structure
