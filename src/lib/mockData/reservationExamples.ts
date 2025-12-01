// Example Reservation Object for Testing

export const EXAMPLE_RESERVATION = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  offer_id: "660e8400-e29b-41d4-a716-446655440001",
  customer_id: "770e8400-e29b-41d4-a716-446655440002",
  partner_id: "880e8400-e29b-41d4-a716-446655440003",
  qr_code: "SP-L2X5MM-3FA2C1B4D8E9F7A0",
  quantity: 2,
  total_price: 9.0,
  status: "ACTIVE",
  points_spent: 10,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
  picked_up_at: null,
  
  // Related offer data
  offer: {
    id: "660e8400-e29b-41d4-a716-446655440001",
    title: "Fresh Pastry Box",
    description: "Assorted fresh pastries from today's batch",
    original_price: 15.0,
    smart_price: 4.5,
    quantity_available: 8,
    quantity_total: 10,
    status: "ACTIVE",
    category: "BAKERY",
    images: [
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800"
    ],
    pickup_start: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    pickup_end: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
    expires_at: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
    partner_id: "880e8400-e29b-41d4-a716-446655440003",
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  
  // Related partner data
  partner: {
    id: "880e8400-e29b-41d4-a716-446655440003",
    user_id: "990e8400-e29b-41d4-a716-446655440004",
    business_name: "Green Valley Organic Bakery",
    email: "contact@greenvalleybakery.ge",
    phone: "+995 555 123 456",
    address: "123 Rustaveli Ave, Tbilisi, Georgia",
    city: "Tbilisi",
    latitude: 41.6941,
    longitude: 44.8337,
    description: "Artisan organic bakery since 2015",
    business_type: "BAKERY",
    status: "ACTIVE",
    images: [
      "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800"
    ],
    business_hours: {
      monday: { open: "07:00", close: "20:00" },
      tuesday: { open: "07:00", close: "20:00" },
      wednesday: { open: "07:00", close: "20:00" },
      thursday: { open: "07:00", close: "20:00" },
      friday: { open: "07:00", close: "20:00" },
      saturday: { open: "08:00", close: "18:00" },
      sunday: { open: "09:00", close: "16:00" },
    },
    created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  
  // Related customer data
  customer: {
    id: "770e8400-e29b-41d4-a716-446655440002",
    name: "David Merabishvili",
    email: "david@example.com",
  },
};

// Example with expiring soon (< 5 minutes)
export const EXAMPLE_EXPIRING_RESERVATION = {
  ...EXAMPLE_RESERVATION,
  id: "551e8400-e29b-41d4-a716-446655440000",
  expires_at: new Date(Date.now() + 4 * 60 * 1000).toISOString(), // 4 minutes from now
};

// Example for navigation testing
export const EXAMPLE_NAVIGATION_RESERVATION = {
  ...EXAMPLE_RESERVATION,
  id: "552e8400-e29b-41d4-a716-446655440000",
  partner: {
    ...EXAMPLE_RESERVATION.partner,
    latitude: 41.7151, // ~2.5 km away from city center
    longitude: 44.8271,
    address: "456 Chavchavadze Ave, Tbilisi, Georgia",
  },
};
