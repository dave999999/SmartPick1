# SmartPick - Be Smart. Pick Smart.

A premium food discovery platform connecting local Georgian bakeries, restaurants, cafés, and markets with customers through time-limited "Smart-Time Offers."

## 🎯 Overview

SmartPick is a mobile-first web application that enables businesses to share exclusive, fresh batches of products available for short windows, while customers can discover and reserve these offerings instantly. The platform emphasizes premium local culture, smart timing, and community pride.

## ✨ Key Features

### For Customers
- **Interactive Map View**: Browse active offers on an interactive map with category filters
- **Smart-Time Offers**: Discover exclusive, time-limited deals from local businesses
- **Instant Reservations**: Reserve offers with a 30-minute hold and receive QR code confirmation
- **My Picks**: Manage all active and past reservations in one place
- **Countdown Timers**: Real-time countdown showing remaining reservation time

### For Partners (Business Owners)
- **Dashboard**: View key metrics (Active Offers, Reservations Today, Items Picked Up)
- **Offer Management**: Create, edit, pause, and delete Smart-Time offers
- **QR Code Validation**: Scan customer QR codes to confirm pickups
- **Real-time Updates**: Instant notifications for new reservations
- **Performance Tracking**: Monitor daily statistics and offer performance

### For Admins
- **Partner Approval**: Review and approve/reject partner applications
- **Platform Analytics**: View platform-wide statistics and metrics
- **User Management**: Monitor customers and partners
- **Offer Moderation**: Oversee offer quality and compliance

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn-ui (built on Radix UI)
- **State Management**: React Context + Local State
- **Routing**: React Router v6
- **QR Codes**: qrcode.react library

### Backend (Supabase Required)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth with Google OAuth
- **Real-time**: Supabase Realtime for live updates
- **Storage**: Supabase Storage for images
- **API**: Supabase client SDK

### Design System
- **Primary Color**: Mint #4CC9A8
- **Accent Color**: Coral #FF6F61
- **Typography**: Poppins font family
- **Design Philosophy**: Premium-local aesthetic with Georgian cultural elements

## 📋 Prerequisites

Before running this application, you need:

