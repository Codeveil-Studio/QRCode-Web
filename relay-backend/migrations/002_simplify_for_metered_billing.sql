-- Migration: Update subscriptions table for Stripe metered billing with graduated pricing
-- This enables usage-based billing where Stripe handles all tier calculations

-- Rename columns to match metered billing terminology
ALTER TABLE public.subscriptions 
RENAME COLUMN item_limit TO current_asset_count;

ALTER TABLE public.subscriptions 
RENAME COLUMN price_per_item TO stripe_base_price;

-- Add metered billing specific fields
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS subscription_item_id TEXT;

ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS last_usage_reported_at TIMESTAMP WITH TIME ZONE;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON public.subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscription_item_id ON public.subscriptions(subscription_item_id);

-- Add unique constraint for Stripe subscription item
ALTER TABLE public.subscriptions 
ADD CONSTRAINT subscriptions_subscription_item_id_unique UNIQUE (subscription_item_id);

-- Add helpful comments
COMMENT ON COLUMN public.subscriptions.current_asset_count IS 'Current number of assets - reported to Stripe for metered billing';
COMMENT ON COLUMN public.subscriptions.subscription_item_id IS 'Stripe subscription item ID used for usage reporting';
COMMENT ON COLUMN public.subscriptions.stripe_base_price IS 'Base price from Stripe price object (reference only - Stripe calculates final graduated price)';
COMMENT ON COLUMN public.subscriptions.last_usage_reported_at IS 'Timestamp when we last reported usage to Stripe for billing';

-- Optional: Create usage history table for audit trail and debugging
CREATE TABLE IF NOT EXISTS public.usage_history (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  
  -- Usage details
  asset_count INTEGER NOT NULL,
  previous_count INTEGER,
  change_amount INTEGER GENERATED ALWAYS AS (asset_count - COALESCE(previous_count, 0)) STORED,
  
  -- Stripe tracking
  subscription_item_id TEXT NOT NULL,
  stripe_usage_record_id TEXT, -- ID returned from Stripe API
  reported_to_stripe_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  changed_by UUID REFERENCES auth.users(id),
  change_reason TEXT DEFAULT 'manual', -- 'asset_added', 'asset_removed', 'bulk_import', 'subscription_created', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT usage_history_pkey PRIMARY KEY (id)
);

-- Indexes for usage history performance
CREATE INDEX IF NOT EXISTS idx_usage_history_org_id ON public.usage_history(org_id);
CREATE INDEX IF NOT EXISTS idx_usage_history_subscription_id ON public.usage_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_usage_history_created_at ON public.usage_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_history_subscription_item_id ON public.usage_history(subscription_item_id);

-- Add comments for usage history
COMMENT ON TABLE public.usage_history IS 'Audit trail of all asset count changes and Stripe usage reporting';
COMMENT ON COLUMN public.usage_history.change_amount IS 'Calculated field: difference between current and previous count';
COMMENT ON COLUMN public.usage_history.stripe_usage_record_id IS 'ID returned from Stripe when usage record is created';
COMMENT ON COLUMN public.usage_history.change_reason IS 'Human-readable reason for the usage change'; 