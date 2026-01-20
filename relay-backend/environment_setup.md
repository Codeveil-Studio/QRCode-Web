# Environment Variables for Subscription System

Add these environment variables to your `.env` file in the `relay-backend` directory:

## Stripe Configuration

```bash
# Stripe API Keys (get from Stripe Dashboard)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# Stripe Webhook Secret (create webhook endpoint in Stripe Dashboard)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Price IDs for volume pricing
STRIPE_PRICE_ID_MONTHLY=price_your_monthly_price_id_here
STRIPE_PRICE_ID_ANNUAL=price_your_annual_price_id_here
```

## Supabase Configuration (if not already set)

```bash
# Supabase Service Role Key (for server-side operations)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

## Frontend Configuration

Add these to your `.env.local` file in the `relay` directory:

```bash
# Stripe Publishable Key (same as backend but for client-side)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

## Setup Instructions

1. **Create Stripe Account**: Go to https://stripe.com and create an account
2. **Get API Keys**: In Stripe Dashboard → Developers → API Keys
3. **Create Webhook**: In Stripe Dashboard → Developers → Webhooks

   - URL: `https://yourdomain.com/api/subscriptions/webhook`
   - **Critical Webhook Events to Listen To**:
     - `checkout.session.completed` ✅ - Creates subscription in database
     - `invoice.payment_succeeded` ✅ - Reactivates subscription
     - `invoice.payment_failed` ✅ - Marks subscription as past_due
     - `invoice.payment_action_required` ✅ - Handles 3D Secure/SCA
     - `invoice.upcoming` ✅ - 30-day billing warning
     - `customer.subscription.created` ⚠️ - Optional (handled by checkout.session.completed)
     - `customer.subscription.updated` ✅ - Updates subscription status
     - `customer.subscription.deleted` ✅ - Marks subscription as canceled
     - `customer.subscription.trial_will_end` ✅ - Trial ending notification
     - `payment_method.attached` ✅ - New payment method added
     - `customer.created` ✅ - Customer creation tracking

4. **Install Stripe CLI** (for local testing):
   ```bash
   # Forward events to local server
   stripe listen --forward-to localhost:5000/api/subscriptions/webhook
   ```

## Webhook Coverage Analysis

### ✅ Fully Covered Scenarios:

- **Successful Payments**: Subscription activation and reactivation
- **Failed Payments**: Subscription marked as past_due with retry logic
- **3D Secure/SCA**: Payment action required handling
- **Subscription Changes**: Updates, cancellations, and modifications
- **Trial Management**: Trial ending notifications
- **Payment Methods**: New payment method attachment
- **Customer Management**: Customer creation tracking

### ⚠️ Edge Cases Handled:

- **Card Declines**: Automatic retry with dunning management
- **Insufficient Funds**: Grace period with past_due status
- **Expired Cards**: Payment method update prompts
- **Subscription Modifications**: Real-time sync with Stripe
- **Webhook Failures**: Comprehensive logging and error handling

### 📊 Webhook Event Logging:

All webhook events are logged to `subscription_events` table with:

- Event type and Stripe event ID
- Processing status (completed/failed)
- Error messages for debugging
- Retry count and timestamps

## Asset Management Features

### New Endpoints:

- `POST /api/subscriptions/org/:orgId/update-asset-count` - Update subscription with Stripe integration
- `GET /api/subscriptions/org/:orgId/current-usage` - Get usage and billing projection
- `GET /api/subscriptions/org/:orgId/invoices` - Invoice history with usage details

### UI Features:

- **Asset Manager**: Interactive asset count adjustment
- **Pricing Preview**: Real-time cost calculation
- **Volume Tier Display**: Tier-based pricing breakdown
- **Upgrade Protection**: Prevent downgrades, allow upgrades only

## Required NPM Packages

Backend dependencies:

```bash
cd relay-backend
npm install stripe
```

Frontend dependencies:

```bash
cd relay
npm install @stripe/stripe-js
```

## Testing Webhook Events

Use Stripe CLI to test all webhook scenarios:

```bash
# Test successful payment
stripe trigger checkout.session.completed

# Test failed payment
stripe trigger invoice.payment_failed

# Test 3D Secure
stripe trigger invoice.payment_action_required

# Test subscription update
stripe trigger customer.subscription.updated

# Test subscription cancellation
stripe trigger customer.subscription.deleted
```

## Monitoring and Troubleshooting

1. **Check Webhook Logs**: Query `subscription_events` table
2. **Monitor Stripe Dashboard**: Check webhook delivery status
3. **Debug Failed Payments**: Review `past_due` subscriptions
4. **Verify Asset Counts**: Compare with `usage_history` table

## Production Deployment Checklist

- [ ] Set production Stripe keys
- [ ] Configure webhook endpoint URL
- [ ] Test all webhook events
- [ ] Verify asset count updates
- [ ] Test payment failure scenarios
- [ ] Monitor webhook delivery rates
- [ ] Set up alerting for failed webhooks
