-- Complete SQL schema for Stripe Metered Billing with Graduated Pricing
-- Run this to create all tables from scratch

-- ==============================================================================
-- 1. SUBSCRIPTIONS TABLE - Main subscription tracking (Updated Schema)
-- ==============================================================================

CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  -- Stripe integration fields
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  subscription_item_id TEXT, -- Critical for usage reporting
  
  -- Usage and pricing
  current_asset_count INTEGER NOT NULL DEFAULT 0,
  stripe_base_price NUMERIC(10,4) NOT NULL DEFAULT 0, -- Reference price from Stripe
  last_usage_reported_at TIMESTAMP WITH TIME ZONE,
  
  -- Subscription details
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  status TEXT NOT NULL DEFAULT 'active',
  
  -- Billing periods (from Stripe)
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  next_billing_date TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID,
  
  -- Primary key and constraints
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_stripe_subscription_id_unique UNIQUE (stripe_subscription_id),
  CONSTRAINT subscriptions_subscription_item_id_unique UNIQUE (subscription_item_id),
  
  -- Check constraints
  CONSTRAINT subscriptions_billing_cycle_check CHECK (
    billing_cycle IN ('monthly', 'annual')
  ),
  CONSTRAINT subscriptions_status_check CHECK (
    status IN ('active', 'canceled', 'past_due', 'unpaid', 'trialing')
  ),
  CONSTRAINT subscriptions_current_asset_count_check CHECK (current_asset_count >= 0)
);

-- ==============================================================================
-- 2. USAGE HISTORY TABLE - Track all usage changes
-- ==============================================================================

CREATE TABLE public.usage_history (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  subscription_id UUID NOT NULL,
  
  -- Usage tracking
  asset_count INTEGER NOT NULL,
  previous_count INTEGER,
  change_amount INTEGER GENERATED ALWAYS AS (asset_count - COALESCE(previous_count, 0)) STORED,
  
  -- Stripe integration
  subscription_item_id TEXT NOT NULL,
  stripe_usage_record_id TEXT, -- ID returned from Stripe API
  reported_to_stripe_at TIMESTAMP WITH TIME ZONE,
  stripe_response_status TEXT, -- 'success', 'failed', 'pending'
  
  -- Change tracking
  changed_by UUID,
  change_reason TEXT NOT NULL DEFAULT 'manual',
  change_context JSONB, -- Additional context data
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Primary key and constraints
  CONSTRAINT usage_history_pkey PRIMARY KEY (id),
  CONSTRAINT usage_history_subscription_id_fkey FOREIGN KEY (subscription_id) 
    REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  
  -- Check constraints
  CONSTRAINT usage_history_asset_count_check CHECK (asset_count >= 0),
  CONSTRAINT usage_history_change_reason_check CHECK (
    change_reason IN (
      'manual', 'asset_added', 'asset_removed', 'bulk_import', 
      'subscription_created', 'api_update', 'webhook_sync'
    )
  )
);

-- Performance indexes
CREATE INDEX idx_subscriptions_org_id ON public.subscriptions(org_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_subscription_item_id ON public.subscriptions(subscription_item_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_created_at ON public.subscriptions(created_at DESC);

-- Usage History indexes
CREATE INDEX idx_usage_history_org_id ON public.usage_history(org_id);
CREATE INDEX idx_usage_history_subscription_id ON public.usage_history(subscription_id);
CREATE INDEX idx_usage_history_subscription_item_id ON public.usage_history(subscription_item_id);
CREATE INDEX idx_usage_history_created_at ON public.usage_history(created_at DESC);
CREATE INDEX idx_usage_history_change_reason ON public.usage_history(change_reason);
CREATE INDEX idx_usage_history_stripe_response_status ON public.usage_history(stripe_response_status);

-- Row Level Security (RLS)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
CREATE POLICY "Users can view org subscriptions" ON public.subscriptions
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.org_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can modify subscriptions" ON public.subscriptions
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM public.org_members 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );

-- RLS Policies for usage history
CREATE POLICY "Users can view org usage history" ON public.usage_history
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.org_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert usage history" ON public.usage_history
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can modify usage history" ON public.usage_history
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM public.org_members 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );

-- Comments for documentation
COMMENT ON TABLE public.subscriptions IS 'Stores subscription information integrated with Stripe metered billing';
COMMENT ON COLUMN public.subscriptions.subscription_item_id IS 'Critical for reporting usage to Stripe';
COMMENT ON COLUMN public.subscriptions.current_asset_count IS 'Current number of assets being tracked';
COMMENT ON COLUMN public.subscriptions.stripe_base_price IS 'Base price from Stripe for reference';

COMMENT ON TABLE public.usage_history IS 'Tracks all changes to asset counts and reports to Stripe';
COMMENT ON COLUMN public.usage_history.change_amount IS 'Automatically calculated difference from previous count';
COMMENT ON COLUMN public.usage_history.stripe_usage_record_id IS 'ID returned from Stripe when usage is reported';
COMMENT ON COLUMN public.usage_history.change_context IS 'Additional context data in JSON format';

-- ==============================================================================
-- 3. PRICING TIERS TABLE - Reference data for frontend display
-- ==============================================================================

