# SmartPick Admin Dashboard - Production Architecture
## Implementation-Ready Specification | February 2026

---

## 1️⃣ SYSTEM OVERVIEW

### What This Admin Dashboard Solves

**SmartPick is a time-sensitive marketplace** where:
- Partners post discounted food/products that must be picked up within 60-90 minutes
- Users reserve with SmartPoints (virtual currency)
- No-shows hurt both platform and partners
- Abuse (fake reservations, point fraud, partner spam) kills the marketplace
- Real money flows through point purchases and partner commissions

**Critical Problems This Dashboard Must Solve:**

1. **Trust Crisis Management**
   - Detect and ban abusive users before they damage partner trust
   - Identify fraudulent partners gaming the system
   - Monitor referral fraud (fake accounts for points)
   - Track repeat no-show offenders

2. **Operational Efficiency**
   - Process 20+ partner applications daily
   - Resolve 50+ support tickets daily
   - Monitor 500+ active reservations in real-time
   - Handle disputes with evidence trails

3. **Revenue Protection**
   - Prevent point purchase chargebacks
   - Track partner commission payments
   - Monitor refund abuse patterns
   - Detect payment fraud

4. **Growth Acceleration**
   - Identify top-performing partners for partnerships
   - Analyze offer performance to guide partners
   - Track user acquisition costs vs lifetime value
   - Measure geographic expansion opportunities

### Who Uses This Dashboard Daily

**Super Admin** (1-2 people, founders/CTO)
- Full system access, financial controls
- Can ban/unban anyone, override everything
- Sees sensitive data (revenue, commissions, fraud scores)
- Makes strategic decisions based on analytics

**Operations Admin** (2-4 people, daily ops team)
- Approves/rejects partner applications
- Monitors reservation health
- Handles escalated support tickets
- Reviews flagged offers for policy violations

**Support Agent** (3-6 people, customer-facing)
- Resolves user complaints
- Processes refund requests
- Assists with reservation issues
- Cannot ban users or access financials

**Finance/Analytics** (1-2 people, business intelligence)
- Readonly access to all data
- Generates reports for management
- Tracks KPIs and growth metrics
- No operational controls

**Partner Admin** (External, partners themselves)
- Limited view: only their own data
- Cannot see other partners or system-wide stats
- Can request forgiveness for customer no-shows
- Can dispute reservations

### Why Real-Time Data Matters

1. **Reservation Window is 60-90 Minutes**
   - After 90 minutes, reservation auto-expires
   - Partners need immediate visibility on pickups
   - Late intervention (>30 min) is useless

2. **Fraud Detection Must Be Instant**
   - Referral abuse must be caught before points are claimed
   - Multiple accounts from same device = instant flag
   - Unusual patterns (10 reservations in 5 minutes) = auto-suspend

3. **Partner Trust Erodes in Hours**
   - 3 no-shows in one day = partner considers leaving
   - Real-time monitoring prevents partner churn
   - Immediate dispute resolution critical

4. **Support SLA is 2 Hours**
   - 80% of tickets must be answered within 2 hours
   - Real-time queue visibility required
   - Auto-escalation for critical issues

### Why Abuse Prevention is Critical

**Without it, the marketplace collapses:**

**User Abuse Patterns:**
- Creating multiple accounts for referral bonuses (50 pts × 10 accounts = 500 pts = $25 equivalent)
- Reserving items with no intent to pickup (blocking legitimate customers)
- Requesting forgiveness repeatedly (exploiting partner empathy)
- Chargebacks after consuming points
- Coordinated attacks (groups booking out competitors)

**Partner Abuse Patterns:**
- Posting fake offers to attract customers, then upselling
- Marking no-shows fraudulently to keep points
- Uploading stolen/copyrighted images
- Posting expired products
- Price manipulation (original_price inflated to make discount look better)

**Impact if Undetected:**
- Partners lose trust → leave platform → fewer offers → users leave
- Legitimate users frustrated by no-stock → abandon platform
- Financial loss from fraudulent refunds
- Legal liability from unsafe/expired products

### Why Analytics Ties to Growth

**Data-Driven Decisions Enable Scale:**

1. **Partner Recruitment** - Which business types have 90%+ pickup rates? Double down recruiting those.
2. **Geographic Expansion** - Which neighborhoods have highest demand but fewest partners? Expand there.
3. **Category Strategy** - Which categories have highest profit margins? Incentivize more partners there.
4. **User Retention** - Which cohorts have 60%+ repeat rate? What do they have in common?
5. **Pricing Optimization** - What SmartPoint price maximizes revenue without hurting conversion?

---

## 2️⃣ USER ROLES & PERMISSIONS

### Role: Super Admin

**Access Level:** GOD MODE

**Permissions:**
- ✅ View ALL data (including PII, financials, internal notes)
- ✅ Create/Edit/Delete users, partners, offers, reservations
- ✅ Ban/unban any user or partner instantly
- ✅ Override any automated decision (penalties, restrictions)
- ✅ Access financial reports (revenue, commissions, refunds)
- ✅ Modify system settings (SmartPoint prices, commission rates, pickup windows)
- ✅ Execute database operations (data exports, bulk updates)
- ✅ Grant/revoke admin privileges
- ✅ Delete accounts (GDPR compliance)

**Cannot Do:**
- Cannot be logged out by another admin
- Cannot have actions blocked (no rate limits)

**Safety Restrictions:**
- All actions logged to immutable audit trail (blockchain-style)
- Sensitive actions require 2FA confirmation
- Financial operations require email OTP
- Mass deletions require typed confirmation

**UI Indicators:**
- Red "SUPER ADMIN" badge always visible
- Warning banners on destructive actions
- Confirmation dialogs with typed phrases

---

### Role: Operations Admin

**Access Level:** Operational Control

**Permissions:**
- ✅ View all users, partners, offers, reservations (except internal admin notes)
- ✅ Approve/reject partner applications
- ✅ Flag/unflag offers for policy violations
- ✅ Soft-ban users (temporary suspensions up to 30 days)
- ✅ Resolve support tickets & disputes
- ✅ View basic analytics (counts, percentages, trends)
- ✅ Send broadcast notifications
- ✅ Manually adjust reservation status (mark picked up, cancel)
- ✅ Grant forgiveness to users with penalties
- ✅ View audit logs (for their own actions)

**Cannot Do:**
- ❌ View financial data (revenue, commissions, bank details)
- ❌ Permanently ban users (>30 days or hard delete)
- ❌ Modify system settings or pricing
- ❌ Export sensitive data (PII bulk exports)
- ❌ Access Super Admin panels
- ❌ Grant admin access to others

**Safety Restrictions:**
- Max 100 users can be banned per day (prevents mass bans)
- All bans require reason (dropdown + text)
- Partner rejections require reason
- Actions logged with IP address

**UI Indicators:**
- Blue "OPS ADMIN" badge
- Financial tabs hidden/disabled
- Destructive actions show "supervisor approval required" if exceeding limits

---

### Role: Support Agent

**Access Level:** Customer Service

**Permissions:**
- ✅ View user profiles, reservation history, support tickets
- ✅ View partner profiles (contact info only, no financials)
- ✅ Create support tickets on behalf of users
- ✅ Add internal notes to tickets
- ✅ Mark tickets as resolved
- ✅ Manually refund SmartPoints (up to 500 points per transaction)
- ✅ Send individual messages to users
- ✅ View basic user stats (total reservations, no-show count)
- ✅ Escalate tickets to Operations Admin

**Cannot Do:**
- ❌ Ban or suspend users
- ❌ Approve/reject partners
- ❌ Modify offers or reservations
- ❌ View financial reports
- ❌ Access system settings
- ❌ View other agents' private notes
- ❌ Refund >500 points (requires supervisor)

**Safety Restrictions:**
- Max 5,000 points can be refunded per day per agent
- Large refunds (>100 pts) require supervisor approval
- All refunds logged with reason
- Ticket reassignment tracked

**UI Indicators:**
- Green "SUPPORT" badge
- Disabled controls show tooltip "Requires Operations Admin"
- Refund button shows remaining daily quota

---

### Role: Finance/Analytics

**Access Level:** READ-ONLY DATA

**Permissions:**
- ✅ View all analytics dashboards
- ✅ View financial reports (revenue, costs, margins)
- ✅ View audit logs (all actions by all admins)
- ✅ Export data for analysis (CSV, JSON)
- ✅ Create custom reports and dashboards
- ✅ View user/partner counts and aggregate stats

**Cannot Do:**
- ❌ Modify any data (users, partners, offers, reservations)
- ❌ Ban or suspend anyone
- ❌ Resolve support tickets
- ❌ Send notifications
- ❌ Change system settings

**Safety Restrictions:**
- PII in exports is automatically masked (emails → em***@domain, phones → +995***7399)
- Exports limited to 50,000 rows per query (prevents database overload)
- All exports logged with purpose

**UI Indicators:**
- Purple "ANALYTICS" badge
- All action buttons hidden or disabled
- Dashboard shows "(View Only)" in title

---

### Role: Partner Admin (External)

**Access Level:** SELF-SERVICE ONLY

**Permissions:**
- ✅ View own partner profile
- ✅ View own offers (active, expired, draft)
- ✅ View own reservations
- ✅ View own earnings and commission statements
- ✅ Request forgiveness for customer no-shows
- ✅ Dispute reservations (with evidence upload)
- ✅ Respond to admin messages

**Cannot Do:**
- ❌ View other partners' data
- ❌ View system-wide stats
- ❌ View user profiles
- ❌ Create/edit/delete users
- ❌ Access admin tools

**Safety Restrictions:**
- Forgiveness requests limited to 5 per week (prevents abuse)
- Disputes require photo evidence
- Cannot dispute after 48 hours

**UI Indicators:**
- Orange "PARTNER" badge
- Limited navigation (only own data visible)
- System-wide tabs hidden

---

## 3️⃣ NAVIGATION & INFORMATION ARCHITECTURE

### Sidebar Structure (Collapsible)

```
╔═══════════════════════════════════════╗
║ 🏠 OVERVIEW                           ║  ← Landing page
╠═══════════════════════════════════════╣
║ 📊 BUSINESS                           ║
║   ├── 👥 Users                        ║  ← User management
║   │   ├── All Users                   ║
║   │   ├── New Signups (24h badge)    ║
║   │   ├── Banned Users               ║
║   │   └── Suspicious Activity        ║
║   ├── 🏪 Partners                     ║  ← Partner management
║   │   ├── All Partners               ║
║   │   ├── Pending Approval (red!)    ║
║   │   ├── Top Performers             ║
║   │   └── At Risk                    ║
║   ├── 🎯 Offers                       ║  ← Offer monitoring
║   │   ├── Live Offers                ║
║   │   ├── Flagged for Review         ║
║   │   ├── Expiring Soon              ║
║   │   └── Performance Analytics      ║
║   └── 📦 Reservations                ║  ← Reservation control
║       ├── Active (real-time)         ║
║       ├── Expiring (30min countdown) ║
║       ├── Disputes                   ║
║       └── History                    ║
╠═══════════════════════════════════════╣
║ 🛡️ SAFETY & SUPPORT                   ║
║   ├── 🎫 Support Tickets ★NEW★       ║  ← Support queue
║   │   ├── Unassigned (red)          ║
║   │   ├── My Tickets                ║
║   │   ├── Escalated                 ║
║   │   └── Resolved (7 days)         ║
║   ├── 🚨 Fraud Prevention            ║  ← Abuse detection
║   │   ├── Referral Fraud            ║
║   │   ├── Multi-Account Detection   ║
║   │   ├── No-Show Patterns          ║
║   │   └── Payment Fraud             ║
║   ├── ⚖️ Disputes & Moderation      ║  ← Conflict resolution
║   │   ├── Pending Disputes          ║
║   │   ├── Forgiveness Requests      ║
║   │   └── Partner Complaints        ║
║   └── 🔐 User Penalties              ║  ← Ban management
║       ├── Active Penalties          ║
║       ├── Lift Requests             ║
║       └── Penalty History           ║
╠═══════════════════════════════════════╣
║ 💰 FINANCE                            ║
║   ├── 📈 Revenue Dashboard           ║  ← Financial overview
║   ├── 💳 Point Purchases             ║  ← SmartPoint sales
║   ├── 🏦 Partner Payouts             ║  ← Commission tracking
║   ├── 💸 Refunds                     ║  ← Refund management
║   └── 📑 Reports & Exports           ║  ← Financial reports
╠═══════════════════════════════════════╣
║ 📡 MONITORING                         ║
║   ├── 🔴 Live Feed                   ║  ← Real-time events
║   ├── 🏥 System Health               ║  ← Uptime, errors
║   ├── ⚡ Performance Metrics         ║  ← Database, API speed
║   └── 📊 Usage Analytics             ║  ← Traffic, devices
╠═══════════════════════════════════════╣
║ 📣 COMMUNICATION                      ║
║   ├── 📢 Announcements               ║  ← Broadcast messages
║   ├── 🔔 Notifications               ║  ← Push/email queue
║   ├── 📧 Email Templates             ║  ← Template editor
║   └── 📲 SMS Campaigns               ║  ← SMS blast (future)
╠═══════════════════════════════════════╣
║ ⚙️ SYSTEM                             ║
║   ├── 🎛️ Settings                    ║  ← System config
║   ├── 📜 Audit Logs                  ║  ← Admin action history
║   ├── 🔧 Feature Flags               ║  ← A/B testing
║   └── 🗃️ Database Tools              ║  ← Maintenance
╚═══════════════════════════════════════╝
```

### Why Things Are Grouped This Way

**Business (Users/Partners/Offers/Reservations):**
- Core operational entities
- Most accessed daily (80% of admin time)
- Grouped by business object, not by action
- Reduces cognitive load: "Where's user X?" → Users section

**Safety & Support (Tickets/Fraud/Disputes/Penalties):**
- Reactive operations (respond to problems)
- Critical for trust and compliance
- Grouped together because they're related: fraud → dispute → penalty
- Color-coded red/orange for urgency

**Finance (Revenue/Purchases/Payouts/Refunds):**
- Restricted access (not all admins)
- Sensitive data, grouped together
- Separate from operations to enforce permissions

**Monitoring (Live/Health/Performance/Usage):**
- Technical metrics, not business metrics
- Real-time dashboards (no actions taken here)
- For ops team during incidents

**Communication (Announcements/Notifications/Templates/SMS):**
- Outbound messaging tools
- Used for marketing and critical alerts
- Grouped to avoid sending duplicate messages

**System (Settings/Logs/Flags/Database):**
- Administrative functions
- Low-frequency access (weekly, not daily)
- Dangerous operations (settings changes) → bottom of list

---

### Global Search (Cmd+K / Ctrl+K)

**Behavior:**
- Opens modal overlay
- Searches across ALL entities simultaneously
- Shows results grouped by type

**Search Examples:**

```
Input: "john@gmail.com"
Results:
  👤 Users (1)
     John Smith - john@gmail.com (ID: 123abc)
  
  🎫 Support Tickets (2)
     #4523 - Login issue - john@gmail.com
     #4501 - Refund request - john@gmail.com

Input: "SP#4523"
Results:
  🎫 Support Tickets (1)
     #4523 - Login issue - Assigned to Sarah
  
  📦 Reservations (0)

Input: "Vake Bakery"
Results:
  🏪 Partners (1)
     Vake Bakery - Approved - 4.8★ (ID: 789xyz)
  
  🎯 Offers (3)
     Croissant 50% off - Active
     Fresh Bread Bundle - Active  
     Pastry Box - Expired
```

**Features:**
- Fuzzy matching (typos okay)
- Searches: emails, names, IDs, phone numbers, business names, ticket numbers
- Keyboard navigation (↑↓ arrows, Enter to open)
- Recent searches saved (last 5)
- Shows entity status (Active, Banned, Expired, etc.)

---

### Quick Actions (Top Right Header)

**Always Visible Shortcuts:**

```
┌─────────────────────────────────────────────────┐
│ [🔍 Search] [+ New] [🔔 3] [🧑 Admin ▾]         │
└─────────────────────────────────────────────────┘
```

**🔍 Search:** Opens global search (Cmd+K)

**+ New (Dropdown):**
- Create Support Ticket
- Send Announcement
- Add User Manually
- Create Partner Manually
- Separator
- Quick Actions →
  - Ban User (opens modal)
  - Flag Offer
  - Refund Points

**🔔 Notifications (Badge shows count):**
- Dropdown shows last 5 notifications:
  - New partner application
  - Escalated support ticket
  - System alert (error spike)
  - Payment chargeback
  - Fraud alert
- "View All" link at bottom

**🧑 Admin Profile (Dropdown):**
- "Signed in as: sarah@smartpick.ge"
- Role: Operations Admin
- Separator
- View My Activity Log
- Admin Settings
- Dark Mode Toggle
- Separator
- Sign Out

---

### Keyboard Shortcuts

**Global:**
- `Cmd/Ctrl + K` → Global Search
- `Cmd/Ctrl + N` → New Quick Action
- `Cmd/Ctrl + Shift + P` → Command Palette (all actions)
- `Cmd/Ctrl + ,` → Settings
- `Cmd/Ctrl + /` → Show all shortcuts

**Navigation:**
- `1` → Overview
- `2` → Users
- `3` → Partners
- `4` → Offers
- `5` → Reservations
- `6` → Support Tickets
- `7` → Fraud Prevention
- `8` → Finance
- `9` → Live Feed
- `0` → Settings

**Tables (when focused):**
- `↑↓` → Navigate rows
- `Enter` → Open detail
- `Cmd/Ctrl + A` → Select all
- `Delete` → Bulk delete (with confirmation)
- `E` → Edit selected
- `B` → Ban selected user
- `F` → Flag selected offer
- `R` → Refresh data

**Modals:**
- `Esc` → Close modal
- `Cmd/Ctrl + Enter` → Submit form
- `Cmd/Ctrl + S` → Save changes

**Why Keyboard Shortcuts:**
- Speed: Support agents handle 50+ tickets/day → every second matters
- Power users: Ops admins use dashboard 8h/day → shortcuts reduce fatigue
- Accessibility: Screen reader users navigate faster
- Professional feel: Matches tools like Linear, Notion, Superhuman

---

## 4️⃣ DASHBOARD HOME (GLOBAL OVERVIEW)

### Landing Screen After Login

