# Reports API Endpoints Documentation

This document outlines the API endpoints needed to support the comprehensive reports page.

## Main Endpoint

### GET `/api/reports/comprehensive`

Returns all report data in a single response to minimize API calls and improve performance.

**Response Structure:**

```json
{
  "success": true,
  "data": {
    "assetStats": {
      "total": 150,
      "active": 120,
      "inactive": 30,
      "needsMaintenance": 15
    },
    "issueStats": {
      "total": 45,
      "open": 12,
      "resolved": 33,
      "critical": 5,
      "byUrgency": {
        "low": 20,
        "medium": 18,
        "high": 7
      }
    },
    "organizationStats": {
      "totalOrgs": 25,
      "totalMembers": 150,
      "avgMembersPerOrg": 6
    },
    "subscriptionStats": {
      "activeSubscriptions": 22,
      "totalRevenue": 245000,
      "avgRevenuePerSub": 11136
    },
    "assetUtilization": [
      {
        "type": "Equipment",
        "count": 85,
        "percentage": 56.7
      },
      {
        "type": "Facility",
        "count": 35,
        "percentage": 23.3
      },
      {
        "type": "Vehicle",
        "count": 30,
        "percentage": 20.0
      }
    ],
    "issueResolutionTrends": [
      {
        "month": "Jan 2024",
        "resolved": 8,
        "created": 12
      },
      {
        "month": "Feb 2024",
        "resolved": 15,
        "created": 10
      },
      {
        "month": "Mar 2024",
        "resolved": 12,
        "created": 8
      }
    ],
    "maintenanceOverdue": [
      {
        "name": "HVAC System A1",
        "daysPastDue": 15,
        "type": "Equipment"
      },
      {
        "name": "Generator B2",
        "daysPastDue": 8,
        "type": "Equipment"
      }
    ],
    "aiInsights": {
      "predictiveMaintenanceAlerts": [
        {
          "assetName": "Elevator System 1",
          "probability": 0.85,
          "daysUntilMaintenance": 12
        },
        {
          "assetName": "Cooling Tower A",
          "probability": 0.65,
          "daysUntilMaintenance": 25
        }
      ],
      "issuePatterns": [
        {
          "pattern": "HVAC issues spike during summer months",
          "frequency": 12,
          "recommendation": "Schedule preventive maintenance for all HVAC units before summer season"
        },
        {
          "pattern": "Electrical issues correlate with high humidity",
          "frequency": 8,
          "recommendation": "Install humidity monitoring and control systems in electrical rooms"
        }
      ],
      "resourceOptimization": [
        {
          "area": "Maintenance Staff Utilization",
          "currentUsage": 85,
          "recommendedUsage": 70,
          "savings": "15% cost reduction"
        },
        {
          "area": "Asset Downtime",
          "currentUsage": 12,
          "recommendedUsage": 8,
          "savings": "4 hours/month"
        }
      ]
    }
  }
}
```

## SQL Queries for Backend Implementation

Here are the SQL queries you'll need to implement in your backend:

### Asset Statistics

```sql
-- Total assets
SELECT COUNT(*) as total FROM assets;

-- Active assets
SELECT COUNT(*) as active FROM assets WHERE status = 'active';

-- Inactive assets
SELECT COUNT(*) as inactive FROM assets WHERE status != 'active';

-- Assets needing maintenance (overdue by 30+ days)
SELECT COUNT(*) as needs_maintenance
FROM assets
WHERE last_maintenance_at < NOW() - INTERVAL '30 days'
OR last_maintenance_at IS NULL;
```

### Issue Statistics

```sql
-- Total issues
SELECT COUNT(*) as total FROM issues;

-- Open issues
SELECT COUNT(*) as open FROM issues WHERE status = 'open';

-- Resolved issues
SELECT COUNT(*) as resolved FROM issues WHERE status = 'resolved';

-- Critical issues
SELECT COUNT(*) as critical FROM issues WHERE is_critical = true;

-- Issues by urgency
SELECT
  urgency,
  COUNT(*) as count
FROM issues
GROUP BY urgency;
```

### Organization Statistics

```sql
-- Total organizations
SELECT COUNT(*) as total_orgs FROM orgs;

-- Total members
SELECT COUNT(*) as total_members FROM org_members;

-- Average members per org
SELECT AVG(member_count) as avg_members_per_org
FROM (
  SELECT org_id, COUNT(*) as member_count
  FROM org_members
  GROUP BY org_id
) org_counts;
```

### Subscription Statistics

```sql
-- Active subscriptions
SELECT COUNT(*) as active_subscriptions
FROM subscriptions
WHERE status = 'active';

-- Total revenue (monthly)
SELECT SUM(total_monthly_cost * 100) as total_revenue_pence
FROM subscriptions
WHERE status = 'active';
```

### Asset Utilization

```sql
SELECT
  at.name as type,
  COUNT(a.id) as count,
  ROUND((COUNT(a.id) * 100.0 / (SELECT COUNT(*) FROM assets)), 1) as percentage
FROM assets a
JOIN asset_types at ON a.type = at.id
GROUP BY at.name, at.id
ORDER BY count DESC;
```

### Issue Resolution Trends (Last 6 months)

```sql
SELECT
  TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as month,
  COUNT(CASE WHEN resolved_at IS NOT NULL THEN 1 END) as resolved,
  COUNT(*) as created
FROM issues
WHERE created_at >= NOW() - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY DATE_TRUNC('month', created_at);
```

### Overdue Maintenance

```sql
SELECT
  a.name,
  at.name as type,
  EXTRACT(DAY FROM (NOW() - a.last_maintenance_at)) as days_past_due
FROM assets a
JOIN asset_types at ON a.type = at.id
WHERE a.last_maintenance_at < NOW() - INTERVAL '30 days'
   OR a.last_maintenance_at IS NULL
ORDER BY days_past_due DESC NULLS LAST
LIMIT 10;
```

## AI Insights Implementation Notes

The AI insights section requires more sophisticated analysis:

1. **Predictive Maintenance Alerts**:

   - Use machine learning models to analyze historical maintenance data
   - Consider factors like asset age, usage patterns, environmental conditions
   - Generate probability scores for maintenance needs

2. **Issue Patterns**:

   - Analyze issue descriptions using NLP techniques
   - Look for correlations between issues and environmental factors
   - Identify seasonal patterns or recurring problems

3. **Resource Optimization**:
   - Analyze staff utilization patterns
   - Calculate asset downtime trends
   - Identify inefficiencies in processes

## Authentication

All endpoints require authentication. Include the user's session cookie or JWT token in the request headers.

## Error Handling

Return appropriate HTTP status codes:

- 200: Success
- 401: Unauthorized (no valid session)
- 403: Forbidden (insufficient permissions)
- 500: Internal server error

## Rate Limiting

Consider implementing rate limiting for the comprehensive reports endpoint as it performs complex queries.

## Caching

Consider caching the report data for 5-15 minutes to improve performance, especially for the AI insights which may require expensive computations.
