-- Create point_purchase_orders table for tracking SmartPoints purchases
CREATE TABLE IF NOT EXISTS public.point_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL CHECK (points > 0),
  gel_amount NUMERIC(10,2) NOT NULL CHECK (gel_amount > 0),
  unit_price NUMERIC(10,4) NOT NULL DEFAULT 0.01, -- GEL per point (1 GEL = 100 points default)
  provider TEXT NOT NULL DEFAULT 'BOG',
  provider_session_id TEXT,
  provider_transaction_id TEXT,
  provider_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::JSONB,
  
  CONSTRAINT valid_unit_price CHECK (unit_price > 0),
  CONSTRAINT valid_amounts CHECK (gel_amount = points * unit_price)
);

-- Create index for faster lookups
CREATE INDEX idx_point_purchase_orders_user_id ON public.point_purchase_orders(user_id);
CREATE INDEX idx_point_purchase_orders_status ON public.point_purchase_orders(status);
CREATE INDEX idx_point_purchase_orders_provider_session ON public.point_purchase_orders(provider_session_id);
CREATE INDEX idx_point_purchase_orders_created_at ON public.point_purchase_orders(created_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_point_purchase_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.status IN ('PAID', 'FAILED', 'CANCELLED', 'EXPIRED') AND OLD.status = 'PENDING' THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_point_purchase_orders_updated_at
BEFORE UPDATE ON public.point_purchase_orders
FOR EACH ROW
EXECUTE FUNCTION update_point_purchase_orders_updated_at();

-- Enable RLS
ALTER TABLE public.point_purchase_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own orders
CREATE POLICY "Users can view own purchase orders"
ON public.point_purchase_orders
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own orders (when initiating payment)
CREATE POLICY "Users can create own purchase orders"
ON public.point_purchase_orders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Only service role can update orders (webhooks)
CREATE POLICY "Service role can update orders"
ON public.point_purchase_orders
FOR UPDATE
USING (auth.role() = 'service_role');

-- Admins can view all orders
CREATE POLICY "Admins can view all orders"
ON public.point_purchase_orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'ADMIN'
  )
);

-- Add comment
COMMENT ON TABLE public.point_purchase_orders IS 'Tracks SmartPoints purchases via payment providers (Bank of Georgia, etc.)';
