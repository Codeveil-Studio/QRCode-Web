# Complete Database Schema for Stripe Metered Billing

## Required Tables

### 1. Update Existing `subscriptions` Table

Run this migration to update your current table:

```sql
-- Update subscriptions table for metered billing
ALTER TABLE public.subscriptions
RENAME COLUMN item_limit TO current_asset_count;

ALTER TABLE public.subscriptions
RENAME COLUMN price_per_item TO stripe_base_price;

-- Add metered billing specific columns
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS subscription_item_id TEXT;

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS last_usage_reported_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON public.subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscription_item_id ON public.subscriptions(subscription_item_id);

-- Add constraints
ALTER TABLE public.subscriptions
ADD CONSTRAINT subscriptions_subscription_item_id_unique UNIQUE (subscription_item_id);

-- Add comments
COMMENT ON COLUMN public.subscriptions.current_asset_count IS 'Current number of assets - reported to Stripe for metered billing';
COMMENT ON COLUMN public.subscriptions.subscription_item_id IS 'Stripe subscription item ID for usage reporting';
COMMENT ON COLUMN public.subscriptions.stripe_base_price IS 'Base price from Stripe (reference only - Stripe calculates final graduated price)';
COMMENT ON COLUMN public.subscriptions.last_usage_reported_at IS 'Timestamp when we last reported usage to Stripe';
```

### 2. Final `subscriptions` Table Structure

After migration, your table will look like this:

```sql
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,

  -- Stripe integration
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  subscription_item_id TEXT UNIQUE, -- FOR USAGE REPORTING

  -- Usage tracking
  current_asset_count INTEGER NOT NULL DEFAULT 0, -- RENAMED from item_limit
  stripe_base_price NUMERIC(10,4) NOT NULL, -- RENAMED from price_per_item
  last_usage_reported_at TIMESTAMP WITH TIME ZONE, -- NEW

  -- Subscription details
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'canceled', 'past_due', 'unpaid')
  ),

  -- Billing periods
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  next_billing_date TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT subscriptions_pkey PRIMARY KEY (id)
);
```

### 3. Optional: Usage History Table (Recommended)

Track usage changes over time for debugging and analytics:

```sql
CREATE TABLE public.usage_history (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,

  -- Usage details
  asset_count INTEGER NOT NULL,
  previous_count INTEGER,
  change_amount INTEGER GENERATED ALWAYS AS (asset_count - COALESCE(previous_count, 0)) STORED,

  -- Stripe tracking
  subscription_item_id TEXT NOT NULL,
  stripe_usage_record_id TEXT, -- ID returned from Stripe
  reported_to_stripe_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  changed_by UUID REFERENCES auth.users(id),
  change_reason TEXT, -- 'asset_added', 'asset_removed', 'bulk_import', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT usage_history_pkey PRIMARY KEY (id)
);

-- Indexes for performance
CREATE INDEX idx_usage_history_org_id ON public.usage_history(org_id);
CREATE INDEX idx_usage_history_subscription_id ON public.usage_history(subscription_id);
CREATE INDEX idx_usage_history_created_at ON public.usage_history(created_at);
```

## Environment Variables Needed

```env
STRIPE_SECRET_KEY=sk_live_... or sk_test_...
STRIPE_PRICE_ID_MONTHLY=price_1234567890_monthly_graduated
STRIPE_PRICE_ID_ANNUAL=price_1234567890_annual_graduated
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=https://your-app.com
```

## How Metered Billing Works

### 1. Stripe Product Setup

- **Product**: "Relay Asset Management"
- **Price Type**: Recurring with metered billing
- **Price Model**: Graduated pricing with tiers

### 2. Graduated Pricing Tiers (in Stripe)

```
Tier 1: First 25 assets     → £4.99 each
Tier 2: Next 25 assets      → £4.49 each (26-50)
Tier 3: Next 50 assets      → £3.99 each (51-100)
Tier 4: Additional assets   → £3.49 each (101+)
```

### 3. Usage Reporting Flow

```
1. User adds/removes assets in your app
2. Call POST /api/subscriptions/org/:orgId/usage
3. System reports new count to Stripe
4. Stripe calculates bill using graduated pricing
5. User gets charged based on actual usage
```

### 4. Billing Process

```
Monthly billing cycle:
- Stripe aggregates all usage records for the period
- Applies graduated pricing automatically
- Generates invoice with tier breakdown
- Charges customer
```

## Benefits of This Setup

✅ **Automatic volume discounts** - Stripe handles tier calculations
✅ **Real-time usage tracking** - Users see immediate pricing updates  
✅ **Simplified backend** - No complex pricing logic needed
✅ **Accurate billing** - Stripe tracks everything precisely
✅ **Easy tier changes** - Update pricing in Stripe dashboard
✅ **Usage history** - Full audit trail of changes
✅ **Webhook reliability** - Stripe handles payment failures, retries, etc.

This is the most robust and scalable way to implement per-asset pricing with bulk discounts!
