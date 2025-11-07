-- Recommended indexes to speed up common queries
-- Offers: partner filters, active status, expiration
CREATE INDEX IF NOT EXISTS idx_offers_partner ON public.offers(partner_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON public.offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_expires_at ON public.offers(expires_at);

-- Reservations: partner & customer filters, status, created_at
CREATE INDEX IF NOT EXISTS idx_reservations_partner ON public.reservations(partner_id);
CREATE INDEX IF NOT EXISTS idx_reservations_customer ON public.reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_created_at ON public.reservations(created_at);

-- Users: penalties (already present in add-penalty-columns.sql, keep for completeness)
CREATE INDEX IF NOT EXISTS idx_users_penalty_until ON public.users(penalty_until);

-- Realtime filters benefit from covering indexes; composite for partner+status helps dashboards
CREATE INDEX IF NOT EXISTS idx_reservations_partner_status ON public.reservations(partner_id, status);