```
╔═════════════════════════════════════════════════════════════════╗
║  SmartPick Admin Control Center     [Search] [+] [🔔3] [Admin▾] ║
╠═════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │ 🚨 ALERTS & CRITICAL ACTIONS                       (3 new)  │ ║
║  ├─────────────────────────────────────────────────────────────┤ ║
║  │ 🔴 12 partner applications waiting (>24h)     [Review Now]  │ ║
║  │ ⚠️  3 dispute escalations (SLA: 4h remaining)  [Resolve]    │ ║
║  │ 💳 2 payment chargebacks ($142 total)         [Investigate] │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                                                                   ║
║  ┌─── KPI CARDS (4 across) ──────────────────────────────────┐  ║
║  │ 📊 Today's Reservations    │ 🏪 Active Partners          │  ║
║  │    342 (+12% vs yesterday) │    87 (2 pending approval)  │  ║
║  │    └─ 89% pickup rate      │    └─ 94% avg satisfaction  │  ║
║  │                             │                             │  ║
║  │ 👥 New Users (24h)         │ 💰 Revenue (Today)          │  ║
║  │    28 (+45% vs last week)  │    ₾2,847 (+8% vs avg)     │  ║
║  │    └─ 18 verified emails   │    └─ ₾127 partner payouts │  ║
║  └───────────────────────────────────────────────────────────┘  ║
║                                                                   ║
║  ┌─── LIVE ACTIVITY FEED (Real-Time) ──────────────────────┐   ║
║  │ 🟢 2m ago  User "Giorgi K." picked up at Vake Bakery     │   ║
║  │ 🔵 3m ago  New reservation: Pizza Factory (3 items)      │   ║
║  │ 🟢 5m ago  Partner "Tbili Coffee" uploaded new offer     │   ║
║  │ 🟠 7m ago  Dispute opened: Reservation #4523             │   ║
║  │ 🔴 9m ago  User "marina_99" missed pickup (2nd offense)  │   ║
║  │ 🔵 11m ago New signup: Nino T. (via referral)           │   ║
║  │ ... [View All Activity] ────────────────────────────────│   ║
║  └─────────────────────────────────────────────────────────┘   ║
║                                                                   ║
║  ┌─── CHARTS (2 across) ─────────────────────────────────────┐  ║
║  │ Reservations (Last 7 Days)   │ User Growth (30 Days)     │  ║
║  │ ▁▃▄█▆▄█ (line chart)        │ ▁▂▃▅▆██ (area chart)     │  ║
║  │ Peak: 412 (Saturday)         │ Total: +847 users         │  ║
║  └───────────────────────────────────────────────────────────┘  ║
║                                                                   ║
║  ┌─── RISK INDICATORS ────────────────────────────────────────┐ ║
║  │ ⚠️  Referral Fraud: 4 suspicious patterns (last 24h)      │ ║
║  │ ⚠️  No-Show Rate: 14% (threshold: 10%) → trending up      │ ║
║  │ ✅ System Health: All services operational                 │ ║
║  │ ✅ Database Performance: 87ms avg query time (good)        │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════╝
```

### KPI Details

**Today's Reservations (342)**
- **Why it exists:** Primary business metric. Low reservations = problem.
- **Updates:** Real-time (WebSocket)
- **Calculation:** `COUNT(*) FROM reservations WHERE created_at >= TODAY`
- **Sub-metric:** Pickup rate (`PICKED_UP / TOTAL * 100`)
- **Alert:** If <200 by 2pm → send alert to ops team
- **Drill-down:** Click to see hourly breakdown

**Active Partners (87)**
- **Why:** Supply-side health. Need 100+ for good selection.
- **Updates:** Every 5 minutes
- **Calculation:** `COUNT(*) FROM partners WHERE status = 'APPROVED'`
- **Sub-metric:** Avg satisfaction (from user ratings)
- **Alert:** If <80 → recruit more partners
- **Drill-down:** Click to see partner list

**New Users (24h) (28)**
- **Why:** Growth tracking. Need 20-30/day for sustainability.
- **Updates:** Every 15 minutes
- **Calculation:** `COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '24 hours'`
- **Sub-metric:** Email verification rate
- **Alert:** If <10 → check marketing campaigns
- **Drill-down:** Click to see new user list with sources

**Revenue (Today) (₾2,847)**
- **Why:** Financial health. Avg ₾2,500/day = profitable.
- **Updates:** Every 30 minutes
- **Calculation:** `SUM(amount) FROM point_purchases WHERE created_at >= TODAY`
- **Sub-metric:** Partner payouts (commission)
- **Alert:** If <₾1,000 by 6pm → investigate
- **Drill-down:** Click to see transaction list

---

### Live Activity Feed

**Why Real-Time:**
- See platform pulse (are people using it?)
- Detect patterns (surge in signups = viral post)
- Catch fraud early (3 reservations from same IP in 1 minute)

**Event Types:**

🟢 **Positive Events (Green):**
- Successful pickup
- New offer published
- Partner approved
- User verified email

🔵 **Neutral Events (Blue):**
- New reservation
- New signup
- Offer updated
- Points purchased

🟠 **Warning Events (Orange):**
- Dispute opened
- Support ticket escalated
- Offer flagged
- Forgiveness request

🔴 **Critical Events (Red):**
- User missed pickup
- Payment chargeback
- Partner suspended
- System error

**Filters:**
- Event type (dropdown: All, Positive, Warnings, Critical)
- Time range (Last hour, Today, Custom)
- Search by user/partner name

**Refresh Rate:**
- Real-time WebSocket connection
- Falls back to 10-second polling if WebSocket fails

---

### Charts

**Reservations (Last 7 Days) - Line Chart**
- **Why:** Spot trends (weekends spike? weekdays drop?)
- **Updates:** Every 30 minutes
- **Y-axis:** Number of reservations
- **X-axis:** Date
- **Tooltip:** Hover shows exact count + pickup rate
- **Insight:** "Saturday is 2x higher than Monday → schedule more partner promotions on weekends"

**User Growth (30 Days) - Area Chart**
- **Why:** Measure if we're growing or plateauing
- **Updates:** Daily (1am)
- **Y-axis:** Total users (cumulative)
- **X-axis:** Date
- **Tooltip:** New users that day
- **Insight:** "Slowed growth last week → coincides with reduced marketing spend"

---

### Risk Indicators (4 Cards)

**Referral Fraud (4 suspicious patterns)**
- **Why:** Detect fake accounts early
- **Updates:** Real-time
- **Logic:**
  - Same device ID → multiple signups
  - Same IP → 5+ signups in 24h
  - Referral code used >10 times in 1 hour
  - Suspicious email patterns (gmail+1@, gmail+2@)
- **Alert Level:** Yellow if >3, Red if >10
- **Action:** Click to investigate in Fraud Prevention panel

**No-Show Rate (14%)**
- **Why:** High no-shows kill partner trust
- **Updates:** Every hour
- **Calculation:** `FAILED_PICKUP / TOTAL_RESERVATIONS * 100`
- **Threshold:** <10% = healthy, >15% = crisis
- **Alert Level:** Yellow if >10%, Red if >15%
- **Action:** Click to see no-show user list

**System Health (All Operational)**
- **Why:** Catch outages before users complain
- **Updates:** Every 60 seconds
- **Checks:**
  - Database latency <100ms
  - API response time <200ms
  - Supabase realtime connected
  - Storage bucket accessible
- **Alert Level:** Red if any check fails
- **Action:** Click to see detailed health dashboard

**Database Performance (87ms avg)**
- **Why:** Slow queries = bad UX
- **Updates:** Every 5 minutes
- **Calculation:** Average query execution time (last 100 queries)
- **Threshold:** <100ms = good, >500ms = bad
- **Alert Level:** Yellow if >100ms, Red if >500ms
- **Action:** Click to see slow query log

---

## 5️⃣ USER MANAGEMENT MODULE

### User List View (Table)

**Columns (12 total, 8 visible by default):**

| Column | Width | Description | Sortable | Filterable |
|--------|-------|-------------|----------|------------|
| ☑️ | 40px | Checkbox for bulk actions | No | No |
| 🆔 ID | 80px | User ID (truncated, tooltip full) | Yes | Search |
| 👤 Name | 180px | User's full name + avatar | Yes | Search |
| 📧 Email | 200px | Email address | Yes | Search |
| 📱 Phone | 120px | Phone number (masked: +995***7399) | No | Search |
| 🎯 Role | 80px | CUSTOMER/PARTNER/ADMIN badge | Yes | Dropdown |
| 💰 Points | 80px | SmartPoints balance | Yes | Range |
| 📊 Activity | 100px | Total reservations | Yes | Range |
| ⚠️ No-Shows | 80px | Failed pickup count | Yes | Range |
| 🚫 Status | 100px | ACTIVE/BANNED/PENALTY badge | Yes | Dropdown |
| 📅 Joined | 100px | Signup date (relative: "2d ago") | Yes | Date Range |
| ⋮ Actions | 60px | Dropdown menu | No | No |

**Hidden Columns (Toggle in settings):**
- Last Login
- Referral Code
- Verified Email
- Max Slots

**Filters (Top Bar):**

```
┌────────────────────────────────────────────────────────────┐
│ [🔍 Search name/email/ID...] [Role ▾] [Status ▾] [More ▾] │
│                                                             │
│ Active Filters: Role: CUSTOMER ✕  No-Shows: >2 ✕          │
└────────────────────────────────────────────────────────────┘
```

**Filter Options:**
- **Search:** Fuzzy search across name, email, ID, phone
- **Role:** All / Customer / Partner / Admin
- **Status:** All / Active / Banned / Under Penalty / Disabled
- **No-Shows:** None / 1-2 / 3-5 / 6+
- **Points:** All / Low (<50) / Medium (50-200) / High (>200)
- **Joined:** All / Last 24h / Last 7d / Last 30d / Custom
- **Verification:** All / Verified Email / Unverified Email
- **Activity:** All / Active (>5 reservations) / Inactive (<5) / Dormant (0)

**Bulk Actions (Select rows):**
- Ban Users (opens modal: reason required)
- Send Message (opens composer)
- Add Points (opens form: amount, reason)
- Deduct Points (admin only)
- Export Selected (CSV)
- Delete Users (GDPR, requires super admin + 2FA)

**Row Actions (⋮ menu):**
- View Profile
- Edit Details
- Add Points
- Ban User
- View Reservations
- View Support Tickets
- Send Email
- View Audit Log
- Delete Account (GDPR)

**Performance:**
- Virtualized table (only render visible rows)
- Pagination: 50 rows per page (adjustable: 25/50/100/200)
- Total count displayed: "Showing 1-50 of 3,247 users"

**Real-Time Updates:**
- WebSocket for status changes (ban, unban, points change)
- New signups appear with animation
- Status badges update live

---

### User Profile Detail Page

**URL:** `/admin/users/:userId`

**Layout:**

```
╔═══════════════════════════════════════════════════════════╗
║ ← Back to Users                            [Edit] [Ban]   ║
╠═══════════════════════════════════════════════════════════╣
║ ┌─ HEADER ──────────────────────────────────────────────┐ ║
║ │ [Avatar] Giorgi Beridze                               │ ║
║ │          giorgi.b@gmail.com | +995 555 123 456        │ ║
║ │          CUSTOMER | Active | Member since Feb 2026    │ ║
║ │                                                        │ ║
║ │ [🔔 Send Notification] [💬 Open Ticket] [🚫 Ban User]│ ║
║ └────────────────────────────────────────────────────────┘ ║
║                                                            ║
║ ┌─ QUICK STATS (4 cards) ───────────────────────────────┐ ║
║ │ 📦 Reservations: 23   💰 Points: 342                 │ ║
║ │ ✅ Pickups: 21 (91%)  ⚠️  No-Shows: 2                 │ ║
║ └────────────────────────────────────────────────────────┘ ║
║                                                            ║
║ [Profile] [Reservations] [Penalties] [Support] [Activity]║
║ ══════════════════════════════════════════════════════════ ║
║ ┌─ PROFILE TAB ──────────────────────────────────────────┐ ║
║ │ Personal Information:                                  │ ║
║ │   Name: Giorgi Beridze                    [Edit]      │ ║
║ │   Email: giorgi.b@gmail.com ✅ Verified    [Change]   │ ║
║ │   Phone: +995 555 123 456                 [Change]    │ ║
║ │   Password: ••••••••                      [Reset]     │ ║
║ │                                                        │ ║
║ │ Account Status:                                        │ ║
║ │   Role: CUSTOMER                          [Upgrade]   │ ║
║ │   Status: ACTIVE                          [Change]    │ ║
║ │   Email Verified: Yes (Feb 3, 2026)                   │ ║
║ │   Last Login: 2 hours ago                             │ ║
║ │   Signup Method: Email                                │ ║
║ │   Referral Code: GIORGI2024               [Copy]      │ ║
║ │   Referred By: Nino T. (nina.t@gmail.com)            │ ║
║ │                                                        │ ║
║ │ SmartPoints:                                          │ ║
║ │   Current Balance: 342 points             [Add/Remove]│ ║
║ │   Total Earned: 567 points                            │ ║
║ │   Total Spent: 225 points                             │ ║
║ │   Total Purchased: 0 points                           │ ║
║ │                                                        │ ║
║ │ Reservation Slots:                                    │ ║
║ │   Max Quantity: 5 (purchased 2 upgrades)             │ ║
║ │   Total Unlocked: 5 slots (base 3 + 2 purchased)     │ ║
║ │   [View Purchase History]                             │ ║
║ │                                                        │ ║
║ │ Gamification:                                         │ ║
║ │   Achievements: 8/25 unlocked               [View]    │ ║
║ │   Current Streak: 5 days 🔥                          │ ║
║ │   Longest Streak: 12 days                             │ ║
║ │   Total Money Saved: ₾87.50                          │ ║
║ │   Favorite Category: Bakery                           │ ║
║ │                                                        │ ║
║ │ Reliability Metrics:                                  │ ║
║ │   Pickup Rate: 91% (21/23)                            │ ║
║ │   No-Shows: 2 (8.7%)                                  │ ║
║ │   Average Pickup Time: 45 min (within window)        │ ║
║ │   Cancellation Rate: 0% (0 cancelled)                │ ║
║ │   Reliability Score: 87/100 ⚠️  (good but improvable)│ ║
║ └────────────────────────────────────────────────────────┘ ║
╚═══════════════════════════════════════════════════════════╝
```

### Reservation History Tab

**Shows all user reservations in table:**

| Date | Partner | Item | Status | Pickup Time | Points |
|------|---------|------|--------|-------------|--------|
| Feb 3, 8:00am | Vake Bakery | Croissant Bundle | ✅ PICKED_UP | 8:47am (47 min) | 50 |
| Feb 2, 6:30pm | Pizza Factory | Margherita Pizza | ✅ PICKED_UP | 7:12pm (42 min) | 120 |
| Feb 1, 9:00am | Tbili Coffee | Coffee + Pastry | ❌ FAILED_PICKUP | Missed | 30 |
| Jan 31, 2:00pm | Fresh Market | Veggie Box | ✅ PICKED_UP | 2:31pm (31 min) | 80 |

**Filters:**
- Status: All / Picked Up / Failed / Cancelled / Active
- Date Range: Last 7d / 30d / 90d / All Time

**Actions per row:**
- View Details
- View QR Code
- Contact Partner
- Open Dispute (if applicable)

---

### No-Show Tracking Tab

**Detailed list of all failed pickups:**

```
╔════════════════════════════════════════════════════════════╗
║ No-Show History (2 offenses)                             ║
╠════════════════════════════════════════════════════════════╣
║ 🔴 Offense #2 - Feb 1, 2026 9:00am                       ║
║    Partner: Tbili Coffee                                  ║
║    Item: Coffee + Pastry (30 points)                     ║
║    Pickup Window: 9:00am - 10:30am                       ║
║    Status: No-show (no pickup, no cancellation)          ║
║    Penalty Applied: Warning (1st offense)                 ║
║    Forgiveness: Not requested                             ║
║    Admin Notes: None                                      ║
║    [Forgive Penalty] [Contact User]                       ║
║                                                            ║
║ 🟠 Offense #1 - Jan 15, 2026 2:00pm                      ║
║    Partner: Fresh Eats                                    ║
║    Item: Lunch Box (45 points)                           ║
║    Pickup Window: 2:00pm - 3:30pm                        ║
║    Status: No-show (system auto-expired)                  ║
║    Penalty Applied: None (first-time warning shown)       ║
║    Forgiveness: Granted by partner                        ║
║    Admin Notes: "User called, stuck in traffic, partner  ║
║                  forgave after explanation"               ║
║    [View Details]                                          ║
╚════════════════════════════════════════════════════════════╝
```

### Risk Scoring Algorithm

**Reliability Score (0-100):**

```
Base Score: 100

Deductions:
- No-show: -10 points each
- Late cancellation (<30 min): -5 points each
- Multiple no-shows same day: -20 points additional
- Pattern detection (always misses Friday): -15 points
- Dispute filed against user: -10 points

Bonuses:
- 10+ successful pickups in a row: +5 points
- 30+ day active streak: +5 points
- Partner gave positive feedback: +3 points
- Early pickup (before scheduled time): +2 points

Cap: Min 0, Max 100

Risk Levels:
- 90-100: ✅ Excellent (no restrictions)
- 75-89:  🟢 Good (minor warnings)
- 50-74:  🟡 Fair (watch list, remind before penalty)
- 25-49:  🟠 Poor (soft ban after next offense)
- 0-24:   🔴 Critical (hard ban recommended)
```

**Auto-Flagging Rules:**

1. **Instant Flag:**
   - 3 no-shows in 24 hours
   - 5 no-shows in 7 days
   - Reliability score <25
   - 10+ reservations made then cancelled in 1 day

2. **Watch List:**
   - 2 no-shows in 48 hours
   - Reliability score 25-49
   - 5+ cancelled reservations in 7 days

3. **Auto-Actions:**
   - Reliability <25 → Send warning email
   - 3rd no-show → Automatic 24-hour ban
   - 4th no-show → Permanent ban (requires admin review)

---

### Manual Admin Actions

**Ban User (Modal):**

```
╔════════════════════════════════════════════════════════╗
║ Ban User: Giorgi Beridze                               ║
╠════════════════════════════════════════════════════════╣
║ Reason (Required):                                     ║
║ [Dropdown ▾]                                           ║
║   - No-show abuse (3+ offenses)                       ║
║   - Fraudulent activity                                ║
║   - Violates terms of service                          ║
║   - Payment chargeback fraud                           ║
║   - Other (specify below)                              ║
║                                                         ║
║ Additional Details:                                     ║
║ [Text Area - Required]                                 ║
║                                                         ║
║ Ban Duration:                                          ║
║ ○ 1 hour (cooling off)                                ║
║ ○ 24 hours (standard penalty)                         ║
║ ● 7 days (serious offense)                            ║
║ ○ 30 days (repeat offender)                           ║
║ ○ Permanent (requires Super Admin approval)           ║
║                                                         ║
║ Notify User:                                           ║
║ ☑️ Send email explaining ban & duration               ║
║ ☑️ Send push notification                              ║
║                                                         ║
║ ⚠️  Warning: This action will:                        ║
║   - Prevent user from making reservations             ║
║   - Cancel all active reservations                    ║
║   - Log this action to audit trail                    ║
║                                                         ║
║ Type "BAN USER" to confirm: [____________]            ║
║                                                         ║
║ [Cancel]                         [Ban User]            ║
╚════════════════════════════════════════════════════════╝
```

**Add/Remove Points (Modal):**

```
╔════════════════════════════════════════════════════════╗
║ Adjust SmartPoints: Giorgi Beridze (342 pts)          ║
╠════════════════════════════════════════════════════════╣
║ Action:                                                ║
║ ● Add Points   ○ Remove Points                        ║
║                                                         ║
║ Amount:                                                ║
║ [_____] points                                         ║
║                                                         ║
║ Reason (Required):                                     ║
║ [Dropdown ▾]                                           ║
║   - Compensation for service issue                    ║
║   - Refund (partner cancelled)                        ║
║   - Promotional bonus                                  ║
║   - Admin correction                                   ║
║   - Other (specify)                                    ║
║                                                         ║
║ Notes (Required, min 20 chars):                        ║
║ [Text Area]                                            ║
║                                                         ║
║ ☑️ Notify user via email                              ║
║ ☑️ Log to point_transactions table                    ║
║                                                         ║
║ New Balance: 342 → 442 points (+100)                  ║
║                                                         ║
║ [Cancel]                         [Confirm]             ║
╚════════════════════════════════════════════════════════╝
```

