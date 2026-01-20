# Stripe Metered Billing with Graduated Pricing Setup

## 1. Create Product in Stripe Dashboard

**Product Name**: `Relay Asset Management`
**Type**: `Recurring`
**Billing Model**: `Per unit`

## 2. Create Price with Graduated Pricing

**Price Details**:

- Billing period: `Monthly`
- Usage type: `Metered`
- Charge for metered usage: `During billing period`
- Price model: `Graduated pricing`

**Graduated Pricing Tiers**:

```
Tier 1: First 25 assets    → £4.99 per asset
Tier 2: Next 25 assets     → £4.49 per asset (26-50)
Tier 3: Next 50 assets     → £3.99 per asset (51-100)
Tier 4: Additional assets  → £3.49 per asset (101+)
```

**Annual Version** (Optional):

- Same structure but with annual billing
- Apply 16.67% discount (2 months free)

## 3. Stripe CLI Commands to Create Product

```bash
# Create the product
stripe products create \
  --name "Relay Asset Management" \
  --description "Pay per asset with volume discounts"

# Create graduated pricing (monthly)
stripe prices create \
  --product prod_XXXXX \
  --currency gbp \
  --recurring[interval]=month \
  --billing_scheme=tiered \
  --tiers_mode=graduated \
  --tiers[0][up_to]=25 \
  --tiers[0][unit_amount]=499 \
  --tiers[1][up_to]=50 \
  --tiers[1][unit_amount]=449 \
  --tiers[2][up_to]=100 \
  --tiers[2][unit_amount]=399 \
  --tiers[3][up_to]=inf \
  --tiers[3][unit_amount]=349
```

## 4. Usage Reporting

Stripe automatically handles:

- ✅ Tier calculations
- ✅ Volume discounts
- ✅ Prorated billing
- ✅ Usage aggregation

We just report usage:

```javascript
await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
  quantity: currentAssetCount,
  timestamp: Math.floor(Date.now() / 1000),
  action: "set", // Set absolute count
});
```

## 5. Benefits

- **Automatic bulk discounts**: Stripe handles tier calculations
- **Real-time pricing**: Users see savings immediately
- **Simplified backend**: No complex pricing logic
- **Accurate billing**: Stripe tracks everything
- **Easy changes**: Update tiers in Stripe dashboard
