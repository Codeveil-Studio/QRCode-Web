# Complete Subscription Implementation Guide

## 📋 **Summary**

You now have a complete subscription system with:

✅ **Database Schema**: Tables for subscriptions, usage tracking, and billing history  
✅ **Stripe Integration**: Pre-made products with proper pricing tiers  
✅ **API Routes**: Complete CRUD operations for subscriptions  
✅ **Webhook Handling**: Automatic subscription lifecycle management  
✅ **Usage Enforcement**: Real-time item limit checking  
✅ **Proration**: Automatic handling of upgrades/downgrades

## 🚀 **Implementation Steps**

### 1. Set Up Database

Run the SQL in `database/schema.sql` in your Supabase SQL Editor.

### 2. Configure Stripe

Follow the steps in `docs/stripe-setup.md` to create products and webhooks.

**Important**: After creating Stripe products, update the `PRICING_TIERS` array in `app/api/subscriptions/create-checkout/route.ts` with your actual Stripe Price IDs.

### 3. Environment Variables

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

### 4. Install Dependencies

```bash
npm install stripe @supabase/supabase-js
```

## 🔧 **How It Works**

### **User Journey:**

1. User selects item count in subscription component
2. System automatically detects correct pricing tier
3. Creates Stripe checkout with proration handling
4. Webhook updates database after successful payment
5. Organization gets new item limits immediately

### **Usage Enforcement:**

```javascript
// Before creating items in your app:
const response = await fetch("/api/organizations/usage", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ itemsToAdd: 1 }),
});

const { canAddItems, upgradeRequired } = await response.json();

if (!canAddItems) {
  // Redirect to subscription upgrade
  router.push("/user-profile?tab=subscriptions");
  return;
}

// Proceed with creating item
```

### **After Creating/Deleting Items:**

```javascript
// Update usage count
await fetch("/api/organizations/update-usage", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    itemsCount: 1,
    operation: "add", // or 'subtract' or 'set'
  }),
});
```

## 📊 **API Endpoints**

| Endpoint                             | Method | Purpose                        |
| ------------------------------------ | ------ | ------------------------------ |
| `/api/subscriptions/create-checkout` | POST   | Create Stripe checkout session |
| `/api/organizations/usage`           | GET    | Get current org usage          |
| `/api/organizations/usage`           | POST   | Check if can add items         |
| `/api/organizations/update-usage`    | POST   | Update item count              |
| `/api/organizations/update-usage`    | GET    | Sync from actual items table   |
| `/api/webhooks/stripe`               | POST   | Handle Stripe webhooks         |

## 💰 **Pricing Logic**

Example: User wants 250 items total

- Current: 150 items at £3.79/item (tier 3)
- New: 250 items at £3.39/item (tier 4)
- **Important**: They pay £3.39 × 250 = £847.50/month for ALL items, not just the additional 100

### **Proration Example:**

- User upgrades mid-month
- Stripe automatically:
  1. Cancels old subscription (150 × £3.79)
  2. Prorates refund for unused time
  3. Creates new subscription (250 × £3.39)
  4. Charges prorated amount for remainder of period

## 🔒 **Security & Permissions**

- Only **managers** and **admins** can create/modify subscriptions
- All users can **view** usage and subscription info
- Row Level Security (RLS) enforces org-based access
- Webhook endpoints use Stripe signature verification

## 🎯 **Integration with Your App**

### **In Item Creation API:**

```javascript
// Before creating item
const usageCheck = await fetch("/api/organizations/usage", {
  method: "POST",
  body: JSON.stringify({ itemsToAdd: 1 }),
});

if (!usageCheck.canAddItems) {
  return res.status(403).json({
    error: "Item limit exceeded",
    upgradeUrl: "/user-profile?tab=subscriptions",
  });
}

// Create item...

// After successful creation
await fetch("/api/organizations/update-usage", {
  method: "POST",
  body: JSON.stringify({ itemsCount: 1, operation: "add" }),
});
```

### **In Item Deletion API:**

```javascript
// After successful deletion
await fetch("/api/organizations/update-usage", {
  method: "POST",
  body: JSON.stringify({ itemsCount: 1, operation: "subtract" }),
});
```

## 🔄 **Subscription States**

| Status     | Description               | User Experience                |
| ---------- | ------------------------- | ------------------------------ |
| `active`   | Subscription current      | Full access to item limits     |
| `past_due` | Payment failed            | Limited access, payment retry  |
| `canceled` | Subscription ended        | No access, upgrade required    |
| `unpaid`   | Multiple payment failures | No access, reactivation needed |

## 🚨 **Error Handling**

The system handles:

- **Failed payments**: Subscription marked as `past_due`
- **Subscription cancellations**: Item limits reset to 0
- **Webhook failures**: Retries with exponential backoff
- **Usage limit breaches**: Clear error messages with upgrade paths

## 📈 **Next Steps**

1. **Deploy**: Set up webhook endpoint in production
2. **Test**: Use Stripe test mode for end-to-end testing
3. **Monitor**: Set up logging for webhook events
4. **Analytics**: Track subscription conversions and churn
5. **Optimize**: A/B test pricing and upgrade flows

## 🛠️ **Troubleshooting**

### Common Issues:

- **Webhook not firing**: Check endpoint URL and selected events
- **Price ID not found**: Verify Stripe price IDs in config
- **RLS blocking queries**: Check user permissions and policies
- **Usage not updating**: Verify item creation/deletion hooks

Your subscription system is now ready for production! 🎉