**Edit Profile (Modal):**
- Update name, email, phone
- Change role (customer → partner, requires partner application)
- Reset password (sends reset email)
- Verify email manually (if verification email failed)

**Soft Ban vs Hard Ban:**

**Soft Ban (Temporary):**
- Duration: 1h, 24h, 7d, 30d
- User can still login and see account
- Cannot make new reservations
- Active reservations auto-cancelled with full refund
- User sees banner: "Your account is temporarily restricted until [date]. Reason: [reason]. [Contact Support]"
- Auto-lifts after duration expires
- Tracked in `user_penalties` table

**Hard Ban (Permanent):**
- User account disabled
- Cannot login
- All data retained (GDPR requires user to request deletion)
- Email sent: "Your account has been permanently banned for violating terms of service. Reason: [reason]. To appeal, contact support@smartpick.ge"
- Requires Super Admin approval + 2FA
- Tracked in audit log with admin ID

---

### Edge Cases

**Multi-Device User:**
- Detect: Same email/phone logged in from iOS + Android + Web simultaneously
- Action: Allow (it's normal for one person to have multiple devices)
- Flag: If >3 devices in different cities simultaneously → fraud alert

**Accidental Ban:**
- Support agent bans wrong user
- Fix: Undo button appears for 5 minutes after ban
- After 5 min: Requires supervisor approval to unban
- Compensation: Automatically add 100 points + apology email

**User Disputes Ban:**
- User emails support claiming innocence
- Support agent reviews audit log + reservation history
- If justified: Unban + compensation + apology
- If not justified: Polite response explaining evidence
- Escalate to Super Admin if unclear

**GDPR Right to Be Forgotten:**
- User requests account deletion
- Super Admin verifies identity (email challenge)
- All PII scrubbed (name → "Deleted User", email → "deleted_[id]@gdpr.local")
- Transaction data retained (anonymous) for compliance
- Process logged in audit trail

---

## 6️⃣ PARTNER (BUSINESS) MANAGEMENT MODULE

### Partner List View (Table)

**Columns (14 total, 9 visible by default):**

| Column | Width | Description | Sortable | Filterable |
|--------|-------|-------------|----------|------------|
| ☑️ | 40px | Checkbox for bulk actions | No | No |
| 🆔 ID | 80px | Partner ID (truncated) | Yes | Search |
| 🏪 Business | 200px | Business name + logo | Yes | Search |
| 📍 Location | 150px | City + address (truncated) | Yes | Dropdown |
| 🏷️ Type | 120px | Business category badge | Yes | Dropdown |
| 📊 Status | 100px | PENDING/APPROVED/BLOCKED | Yes | Dropdown |
| 🎯 Offers | 80px | Active offers count | Yes | Range |
| 📈 Pickups | 80px | Total successful pickups | Yes | Range |
| ⭐ Rating | 80px | Avg rating (from users) | Yes | Range |
| 🚫 No-Shows | 80px | Customer no-shows | Yes | Range |
| 💰 Revenue | 100px | Total earnings (₾) | Yes | Range |
| 📅 Joined | 100px | Application date | Yes | Date Range |
| ⋮ Actions | 60px | Dropdown menu | No | No |

**Hidden Columns (Toggle in settings):**
- Contact Info (phone, email)
- Commission Rate
- Last Offer Posted
- Reliability Score
- Image Quota Used/Max

**Filters (Top Bar):**

```
┌──────────────────────────────────────────────────────────────┐
│ [🔍 Search business name/city...] [Status ▾] [Type ▾] [More ▾]│
│                                                               │
│ Active Filters: Status: PENDING ✕  City: Tbilisi ✕         │
└──────────────────────────────────────────────────────────────┘
```

**Filter Options:**
- **Search:** Business name, city, address, contact info
- **Status:** All / Pending Approval / Approved / Rejected / Blocked / Paused
- **Business Type:** All / Bakery / Restaurant / Café / Grocery / Fast Food / Dessert / Bar / Buffet / Catering / Healthy Food / International / Other
- **City:** All / Tbilisi / Batumi / Kutaisi / Rustavi / Other
- **Pickup Rate:** All / Excellent (>95%) / Good (85-95%) / Fair (70-85%) / Poor (<70%)
- **Active Offers:** All / None / 1-5 / 6-10 / 11+
- **Revenue:** All / <₾1000 / ₾1000-5000 / ₾5000-10000 / >₾10000
- **Joined:** Last 24h / Last 7d / Last 30d / All Time

**Bulk Actions (Select rows):**
- Approve Partners (pending only)
- Reject Partners (requires reason)
- Block Partners (active only, requires reason)
- Unblock Partners
- Send Message
- Export Selected (CSV)
- Delete Partners (rejected only, GDPR)

**Row Actions (⋮ menu):**
- View Profile
- Approve/Reject (if pending)
- Edit Details
- Block/Unblock
- View Offers
- View Reservations
- View Earnings
- View Audit Log
- Send Email
- Delete (GDPR)

**Smart Views (Quick Filters):**
- 🔴 **Needs Attention (12)** → Pending >24h OR active with <70% pickup rate
- 🟢 **Top Performers (8)** → >95% pickup rate AND >50 total pickups
- 🟠 **At Risk (3)** → <70% pickup rate OR no offers in 7 days
- 🔵 **New This Week (15)** → Joined in last 7 days

**Performance:**
- Server-side pagination: 50 per page
- Total: "Showing 1-50 of 187 partners"
- Cache partner stats for 5 minutes (reduces load)

---

### Partner Profile Detail Page

**URL:** `/admin/partners/:partnerId`

**Layout:**

```
╔═══════════════════════════════════════════════════════════════╗
║ ← Back to Partners                [Edit] [Approve] [Block]    ║
╠═══════════════════════════════════════════════════════════════╣
║ ┌─ HEADER ────────────────────────────────────────────────────┐ ║
║ │ [Logo] Vake Bakery                                          │ ║
║ │        BAKERY • Tbilisi, Vake                               │ ║
║ │        Status: APPROVED ✅ • Member since Jan 15, 2026      │ ║
║ │        ⭐ 4.8/5.0 (127 ratings) • 📞 +995 555 123 456      │ ║
║ │                                                              │ ║
║ │ [📊 View Analytics] [💬 Send Message] [🚫 Block Partner]   │ ║
║ └──────────────────────────────────────────────────────────────┘ ║
║                                                                  ║
║ ┌─ QUICK STATS (5 cards) ────────────────────────────────────┐  ║
║ │ 🎯 Active Offers: 8      📦 Total Reservations: 342        │  ║
║ │ ✅ Pickups: 325 (95%)    💰 Total Revenue: ₾12,847         │  ║
║ │ 🚫 No-Shows: 17 (5%)     └─ Commission Paid: ₾1,927 (15%) │  ║
║ └──────────────────────────────────────────────────────────────┘  ║
║                                                                  ║
║ [Profile] [Offers] [Reservations] [Earnings] [Reviews] [Activity]║
║ ══════════════════════════════════════════════════════════════   ║
║ ┌─ PROFILE TAB ────────────────────────────────────────────────┐ ║
║ │ Business Information:                                        │ ║
║ │   Business Name: Vake Bakery                    [Edit]      │ ║
║ │   Business Type: Bakery                         [Change]    │ ║
║ │   Description: Fresh bread and pastries daily...           │ ║
║ │   Registration: Jan 15, 2026                                │ ║
║ │                                                              │ ║
║ │ Location:                                                    │ ║
║ │   Address: 12 Chavchavadze Ave, Vake           [Edit]      │ ║
║ │   City: Tbilisi                                             │ ║
║ │   Coordinates: 41.7151° N, 44.7775° E          [View Map]  │ ║
║ │                                                              │ ║
║ │ Contact Information:                                         │ ║
║ │   Phone: +995 555 123 456                      [Call]       │ ║
║ │   Email: info@vakebakery.ge                    [Email]      │ ║
║ │   Telegram: @vakebakery                        [Open]       │ ║
║ │   WhatsApp: +995 555 123 456                   [Chat]       │ ║
║ │                                                              │ ║
║ │ Business Hours:                                              │ ║
║ │   Monday:    07:00 - 20:00                                  │ ║
║ │   Tuesday:   07:00 - 20:00                                  │ ║
║ │   Wednesday: 07:00 - 20:00                                  │ ║
║ │   Thursday:  07:00 - 20:00                                  │ ║
║ │   Friday:    07:00 - 21:00                                  │ ║
║ │   Saturday:  08:00 - 21:00                                  │ ║
║ │   Sunday:    08:00 - 18:00                                  │ ║
║ │   [Edit Hours]                                               │ ║
║ │                                                              │ ║
║ │ Media:                                                       │ ║
║ │   Logo: [Image thumbnail]                      [Change]     │ ║
║ │   Cover Photo: [Image thumbnail]               [Change]     │ ║
║ │   Gallery: 8/15 images used                    [Manage]     │ ║
║ │   Upload Approved: ✅ Yes (can upload directly)            │ ║
║ │                                                              │ ║
║ │ Account Status:                                              │ ║
║ │   Status: APPROVED ✅                          [Change]     │ ║
║ │   User ID: abc-123-def                         [View User]  │ ║
║ │   Verification Date: Jan 15, 2026                           │ ║
║ │   Verified By: Sarah K. (Operations Admin)                  │ ║
║ │   Last Active: 2 hours ago                                  │ ║
║ │                                                              │ ║
║ │ Financial:                                                   │ ║
║ │   Commission Rate: 15% (platform standard)     [Override]   │ ║
║ │   Partner Points Balance: 250 pts              [Adjust]     │ ║
║ │   Total Earnings: ₾12,847                                   │ ║
║ │   Commission Paid: ₾1,927 (15% of ₾12,847)               │ ║
║ │   Pending Payout: ₾348 (this week)            [Process]    │ ║
║ │   Bank Account: •••• 4523                      [View]       │ ║
║ │                                                              │ ║
║ │ Performance Metrics:                                         │ ║
║ │   Trust Score: 94/100 🟢 (excellent)                       │ ║
║ │   Pickup Success Rate: 95% (325/342)                        │ ║
║ │   Average Rating: 4.8/5.0 (127 reviews)                    │ ║
║ │   Offer Response Time: 12 min avg                           │ ║
║ │   Customer Satisfaction: 97%                                │ ║
║ │   Repeat Customer Rate: 68%                                 │ ║
║ │                                                              │ ║
║ │ Reliability Breakdown:                                       │ ║
║ │   ✅ Offers fulfilled: 325 (95%)                            │ ║
║ │   ⚠️  Customer no-shows: 17 (5%)                            │ ║
║ │   ❌ Partner cancelled: 0 (0%)                              │ ║
║ │   🔄 Disputed: 2 (0.6%) - all resolved                     │ ║
║ │                                                              │ ║
║ │ Red Flags: None ✅                                          │ ║
║ │ Warnings: None                                               │ ║
║ │ Admin Notes: "Excellent partner, very reliable"            │ ║
║ │              [Add Note]                                      │ ║
║ └──────────────────────────────────────────────────────────────┘ ║
╚═══════════════════════════════════════════════════════════════╝
```

---

### Partner Onboarding Flow (Admin Side)

**When partner submits application:**

1. **Auto-Notification:**
   - Slack/Email to ops team: "New partner application: Vake Bakery"
   - Dashboard notification badge: "12 pending applications"
   - Entry appears in "Pending Approval" list

2. **Admin Reviews Application:**
   - **Checklist (Admin must verify):**
     - ☑️ Business name is legitimate (Google search)
     - ☑️ Address is valid (Google Maps verification)
     - ☑️ Phone number works (call or SMS test)
     - ☑️ Email is active (test email sent)
     - ☑️ Business type matches description
     - ☑️ No duplicate applications (same address/phone)
     - ☑️ Photos are appropriate (not stolen, not offensive)
     - ☑️ Business hours are reasonable

3. **Admin Decision:**

   **Option A: Approve**
   - Click "Approve" button
   - Partner gets email: "Congratulations! Your application is approved"
   - Partner can immediately start posting offers
   - Partner gets 250 welcome points
   - Logged: "Approved by Sarah K. on Feb 3, 2026 at 3:45pm"

   **Option B: Reject**
   - Must select reason:
     - Business doesn't exist
     - Duplicate application
     - Inappropriate content
     - Incomplete information
     - Violates policies
     - Other (explain)
   - Required: Detailed explanation (min 50 chars)
   - Email sent: "Unfortunately, your application was not approved. Reason: [reason]. You may reapply after addressing these issues."
   - Logged: "Rejected by Sarah K. Reason: [reason]"

   **Option C: Request More Info**
   - Send email asking for clarification
   - Application stays in "Pending" state
   - Auto-reminder if no response in 48 hours

---

### Trust Scoring Algorithm

**Trust Score (0-100):**

```
Base Score: 100

Deductions:
- Customer no-show: -2 points each
- Partner cancelled offer: -5 points each
- Late to update offer status: -1 point per hour
- Customer complaint: -10 points each
- Disputed then lost: -15 points
- Fake/misleading photos: -30 points
- Policy violation: -50 points

Bonuses:
- 100+ successful pickups: +5 points
- 30+ days no issues: +5 points
- 5-star rating avg: +10 points
- Repeat customers >60%: +5 points
- Fast offer updates (<5 min): +3 points

Thresholds:
- 90-100: 🟢 Excellent (featured in searches, priority support)
- 75-89:  🟡 Good (normal status)
- 60-74:  🟠 Fair (watch list, more monitoring)
- 40-59:  🔴 Poor (restricted, can't post new offers)
- 0-39:   ⛔ Critical (auto-block, manual review required)

Auto-Actions:
- Score <60 → Warning email sent
- Score <40 → Auto-block, requires admin review to unblock
- 3 complaints in 7 days → Auto-block
```

---

### Auto-Warnings System

**Trigger Conditions:**

1. **Pickup Rate <85%:**
   - Email: "Your pickup rate has dropped below 85%. Customers are not picking up their reservations. Please review your offers."
   - Action: None (just warning)

2. **No Offers in 7 Days:**
   - Email: "We noticed you haven't posted any offers in 7 days. Need help?"
   - Action: Status changed to "PAUSED" (can be reactivated)

3. **3 Customer Complaints in 7 Days:**
   - Email: "Multiple customers have complained. We're reviewing your account."
   - Action: Offers hidden until admin review

4. **Low Ratings (<3.5 stars):**
   - Email: "Your average rating is low. Let's improve customer satisfaction together."
   - Action: Assigned to success team for coaching

---

### Manual Admin Overrides

**Block Partner (Modal):**

```
╔════════════════════════════════════════════════════════╗
║ Block Partner: Vake Bakery                             ║
╠════════════════════════════════════════════════════════╣
║ This will:                                             ║
║   ❌ Hide all active offers immediately                ║
║   ❌ Prevent posting new offers                        ║
║   ❌ Cancel all active reservations (refund users)     ║
║   ⚠️  Partner can still login to see account          ║
║                                                         ║
║ Reason (Required):                                     ║
║ [Dropdown ▾]                                           ║
║   - Multiple customer complaints                       ║
║   - Fraudulent activity                                ║
║   - Policy violation                                   ║
║   - Health/safety issue                                ║
║   - Duplicate account                                  ║
║   - Other (specify)                                    ║
║                                                         ║
║ Details (Required, min 50 chars):                      ║
║ [Text Area]                                            ║
║                                                         ║
║ Duration:                                              ║
║ ● Temporary (7 days)                                   ║
║ ○ Permanent (requires Super Admin)                    ║
║                                                         ║
║ ☑️ Send email to partner                              ║
║ ☑️ Refund all active reservations                     ║
║ ☑️ Notify affected customers                          ║
║                                                         ║
║ [Cancel]                         [Block Partner]       ║
╚════════════════════════════════════════════════════════╝
```

**Adjust Commission Rate (Modal):**
- Standard: 15%
- Can override per partner: 10-25%
- Reason required (e.g., "High-volume partner discount")
- Applies to future earnings only

**Grant Upload Permission:**
- By default, partners must request admin approval for images
- "Trusted" partners can upload directly
- Toggle: "Approve for direct upload"
- Logs: Who granted permission and when

---

### Suspension Logic

**Temporary Suspension (7 days):**
- Partner can login but can't post offers
- Active offers hidden
- Active reservations allowed to complete
- Email: "Your account is suspended until [date]. Reason: [reason]"
- Auto-lifts after 7 days

**Permanent Block:**
- Requires Super Admin approval
- All offers deleted
- All reservations cancelled + refunded
- Partner cannot reapply with same email/phone
- Email: "Your account has been permanently blocked. Reason: [reason]. Contact support@smartpick.ge to appeal."

---

## 7️⃣ OFFER MANAGEMENT MODULE

### Live Offers Table

**Columns (12 total, 8 visible by default):**

| Column | Width | Description | Sortable | Filterable |
|--------|-------|-------------|----------|------------|
| ☑️ | 40px | Checkbox | No | No |
| 🎯 Offer | 250px | Title + image thumbnail | Yes | Search |
| 🏪 Partner | 150px | Business name | Yes | Search |
| 🏷️ Category | 100px | Category badge | Yes | Dropdown |
| 💰 Price | 120px | Original → Smart (discount %) | Yes | Range |
| 📦 Stock | 80px | Available / Total | Yes | Range |
| ⏰ Expires | 120px | Countdown timer (if <6h) | Yes | Soon/Today/Week |
| 📊 Status | 100px | ACTIVE/EXPIRED/PAUSED badge | Yes | Dropdown |
| 🔥 Demand | 80px | Reservation count | Yes | Range |
| ⚠️ Flags | 80px | Flag icon (if flagged) | No | Yes/No |
| 📅 Posted | 100px | Created date | Yes | Date Range |
| ⋮ Actions | 60px | Dropdown menu | No | No |

**Real-Time Features:**
- ⏰ **Live Countdown:** Offers expiring in <6 hours show ticking countdown
- 📦 **Stock Updates:** Quantity updates in real-time when reservations made
- 🔴 **Auto-Status:** Status changes to EXPIRED automatically when time runs out
- 🟡 **Low Stock Alert:** Yellow highlight when quantity <3

**Filters:**

```
┌──────────────────────────────────────────────────────────────┐
│ [🔍 Search offer title/partner...] [Status ▾] [Category ▾]   │
│                                                               │
│ Active Filters: Status: ACTIVE ✕  Expires: <6 hours ✕      │
└──────────────────────────────────────────────────────────────┘
```

**Smart Views:**
- 🔴 **Expiring Soon (<1h)** → Urgent monitoring
- 🟠 **Low Stock (<3 items)** → Almost sold out
- ⚠️ **Flagged for Review** → Needs admin attention
- 🚀 **Hot Offers (10+ reservations)** → High demand
- 💤 **No Reservations (>24h)** → Poor performance

**Bulk Actions:**
- Pause Offers (hide from users)
- Unpause Offers
- Flag for Review
- Extend Expiry (add time)
- Feature Offers (boost in search)
- Delete Offers (requires reason)

**Row Actions:**
- View Details
- Edit Offer (admin override)
- Pause/Unpause
- Flag/Unflag
- View Reservations
- View Analytics
- Duplicate Offer (for partner)
- Delete Offer

---

### Offer Detail Page

**URL:** `/admin/offers/:offerId`

```
╔═══════════════════════════════════════════════════════════════╗
║ ← Back to Offers                      [Edit] [Pause] [Flag]   ║
╠═══════════════════════════════════════════════════════════════╣
║ ┌─ OFFER PREVIEW ───────────────────────────────────────────┐  ║
║ │ [Images Carousel - 3 photos]                              │  ║
║ │                                                            │  ║
║ │ 🥐 Fresh Croissant Bundle                                 │  ║
║ │ 🏪 Vake Bakery • Tbilisi, Vake                           │  ║
║ │                                                            │  ║
║ │ ₾15.00 → ₾7.50 (50% off) 💰                              │  ║
║ │                                                            │  ║
║ │ 📦 Stock: 12 available (20 total)                        │  ║
║ │ ⏰ Expires: Today at 6:00 PM (3h 42m remaining)          │  ║
║ │ 🕐 Pickup: 4:00 PM - 6:00 PM                             │  ║
║ │                                                            │  ║
║ │ 📝 Description:                                           │  ║
║ │    3 fresh croissants (plain, chocolate, almond)         │  ║
║ │    Baked this morning. Perfect for breakfast or snack.   │  ║
║ │                                                            │  ║
║ │ Status: ACTIVE ✅ • Posted 4 hours ago                    │  ║
║ └────────────────────────────────────────────────────────────┘  ║
║                                                                  ║
║ ┌─ PERFORMANCE METRICS ──────────────────────────────────────┐  ║
║ │ 📊 Reservations: 8 (40% conversion rate)                  │  ║
║ │ 👁️  Views: 127 unique users                               │  ║
║ │ ⭐ Average Rating: 4.9/5.0 (from previous customers)      │  ║
║ │ 💰 Revenue: ₾60 (8 × ₾7.50)                              │  ║
║ │ 🔥 Demand Score: High (trending offer)                    │  ║
║ └────────────────────────────────────────────────────────────┘  ║
║                                                                  ║
║ ┌─ ABUSE DETECTION ──────────────────────────────────────────┐  ║
║ │ ✅ Price Valid: ₾15 → ₾7.50 (50% discount, reasonable)   │  ║
║ │ ✅ Images Unique: No duplicates found in system           │  ║
║ │ ✅ Description Quality: Clear and detailed                │  ║
║ │ ✅ Stock Reasonable: 20 items (normal for this partner)   │  ║
║ │ ⚠️  Price Inflation Check: Original price ₾15 seems high │  ║
║ │    for croissants (market avg: ₾10-12).                  │  ║
║ │    [Flag for Review] [Mark as Valid]                      │  ║
║ └────────────────────────────────────────────────────────────┘  ║
║                                                                  ║
║ ┌─ RESERVATIONS (8) ─────────────────────────────────────────┐  ║
║ │ [Table showing who reserved, status, pickup time]         │  ║
║ └────────────────────────────────────────────────────────────┘  ║
║                                                                  ║
║ ┌─ ADMIN ACTIONS ────────────────────────────────────────────┐  ║
║ │ [Pause Offer] [Extend Expiry] [Edit Details] [Delete]     │  ║
║ │ [Flag for Review] [Feature Offer] [Contact Partner]       │  ║
║ └────────────────────────────────────────────────────────────┘  ║
╚═══════════════════════════════════════════════════════════════╝
```

---

### Offer Lifecycle

**States:**

1. **SCHEDULED** (optional)
   - Partner sets future publish date
   - Not visible to customers yet
   - Admin can preview
   - Auto-publishes at scheduled time

2. **ACTIVE**
   - Live on platform
   - Users can reserve
   - Stock decrements with each reservation
   - Expires at specified time

3. **SOLD_OUT**
   - Quantity reached 0
   - Not visible in search
   - Can be relisted by partner (if auto-relist enabled)

4. **EXPIRED**
   - Pickup time passed
   - No longer reservable
   - Archived automatically after 7 days

5. **PAUSED**
   - Partner or admin paused
   - Hidden from users
   - Can be unpaused anytime

6. **FLAGGED**
   - Admin flagged for review
   - Hidden from users until reviewed
   - Partner notified

---

### Reservation Funnel Per Offer

**Shows conversion:**

```
1000 Views
  ↓ 12% clicked
120 Detail Views
  ↓ 6.7% reserved
8 Reservations
  ↓ 87.5% picked up
7 Successful Pickups
  ↓ 12.5% no-show
1 Failed Pickup
```

**Insights:**
- High views but low clicks → improve thumbnail
- High clicks but low reservations → pricing issue or description unclear
- High reservations but low pickups → pickup window too tight or location issue

---

### Abuse Prevention

**Auto-Detection Rules:**

1. **Price Inflation:**
   - Check if original_price > 150% of market average for category
   - Flag: "Potential price manipulation"
   - Action: Auto-flag for admin review

2. **Duplicate Images:**
   - Perceptual hash comparison with existing offers
   - Flag: "Image used in another offer"
   - Action: Auto-pause + notify partner

3. **Spam Patterns:**
   - Same partner posts >10 identical offers in 1 hour
   - Flag: "Possible spam"
   - Action: Auto-pause new offers, alert admin

4. **Stock Manipulation:**
   - Partner posts 100+ quantity (unusual)
   - Flag: "Abnormal stock quantity"
   - Action: Auto-flag for review

5. **Expired Products:**
   - NLP scan description for keywords: "expired", "old", "yesterday"
   - Flag: "Possible expired product"
   - Action: Auto-flag for immediate review

---

### Emergency Admin Controls

**Pause All Offers (Partner-Level):**
- Pause all active offers from specific partner
- Use case: Food safety issue, partner temporarily closed
- Requires reason
- Notifies partner immediately

**Force Expire Offer:**
- Manually expire offer before scheduled time
- Use case: Item no longer available, quality issue
- Refunds all active reservations automatically
- Logs reason

**Bulk Price Override:**
- Admin can adjust prices for compliance
- Use case: Partner mistakenly set wrong price
- Requires Super Admin approval
- Notifies partner

**Feature Boost:**
- Manually boost offer to top of search
- Use case: Promote excellent partner, special promotion
- Duration: 1 hour / 6 hours / 24 hours
- Marked as "Featured" badge

---

## 8️⃣ RESERVATION & PICKUP CONTROL

### Real-Time Reservation Feed

**Live Dashboard:**

```
╔═══════════════════════════════════════════════════════════════╗
║ 🔴 LIVE RESERVATIONS                          [Refresh: Auto]  ║
╠═══════════════════════════════════════════════════════════════╣
║ Filters: [Status ▾] [Partner ▾] [Expiring Soon ▾] [Search]   ║
║                                                                 ║
║ ┌─ ACTIVE RESERVATIONS (47) ─────────────────────────────────┐ ║
║ │                                                             │ ║
║ │ 🔴 URGENT (Expires <30 min) - 3 reservations              │ ║
║ │ ─────────────────────────────────────────────────────────  │ ║
║ │ 🥐 Croissant Bundle • Vake Bakery                         │ ║
║ │    Reserved by: Giorgi B. • ⏰ Expires in 18 minutes      │ ║
║ │    Pickup: 5:00-6:00 PM • Points: 50 • Qty: 2            │ ║
║ │    [View Details] [Contact User] [Extend Time]            │ ║
║ │                                                             │ ║
║ │ 🍕 Pizza Margherita • Pizza Factory                       │ ║
║ │    Reserved by: Nino T. • ⏰ Expires in 22 minutes        │ ║
║ │    Pickup: 7:00-8:30 PM • Points: 120 • Qty: 1           │ ║
║ │    [View Details] [Contact User] [Extend Time]            │ ║
║ │                                                             │ ║
║ │ ─────────────────────────────────────────────────────────  │ ║
║ │ 🟡 WARNING (Expires <1 hour) - 8 reservations            │ ║
║ │ [Show 8 reservations...]                                   │ ║
║ │                                                             │ ║
║ │ ─────────────────────────────────────────────────────────  │ ║
║ │ 🟢 NORMAL (>1 hour remaining) - 36 reservations           │ ║
║ │ [Show 36 reservations...]                                  │ ║
║ └─────────────────────────────────────────────────────────────┘ ║
║                                                                 ║
║ ┌─ RECENTLY COMPLETED (Last 1 hour) ─────────────────────────┐ ║
║ │ ✅ Picked up: 23 | ❌ Expired: 4 | 🔄 Cancelled: 1         │ ║
║ │ [View All Completed]                                        │ ║
║ └─────────────────────────────────────────────────────────────┘ ║
╚═══════════════════════════════════════════════════════════════╝
```

**Real-Time Updates:**
- WebSocket connection
- Countdown timers update every 10 seconds
- Status changes animate in
- Alert sound when reservation <5 minutes
- Browser notification for critical (<15 min)

---

### Countdown Timer Display

**Visual Hierarchy:**

```
⏰ 18:47 remaining   🔴 RED    = <30 minutes (urgent)
⏰ 42:13 remaining   🟠 ORANGE = 30-60 minutes (warning)
⏰ 1h 34m remaining  🟡 YELLOW = 1-2 hours (attention)
⏰ 3h 15m remaining  🟢 GREEN  = >2 hours (normal)
```

---

### Manual Intervention Tools

**Extend Reservation Time (Modal):**

```
╔════════════════════════════════════════════════════════╗
║ Extend Reservation Time                                ║
╠════════════════════════════════════════════════════════╣
║ Reservation: #R-4523                                   ║
║ User: Giorgi B. (giorgi.b@gmail.com)                  ║
║ Offer: Croissant Bundle • Vake Bakery                 ║
║ Current Expiry: Today 6:00 PM (18 min remaining)      ║
║                                                         ║
║ Extend by:                                             ║
║ ○ 30 minutes (new expiry: 6:30 PM)                    ║
║ ● 1 hour (new expiry: 7:00 PM)                        ║
║ ○ 2 hours (new expiry: 8:00 PM)                       ║
║ ○ Custom: [____] minutes                              ║
║                                                         ║
║ Reason (Required):                                     ║
║ [Dropdown ▾]                                           ║
║   - User requested more time                           ║
║   - Partner agreed to extension                        ║
║   - System issue (user's request)                     ║
║   - Traffic delay reported                             ║
║   - Other (specify)                                    ║
║                                                         ║
║ Notes:                                                 ║
║ [Text Area]                                            ║
║                                                         ║
║ ☑️ Notify user via push notification                  ║
║ ☑️ Notify partner via SMS                             ║
║                                                         ║
║ [Cancel]                         [Extend Time]         ║
╚════════════════════════════════════════════════════════╝
```

**Manual Pickup (Force Complete):**
- Use case: User forgot to show QR code, partner confirmed verbally
- Admin marks as picked up manually
- Requires reason + partner confirmation
- Points transferred to partner
- User gets pickup confirmation

**Cancel Reservation (Admin Override):**
- Refunds points immediately
- Offer stock restored (+1)
- Requires reason
- Both user and partner notified

---

### What Happens on Expiry

**Auto-Expiry Process (Runs every 1 minute):**

1. **Check for expired reservations:**
   ```sql
   SELECT * FROM reservations
   WHERE status = 'ACTIVE'
   AND expires_at < NOW()
   ```

2. **For each expired reservation:**
   - Update status → `FAILED_PICKUP`
   - Restore offer quantity (+1)
   - Check user penalty status:
     - 1st offense → Warning (no penalty)
     - 2nd offense → 1-hour ban
     - 3rd offense → 24-hour ban
     - 4th offense → Permanent ban (admin review)
   - Points NOT refunded (user lost their chance)
   - Partner keeps points (compensation for wasted slot)

3. **Notifications:**
   - User: "Your reservation expired. You missed the pickup window."
   - Partner: "Reservation expired. Item returned to inventory."

4. **Logging:**
   - Create penalty record if applicable
   - Update user_penalties table
   - Increment no-show count
   - Log to audit trail

---

### Late Pickup Handling

**Scenario: User arrives 10 minutes after window closes**

**Current System:**
- Reservation auto-expired
- User cannot use QR code
- User contacts support: "I'm here but it says expired!"

**Support Agent Actions:**

1. **Check Context:**
   - How late? (10 min = minor, 2 hours = major)
   - Partner still open?
   - Item still available?
   - User's history (frequent late or first time?)

2. **If Grace Period Appropriate (≤15 minutes late):**
   - Contact partner: "User is here, can you honor reservation?"
   - If partner agrees:
     - Admin manually marks as picked up
     - No penalty applied
     - Log: "Late pickup accepted with partner permission"
   - If partner refuses:
     - Refund points to user
     - No penalty (partner's decision)
     - Log: "Late pickup denied by partner"

3. **If Too Late (>15 minutes):**
   - Apologize to user: "Window closed, item may be sold"
   - Offer 50% points refund as goodwill
   - Standard no-show penalty applies
   - Log: "Excessive delay, penalty enforced"

---

### Partner Disputes

**Scenario: Partner claims user picked up, user denies**

**Dispute Process:**

1. **User Files Dispute:**
   - Via support ticket or app
   - Claims: "I never received the item"
   - Required: Explain what happened

2. **Admin Investigation:**
   - Check reservation status (marked PICKED_UP)
   - Who marked it? (partner or user confirmation)
   - Timestamp of pickup
   - Ask partner for evidence (photo, video, witness)
   - Check user's history (frequent disputes = red flag)

3. **Resolution Options:**

   **Option A: Rule in favor of user**
   - Refund points + compensation (+50 pts)
   - Warning to partner
   - Update partner trust score (-10)
   - Log: "Dispute resolved: user refunded"

   **Option B: Rule in favor of partner**
   - No refund
   - Explain to user with evidence
   - If user persists, flag user for abuse
   - Log: "Dispute resolved: partner correct"

   **Option C: Split Decision (unclear)**
   - Refund 50% of points
   - No penalty to either party
   - Treat as one-time goodwill
   - Log: "Dispute resolved: inconclusive, 50% refund"

---

## 9️⃣ ANALYTICS & REPORTING SYSTEM

### Core Metrics Dashboard

**Business Health (4 KPIs):**

```
┌────────────────────────────────────────────────────────┐
│ 📊 GMV (Gross Merchandise Value)                      │
│    ₾127,438 this month (+18% vs last month)          │
│    ▁▂▃▅▆▇█ (trending up)                             │
│                                                         │
│ 💰 Platform Revenue (Commission)                       │
│    ₾19,116 this month (15% of GMV)                   │
│    Target: ₾20,000 (96% achieved)                    │
│                                                         │
│ 📈 Active Users (Made ≥1 reservation this month)      │
│    2,847 users (58% of total userbase)               │
│    +342 vs last month (+13.7% growth)                │
│                                                         │
│ ⭐ Platform Health Score                               │
│    87/100 (Good)                                       │
│    - Pickup Rate: 92% ✅                              │
│    - User Satisfaction: 4.6/5 ✅                      │
│    - Partner Retention: 94% ✅                        │
│    - No-Show Rate: 8% ⚠️ (target: <5%)              │
└────────────────────────────────────────────────────────┘
```

---

### Growth Metrics

**User Acquisition Funnel:**

```
┌────────────────────────────────────────────────────────┐
│ This Month (Feb 2026):                                │
│                                                         │
│ 5,240 Website Visitors                                │
│   ↓ 23% signed up                                     │
│ 1,205 New Signups                                     │
│   ↓ 68% verified email                                │
│   820 Verified Users                                   │
│   ↓ 41% made first reservation                        │
│   336 Activated Users                                  │
│   ↓ 62% made 2nd reservation                          │
│   208 Retained Users                                   │
│                                                         │
│ Key Metrics:                                           │
│ - Signup Rate: 23% (industry avg: 15-20%)            │
│ - Activation Rate: 41% (good, target: 50%)           │
│ - Retention Rate: 62% (excellent!)                    │
│                                                         │
│ Drop-off Analysis:                                     │
│ - 32% don't verify email → Send reminder campaign     │
│ - 59% verify but don't reserve → Add onboarding flow │
│ - 38% reserve once but don't return → Retargeting    │
└────────────────────────────────────────────────────────┘
```

**Partner Growth:**

```
┌────────────────────────────────────────────────────────┐
│ Partner Pipeline:                                      │
│                                                         │
│ 48 Applications Submitted (this month)                │
│   ↓ 75% approved                                       │
│  36 Partners Onboarded                                 │
│   ↓ 83% posted first offer                            │
│  30 Active Partners (posted ≥1 offer)                 │
│   ↓ 67% posted 5+ offers                              │
│  20 High-Value Partners                                │
│                                                         │
│ Churn:                                                 │
│ - 3 partners inactive >30 days (8% churn rate)       │
│ - Reasons: Too complicated (2), Low demand (1)        │
│                                                         │
│ Average Time to First Offer: 18 hours (good)          │
│ Average Offers per Partner: 12.4 per month            │
└────────────────────────────────────────────────────────┘
```

---

### Revenue Metrics

**Revenue Breakdown:**

```
┌────────────────────────────────────────────────────────┐
│ February 2026 Revenue:                                 │
│                                                         │
│ SmartPoints Purchased:     ₾87,420 (gross)            │
│   - Credit Card:           ₾62,840 (72%)              │
│   - Bank Transfer:         ₾24,580 (28%)              │
│   - Transaction Fees:      -₾3,497 (4%)               │
│   = Net Points Revenue:    ₾83,923                    │
│                                                         │
│ SmartPoints Used:          ₾91,235 (point value)      │
│   Note: Users spending more than buying = healthy     │
│                                                         │
│ Partner Commissions Earned: ₾19,116 (15% of GMV)     │
│   - Paid Out:              ₾16,428 (86%)              │
│   - Pending Payout:        ₾2,688 (14%)               │
│                                                         │
│ Unit Economics:                                        │
│   Average User Lifetime Value: ₾142                   │
│   Average Acquisition Cost: ₾23                       │
│   LTV/CAC Ratio: 6.2x (excellent, >3x is good)       │
│                                                         │
│   Average Partner Lifetime Value: ₾3,847              │
│   Average Partner Onboarding Cost: ₾180               │
│   LTV/CAC Ratio: 21.4x (very strong)                 │
└────────────────────────────────────────────────────────┘
```

---

### Geo Analytics

**City Performance:**

| City | Users | Partners | GMV | Avg Order | Pickup Rate |
|------|-------|----------|-----|-----------|-------------|
| Tbilisi | 2,340 | 67 | ₾94,200 | ₾40.26 | 93% |
| Batumi | 387 | 14 | ₾18,470 | ₾47.73 | 89% |
| Kutaisi | 284 | 9 | ₾11,320 | ₾39.86 | 91% |
| Rustavi | 142 | 6 | ₾5,680 | ₾40.00 | 88% |

**Expansion Opportunities:**
- Batumi: Higher avg order value → premium market
- Kutaisi: Growing fast (+28% users this month)
- Rustavi: Need more partners (only 6 vs 142 users = 24:1 ratio)

**Heatmap View:**
- Interactive map showing user density
- Partner coverage overlay
- Underserved areas highlighted in red
- Click region → detailed stats

---

### Behavioral Analytics

**Usage Patterns:**

```
┌────────────────────────────────────────────────────────┐
│ When Do Users Reserve? (Peak Times)                   │
│                                                         │
│ Monday-Friday:                                         │
│   8-10am:  Breakfast (18% of daily)                   │
│   12-2pm:  Lunch (32% of daily) ← Peak                │
│   6-8pm:   Dinner (27% of daily)                      │
│   8-10pm:  Late snack (12% of daily)                  │
│                                                         │
│ Saturday-Sunday:                                       │
│   10-12pm: Brunch (35% of daily) ← Weekend peak       │
│   6-8pm:   Dinner (28% of daily)                      │
│                                                         │
│ Insight: Add more lunch offers weekdays,              │
│          brunch offers weekends                        │
└────────────────────────────────────────────────────────┘
```

**Category Preferences:**

```
┌────────────────────────────────────────────────────────┐
│ Most Popular Categories (by reservation count):       │
│                                                         │
│ 1. 🥖 Bakery        847 reservations (28%)            │
│ 2. 🍕 Fast Food     624 reservations (21%)            │
│ 3. ☕ Café          512 reservations (17%)            │
│ 4. 🍱 Restaurant    398 reservations (13%)            │
│ 5. 🍰 Dessert       287 reservations (9%)             │
│ 6. 🥗 Healthy Food  198 reservations (7%)             │
│ 7. 🛒 Grocery       142 reservations (5%)             │
│                                                         │
│ Fastest Growing: Healthy Food (+45% vs last month)   │
│ Declining: Grocery (-12% vs last month)              │
└────────────────────────────────────────────────────────┘
```

**Device Usage:**

```
Mobile (iOS):    1,847 users (63%)
Mobile (Android):  887 users (30%)
Web (Desktop):     198 users (7%)

Insight: Mobile-first is critical (93% mobile users)
```

---

### How Metrics Are Calculated

**GMV (Gross Merchandise Value):**
```sql
SELECT SUM(total_price)
FROM reservations
WHERE status = 'PICKED_UP'
AND created_at >= '2026-02-01'
AND created_at < '2026-03-01'
```

**Platform Revenue (Commission):**
```sql
SELECT SUM(total_price * 0.15) as commission
FROM reservations
WHERE status = 'PICKED_UP'
AND created_at >= '2026-02-01'
```

**Active Users:**
```sql
SELECT COUNT(DISTINCT customer_id)
FROM reservations
WHERE created_at >= '2026-02-01'
```

**Pickup Rate:**
```sql
SELECT 
  (COUNT(*) FILTER (WHERE status = 'PICKED_UP') * 100.0 / COUNT(*))
FROM reservations
WHERE status IN ('PICKED_UP', 'FAILED_PICKUP', 'EXPIRED')
```

**User Lifetime Value (LTV):**
```sql
-- Average revenue per user over their lifetime
SELECT AVG(user_total_spent)
FROM (
  SELECT customer_id, SUM(total_price * 0.15) as user_total_spent
  FROM reservations
  WHERE status = 'PICKED_UP'
  GROUP BY customer_id
) subquery
```

---

### Why Each Metric Matters

**GMV → Market Size**
- Tracks total economic activity
- Growth = platform is scaling
- Used for investor pitches

**Platform Revenue → Profitability**
- Direct revenue from commissions
- Need $50K/month to break even
- Currently at $19K → 38% to goal

**Active Users → Engagement**
- "Active" = reserved this month
- 58% active rate is healthy (target: 60%)
- Declining = product issue

**Platform Health Score → Operational Excellence**
- Composite score of multiple sub-metrics
- Used for dashboards and executive reports
- Alerts if <75

**No-Show Rate → Trust Metric**
- High no-shows → partners leave
- Target: <5%, currently 8% (needs improvement)
- Main focus area for Q1 2026

**LTV/CAC Ratio → Sustainability**
- LTV = Lifetime Value, CAC = Customer Acquisition Cost
- >3x = profitable business
- 6.2x = very healthy

---

### How Admins Use Analytics to Make Decisions

**Example 1: Low Lunch Supply**
- Data: 32% of reservations happen 12-2pm
- Data: Only 15% of offers are available 12-2pm
- Decision: Email partners to post more lunch offers
- Result: +23% lunch offers posted, +18% lunch reservations

**Example 2: Batumi Expansion**
- Data: Higher avg order value (₾47.73 vs ₾40.26 in Tbilisi)
- Data: Only 14 partners (vs 67 in Tbilisi)
- Decision: Focus sales team on Batumi partner recruitment
- Goal: Double partners to 28 in Q1

**Example 3: Mobile App Priority**
- Data: 93% of users on mobile
- Data: Web app has higher bounce rate (45% vs 12%)
- Decision: Deprioritize web features, focus on mobile UX
- Result: More resources allocated to mobile team

---

## 🔔 10️⃣ NOTIFICATIONS & AUTOMATION ENGINE

### Notification Types

**1. Push Notifications (In-App + Mobile)**
- New offer from favorite partner
- Reservation reminder (30 min before pickup)
- Offer expiring soon (<15 min)
- Reservation about to expire
- Points added to account
- Achievement unlocked
- Penalty applied/lifted

**2. Email Notifications**
- Welcome email (signup)
- Email verification
- Reservation confirmation
- Pickup reminder (1 hour before)
- Reservation expired
- Penalty warning
- Weekly digest (offers you might like)

**3. SMS Notifications (Critical Only)**
- Verification code
- Reservation about to expire (15 min)
- Partner cancelled your reservation
- Account banned/suspended

**4. Internal Admin Notifications**
- New partner application
- Support ticket escalated
- Fraud alert triggered
- System error (500s, database down)
- Revenue milestone reached

---

### Rule-Based Automation

**Admin Creates Rules:**

```
╔════════════════════════════════════════════════════════╗
║ Create Automation Rule                                 ║
╠════════════════════════════════════════════════════════╣
║ Rule Name: Remind Users Before Pickup                 ║
║                                                         ║
║ Trigger:                                               ║
║ [When ▾] reservation pickup time                      ║
║ [Is ▾] 30 minutes away                                ║
║                                                         ║
║ Conditions (Optional):                                 ║
║ [If ▾] reservation status                             ║
║ [Is ▾] ACTIVE                                         ║
║                                                         ║
║ Actions:                                               ║
║ 1. Send push notification                             ║
║    Message: "Don't forget! Pickup in 30 min at..."   ║
║ 2. Send email                                          ║
║    Template: reservation_reminder_30min               ║
║                                                         ║
║ Audience: All users with active reservations          ║
║                                                         ║
║ Throttling:                                            ║
║ ☑️ Max 1 notification per user per day                ║
║ ☑️ Respect user notification preferences              ║
║                                                         ║
║ Active: ☑️ Enabled                                    ║
║                                                         ║
║ [Cancel]                         [Create Rule]         ║
╚════════════════════════════════════════════════════════╝
```

---

### Automation Examples

**1. No-Show Prevention:**
```
TRIGGER: Reservation expires in 15 minutes
CONDITION: Status = ACTIVE
ACTION: 
  - Send urgent push: "Last chance! Pickup expires in 15 min"
  - Send SMS if push fails
  - Log notification sent
```

**2. Re-Engagement Campaign:**
```
TRIGGER: User hasn't reserved in 14 days
CONDITION: User has >100 points balance
ACTION:
  - Send email: "You have 100 points! See what's new"
  - Show personalized offers (favorite categories)
  - Track email open/click rates
```

**3. Partner Inactivity Alert:**
```
TRIGGER: Partner hasn't posted offer in 7 days
CONDITION: Partner status = APPROVED
ACTION:
  - Send email: "We miss you! Post a new offer today"
  - Offer free promotion (featured slot)
  - If no response in 7 days → mark as PAUSED
```

**4. Revenue Milestone Celebration:**
```
TRIGGER: Monthly GMV crosses ₾100,000
CONDITION: Not notified this month
ACTION:
  - Send internal Slack message to team
  - Email investors with milestone update
  - Create admin dashboard banner
```

---

### Audience Targeting

**Segment Users:**

```
╔════════════════════════════════════════════════════════╗
║ Define Audience for Campaign                           ║
╠════════════════════════════════════════════════════════╣
║ Audience Name: High-Value Inactive Users              ║
║                                                         ║
║ Filters:                                               ║
║ ☑️ Total reservations ≥ 10                            ║
║ ☑️ Last reservation > 14 days ago                     ║
║ ☑️ Points balance ≥ 50                                ║
║ ☑️ Average rating given ≥ 4.5                         ║
║ ☑️ Email notifications enabled                        ║
║                                                         ║
║ Matched Users: 142 users                              ║
║                                                         ║
║ Preview:                                               ║
║ - Giorgi B. (17 reservations, last 21 days ago)      ║
║ - Nino T. (23 reservations, last 18 days ago)        ║
║ - Lasha K. (14 reservations, last 16 days ago)       ║
║ ...                                                    ║
║                                                         ║
║ [Export List] [Send Test Message] [Launch Campaign]   ║
╚════════════════════════════════════════════════════════╝
```

---

### Throttling Rules (Prevent Spam)

**Rate Limits:**
- Max 3 push notifications per user per day
- Max 2 emails per user per day
- Max 1 SMS per user per week (unless critical)
- If user ignores 5 notifications → reduce frequency

**Quiet Hours:**
- No push notifications 11pm - 8am
- Emails can be sent anytime (user checks at convenience)
- SMS only critical (verification, urgent pickup reminders)

**User Preferences:**
- Allow users to customize notification settings
- Options: All / Important Only / None
- Cannot disable critical notifications (verification, ban notices)

---

### Fail-Safes

**Duplicate Detection:**
- Check if same notification sent in last 5 minutes
- Prevent accidental double-sends
- Log: "Duplicate notification blocked"

**Template Validation:**
- Check for missing variables before sending
- Example: "Hello {{name}}" → if name is null, use "Hello there"
- Prevent broken emails

**Delivery Tracking:**
- Track: Sent / Delivered / Opened / Clicked
- If delivery fails → retry 3 times
- If 3 failures → flag email/device token as invalid

**Batch Sending:**
- Don't send 10,000 emails at once
- Use queue: 1,000 per batch, 30 seconds delay between batches
- Prevents email provider rate limits

---

## 🛟 11️⃣ SUPPORT, DISPUTES & MODERATION

### Support Tickets System ★ NEW ★

**Ticket List View:**

```
╔═══════════════════════════════════════════════════════════════╗
║ 🎫 SUPPORT TICKETS                            [New Ticket]    ║
╠═══════════════════════════════════════════════════════════════╣
║ Filters: [Status ▾] [Priority ▾] [Assigned ▾] [Topic ▾]     ║
║                                                                 ║
║ Smart Views:                                                   ║
║ 🔴 Unassigned (8) | 📋 My Tickets (12) | ⏰ SLA at Risk (3) ║
║                                                                 ║
║ ┌─ TICKET LIST ──────────────────────────────────────────────┐ ║
║ │ #4589 🔴 URGENT | Can't login to account                  │ ║
║ │ User: marina_99 • Unassigned • Opened 18 min ago          │ ║
║ │ [Assign to Me] [View]                                      │ ║
║ │                                                              │ ║
║ │ #4588 🟠 HIGH | Didn't receive points after payment       │ ║
║ │ User: giorgi.b • Assigned: Sarah K. • Opened 42 min ago   │ ║
║ │ SLA: 1h 18m remaining                                      │ ║
║ │ [View]                                                      │ ║
║ │                                                              │ ║
║ │ #4587 🟡 MEDIUM | Partner cancelled my reservation        │ ║
║ │ User: nino.t • Assigned: Alex M. • Opened 2 hours ago     │ ║
║ │ Status: Waiting for user response                          │ ║
║ │ [View]                                                      │ ║
║ │                                                              │ ║
║ │ #4586 ✅ RESOLVED | How to use SmartPoints?               │ ║
║ │ User: lasha.k • Resolved by: Sarah K. • 3 hours ago       │ ║
║ │ Resolution time: 12 minutes (excellent!)                   │ ║
║ │ [View]                                                      │ ║
║ └──────────────────────────────────────────────────────────────┘ ║
║                                                                 ║
║ SLA Performance (Today):                                       ║
║ ⚡ Avg Response Time: 47 minutes (target: <2 hours) ✅        ║
║ ✅ Resolved: 23 tickets (avg 28 min resolution)               ║
║ 📊 Open: 18 tickets | Overdue: 3 tickets ⚠️                  ║
╚═══════════════════════════════════════════════════════════════╝
```

---

### Ticket Detail Page

**URL:** `/admin/support/:ticketId`

```
╔═══════════════════════════════════════════════════════════════╗
║ ← Back to Tickets           #4588 | Didn't receive points    ║
╠═══════════════════════════════════════════════════════════════╣
║ ┌─ TICKET INFO ──────────────────────────────────────────────┐ ║
║ │ Status: 🟠 OPEN (assigned)                                 │ ║
║ │ Priority: HIGH                                              │ ║
║ │ Topic: Payment Issue                                        │ ║
║ │ Assigned to: Sarah K. (you)                                │ ║
║ │ Created: 42 minutes ago                                     │ ║
║ │ SLA: 1h 18m remaining ⏰                                    │ ║
║ │                                                              │ ║
║ │ User: Giorgi B.                                             │ ║
║ │   Email: giorgi.b@gmail.com                                │ ║
║ │   Phone: +995 555 123 456                                  │ ║
║ │   Total Reservations: 23                                    │ ║
║ │   [View Profile] [View Reservations] [Contact User]        │ ║
║ └──────────────────────────────────────────────────────────────┘ ║
║                                                                 ║
║ ┌─ CONVERSATION ──────────────────────────────────────────────┐ ║
║ │ Giorgi B. • 42 min ago                                      │ ║
║ │ I purchased 500 SmartPoints 1 hour ago via credit card     │ ║
║ │ but they haven't been added to my account. Transaction ID:  │ ║
║ │ TXN-4523ABC. Can you help?                                 │ ║
║ │                                                              │ ║
║ │ [Attachments: screenshot.png] [View]                        │ ║
║ │                                                              │ ║
║ │ ─────────────────────────────────────────────────────────   │ ║
║ │                                                              │ ║
║ │ Sarah K. (Internal Note) • 35 min ago                      │ ║
║ │ 📝 Checking transaction TXN-4523ABC in payment logs...     │ ║
║ │                                                              │ ║
║ │ ─────────────────────────────────────────────────────────   │ ║
║ │                                                              │ ║
║ │ [Type your response...]                                     │ ║
║ │                                                              │ ║
║ │ Quick Actions:                                              │ ║ │ [Add 500 Points] [Request More Info] [Escalate to Ops]     │ ║
║ │ [Mark as Resolved] [Close Ticket]                          │ ║
║ └──────────────────────────────────────────────────────────────┘ ║
║                                                                 ║
║ ┌─ RELATED DATA (Auto-Fetched) ─────────────────────────────┐  ║
║ │ 💳 Payment Transaction TXN-4523ABC:                        │ ║
║ │    Status: COMPLETED ✅                                     │ ║
║ │    Amount: ₾25.00 (500 points)                            │ ║
║ │    Date: Feb 3, 2:18 PM                                    │ ║
║ │    Method: Credit Card (•••• 4523)                         │ ║
║ │    Gateway Response: SUCCESS                                │ ║
║ │                                                              │ ║
║ │ 💰 User Points Balance:                                    │ ║
║ │    Current: 342 points                                      │ ║
║ │    Expected: 842 points (if 500 added)                    │ ║
║ │                                                              │ ║
║ │ 📜 Point Transactions (Last 24h):                          │ ║
║ │    Feb 3, 1:45 PM: -50 pts (reservation)                  │ ║
║ │    Feb 3, 9:30 AM: +100 pts (referral bonus)              │ ║
║ │    Feb 2, 6:15 PM: -30 pts (reservation)                  │ ║
║ │    ❌ No record of +500 pts from TXN-4523ABC               │ ║
║ │                                                              │ ║
║ │ 🔍 Root Cause: Payment webhook might have failed           │ ║
║ │    [Manually Add Points] [Retry Webhook]                   │ ║
║ └──────────────────────────────────────────────────────────────┘ ║
╚═══════════════════════════════════════════════════════════════╝
```

---

### Ticket Lifecycle

**States:**

1. **UNASSIGNED**
   - Just created
   - Waiting for agent to claim
   - SLA clock starts

2. **ASSIGNED**
   - Agent claimed ticket
   - Agent investigating
   - Can add internal notes

3. **WAITING_FOR_USER**
   - Agent requested more info
   - SLA paused
   - Auto-reminder if no response in 48h

4. **RESOLVED**
   - Issue fixed
   - User notified
   - Stays open 24h in case user responds

5. **CLOSED**
   - Fully completed
   - Archived after 7 days
   - Can be reopened if user responds

---

### Dispute Resolution

**Dispute Types:**

1. **User vs Partner:**
   - User says didn't receive item
   - Partner says user picked up
   - Need evidence from both sides

2. **User vs Platform:**
   - Points not refunded after cancellation
   - Ban unfair
   - Payment issue

3. **Partner vs Platform:**
   - Commission calculation incorrect
   - Unfair no-show attribution
   - Account suspended by mistake

**Resolution Process:**

```
╔════════════════════════════════════════════════════════╗
║ Resolve Dispute #D-4523                                ║
╠════════════════════════════════════════════════════════╣
║ Type: User vs Partner                                  ║
║ User: Giorgi B. claims "didn't receive item"          ║
║ Partner: Vake Bakery claims "user picked up"          ║
║ Reservation: #R-8847 (Croissant Bundle, 50 pts)      ║
║                                                         ║
║ Evidence Collected:                                    ║
║ ☑️ User statement: [View]                             ║
║ ☑️ Partner statement: [View]                          ║
║ ☑️ Partner photo evidence: croissants_packed.jpg      ║
║ ☐ User photo evidence: None submitted                 ║
║ ☑️ Pickup timestamp: 5:42 PM (within window)          ║
║ ☑️ GPS location: User was at bakery at 5:42 PM ✅    ║
║                                                         ║
║ Admin Decision:                                        ║
║ ● Rule in favor of partner                            ║
║ ○ Rule in favor of user                               ║
║ ○ Split decision (partial refund)                     ║
║                                                         ║
║ Reasoning (Required):                                  ║
║ [Text Area - Min 100 chars]                           ║
║                                                         ║
║ Actions:                                               ║
║ If Partner Wins:                                       ║
║   ☐ No refund to user                                 ║
║   ☐ Update user reliability score (-5)                ║
║   ☐ Flag user if multiple disputes                    ║
║                                                         ║
║ If User Wins:                                          ║
║   ☐ Refund 50 points to user                          ║
║   ☐ Add 25 compensation points                        ║
║   ☐ Warn partner (trust score -10)                    ║
║                                                         ║
║ [Cancel]                         [Submit Decision]     ║
╚════════════════════════════════════════════════════════╝
```

---

### Evidence Attachment

**Users/Partners Can Upload:**
- Photos (max 5 per dispute)
- Videos (max 30 seconds)
- Screenshots
- Receipts

**Admin Can Request:**
- Security camera footage (from partner)
- Bank transaction proof
- GPS location history
- Device logs

**Storage:**
- Supabase Storage (encrypted)
- Auto-delete after dispute resolved + 30 days
- GDPR compliant

---

### Resolution Outcomes

**Possible Resolutions:**

1. **Full Refund to User:**
   - User was right
   - Partner made mistake
   - Points returned + compensation

2. **No Refund (Partner Correct):**
   - Partner evidence strong
   - User trying to scam
   - No action

3. **Partial Refund (50%):**
   - Unclear situation
   - Goodwill gesture
   - Both parties partially right

4. **Partner Penalized:**
   - Clear policy violation
   - Refund + compensation to user
   - Partner trust score reduced
   - Warning or suspension

5. **User Penalized:**
   - False claim
   - Fraudulent dispute
   - User reliability score reduced
   - Warning or ban

---

### SLA Logic

**Response Time SLA:**

| Priority | Target Response | Alert If Exceeded |
|----------|-----------------|-------------------|
| 🔴 URGENT | 30 minutes | Immediate Slack alert |
| 🟠 HIGH | 2 hours | Email to ops manager |
| 🟡 MEDIUM | 8 hours | Dashboard alert |
| 🟢 LOW | 24 hours | Weekly report |

**Resolution Time SLA:**

| Type | Target Resolution | Current Avg |
|------|-------------------|-------------|
| Payment Issue | 2 hours | 1.5 hours ✅ |
| Account Issue | 4 hours | 3.2 hours ✅ |
| Dispute | 24 hours | 18 hours ✅ |
| General Question | 8 hours | 4.7 hours ✅ |

**SLA Tracking:**
- Color-coded: Green (on track), Yellow (at risk), Red (overdue)
- Auto-escalate to Operations Admin if SLA missed
- Report: SLA compliance rate (target: >95%)

---

### Abuse Detection (Support Side)

**Patterns Indicating Abuse:**

1. **Serial Complainer:**
   - User files 5+ disputes in 30 days
   - All disputes ruled against user
   - Action: Flag user, investigate for fraud

2. **Fake Evidence:**
   - Photo metadata doesn't match claim
   - Reverse image search finds stock photo
   - Action: Ban user immediately, report to legal

3. **Refund Farmer:**
   - User requests refund every time
   - Pattern: reserves, doesn't pickup, demands refund
   - Action: Ban after 3 attempts

4. **Partner Gaming System:**
   - Partner always claims "no-show" even when user shows
   - Multiple user complaints
   - Action: Suspend partner, investigate

---

### Audit Logs (Dispute Trail)

**Every action logged:**
- Who viewed dispute
- Who requested evidence
- Who made decision
- Date/time stamps
- IP addresses
- Reasoning provided

**Immutable:**
- Cannot be edited after submission
- Blockchain-style hash for integrity
- Used for legal compliance if disputes escalate

---

## ⚙️ 12️⃣ SETTINGS & CONFIGURATION

### System Settings Dashboard

```
╔═══════════════════════════════════════════════════════════════╗
║ ⚙️ SYSTEM SETTINGS                          [Save Changes]    ║
╠═══════════════════════════════════════════════════════════════╣
║ [General] [Pricing] [Reservations] [Penalties] [Features]    ║
║ ══════════════════════════════════════════════════════════════ ║
║ ┌─ GENERAL SETTINGS ─────────────────────────────────────────┐ ║
║ │ Platform Name:                                             │ ║
║ │ [SmartPick]                                                │ ║
║ │                                                             │ ║
║ │ Support Email:                                              │ ║
║ │ [support@smartpick.ge]                                     │ ║
║ │                                                             │ ║
║ │ Support Phone:                                              │ ║
║ │ [+995 557 737 399]                                         │ ║
║ │                                                             │ ║
║ │ Operating Cities:                                           │ ║
║ │ ☑️ Tbilisi                                                 │ ║
║ │ ☑️ Batumi                                                  │ ║
║ │ ☑️ Kutaisi                                                 │ ║
║ │ ☑️ Rustavi                                                 │ ║
║ │ ☐ Zugdidi (coming soon)                                    │ ║
║ │                                                             │ ║
║ │ Default Language:                                           │ ║
║ │ [English ▾] (Georgian also supported)                      │ ║
║ │                                                             │ ║
║ │ Maintenance Mode:                                           │ ║
║ │ ☐ Enable (blocks all users except admins)                 │ ║
║ │ Message: [We're upgrading the system...]                   │ ║
║ └─────────────────────────────────────────────────────────────┘ ║
╚═══════════════════════════════════════════════════════════════╝
```

---

### Pricing Settings

```
╔═══════════════════════════════════════════════════════════════╗
║ 💰 PRICING & COMMISSION                                       ║
╠═══════════════════════════════════════════════════════════════╣
║ SmartPoints Pricing:                                          ║
║   100 points = ₾ [5.00] GEL                                  ║
║   (Users pay ₾5 for 100 points)                              ║
║                                                                 ║
║ Point Packages:                                                ║
║   ☑️ 100 points = ₾5.00                                      ║
║   ☑️ 500 points = ₾23.00 (8% discount)                      ║
║   ☑️ 1000 points = ₾42.00 (16% discount)                    ║
║   ☑️ 2000 points = ₾78.00 (22% discount)                    ║
║                                                                 ║
║ Partner Commission:                                            ║
║   Standard Rate: [15]%                                         ║
║   (Platform takes 15% of each successful pickup)              ║
║                                                                 ║
║   High-Volume Discount:                                        ║
║   ☑️ >50 pickups/month: 12%                                  ║
║   ☑️ >100 pickups/month: 10%                                 ║
║                                                                 ║
║ Payment Processing Fees:                                       ║
║   Credit Card: [2.9]% + ₾0.30                                ║
║   Bank Transfer: [1.2]% flat                                  ║
║                                                                 ║
║ Refund Policy:                                                 ║
║   ☑️ Full refund if partner cancels                          ║
║   ☑️ No refund if user no-shows                              ║
║   ☑️ 50% refund if cancelled >24h before pickup              ║
║   ☐ Allow refunds <24h (not recommended)                     ║
╚═══════════════════════════════════════════════════════════════╝
```

---

### Reservation Settings

```
╔═══════════════════════════════════════════════════════════════╗
║ 📦 RESERVATION RULES                                          ║
╠═══════════════════════════════════════════════════════════════╣
║ Reservation Window:                                            ║
║   Duration: [90] minutes (from reservation to pickup)         ║
║   (User has 90 min to arrive and pickup)                      ║
║                                                                 ║
║   Min Advance Notice: [30] minutes                            ║
║   (Pickup must be at least 30 min after reservation)          ║
║                                                                 ║
║   Max Advance Notice: [24] hours                              ║
║   (Can't reserve more than 24h ahead)                         ║
║                                                                 ║
║ Quantity Limits:                                               ║
║   Base Slots: [3] items per reservation                       ║
║   Max Slots: [10] items (after upgrades)                      ║
║   Slot Upgrade Cost: [200] points per additional slot         ║
║                                                                 ║
║ Auto-Expiry:                                                   ║
║   ☑️ Auto-expire after pickup window ends                    ║
║   ☑️ Send reminder 30 min before expiry                      ║
║   ☑️ Send urgent alert 15 min before expiry                  ║
║   Grace Period: [5] minutes (after expiry, before penalty)    ║
║                                                                 ║
║ Cancellation Rules:                                            ║
║   Free Cancellation: [30] minutes before pickup               ║
║   (Cancel >30 min = full refund, <30 min = no refund)        ║
║                                                                 ║
║   Max Cancellations: [3] per day                              ║
║   (Prevents abuse - can't book/cancel repeatedly)             ║
╚═══════════════════════════════════════════════════════════════╝
```

---

### Penalty Settings

```
╔═══════════════════════════════════════════════════════════════╗
║ 🚫 PENALTY SYSTEM                                             ║
╠═══════════════════════════════════════════════════════════════╣
║ No-Show Penalties:                                             ║
║   1st Offense: [WARNING] (no ban, just warning message)       ║
║   2nd Offense: [1 HOUR] ban                                   ║
║   3rd Offense: [24 HOUR] ban                                  ║
║   4th Offense: [PERMANENT] ban (requires admin review)        ║
║                                                                 ║
║ Point Lift System:                                             ║
║   ☑️ Allow users to lift penalties with points               ║
║   1-hour ban: [50] points to lift                             ║
║   24-hour ban: [200] points to lift                           ║
║   Permanent ban: Cannot be lifted with points                 ║
║                                                                 ║
║ Partner Forgiveness:                                           ║
║   ☑️ Allow partners to forgive no-shows                       ║
║   Max Forgiveness Requests: [5] per week per partner         ║
║   Auto-Approval: ☐ (requires admin approval)                 ║
║                                                                 ║
║ Reliability Score:                                             ║
║   No-Show Penalty: [-10] points per offense                   ║
║   Successful Pickup Bonus: [+1] point                         ║
║   Streak Bonus (10+ pickups): [+5] points                    ║
║   Score Reset: ☑️ After [30] days of good behavior           ║
║                                                                 ║
║ Auto-Ban Triggers:                                             ║
║   ☑️ 3 no-shows in 7 days → auto 24-hour ban                ║
║   ☑️ Reliability score <25 → flag for review                 ║
║   ☑️ 5 disputes filed (lost) → permanent ban                 ║
╚═══════════════════════════════════════════════════════════════╝
```

---

### Feature Flags

```
╔═══════════════════════════════════════════════════════════════╗
║ 🚩 FEATURE FLAGS                                              ║
╠═══════════════════════════════════════════════════════════════╣
║ User-Facing Features:                                          ║
║   ☑️ Referral System (earn 50 pts per referral)              ║
║   ☑️ Achievement System (gamification)                        ║
║   ☑️ Slot Unlocking (buy more reservation slots)             ║
║   ☑️ Favorites (save favorite partners)                       ║
║   ☐ Social Sharing (share offers) - Beta                     ║
║   ☐ Reviews & Ratings - Coming Soon                          ║
║                                                                 ║
║ Partner Features:                                              ║
║   ☑️ Auto-Relist (auto-repost sold-out offers)               ║
║   ☑️ Scheduled Publishing (post offers for future)            ║
║   ☑️ Bulk Upload (CSV import for multiple offers)            ║
║   ☑️ Analytics Dashboard                                      ║
║   ☐ Premium Partner Badge - Beta                             ║
║                                                                 ║
║ Payment Methods:                                               ║
║   ☑️ Credit/Debit Card (Stripe)                              ║
║   ☑️ Bank Transfer (BOG)                                      ║
║   ☐ Apple Pay - Coming Soon                                  ║
║   ☐ Google Pay - Coming Soon                                 ║
║   ☐ Crypto (USDT) - Experimental                             ║
║                                                                 ║
║ Advanced Features:                                             ║
║   ☐ AI-Powered Recommendations - Beta                         ║
║   ☐ Dark Mode - Testing                                       ║
║   ☑️ Push Notifications                                       ║
║   ☑️ Email Notifications                                      ║
║   ☐ SMS Notifications (too expensive)                         ║
╚═══════════════════════════════════════════════════════════════╝
```

---

### What Must Be Editable

**✅ Safe to Edit:**
- Support contact info
- Operating cities
- Notification timing
- Commission rates (with approval)
- Penalty durations
- Feature flags (on/off)
- Cancellation windows
- Slot pricing

**⚠️ Edit with Caution:**
- SmartPoints pricing (affects revenue model)
- Pickup window duration (affects user behavior)
- Base reservation slots (affects UX significantly)

**🔒 Locked (Cannot Edit):**
- User IDs (immutable)
- Transaction history (audit trail)
- Audit logs (compliance)
- Database schema (requires migration)

---

### Change Log & Audit

**Every settings change tracked:**
- Who changed it
- What was changed (old value → new value)
- When it was changed
- Why it was changed (required comment)
- IP address

**Example Log:**
```
Feb 3, 2026 3:45 PM
Changed by: Sarah K. (Operations Admin)
Setting: Pickup Window Duration
Old Value: 60 minutes
New Value: 90 minutes
Reason: "Users complained 60 min not enough time during traffic"
IP: 185.123.45.67
```

---

## 🗄️ 13️⃣ DATABASE MODELS (HIGH LEVEL)

### Core Tables

**users**
```
- id (UUID, PK)
- email (TEXT, UNIQUE)
- name (TEXT)
- phone (TEXT)
- avatar_url (TEXT)
- role (ENUM: CUSTOMER, PARTNER, ADMIN)
- status (ENUM: ACTIVE, DISABLED)
- penalty_until (TIMESTAMPTZ, nullable)
- penalty_count (INT, default 0)
- penalty_warning_shown (BOOLEAN, default false)
- max_reservation_quantity (INT, default 3)
- purchased_slots (JSONB, array of purchase history)
- referral_code (TEXT, UNIQUE)
- referred_by (UUID, FK → users.id, nullable)
- is_email_verified (BOOLEAN, default false)
- last_login (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

**partners**
```
- id (UUID, PK)
- user_id (UUID, FK → users.id)
- business_name (TEXT)
- business_type (ENUM: BAKERY, RESTAURANT, CAFE, etc.)
- description (TEXT)
- address (TEXT)
- city (TEXT)
- latitude (DOUBLE)
- longitude (DOUBLE)
- location (GEOGRAPHY POINT) -- PostGIS for spatial queries
- phone (TEXT)
- email (TEXT)
- telegram (TEXT, nullable)
- whatsapp (TEXT, nullable)
- business_hours (JSONB)
- status (ENUM: PENDING, APPROVED, REJECTED, BLOCKED, PAUSED)
- images (TEXT[])
- cover_image_url (TEXT, nullable)
- approved_for_upload (BOOLEAN, default false)
- image_quota_used (INT, default 0)
- image_quota_max (INT, default 15)
- trust_score (INT, default 100)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

**offers**
```
- id (UUID, PK)
- partner_id (UUID, FK → partners.id)
- category (TEXT)
- title (TEXT)
- description (TEXT)
- images (TEXT[])
- original_price (NUMERIC(10,2))
- smart_price (NUMERIC(10,2))
- quantity_available (INT)
- quantity_total (INT)
- pickup_start (TIMESTAMPTZ)
- pickup_end (TIMESTAMPTZ)
- status (ENUM: ACTIVE, EXPIRED, PAUSED, SOLD_OUT, SCHEDULED)
- is_flagged (BOOLEAN, default false)
- flagged_reason (TEXT, nullable)
- auto_relist_enabled (BOOLEAN, default false)
- last_relisted_at (TIMESTAMPTZ, nullable)
- scheduled_publish_at (TIMESTAMPTZ, nullable)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
- expires_at (TIMESTAMPTZ)
```

**reservations**
```
- id (UUID, PK)
- offer_id (UUID, FK → offers.id)
- customer_id (UUID, FK → users.id)
- partner_id (UUID, FK → partners.id)
- qr_code (TEXT, UNIQUE)
- quantity (INT)
- total_price (NUMERIC(10,2))
- smart_price (NUMERIC(10,2))
- status (ENUM: ACTIVE, PICKED_UP, CANCELLED, EXPIRED, FAILED_PICKUP)
- points_spent (INT)
- user_confirmed_pickup (BOOLEAN, default false)
- no_show (BOOLEAN, default false)
- forgiveness_requested (BOOLEAN, default false)
- forgiveness_request_reason (TEXT, nullable)
- forgiveness_approved (BOOLEAN, default false)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
- expires_at (TIMESTAMPTZ)
- picked_up_at (TIMESTAMPTZ, nullable)
```

**user_points**
```
- id (UUID, PK)
- user_id (UUID, FK → users.id, UNIQUE)
- balance (INT, default 100, CHECK >= 0)
- updated_at (TIMESTAMPTZ)
```

**point_transactions**
```
- id (UUID, PK)
- user_id (UUID, FK → users.id)
- change (INT) -- positive = add, negative = deduct
- reason (TEXT) -- 'registration', 'reservation', 'refund', etc.
- balance_before (INT)
- balance_after (INT)
- metadata (JSONB)
- created_at (TIMESTAMPTZ)
```

**user_penalties**
```
- id (UUID, PK)
- user_id (UUID, FK → users.id)
- reservation_id (UUID, FK → reservations.id)
- partner_id (UUID, FK → partners.id)
- offense_number (INT, 1-4)
- offense_type (ENUM: missed_pickup, late_cancellation, no_show)
- penalty_type (ENUM: warning, 1hour, 24hour, permanent)
- suspended_until (TIMESTAMPTZ, nullable)
- is_active (BOOLEAN, default true)
- acknowledged (BOOLEAN, default false)
- can_lift_with_points (BOOLEAN, default false)
- points_required (INT, default 0)
- lifted_with_points (BOOLEAN, default false)
- forgiveness_requested (BOOLEAN, default false)
- forgiveness_status (ENUM: pending, granted, denied, expired)
- admin_reviewed (BOOLEAN, default false)
- admin_decision (ENUM: unban, reduce_penalty, keep_banned, extend_ban)
- admin_notes (TEXT, nullable)
- reviewed_by (UUID, FK → users.id, nullable)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

**user_stats** (Gamification)
```
- id (UUID, PK)
- user_id (UUID, FK → users.id, UNIQUE)
- total_reservations (INT, default 0)
- total_money_saved (NUMERIC(10,2), default 0)
- favorite_category (TEXT, nullable)
- current_streak_days (INT, default 0)
- longest_streak_days (INT, default 0)
- last_activity_date (DATE, nullable)
- total_referrals (INT, default 0)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

**achievement_definitions**
```
- id (TEXT, PK) -- e.g., 'first_pick'
- name (TEXT)
- description (TEXT)
- icon (TEXT) -- emoji
- category (ENUM: milestone, social, engagement, savings)
- tier (ENUM: bronze, silver, gold, platinum)
- requirement (JSONB)
- reward_points (INT)
- is_active (BOOLEAN, default true)
- created_at (TIMESTAMPTZ)
```

**user_achievements**
```
- id (UUID, PK)
- user_id (UUID, FK → users.id)
- achievement_id (TEXT, FK → achievement_definitions.id)
- unlocked_at (TIMESTAMPTZ)
- is_new (BOOLEAN, default true)
- viewed_at (TIMESTAMPTZ, nullable)
- UNIQUE(user_id, achievement_id)
```

**contact_submissions** ★ NEW ★
```
- id (UUID, PK)
- ticket_id (TEXT, UNIQUE) -- e.g., 'SP4523'
- full_name (TEXT)
- email (TEXT)
- phone (TEXT, nullable)
- topic (ENUM: technical, reservation, partnership, general, other)
- message (TEXT)
- status (ENUM: pending, in_progress, resolved, closed)
- priority (ENUM: low, medium, high, urgent)
- assigned_to (UUID, FK → users.id, nullable)
- captcha_token (TEXT)
- resolved_at (TIMESTAMPTZ, nullable)
- resolved_by (UUID, FK → users.id, nullable)
- internal_notes (TEXT, nullable)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

**partner_points**
```
- id (UUID, PK)
- user_id (UUID, FK → partners.id, UNIQUE) -- confusingly named but correct
- balance (INT, default 250)
- offer_slots (INT, default 10)
- updated_at (TIMESTAMPTZ)
```

**partner_point_transactions**
```
- id (UUID, PK)
- partner_id (UUID, FK → partners.id)
- change (INT)
- reason (TEXT)
- balance_before (INT)
- balance_after (INT)
- metadata (JSONB)
- created_at (TIMESTAMPTZ)
```

**audit_log**
```
- id (UUID, PK)
- event_type (TEXT) -- e.g., 'USER_BANNED', 'PARTNER_APPROVED'
- actor_id (UUID, FK → users.id, nullable) -- who did it
- target_id (UUID, nullable) -- what it was done to
- metadata (JSONB) -- additional context
- ip_address (TEXT, nullable)
- created_at (TIMESTAMPTZ)
```

**system_settings**
```
- id (UUID, PK)
- key (TEXT, UNIQUE) -- e.g., 'maintenance_mode'
- value (JSONB) -- flexible storage
- updated_by (UUID, FK → users.id, nullable)
- updated_at (TIMESTAMPTZ)
```

**referral_tracking** (Fraud Prevention)
```
- id (UUID, PK)
- referrer_id (UUID, FK → users.id)
- referee_id (UUID, FK → users.id)
- referral_code (TEXT)
- referee_device_id (TEXT, nullable)
- referee_ip (TEXT, nullable)
- status (ENUM: pending, verified, fraud, expired)
- points_awarded (INT, default 0)
- created_at (TIMESTAMPTZ)
```

**email_verification_tokens**
```
- id (UUID, PK)
- user_id (UUID, FK → users.id)
- token (TEXT, UNIQUE)
- expires_at (TIMESTAMPTZ)
- used (BOOLEAN, default false)
- created_at (TIMESTAMPTZ)
```

---

### Relationships

**One-to-One:**
- users → user_points
- users → user_stats
- partners → partner_points

**One-to-Many:**
- users → reservations (customer_id)
- users → user_penalties
- users → user_achievements
- users → point_transactions
- partners → offers
- partners → reservations (partner_id)
- offers → reservations

**Many-to-Many:**
- users ↔ achievement_definitions (via user_achievements)

---

### Indexes (Critical for Performance)

**Spatial Indexes:**
```sql
CREATE INDEX idx_partners_location_gist ON partners USING GIST(location);
```

**Query Optimization Indexes:**
```sql
-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_referral_code ON users(referral_code);

-- Partners
CREATE INDEX idx_partners_user_id ON partners(user_id);
CREATE INDEX idx_partners_status ON partners(status);
CREATE INDEX idx_partners_city ON partners(city);

-- Offers
CREATE INDEX idx_offers_partner_id ON offers(partner_id);
CREATE INDEX idx_offers_status ON offers(status);
CREATE INDEX idx_offers_category ON offers(category);
CREATE INDEX idx_offers_expires_at ON offers(expires_at);
CREATE INDEX idx_offers_active ON offers(status, expires_at, quantity_available) WHERE status = 'ACTIVE';

-- Reservations
CREATE INDEX idx_reservations_customer_id ON reservations(customer_id);
CREATE INDEX idx_reservations_partner_id ON reservations(partner_id);
CREATE INDEX idx_reservations_offer_id ON reservations(offer_id);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_expires_at ON reservations(expires_at);

-- Penalties
CREATE INDEX idx_user_penalties_user_id ON user_penalties(user_id);
CREATE INDEX idx_user_penalties_active ON user_penalties(is_active) WHERE is_active = true;

-- Points
CREATE INDEX idx_point_transactions_user_id ON point_transactions(user_id);
CREATE INDEX idx_point_transactions_created_at ON point_transactions(created_at DESC);

-- Support Tickets
CREATE INDEX idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX idx_contact_submissions_assigned_to ON contact_submissions(assigned_to);
CREATE INDEX idx_contact_submissions_email ON contact_submissions(email);

-- Audit Log
CREATE INDEX idx_audit_log_actor_id ON audit_log(actor_id);
CREATE INDEX idx_audit_log_event_type ON audit_log(event_type);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
```

---

## 🔌 14️⃣ APIS REQUIRED (ADMIN SIDE)

### Authentication & Authorization

**POST `/admin/auth/login`**
- Purpose: Admin login with email/password
- Body: `{ email, password }`
- Response: `{ token, user: { id, name, role, permissions } }`
- Security: Rate limited (5 attempts per 15 min), 2FA for Super Admin

**POST `/admin/auth/verify-2fa`**
- Purpose: Second factor verification
- Body: `{ userId, code }`
- Response: `{ success, token }`

**POST `/admin/auth/logout`**
- Purpose: Invalidate admin session
- Security: Clear token, log to audit trail

---

### User Management

**GET `/admin/users`**
- Purpose: List users with filters
- Params: `status, role, search, page, limit, sortBy, sortOrder`
- Response: `{ users: [], total, page, pages }`
- Security: Operations Admin+

**GET `/admin/users/:userId`**
- Purpose: Get user profile + detailed stats
- Response: `{ user, stats, penalties, reservations, pointBalance }`
- Security: Support Agent+

**PATCH `/admin/users/:userId`**
- Purpose: Update user details
- Body: `{ name, email, phone, role, status }`
- Security: Operations Admin+, logs to audit trail

**POST `/admin/users/:userId/ban`**
- Purpose: Ban/suspend user
- Body: `{ reason, duration, notifyUser }`
- Response: `{ success, penaltyId }`
- Security: Operations Admin+, requires reason

**POST `/admin/users/:userId/points`**
- Purpose: Add/remove points manually
- Body: `{ amount, reason, notes }`
- Security: Operations Admin+, logged to point_transactions

**DELETE `/admin/users/:userId`**
- Purpose: GDPR delete user
- Security: Super Admin only, requires 2FA, scrubs PII

---

### Partner Management

**GET `/admin/partners`**
- Purpose: List partners with filters
- Params: `status, city, businessType, search, page, limit`
- Response: `{ partners: [], total }`
- Security: Support Agent+

**GET `/admin/partners/:partnerId`**
- Purpose: Get partner profile + performance metrics
- Response: `{ partner, stats: { totalOffers, pickupRate, revenue, trustScore } }`
- Security: Support Agent+

**POST `/admin/partners/:partnerId/approve`**
- Purpose: Approve pending partner
- Body: `{ notes }`
- Response: `{ success }`
- Security: Operations Admin+, sends welcome email

**POST `/admin/partners/:partnerId/reject`**
- Purpose: Reject partner application
- Body: `{ reason (required), detailedExplanation }`
- Security: Operations Admin+, sends rejection email

**POST `/admin/partners/:partnerId/block`**
- Purpose: Block active partner
- Body: `{ reason, duration, hideOffers, cancelReservations }`
- Security: Operations Admin+, Super Admin for permanent

**PATCH `/admin/partners/:partnerId/commission`**
- Purpose: Override commission rate
- Body: `{ newRate, reason }`
- Security: Super Admin only

---

### Offer Management

**GET `/admin/offers`**
- Purpose: List all offers with filters
- Params: `status, partnerId, category, flagged, expiringIn, page`
- Response: `{ offers: [], total }`
- Security: Support Agent+

**GET `/admin/offers/:offerId`**
- Purpose: Get offer details + reservations
- Response: `{ offer, reservations: [], analytics: { views, conversionRate } }`
- Security: Support Agent+

**PATCH `/admin/offers/:offerId/pause`**
- Purpose: Pause/unpause offer
- Body: `{ reason }`
- Security: Operations Admin+

**POST `/admin/offers/:offerId/flag`**
- Purpose: Flag offer for review
- Body: `{ reason, autoHide: boolean }`
- Security: Operations Admin+

**DELETE `/admin/offers/:offerId`**
- Purpose: Delete offer (emergency)
- Body: `{ reason, refundReservations: boolean }`
- Security: Operations Admin+

---

### Reservation Management

**GET `/admin/reservations`**
- Purpose: List reservations (real-time feed)
- Params: `status, partnerId, customerId, expiringIn, page`
- Response: `{ reservations: [], total }`
- Security: Support Agent+

**GET `/admin/reservations/:reservationId`**
- Purpose: Get reservation details
- Response: `{ reservation, offer, customer, partner }`
- Security: Support Agent+

**POST `/admin/reservations/:reservationId/extend`**
- Purpose: Extend reservation time
- Body: `{ extensionMinutes, reason }`
- Security: Operations Admin+

**POST `/admin/reservations/:reservationId/force-complete`**
- Purpose: Manually mark as picked up
- Body: `{ reason, partnerConfirmation: boolean }`
- Security: Operations Admin+

**POST `/admin/reservations/:reservationId/cancel`**
- Purpose: Admin cancel reservation
- Body: `{ reason, refundPoints: boolean }`
- Security: Operations Admin+

---

### Support Tickets ★ NEW ★

**GET `/admin/support/tickets`**
- Purpose: List support tickets
- Params: `status, priority, assignedTo, topic, page`
- Response: `{ tickets: [], total, slaStats }`
- Security: Support Agent+

**GET `/admin/support/tickets/:ticketId`**
- Purpose: Get ticket details + conversation
- Response: `{ ticket, messages: [], relatedData }`
- Security: Support Agent+

**POST `/admin/support/tickets/:ticketId/assign`**
- Purpose: Assign ticket to agent
- Body: `{ assigneeId }`
- Security: Support Agent+ (can assign to self)

**POST `/admin/support/tickets/:ticketId/reply`**
- Purpose: Add message to ticket
- Body: `{ message, isInternalNote: boolean, attachments: [] }`
- Security: Support Agent+

**PATCH `/admin/support/tickets/:ticketId/status`**
- Purpose: Update ticket status
- Body: `{ status, resolution }`
- Security: Support Agent+

**POST `/admin/support/tickets/:ticketId/escalate`**
- Purpose: Escalate to Operations Admin
- Body: `{ reason }`
- Security: Support Agent+

---

### Analytics & Reports

**GET `/admin/analytics/dashboard`**
- Purpose: Get overview KPIs
- Response: `{ gmv, revenue, activeUsers, pickupRate, healthScore }`
- Security: Finance+

**GET `/admin/analytics/users`**
- Purpose: User growth & behavior analytics
- Params: `startDate, endDate, groupBy`
- Response: `{ signups, activations, retention, ltv }`
- Security: Finance+

**GET `/admin/analytics/partners`**
- Purpose: Partner performance analytics
- Response: `{ topPartners, churnRate, avgOffersPerPartner }`
- Security: Finance+

**GET `/admin/analytics/revenue`**
- Purpose: Financial analytics
- Params: `startDate, endDate`
- Response: `{ pointsPurchased, commissionsEarned, refunds, netRevenue }`
- Security: Finance+ only

**GET `/admin/analytics/geo`**
- Purpose: Geographic distribution
- Response: `{ cities: [{ city, users, partners, gmv }] }`
- Security: Finance+

**POST `/admin/analytics/export`**
- Purpose: Export data to CSV
- Body: `{ reportType, filters, columns }`
- Response: CSV file download
- Security: Finance+ only, PII masked

---

### Fraud Prevention

**GET `/admin/fraud/referrals`**
- Purpose: Detect referral fraud patterns
- Response: `{ suspiciousPatterns: [{ userId, reason, evidence }] }`
- Security: Operations Admin+

**GET `/admin/fraud/multi-accounts`**
- Purpose: Detect multiple accounts from same device/IP
- Response: `{ clusters: [{ deviceId, accounts: [] }] }`
- Security: Operations Admin+

**POST `/admin/fraud/investigate`**
- Purpose: Deep dive into user
- Body: `{ userId }`
- Response: `{ deviceHistory, ipHistory, associatedAccounts, riskScore }`
- Security: Operations Admin+

---

### Notifications & Automation

**POST `/admin/notifications/send`**
- Purpose: Send notification to users
- Body: `{ audience: { filters }, message, channels: ['push', 'email'] }`
- Security: Operations Admin+

**POST `/admin/notifications/broadcast`**
- Purpose: Send announcement to all users
- Body: `{ subject, message, priority }`
- Security: Super Admin only

**GET `/admin/automation/rules`**
- Purpose: List automation rules
- Response: `{ rules: [] }`
- Security: Operations Admin+

**POST `/admin/automation/rules`**
- Purpose: Create automation rule
- Body: `{ trigger, conditions, actions }`
- Security: Operations Admin+

---

### System Administration

**GET `/admin/system/health`**
- Purpose: System health check
- Response: `{ database, api, storage, realtime, errors }`
- Security: Operations Admin+

**GET `/admin/system/audit-log`**
- Purpose: View audit trail
- Params: `actorId, eventType, startDate, endDate, page`
- Response: `{ logs: [] }`
- Security: Finance+ (view only), Super Admin (full access)

**GET `/admin/system/settings`**
- Purpose: Get system settings
- Response: `{ settings: { key: value } }`
- Security: Operations Admin+ (view), Super Admin (edit)

**PATCH `/admin/system/settings`**
- Purpose: Update system setting
- Body: `{ key, value, reason }`
- Security: Super Admin only

**POST `/admin/system/maintenance`**
- Purpose: Enable/disable maintenance mode
- Body: `{ enabled, message }`
- Security: Super Admin only

---

### Security Notes

**All endpoints require:**
- Valid JWT token in `Authorization: Bearer <token>` header
- Rate limiting (100 requests per minute per admin)
- CORS restricted to admin domain only
- HTTPS only (TLS 1.3)

**Sensitive endpoints additionally require:**
- 2FA confirmation for destructive actions (delete, ban)
- IP whitelist for financial operations
- Audit logging (who, what, when, why)

**Error Responses:**
```json
{
  "error": true,
  "code": "UNAUTHORIZED",
  "message": "Insufficient permissions",
  "details": "This action requires Super Admin role"
}
```

---

## 🎨 15️⃣ UX & UI GUIDELINES

### Visual Hierarchy

**Color System:**

```
Primary Colors:
- Teal #14B8A6 (actions, links, active states)
- Emerald #10B981 (success, positive actions)

Status Colors:
- Red #EF4444 (urgent, errors, critical)
- Orange #F97316 (warnings, attention needed)
- Yellow #F59E0B (caution, review)
- Green #22C55E (success, completed)
- Blue #3B82F6 (info, neutral)
- Gray #6B7280 (disabled, inactive)

Background:
- White #FFFFFF (cards, modals)
- Gray-50 #F9FAFB (page background)
- Gray-100 #F3F4F6 (subtle backgrounds)
- Gray-900 #111827 (text, headers)

Borders:
- Gray-200 #E5E7EB (default borders)
- Gray-300 #D1D5DB (hover borders)
```

**Typography:**

```
Font Family: Inter (system fallback: -apple-system, BlinkMacSystemFont)

Headings:
- H1: 36px / 40px (page titles)
- H2: 24px / 32px (section titles)
- H3: 20px / 28px (card titles)
- H4: 16px / 24px (subsections)

Body:
- Large: 16px / 24px (descriptions, explanations)
- Base: 14px / 20px (default text, table cells)
- Small: 12px / 16px (labels, helper text)
- Tiny: 10px / 14px (timestamps, metadata)

Weights:
- Regular 400 (body text)
- Medium 500 (emphasis, buttons)
- Semibold 600 (headings, important)
- Bold 700 (strong emphasis, alerts)
```

**Spacing:**

```
Consistent 4px grid:
- 4px (tight spacing, icon-text gap)
- 8px (compact elements)
- 12px (comfortable spacing)
- 16px (default spacing)
- 24px (section gaps)
- 32px (large gaps)
- 48px (page sections)
- 64px (major sections)
```

---

### Tables vs Cards

**Use Tables When:**
- Displaying 10+ items
- Need to compare multiple attributes
- Sorting/filtering is primary action
- Data is structured and uniform
- Examples: User list, reservation history, transaction log

**Use Cards When:**
- Displaying 1-5 items
- Visual hierarchy important
- Mixed content types (images, text, actions)
- Mobile-friendly layout needed
- Examples: Dashboard KPIs, partner profiles, offer previews

**Table Design:**
```
┌────────────────────────────────────────────────────┐
│ Header (sticky, gray bg)                           │
├────────────────────────────────────────────────────┤
│ Row 1 (white bg, hover: gray-50)                   │
│ Row 2 (white bg, hover: gray-50)                   │
│ Row 3 (white bg, hover: gray-50)                   │
└────────────────────────────────────────────────────┘

Features:
- Alternating row hover (not zebra stripes)
- Sticky header on scroll
- Action column always rightmost
- Checkbox column always leftmost
- Min row height: 56px (comfortable clicking)
- Horizontal scroll on mobile (not responsive stacking)
```

**Card Design:**
```
┌─────────────────────────────────┐
│ [Icon] Title          [Badge]   │
│ Subtitle / Description          │
│ ────────────────────────────    │
│ Metric 1: Value                 │
│ Metric 2: Value                 │
│ ────────────────────────────────│
│ [Action 1] [Action 2]           │
└─────────────────────────────────┘

Features:
- White background, subtle shadow
- Rounded corners (8px)
- Hover: lift shadow (transform: translateY(-2px))
- Max width: 400px (prevents stretched cards)
- Padding: 24px
```

---

### Error States

**Form Validation Errors:**
```
┌───────────────────────────────┐
│ Email Address *               │
│ [giorgi.b@gmail]              │ ← Invalid input (red border)
│ ⚠️  Invalid email format      │ ← Error message (red text)
└───────────────────────────────┘

Rules:
- Show error on blur OR submit (not on typing)
- Red border (2px) on invalid field
- Error icon + message below field
- Don't disable submit button (let validation show errors)
```

**API Error States:**
```
╔════════════════════════════════════════╗
║ ⚠️  Failed to Load Data                ║
╠════════════════════════════════════════╣
║ We couldn't load users. This might be ║
║ a temporary issue.                     ║
║                                        ║
║ [Retry] [Contact Support]             ║
╚════════════════════════════════════════╝

Features:
- Friendly language (not "Error 500")
- Explain what happened
- Offer actionable solutions
- Log technical details behind the scenes
```

**Empty States:**
```
╔════════════════════════════════════════╗
║         🔍                             ║
║                                        ║
║    No tickets found                   ║
║                                        ║
║  Try adjusting your filters or        ║
║  create a new ticket.                 ║
║                                        ║
║  [Clear Filters] [New Ticket]         ║
╚════════════════════════════════════════╝

Features:
- Large centered icon
- Short explanatory text
- Clear call-to-action
- Never show "empty array []" or loading indefinitely
```

---

### Loading States

**Skeleton Screens (Preferred):**
```
┌─────────────────────────────────────┐
│ ████████ ████████       ████        │ ← Animated gradient
│ ████████ ████████       ████        │
│ ████████ ████████       ████        │
│ ████████ ████████       ████        │
└─────────────────────────────────────┘

Why: Shows layout, feels faster, no jarring transition
Use for: Tables, cards, lists
```

**Spinners:**
```
        ⏳ Loading...

Why: Simple, universal, works anywhere
Use for: Buttons, modals, small components
```

**Progress Bars:**
```
┌─────────────────────────────────────┐
│ Exporting data... 47%               │
│ ███████████████░░░░░░░░░░░░░░░      │
└─────────────────────────────────────┘

Why: Shows progress, reduces anxiety
Use for: Uploads, exports, long operations
```

**Rules:**
- Never show spinner >5 seconds without explanation
- Skeleton screens for initial load
- Spinners for user-triggered actions
- Progress bars for >10 second operations

---

### Dark Mode Readiness

**Color Adaptation:**
```
Light Mode          →  Dark Mode
──────────────────────────────────────
White #FFFFFF       →  Gray-900 #111827
Gray-50 #F9FAFB     →  Gray-800 #1F2937
Gray-900 #111827    →  White #FFFFFF
Teal #14B8A6        →  Teal #14B8A6 (same)
```

**Implementation:**
```css
/* Use CSS variables */
:root {
  --bg-primary: #FFFFFF;
  --bg-secondary: #F9FAFB;
  --text-primary: #111827;
  --text-secondary: #6B7280;
}

[data-theme="dark"] {
  --bg-primary: #111827;
  --bg-secondary: #1F2937;
  --text-primary: #FFFFFF;
  --text-secondary: #9CA3AF;
}

/* Use in components */
.card {
  background: var(--bg-primary);
  color: var(--text-primary);
}
```

**Dark Mode Toggle:**
- Top right header next to admin profile
- Persists preference in localStorage
- System preference detection: `prefers-color-scheme: dark`

---

### Design for Speed

**Perceived Performance:**
1. **Optimistic Updates:**
   - Update UI immediately, sync to server in background
   - Example: Clicking "Ban User" → shows "Banned" immediately
   - If fails → revert + show error toast

2. **Progressive Loading:**
   - Load critical data first (KPIs)
   - Load secondary data (charts) after
   - Load tertiary data (activity feed) last

3. **Prefetching:**
   - On hover over "View Details", prefetch that data
   - On opening modal, load related data immediately

4. **Caching:**
   - Cache static data (partner list, categories) for 5 minutes
   - Invalidate cache on mutations (create/update/delete)

---

### Design for Clarity

**Information Density:**
- Don't overcrowd screens (max 3-4 sections per page)
- Use whitespace generously (32-48px between sections)
- Group related information in cards/panels
- Collapse advanced features behind "Show More"

**Consistent Patterns:**
- All list pages have same structure (filters → table → pagination)
- All detail pages have same structure (header → tabs → content)
- All forms have same structure (title → fields → actions)

**Visual Cues:**
- Icons consistently used (same icon = same meaning everywhere)
- Colors consistently used (red = bad, green = good)
- Badges/tags for status (not just text)

---

### Design for Low Cognitive Load

**Reduce Decisions:**
- Smart defaults (most common option pre-selected)
- Suggested actions ("Based on evidence, we recommend...")
- Hide advanced options (power users can access via keyboard)

**Progressive Disclosure:**
```
Basic View:           Advanced View (toggle):
────────────────      ──────────────────────────
Name: Giorgi B.       Name: Giorgi B.
Email: giorgi.b@      Email: giorgi.b@gmail.com
Status: ACTIVE        Status: ACTIVE
                      User ID: abc-123-def
[Edit] [Ban]          Last Login: 2h ago
                      IP: 185.123.45.67
                      Device: iPhone 14 Pro
                      [Edit] [Ban] [Delete] [Export]
```

**Prevent Mistakes:**
- Destructive actions require confirmation
- Critical actions require typed confirmation ("Type DELETE to confirm")
- Undo buttons for reversible actions (5-minute window)

---

## 🚀 16️⃣ MVP vs PHASE-2 vs PHASE-3 ROADMAP

### MVP (Launch-Ready) - 4 Weeks

**Must-Have for Day 1:**

**Week 1: Core Infrastructure**
- ✅ Admin authentication & role system
- ✅ Database tables & indexes
- ✅ Basic admin layout (sidebar, header, routing)
- ✅ Overview dashboard (KPIs, live feed)

**Week 2: Business Operations**
- ✅ User management (list, view, ban, edit)
- ✅ Partner management (approve/reject applications)
- ✅ Offer management (list, flag, pause)
- ✅ Reservation monitoring (list, extend time)

**Week 3: Support & Safety**
- ✅ Support tickets system (create, assign, resolve)
- ✅ Basic analytics (users, partners, revenue)
- ✅ Penalty management (view, lift penalties)
- ✅ Audit logging (all admin actions)

**Week 4: Polish & Deploy**
- ✅ Error handling & loading states
- ✅ Mobile-responsive admin panel
- ✅ System settings configuration
- ✅ Admin onboarding documentation

**MVP Success Criteria:**
- Operations team can approve 20+ partners/day
- Support team can resolve 50+ tickets/day
- Super Admin can monitor all KPIs in real-time
- Zero manual database queries needed for daily ops

---

### Phase 2 (After Traction) - 3 Weeks

**Add After 100 Partners + 1000 Users:**

**Week 5: Advanced Analytics**
- 📊 Custom report builder (drag-drop metrics)
- 📈 Geo analytics (heatmaps, expansion opportunities)
- 💰 Revenue forecasting (ML-based predictions)
- 📉 Cohort analysis (user retention by signup date)
- 📑 Automated weekly reports (email to stakeholders)

**Week 6: Fraud Prevention**
- 🕵️ Referral fraud dashboard
- 🔍 Multi-account detection (device ID, IP clustering)
- 🚨 Real-time fraud alerts (Slack/email)
- 🤖 ML-based risk scoring (suspicious patterns)
- 📋 Investigation tools (deep user analysis)

**Week 7: Communication & Automation**
- 📢 Advanced broadcast system (segment by behavior)
- 🤖 Automation rule builder (if-then workflows)
- 📧 Email template editor (drag-drop builder)
- 📲 SMS campaign management
- 🔔 Push notification scheduler

**Phase 2 Success Criteria:**
- <2% fraud rate (referrals, multi-accounts)
- 90%+ automation for repetitive tasks
- Custom reports used weekly by management
- Proactive issue detection (before users complain)

---

### Phase 3 (Scale) - 4 Weeks

**Add After 500 Partners + 10,000 Users:**

**Week 8-9: Advanced Partner Tools**
- 🏆 Partner success scoring (predictive churn detection)
- 📊 Partner performance benchmarking (vs peers)
- 💬 Partner messaging center (in-app chat)
- 🎓 Partner training portal (video tutorials, best practices)
- 🏅 Partner badge system (verified, top-rated, etc.)

**Week 10-11: Advanced User Insights**
- 🧠 User behavior analytics (funnel analysis, drop-off points)
- 💡 Personalization engine (recommend partners to users)
- 📱 Device & platform analytics (iOS vs Android performance)
- 🎯 A/B testing dashboard (test features on subsets)
- 🔮 Churn prediction (identify at-risk users)

**Week 12: Enterprise Features**
- 👥 Multi-admin collaboration (internal chat, task assignment)
- 🔐 Advanced permissions (granular role-based access)
- 🌍 Multi-city management (city-specific admins)
- 📊 Real-time dashboard broadcasting (TV screens in office)
- 🔗 API for partners (let partners build integrations)

**Phase 3 Success Criteria:**
- Support 1000+ partners across 5+ cities
- <5% support ticket escalation rate
- 95%+ admin satisfaction score
- Platform scales to 50K+ users without performance issues

---

### What NOT to Build

**Features to Avoid:**

❌ **Social Features (User-to-User Messaging)**
- Why: Increases moderation burden 10x
- Instead: Let users contact partners directly via phone/Telegram

❌ **Custom Partner App Builder**
- Why: Too complex, partners want simple tools
- Instead: Great partner dashboard is enough

❌ **Cryptocurrency Payments**
- Why: Legal complexity, high risk, low demand
- Instead: Stick to credit cards and bank transfers

❌ **Uber-Like Partner Matching Algorithm**
- Why: Not a marketplace problem (users choose partners)
- Instead: Better search and filters

❌ **Blockchain-Based Loyalty Points**
- Why: Solves no real problem, adds complexity
- Instead: Simple SQL-based point system works great

---

## 🧯 17️⃣ COMMON FAILURE SCENARIOS & SAFEGUARDS

### Partner Abuse

**Scenario 1: Fake Offers**
- Partner posts unrealistic offers to attract traffic
- Example: "iPhone 14 Pro for ₾50"
- **Detection:**
  - Price anomaly detection (>90% discount = auto-flag)
  - Compare to market average for category
  - Check partner history (new partner + suspicious offer = high risk)
- **Prevention:**
  - Manual approval for first 5 offers from new partners
  - Require photo evidence for high-value items
  - Auto-flag offers with >80% discount
- **Response:**
  - Hide offer immediately
  - Send warning email to partner
  - If repeated: block partner + ban from platform
- **Safeguard:**
  - Refund all users who reserved fake offer
  - Add compensation (+50 pts) for inconvenience

---

**Scenario 2: Bait-and-Switch**
- Partner posts bread, delivers stale/different product
- **Detection:**
  - Multiple user complaints about same partner (3+ in 7 days)
  - Low rating trend (sudden drop from 4.8 to 3.2)
  - High refund request rate (>20% of orders)
- **Prevention:**
  - Photo verification at pickup (encourage users to photograph product)
  - Post-pickup survey ("Did you receive what was advertised?")
  - Mystery shopper program (admin makes test reservations)
- **Response:**
  - Immediate review of all partner offers
  - Suspend partner until investigation complete
  - Refund affected users
- **Safeguard:**
  - Partner bond system (₾500 deposit for new partners, returned after 50 successful pickups)

---

**Scenario 3: Partner Marks No-Show Fraudulently**
- Partner keeps user's points by falsely claiming no-show
- **Detection:**
  - User disputes with evidence (GPS data, photo at location)
  - Pattern: Partner has >30% no-show rate (industry avg: 5-8%)
  - User has perfect pickup history (0 previous no-shows)
- **Prevention:**
  - Require partner to photograph "no-show" status
  - GPS verification (did user arrive at location?)
  - Timestamp verification (was user there during window?)
- **Response:**
  - Investigate immediately (<2 hours)
  - Refund user if evidence supports them
  - Penalize partner (trust score -20, warning)
- **Safeguard:**
  - 3 fraudulent no-show claims = auto-suspend partner
  - Manual review required to reinstate

---

### User Abuse

**Scenario 4: Serial No-Show Abuser**
- User reserves offers but never picks up (blocks inventory)
- **Detection:**
  - 3+ no-shows in 7 days
  - Pattern: always reserves during peak times
  - Never requests forgiveness (true accident would apologize)
- **Prevention:**
  - Progressive penalties (warning → 1h → 24h → permanent)
  - Require credit card on file after 2nd no-show (not charged, just verification)
  - SMS reminder 15 minutes before expiry
- **Response:**
  - Automatic ban escalation (no human needed)
  - Email explaining penalty + how to avoid future
  - Offer point lift option (for accidental no-shows)
- **Safeguard:**
  - Partner compensation system (keep user's points)
  - Partners not financially hurt by no-shows

---

**Scenario 5: Referral Fraud**
- User creates 20 fake accounts to get referral bonuses
- **Detection:**
  - Same device ID across multiple accounts
  - Same IP address for >5 signups in 24 hours
  - Suspicious email patterns (gmail+1@, gmail+2@)
  - Referral code used >10 times from same device
- **Prevention:**
  - Device fingerprinting (track unique device IDs)
  - Email verification required before referral points awarded
  - Phone verification for high-value bonuses (>100 pts)
  - Rate limit: max 10 referrals per user per month
- **Response:**
  - Ban all associated accounts immediately
  - Clawback fraudulent points
  - IP/device blacklist (prevent re-registration)
- **Safeguard:**
  - Referral points awarded after referee makes first purchase (not just signup)
  - Max 500 pts per referrer per month (even if referring 100 people)

---

**Scenario 6: Payment Chargeback Fraud**
- User buys 1000 points, uses them, then disputes credit card charge
- **Detection:**
  - Chargeback notification from payment processor
  - Check user's point spending pattern (spent all points immediately = suspicious)
- **Prevention:**
  - KYC verification for purchases >₾100
  - Delay large point deposits by 24 hours (fraud cooling period)
  - Mark accounts with chargebacks for extra scrutiny
- **Response:**
  - Immediately freeze account
  - Deduct fraudulent points (can go negative)
  - Ban user if points already spent
  - Report to payment processor's fraud network
- **Safeguard:**
  - Chargeback insurance (optional, costs 1% of revenue)
  - Max point purchase per user per day: 2000 pts (₾100)

---

### Admin Mistakes

**Scenario 7: Admin Bans Wrong User**
- Support agent clicks wrong row in table, bans innocent user
- **Detection:**
  - User complains via email/social media
  - Admin realizes mistake
- **Prevention:**
  - Confirmation dialog with user details ("Ban Giorgi B., giorgi.b@gmail.com?")
  - 5-minute "undo" window after ban
  - Require reason for every ban (can't be lazy)
- **Response:**
  - Undo button in admin panel (only Operations Admin+)
  - Auto-unban + compensation points (+100)
  - Apology email explaining mistake
- **Safeguard:**
  - All admin actions logged to immutable audit trail
  - Weekly review of admin actions by supervisor
  - Automated alerts for unusual admin behavior (10 bans in 10 minutes)

---

**Scenario 8: Admin Accidentally Deletes Data**
- Super Admin runs DELETE query without WHERE clause
- **Detection:**
  - Database trigger alerts on mass deletion (>100 rows)
  - Monitoring system catches abnormal query
- **Prevention:**
  - No direct database access (use admin panel only)
  - Soft deletes (mark as deleted, don't actually delete)
  - Require typed confirmation for destructive actions
  - Restrict DELETE permissions (only Super Admin + 2FA)
- **Response:**
  - Immediate database restore from backup (15-minute RPO)
  - Alert entire team via Slack
  - Post-mortem meeting to improve processes
- **Safeguard:**
  - Automated hourly backups (kept for 30 days)
  - Point-in-time recovery enabled
  - "Read-only Friday" policy (no risky changes on Fridays)

---

### Data Inconsistency

**Scenario 9: Points Not Deducted After Reservation**
- User reserves offer, but payment webhook fails
- **Detection:**
  - Reservation exists with status ACTIVE
  - No corresponding point_transaction record
  - User complains "I reserved but still have same points"
- **Prevention:**
  - Idempotent webhooks (retry-safe)
  - Atomic transactions (reservation + point deduction in one transaction)
  - Background job checks for orphaned reservations (every 5 minutes)
- **Response:**
  - Admin can manually deduct points
  - If webhook failed due to system error: don't deduct (our fault)
  - If user exploited race condition: deduct + warning
- **Safeguard:**
  - Database constraints (CHECK balance >= 0)
  - Periodic reconciliation job (every night, verify all balances)

---

**Scenario 10: Offer Stock Desync**
- Offer shows 5 available, but actually 0 (all reserved)
- **Detection:**
  - User tries to reserve, gets "Sold out" error
  - Refresh shows different stock count
- **Prevention:**
  - Real-time stock updates via WebSockets
  - Pessimistic locking on reservation creation
  - Cache invalidation on every reservation
- **Response:**
  - Background job recalculates stock (every 1 minute)
  - Auto-correct discrepancies
  - Log to monitoring for investigation
- **Safeguard:**
  - Reservation queue system (prevent race conditions)
  - Stock decremented in same transaction as reservation created

---

### Scaling Issues

**Scenario 11: Database Overload During Peak Hours**
- Friday 6pm: 500 users trying to reserve simultaneously
- Database slow queries, timeouts, 500 errors
- **Detection:**
  - APM alerts: query time >1 second
  - Error rate spike (>5% of requests)
  - User complaints: "App not loading"
- **Prevention:**
  - Read replicas for analytics queries (don't hit primary DB)
  - Connection pooling (max 100 connections)
  - Rate limiting (10 requests per second per user)
  - CDN for static assets
- **Response:**
  - Auto-scale database (increase CPU/RAM)
  - Enable query cache
  - Temporarily disable non-critical features (analytics dashboard)
- **Safeguard:**
  - Load testing before launch (simulate 1000 concurrent users)
  - Circuit breakers (fail fast if DB slow)
  - Graceful degradation (show cached data if DB unreachable)

---

**Scenario 12: Storage Quota Exceeded**
- Partners upload too many images, exceed 100GB Supabase limit
- **Detection:**
  - Storage API returns "Quota exceeded" error
  - Monitoring alert: storage >90% full
- **Prevention:**
  - Per-partner image quota (15 images max)
  - Image compression (max 500KB per image)
  - Delete old images (offers expired >30 days)
- **Response:**
  - Upgrade storage plan immediately
  - Email partners to remove unused images
  - Implement image expiry policy
- **Safeguard:**
  - Monitor storage daily
  - Alert at 80%, 90%, 95% thresholds
  - Budget buffer for emergency upgrades

---

### Final Safety Principles

**1. Defense in Depth**
- Multiple layers of protection
- Example: Input validation (client) + sanitization (server) + database constraints

**2. Fail Gracefully**
- Never show raw error messages to users
- Log technical details, show friendly message
- Provide actionable next steps ("Try again" button)

**3. Audit Everything**
- Every admin action logged
- Every payment transaction recorded
- Every ban/unban has reason + timestamp
- Use logs for post-mortems and compliance

**4. Assume Bad Actors**
- Don't trust user input (validate everything)
- Don't trust admin input (confirm destructive actions)
- Don't trust payment gateways (verify webhooks)
- Don't trust external APIs (retry with backoff)

**5. Plan for Recovery**
- Backups tested monthly (can we actually restore?)
- Runbooks for common incidents (step-by-step guides)
- On-call rotation (someone always available)
- Incident response protocol (who does what when things break)

---

## 🎯 CONCLUSION

This admin dashboard is designed for **real-world operations at scale**.

**Key Takeaways:**

1. **Trust is Everything** - Abuse detection and prevention are core features, not add-ons.

2. **Speed Matters** - Real-time monitoring prevents issues before they escalate.

3. **Admins Are Users Too** - Great UX for admins = faster operations = happier team.

4. **Audit Everything** - When disputes happen (and they will), logs are your defense.

5. **Plan for Scale** - Start simple (MVP), but architect for 10x growth.

6. **Failure is Normal** - Build safeguards, not perfect systems.

---

**Document Complete: February 3, 2026**
**Total Sections: 17/17 ✅**
**Pages: ~60 pages of implementation-ready specifications**

---

## 📋 APPENDIX: QUICK REFERENCE

### Admin Role Permissions Matrix

| Action | Support Agent | Ops Admin | Finance | Super Admin |
|--------|---------------|-----------|---------|-------------|
| View users | ✅ | ✅ | ✅ | ✅ |
| Ban users (<30d) | ❌ | ✅ | ❌ | ✅ |
| Ban users (permanent) | ❌ | ❌ | ❌ | ✅ |
| Approve partners | ❌ | ✅ | ❌ | ✅ |
| View financials | ❌ | ❌ | ✅ | ✅ |
| Modify settings | ❌ | ❌ | ❌ | ✅ |
| Resolve tickets | ✅ | ✅ | ❌ | ✅ |
| Refund points (<500) | ✅ | ✅ | ❌ | ✅ |
| Export data | ❌ | ❌ | ✅ | ✅ |

### Priority Matrix

| Priority | Response SLA | Resolution SLA | Alert |
|----------|--------------|----------------|-------|
| 🔴 URGENT | 30 minutes | 2 hours | Slack + SMS |
| 🟠 HIGH | 2 hours | 8 hours | Email |
| 🟡 MEDIUM | 8 hours | 24 hours | Dashboard |
| 🟢 LOW | 24 hours | 72 hours | Weekly report |

### Status Color Legend

| Color | Meaning | Use Cases |
|-------|---------|-----------|
| 🔴 Red | Critical/Error | Urgent tickets, system down, banned users |
| 🟠 Orange | Warning | Expiring soon, needs review, at-risk partners |
| 🟡 Yellow | Caution | Moderate issues, watch list, pending items |
| 🟢 Green | Success | Completed, approved, operational |
| 🔵 Blue | Info | Neutral events, FYI, no action needed |
| ⚫ Gray | Inactive | Disabled, expired, archived |

---

**END OF DOCUMENT**
