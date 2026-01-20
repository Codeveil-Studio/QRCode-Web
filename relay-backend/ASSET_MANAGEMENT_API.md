# Asset Management API Documentation

## Overview

This API handles organization asset count management with automatic Stripe subscription updates and pricing tier calculations.

## Setup

### 1. Database Setup

Run the SQL script to create the required tables:

```sql
-- Run the contents of database-setup.sql in your Supabase SQL editor
```

### 2. Environment Variables

Add these to your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PRODUCT_ID=prod_your_stripe_product_id

# Existing environment variables...
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
# ... etc
```

### 3. Required Tables

The system expects these tables to exist:

- `orgs` - Organization table
- `org_members` - Organization membership with roles
- `org_usage` - Current usage and subscription info
- `org_usage_history` - Historical changes
- `pricing_tiers` - Pricing configuration

## API Endpoint

### POST /api/orgs/:orgId/assets

Updates the asset count for an organization.

**Authentication:** Required (Bearer token)

**Permissions:** User must be an admin or owner of the organization

**Request Body:**

```json
{
  "change": 10 // Integer between -1000 and 1000
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "newTotal": 210,
    "tier": "Business",
    "unitPrice": 339
  },
  "message": "Successfully updated asset count by 10. New total: 210"
}
```

## Flow

1. **Validate Request** - Check authentication and permissions
2. **Fetch Current Usage** - Get org_usage record
3. **Calculate New Total** - Apply the change
4. **Calculate Pricing** - Determine new tier and unit price
5. **Update Stripe** - Modify subscription quantity and price
6. **Update Database** - Update org_usage table
7. **Log History** - Record change in org_usage_history
8. **Return Response** - Success with new totals

## Error Handling

- **401 Unauthorized** - Missing or invalid authentication
- **403 Forbidden** - User not a member or lacks admin permissions
- **404 Not Found** - Organization usage record not found
- **400 Bad Request** - Invalid change amount or would result in negative assets
- **500 Internal Server Error** - Database or Stripe API errors

## Pricing Tiers

Default tiers (configurable via database):

| Tier     | Assets  | Monthly Price | Annual Price  |
| -------- | ------- | ------------- | ------------- |
| Starter  | 1-9     | £4.99         | £49.90        |
| Value    | 10-49   | £4.59         | £45.90        |
| Popular  | 50-99   | £3.79         | £37.90        |
| Business | 100-249 | £3.39         | £33.90        |
| Custom   | 250+    | Contact Sales | Contact Sales |

## Database Schema

### org_usage

```sql
CREATE TABLE org_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  total_assets INTEGER NOT NULL DEFAULT 0,
  pricing_tier TEXT NOT NULL,
  unit_price_pence INTEGER NOT NULL,
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('month', 'year')),
  subscription_id TEXT NOT NULL,
  subscription_item_id TEXT NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### org_usage_history

```sql
CREATE TABLE org_usage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  total_assets INTEGER NOT NULL,
  pricing_tier TEXT NOT NULL,
  unit_price_pence INTEGER NOT NULL,
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('month', 'year')),
  subscription_id TEXT NOT NULL,
  subscription_item_id TEXT NOT NULL,
  change_type TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### pricing_tiers

```sql
CREATE TABLE pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name TEXT NOT NULL UNIQUE,
  min_assets INTEGER NOT NULL CHECK (min_assets >= 0),
  max_assets INTEGER,
  price_month_pence INTEGER NOT NULL CHECK (price_month_pence >= 0),
  price_year_pence INTEGER NOT NULL CHECK (price_year_pence >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## Example Usage

```bash
# Increase assets by 10
curl -X POST \
  http://localhost:5000/api/orgs/123e4567-e89b-12d3-a456-426614174000/assets \
  -H 'Authorization: Bearer your_token_here' \
  -H 'Content-Type: application/json' \
  -d '{"change": 10}'

# Decrease assets by 5
curl -X POST \
  http://localhost:5000/api/orgs/123e4567-e89b-12d3-a456-426614174000/assets \
  -H 'Authorization: Bearer your_token_here' \
  -H 'Content-Type: application/json' \
  -d '{"change": -5}'
```

## Testing

Before deploying, ensure:

1. Database tables are created
2. Sample org_usage record exists
3. Stripe product and subscription are configured
4. Environment variables are set
5. User has proper organization permissions

## Security Notes

- All operations require authentication
- User permissions are verified against organization membership
- Only admin/owner roles can modify asset counts
- All changes are logged for audit purposes
- Stripe operations are wrapped in try-catch for graceful failure handling
