# Notification System Setup Guide

This guide will help you set up the enhanced notification system that sends alerts for issues based on their criticality and organization preferences.

## Overview

The notification system supports:

- **SMS notifications** for critical issues (via Twilio)
- **Email notifications** for normal/critical issues (via SendGrid)
- **Organization-level preferences** with system defaults
- **User-level preferences** with override capabilities
- **Quiet hours** and timezone support
- **Notification logs** for auditing and debugging

## Database Setup

1. **Run the migration** to create the necessary tables:

```bash
# Apply the migration to your Supabase database
psql -h your-db-host -U postgres -d postgres -f migrations/001_notification_system.sql
```

Or apply it via Supabase Dashboard → SQL Editor.

The migration creates:

- `organization_notification_preferences` table
- `notification_logs` table
- Enhanced `notification_preferences` in the `profiles` table
- Appropriate indexes and RLS policies

## Environment Variables

Add these environment variables to your `.env` file:

```bash
# SendGrid Configuration (for Email Notifications)
SENDGRID_API_KEY=SG.your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Twilio Configuration (for SMS Notifications)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

## SendGrid Setup

1. **Create SendGrid Account**: Sign up at [sendgrid.com](https://sendgrid.com)

2. **Get API Key**:

   - Go to Settings → API Keys
   - Create a new API key with "Full Access" permissions
   - Copy the API key

3. **Verify Domain** (recommended):

   - Go to Settings → Sender Authentication
   - Set up domain authentication for better deliverability

4. **Set Environment Variables**:

```bash
SENDGRID_API_KEY=SG.your_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

## Twilio Setup

1. **Create Twilio Account**: Sign up at [twilio.com](https://www.twilio.com)

2. **Get Credentials**:

   - Account SID (from Console Dashboard)
   - Auth Token (from Console Dashboard)
   - Phone Number (buy a phone number from Twilio)

3. **Set Environment Variables**:

```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

## Install Dependencies

```bash
npm install @sendgrid/mail twilio
```

## API Endpoints

The notification system provides these API endpoints:

### User Notification Preferences

```bash
# Get user notification preferences
GET /api/notifications/preferences

# Update user notification preferences
PUT /api/notifications/preferences
Content-Type: application/json
{
  "issue_notifications_enabled": true,
  "flow_notifications_enabled": true,
  "sms_enabled": false,
  "email_enabled": true,
  "phone_number": "+1234567890",
  "notification_email": "user@example.com",
  "critical_issue_sms": true,
  "critical_issue_email": true,
  "normal_issue_sms": false,
  "normal_issue_email": true,
  "quiet_hours_enabled": true,
  "quiet_start": "22:00",
  "quiet_end": "08:00",
  "timezone": "America/New_York",
  "daily_digest": false,
  "weekly_digest": true,
  "use_system_defaults": false
}
```

### Organization Notification Preferences (Admin Only)

```bash
# Get organization notification preferences
GET /api/notifications/org/preferences

# Update organization notification preferences
PUT /api/notifications/org/preferences
Content-Type: application/json
{
  "critical_issue_default_channel": "both",
  "normal_issue_default_channel": "email",
  "allow_user_overrides": true,
  "escalation_enabled": true,
  "escalation_delay_minutes": 30,
  "escalation_contacts": ["+1234567890", "+0987654321"]
}
```

### Notification Logs

```bash
# Get notification logs for the current user
GET /api/notifications/logs?page=1&limit=20&type=email&status=sent
```

## How Notifications Work

### Critical Issues

- **Triggers**: Issues with `is_critical: true` or `urgency: "critical"`
- **Default Channels**: Both SMS and Email (configurable by organization)
- **Behavior**:
  - Sent immediately regardless of quiet hours
  - Uses organization defaults unless user overrides
  - Can escalate to additional contacts if enabled

### Normal Issues

- **Triggers**: All other issues
- **Default Channels**: Email only (configurable by organization)
- **Behavior**:
  - Respects quiet hours settings
  - Uses organization defaults unless user overrides
  - SMS during quiet hours is disabled

### Notification Flow

1. **Issue Created**: When an issue is created via API or reported via QR code
2. **Determine Criticality**: Check `is_critical` flag and `urgency` level
3. **Get Preferences**: Fetch user and organization notification preferences
4. **Apply Rules**: Determine which channels to use based on preferences
5. **Check Timing**: Respect quiet hours for non-critical issues
6. **Send Notifications**: Send via appropriate channels (SMS/Email)
7. **Log Results**: Record all attempts in `notification_logs` table

### User Preference Override

- Users can override organization defaults by setting `use_system_defaults: false`
- When overriding, users can specify individual preferences for:
  - Critical issue notifications (SMS/Email)
  - Normal issue notifications (SMS/Email)
  - Quiet hours and timing
  - Custom notification email address

## Testing

### Test Email Notifications

```bash
# Create a test issue to trigger email notification
curl -X POST http://localhost:5000/api/issues \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{
    "asset_id": "asset_uuid",
    "description": "Test critical issue",
    "is_critical": true,
    "urgency": "high"
  }'
```

### Test SMS Notifications

1. Enable SMS in user preferences
2. Add a valid phone number
3. Create a critical issue
4. Check notification logs for delivery status

### Test Organization Preferences

1. Set organization defaults as admin
2. Create issues with different users
3. Verify notifications follow organization rules

## Troubleshooting

### Common Issues

1. **SendGrid Authentication Error**:

   - Verify API key is correct
   - Check API key permissions (needs Full Access)
   - Verify sender email is authenticated

2. **Twilio Authentication Error**:

   - Verify Account SID and Auth Token
   - Check phone number format (+1234567890)
   - Ensure phone number is purchased from Twilio

3. **No Notifications Sent**:

   - Check user has `issue_notifications_enabled: true`
   - Verify organization allows the notification type
   - Check if it's during quiet hours for normal issues

4. **Database Permission Errors**:
   - Ensure RLS policies are applied
   - Verify user is member of organization
   - Check admin role for organization preferences

### Debugging

1. **Check Notification Logs**:

```bash
GET /api/notifications/logs?status=failed
```

2. **Check Server Logs**:

```bash
# Look for notification-related errors
tail -f logs/server.log | grep notification
```

3. **Test Notification Services Directly**:

```javascript
// Test SendGrid
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
sgMail.send({
  to: "test@example.com",
  from: process.env.SENDGRID_FROM_EMAIL,
  subject: "Test Email",
  text: "This is a test email",
});

// Test Twilio
const twilio = require("twilio");
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
client.messages.create({
  body: "Test SMS",
  from: process.env.TWILIO_PHONE_NUMBER,
  to: "+1234567890",
});
```

## Security Considerations

1. **Environment Variables**: Keep API keys secure and never commit them to version control
2. **Rate Limiting**: Both SendGrid and Twilio have rate limits - monitor usage
3. **Data Privacy**: Notification logs contain sensitive information - implement proper access controls
4. **Phone Number Validation**: Validate phone numbers before sending SMS to avoid charges for invalid numbers

## Cost Considerations

1. **SendGrid**: Free tier includes 100 emails/day, paid plans start at $14.95/month
2. **Twilio**: SMS costs vary by country, typically $0.0075/SMS in US
3. **Database**: Additional storage for notification logs and preferences

## Next Steps

1. Set up monitoring and alerting for notification failures
2. Implement notification templates for better formatting
3. Add support for notification scheduling and batching
4. Implement escalation workflows for unacknowledged critical issues
5. Add notification preferences to the frontend UI
