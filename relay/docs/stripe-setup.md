# Stripe Setup Guide

## 1. Create Stripe Account & Get Keys

1. Go to [stripe.com](https://stripe.com) and create account
2. Get your **Publishable Key** and **Secret Key** from Dashboard > Developers > API Keys
3. Add to your environment variables:

```env
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... (we'll get this later)
```

## 2. Product Strategy - I Recommend Pre-made Products

**Why Pre-made is better than dynamic:**

- Easier to manage in Stripe Dashboard
- Better for analytics and reporting
- Stripe webhooks are more reliable
- Easier to handle proration
- Better for tax handling

## 3. Create Products in Stripe Dashboard

Go to **Products** section and create these:

### Product 1: "Items 1-9"

- Name: `Relay Items (1-9)`
- Price: `£4.99 per item per month`
- Billing: `Monthly`
- Metadata: `{"tier": "tier-1", "min_items": 1, "max_items": 9}`

### Product 2: "Items 10-49"

- Name: `Relay Items (10-49)`
- Price: `£4.59 per item per month`
- Billing: `Monthly`
- Metadata: `{"tier": "tier-2", "min_items": 10, "max_items": 49}`

### Product 3: "Items 50-199"

- Name: `Relay Items (50-199)`
- Price: `£3.79 per item per month`
- Billing: `Monthly`
- Metadata: `{"tier": "tier-3", "min_items": 50, "max_items": 199}`

### Product 4: "Items 200-499"

- Name: `Relay Items (200-499)`
- Price: `£3.39 per item per month`
- Billing: `Monthly`
- Metadata: `{"tier": "tier-4", "min_items": 200, "max_items": 499}`

### Product 5: "Items 500-999"

- Name: `Relay Items (500-999)`
- Price: `£2.99 per item per month`
- Billing: `Monthly`
- Metadata: `{"tier": "tier-5", "min_items": 500, "max_items": 999}`

### Product 6: "Items 1000-1999"

- Name: `Relay Items (1000-1999)`
- Price: `£2.49 per item per month`
- Billing: `Monthly`
- Metadata: `{"tier": "tier-6", "min_items": 1000, "max_items": 1999}`

### Product 7: "Items 2000-4999"

- Name: `Relay Items (2000-4999)`
- Price: `£1.99 per item per month`
- Billing: `Monthly`
- Metadata: `{"tier": "tier-7", "min_items": 2000, "max_items": 4999}`

## 4. Create Annual Versions (Optional)

For each product above, create an annual version with 17% discount:

- Same name but add "(Annual)"
- Price: Monthly price × 10 (2 months free)
- Billing: `Yearly`

## 5. Webhook Setup

1. Go to **Developers > Webhooks**
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select these events:

   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `checkout.session.completed`

4. Copy the webhook secret to your `.env`

## 6. Proration Handling Strategy

Stripe handles proration automatically for subscription changes:

**Upgrade Example:**

- User has 150 items at £3.79/item (tier 3)
- Wants 250 items total (tier 4 at £3.39/item)
- Stripe will:
  1. Cancel current subscription
  2. Prorate refund for unused time
  3. Create new subscription for 250 items at £3.39/item
  4. Charge prorated amount for remaining period

**Key Points:**

- Always cancel old subscription when creating new one
- Use `proration_behavior: 'create_prorations'` in Stripe API
- Let Stripe handle the math - it's very reliable

## 7. Environment Variables Needed

```env
# Stripe
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