CREATE TABLE public.pricing_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  
  -- Tier definition
  tier_number INTEGER NOT NULL,
  tier_name TEXT NOT NULL,
  min_assets INTEGER NOT NULL,
  max_assets INTEGER, -- NULL means no upper limit
  
  -- Pricing (in pence for GBP)
  monthly_price_pence INTEGER NOT NULL,
  annual_price_pence INTEGER NOT NULL,
  
  -- Display
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Primary key and constraints
  CONSTRAINT pricing_tiers_pkey PRIMARY KEY (id),
  CONSTRAINT pricing_tiers_tier_number_unique UNIQUE (tier_number),
  
  -- Check constraints
  CONSTRAINT pricing_tiers_min_assets_check CHECK (min_assets >= 0),
  CONSTRAINT pricing_tiers_max_assets_check CHECK (max_assets IS NULL OR max_assets > min_assets),
  CONSTRAINT pricing_tiers_monthly_price_check CHECK (monthly_price_pence > 0),
  CONSTRAINT pricing_tiers_annual_price_check CHECK (annual_price_pence > 0)
);

-- Performance indexes for pricing tiers
CREATE INDEX idx_pricing_tiers_tier_number ON public.pricing_tiers(tier_number);
CREATE INDEX idx_pricing_tiers_is_active ON public.pricing_tiers(is_active);
CREATE INDEX idx_pricing_tiers_display_order ON public.pricing_tiers(display_order);

-- Comments for pricing tiers
COMMENT ON TABLE public.pricing_tiers IS 'Reference data for pricing tiers - used for frontend display and calculations';
COMMENT ON COLUMN public.pricing_tiers.tier_number IS 'Sequential tier number (1, 2, 3, etc.)';
COMMENT ON COLUMN public.pricing_tiers.max_assets IS 'Maximum assets for this tier (NULL = unlimited)';
COMMENT ON COLUMN public.pricing_tiers.monthly_price_pence IS 'Price per asset per month in pence (e.g., 499 = £4.99)';
COMMENT ON COLUMN public.pricing_tiers.annual_price_pence IS 'Price per asset per year in pence (includes annual discount)';

-- ==============================================================================
-- 4. INSERT DEFAULT PRICING TIERS
-- ==============================================================================

INSERT INTO public.pricing_tiers (
  tier_number, tier_name, min_assets, max_assets, 
  monthly_price_pence, annual_price_pence, 
  description, display_order
) VALUES 
(1, 'Starter', 1, 25, 499, 5988, 'Perfect for small teams getting started', 1),
(2, 'Growth', 26, 50, 449, 5388, 'Ideal for growing businesses', 2),
(3, 'Professional', 51, 100, 399, 4788, 'For established organizations', 3),
(4, 'Enterprise', 101, NULL, 349, 4188, 'Unlimited scale with volume pricing', 4);

-- ==============================================================================
-- 5. SUBSCRIPTION EVENTS TABLE - Event sourcing (optional but recommended)
-- ==============================================================================

CREATE TABLE public.subscription_events (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL,
  
  -- Event details
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',
  
  -- Stripe integration
  stripe_event_id TEXT, -- From Stripe webhook
  stripe_event_type TEXT, -- Stripe event type
  
  -- Processing status
  processed_at TIMESTAMP WITH TIME ZONE,
  processing_status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Primary key and constraints
  CONSTRAINT subscription_events_pkey PRIMARY KEY (id),
  CONSTRAINT subscription_events_subscription_id_fkey FOREIGN KEY (subscription_id) 
    REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  
  -- Check constraints
  CONSTRAINT subscription_events_event_type_check CHECK (
    event_type IN (
      'subscription_created', 'subscription_updated', 'subscription_canceled',
      'usage_reported', 'payment_succeeded', 'payment_failed',
      'invoice_created', 'webhook_received'
    )
  ),
  CONSTRAINT subscription_events_processing_status_check CHECK (
    processing_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')
  ),
  CONSTRAINT subscription_events_retry_count_check CHECK (retry_count >= 0)
);

-- Performance indexes for subscription events
CREATE INDEX idx_subscription_events_subscription_id ON public.subscription_events(subscription_id);
CREATE INDEX idx_subscription_events_event_type ON public.subscription_events(event_type);
CREATE INDEX idx_subscription_events_stripe_event_id ON public.subscription_events(stripe_event_id);
CREATE INDEX idx_subscription_events_processing_status ON public.subscription_events(processing_status);
CREATE INDEX idx_subscription_events_created_at ON public.subscription_events(created_at DESC);

-- Comments for subscription events
COMMENT ON TABLE public.subscription_events IS 'Event sourcing table for all subscription-related events and Stripe webhooks';
COMMENT ON COLUMN public.subscription_events.event_data IS 'JSON payload containing event-specific data';
COMMENT ON COLUMN public.subscription_events.stripe_event_id IS 'Stripe event ID from webhook (for deduplication)';
COMMENT ON COLUMN public.subscription_events.processing_status IS 'Status of event processing for reliability';

-- ==============================================================================
-- 6. FUNCTIONS AND TRIGGERS
-- ==============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for subscriptions table
CREATE TRIGGER update_subscriptions_updated_at 
  BEFORE UPDATE ON public.subscriptions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for pricing_tiers table
CREATE TRIGGER update_pricing_tiers_updated_at 
  BEFORE UPDATE ON public.pricing_tiers 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 7. GRANTS (adjust based on your user setup)
-- ==============================================================================

-- Grant appropriate permissions to your application user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- ==============================================================================
-- COMPLETE! 
-- ==============================================================================

-- This schema provides:
-- ✅ Complete Stripe metered billing integration
-- ✅ Graduated pricing tier support  
-- ✅ Full audit trail with usage history
-- ✅ Event sourcing for reliability
-- ✅ Performance optimized with proper indexes
-- ✅ Row Level Security for multi-tenant applications
-- ✅ Comprehensive constraints and data validation 