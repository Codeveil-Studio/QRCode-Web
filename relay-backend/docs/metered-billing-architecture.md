# Relay Metered Billing Architecture

## 🎯 Overview

Complete rewrite to use **Stripe Metered Billing with Graduated Pricing**. Stripe handles all pricing logic, tier calculations, and bulk discounts automatically.

## 🏗️ Architecture

### **1. Stripe Configuration**

- **Product**: Single "Relay Asset Management" product
- **Pricing**: Graduated tiers built into Stripe price
- **Billing**: Usage-based metered billing

### **2. Pricing Tiers (Configured in Stripe)**

```
Tier 1: First 25 assets    → £4.99/asset
Tier 2: Next 25 assets     → £4.49/asset (26-50)
Tier 3: Next 50 assets     → £3.99/asset (51-100)
Tier 4: Additional assets  → £3.49/asset (101+)
```

### **3. Database Schema**

```sql
public.subscriptions (
  id uuid primary key,
  org_id uuid references orgs(id),
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_item_id text,    -- NEW: For usage reporting
  current_asset_count integer,  -- RENAMED: from item_limit
  stripe_unit_amount numeric,   -- RENAMED: from price_per_item
  billing_cycle text,
  status text,
  current_period_start timestamp,
  current_period_end timestamp,
  last_usage_reported_at timestamp,  -- NEW: Track reporting
  -- ... other existing fields
)
```

## 🔄 Workflow

### **Subscription Creation**

1. User selects asset count
2. Creates Stripe checkout with metered billing
3. Webhook creates subscription record
4. Reports initial usage to Stripe

### **Usage Updates**

1. Assets added/removed in system
2. Call `POST /api/subscriptions/org/:orgId/usage`
3. Reports new count to Stripe
4. Stripe calculates pricing automatically

### **Billing**

1. Stripe aggregates usage over billing period
2. Applies graduated pricing automatically
3. Generates invoice with tier breakdown
4. Processes payment

## 📡 API Endpoints

### **POST /api/subscriptions/pricing-preview**

Get pricing preview with tier breakdown and savings suggestions.

**Request:**

```json
{
  "assetCount": 75
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "assetCount": 75,
    "estimatedMonthlyTotal": 30475,
    "formattedTotal": "£304.75",
    "tierBreakdown": [
      {
        "tier": 1,
        "range": "1-25",
        "unitPrice": 499,
        "quantity": 25,
        "subtotal": 12475
      },
      {
        "tier": 2,
        "range": "26-50",
        "unitPrice": 449,
        "quantity": 25,
        "subtotal": 11225
      },
      {
        "tier": 3,
        "range": "51-100",
        "unitPrice": 399,
        "quantity": 25,
        "subtotal": 9975
      }
    ],
    "potentialSavings": {
      "nextTierAt": 101,
      "savingsAmount": 50,
      "message": "Add 26 more assets to save £0.50 per asset on future additions"
    }
  }
}
```

### **POST /api/subscriptions/org/:orgId/usage**

Update asset count and report to Stripe.

**Request:**

```json
{
  "assetCount": 45
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "assetCount": 45,
    "pricing": {
      /* pricing breakdown */
    },
    "message": "Usage updated successfully"
  }
}
```

### **GET /api/subscriptions/org/:orgId**

Get subscription details with current pricing.

## 🎯 Benefits

### **For Users**

- ✅ **Transparent pricing**: See exact tier breakdown
- ✅ **Automatic discounts**: No complex upgrade process
- ✅ **Savings suggestions**: Know when to add more assets
- ✅ **Fair billing**: Pay exactly for what you use

### **For Development**

- ✅ **Simple logic**: No complex pricing calculations
- ✅ **Stripe handles everything**: Tiers, prorations, billing
- ✅ **Easy changes**: Update tiers in Stripe dashboard
- ✅ **Reliable billing**: Stripe's proven infrastructure

## 🔧 Environment Variables

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_ID_MONTHLY=price_monthly_graduated  # Your Stripe price ID
STRIPE_PRICE_ID_ANNUAL=price_annual_graduated    # Your Stripe price ID
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 🚀 Implementation Steps

1. **Run Migration**: `002_simplify_for_metered_billing.sql`
2. **Set up Stripe Product**: Follow `stripe-metered-billing-setup.md`
3. **Configure Environment**: Add Stripe price IDs
4. **Test Webhooks**: Set up webhook endpoint
5. **Implement Usage Reporting**: Connect to asset management system

## 💡 Smart Features

### **Bulk Discount Suggestions**

System automatically suggests when users should add more assets to get better pricing:

```
"Add 26 more assets to save £0.50 per asset on future additions"
```

### **Real-time Pricing**

Users see immediate pricing updates as they adjust asset counts.

### **Usage Tracking**

System tracks when usage was last reported to Stripe for debugging.