1. **Supabase Project**: Create a free project at [supabase.com](https://supabase.com)
2. **Google OAuth Credentials**: Set up OAuth in Google Cloud Console
3. **Node.js**: Version 18+ recommended
4. **pnpm**: Fast, disk-efficient package manager

## 🚀 Getting Started

### 1. Clone and Install

```bash
cd /workspace/shadcn-ui
pnpm install
```

### 2. Configure Supabase

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Set Up Database Schema

Run the following SQL in your Supabase SQL Editor:

```sql
-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  avatar_url TEXT,
  role VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create partners table
CREATE TABLE partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  address VARCHAR(500) NOT NULL,
  city VARCHAR(100) NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  telegram VARCHAR(100),
  whatsapp VARCHAR(50),
  business_hours JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  images TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create offers table
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id) NOT NULL,
  category VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  images TEXT[],
  original_price DECIMAL(10,2) NOT NULL,
  smart_price DECIMAL(10,2) NOT NULL,
  quantity_available INTEGER NOT NULL,
  quantity_total INTEGER NOT NULL,
  pickup_start TIMESTAMP WITH TIME ZONE NOT NULL,
  pickup_end TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create reservations table
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES offers(id) NOT NULL,
  customer_id UUID REFERENCES users(id) NOT NULL,
  partner_id UUID REFERENCES partners(id) NOT NULL,
  qr_code VARCHAR(50) UNIQUE NOT NULL,
  quantity INTEGER NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  picked_up_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX idx_offers_partner_id ON offers(partner_id);
CREATE INDEX idx_offers_status ON offers(status);
CREATE INDEX idx_reservations_customer_id ON reservations(customer_id);
CREATE INDEX idx_reservations_partner_id ON reservations(partner_id);
CREATE INDEX idx_reservations_qr_code ON reservations(qr_code);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('offer-images', 'offer-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('partner-images', 'partner-images', true);
```

### 4. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/auth/callback` (development)
   - `https://your-domain.com/auth/callback` (production)
6. Add credentials to Supabase Dashboard → Authentication → Providers → Google

### 5. Run Development Server

```bash
pnpm run dev
```

Visit `http://localhost:3000` to see the application.

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/              # Shadcn-ui components
│   └── OfferMap.tsx     # Map/list view for offers
├── lib/
│   ├── api.ts           # API functions and Supabase queries
│   ├── supabase.ts      # Supabase client configuration
│   ├── types.ts         # TypeScript interfaces
│   └── utils.ts         # Utility functions
├── pages/
│   ├── Index.tsx        # Homepage (customer view)
│   ├── PartnerDashboard.tsx  # Partner management interface
│   ├── ReservationDetail.tsx # Reservation details with QR code
│   ├── MyPicks.tsx      # Customer reservations list
│   ├── ReserveOffer.tsx # Offer reservation flow
│   ├── AdminPanel.tsx   # Admin management interface
│   └── NotFound.tsx     # 404 page
├── App.tsx              # Main app with routing
└── main.tsx             # Application entry point
```

## 🎨 Design Guidelines

### Brand Colors
- **Mint**: `#4CC9A8` - Primary actions, CTAs
- **Coral**: `#FF6F61` - Accents, urgency indicators
- **Background**: `#FAFAFA` - Page background
- **Text**: `#333333` - Primary text

### Typography
- **Font**: Poppins (Light, Regular, Medium, SemiBold)
- **Headings**: Bold, clear hierarchy
- **Body**: 16px base size, readable line height

### Voice & Tone
- **Smart**: Emphasize intelligence and timing
- **Proudly Local**: Celebrate Georgian culture
- **Friendly**: Approachable and transparent
- **Never Cheap**: Avoid discount/bargain language

## 🔐 Security Features

- **Row Level Security (RLS)**: Database-level access control
- **JWT Authentication**: Secure token-based auth
- **QR Code Validation**: HMAC-signed codes with expiration
- **Rate Limiting**: Prevent abuse (to be implemented)
- **Input Validation**: Zod schemas for data validation

## 📱 Responsive Design

- **Mobile-First**: Optimized for smartphones (375px+)
- **Tablet**: Enhanced layout for medium screens
- **Desktop**: Full-featured experience for large screens
- **Touch-Optimized**: Large tap targets, swipe gestures

## 🚧 MVP Limitations

The current implementation is an MVP with the following simplifications:

1. **No Payment Integration**: Cash-only pickups (payment gateway in Phase 2)
2. **No Notifications**: WhatsApp/Telegram placeholders (to be integrated)
3. **English Only**: Georgian translation in Phase 2
4. **Single Location**: One location per partner (multi-location in Phase 2)
5. **Basic Analytics**: Simple stats (advanced charts in Phase 2)
6. **Mock Map**: Placeholder map view (Google Maps API requires key)

## 🔄 Real-time Features

SmartPick uses Supabase Realtime for instant updates:

- **Offer Updates**: New offers appear immediately on customer maps
- **Reservation Alerts**: Partners receive instant notifications
- **Quantity Updates**: Available quantities sync across all users
- **Status Changes**: Pickup confirmations update in real-time

## 📊 Data Models

### User
- Customer, Partner, or Admin role
- Google OAuth authentication
- Profile preferences

### Partner
- Business information and location
- Contact details (phone, email, Telegram, WhatsApp)
- Business hours and status (Pending/Approved/Blocked)

### Offer
- Product details and pricing
- Quantity and availability
- Pickup window with auto-expiration
- Status (Active/Paused/Expired)

### Reservation
- Customer-offer relationship
- QR code for pickup validation
- 30-minute expiration timer
- Status tracking (Active/Picked Up/Cancelled/Expired)

## 🧪 Testing

```bash
# Run linting
pnpm run lint

# Build for production
pnpm run build

# Type checking
pnpm run type-check
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Manual Deployment

```bash
pnpm run build
# Deploy dist/ folder to your hosting provider
```

## 📈 Future Enhancements (Phase 2)

- [ ] Payment integration (Stripe/local Georgian payment gateways)
- [ ] WhatsApp/Telegram notifications
- [ ] Georgian language support
- [ ] Google Maps integration
- [ ] Customer reviews and ratings
- [ ] Loyalty program
- [ ] Advanced analytics dashboard
- [ ] Push notifications
- [ ] Social sharing
- [ ] Multi-location support for chains

## 🤝 Contributing

This is an MVP demonstration project. For production use, consider:

1. Adding comprehensive error handling
2. Implementing proper logging and monitoring
3. Adding end-to-end tests
4. Setting up CI/CD pipeline
5. Implementing proper rate limiting
6. Adding data backup strategies

## 📄 License

This project is created as an MVP demonstration for SmartPick platform.

## 🙏 Acknowledgments

- Built with [Shadcn-ui](https://ui.shadcn.com) component library
- Powered by [Supabase](https://supabase.com) backend
- Designed for Georgian local businesses

---

**SmartPick** - Helping local businesses share more of what they create, and less of it go to waste — naturally.