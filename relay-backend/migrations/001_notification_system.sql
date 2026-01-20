-- Migration: Notification System Setup
-- This migration sets up the tables needed for the enhanced notification system

-- 1. Create organization_notification_preferences table
CREATE TABLE IF NOT EXISTS organization_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    
    -- System defaults
    critical_issue_default_channel TEXT NOT NULL DEFAULT 'both' 
        CHECK (critical_issue_default_channel IN ('sms', 'email', 'both')),
    normal_issue_default_channel TEXT NOT NULL DEFAULT 'email'
        CHECK (normal_issue_default_channel IN ('email', 'sms', 'both', 'none')),
    
    -- Override settings
    allow_user_overrides BOOLEAN NOT NULL DEFAULT true,
    
    -- Emergency escalation
    escalation_enabled BOOLEAN NOT NULL DEFAULT false,
    escalation_delay_minutes INTEGER NOT NULL DEFAULT 30 
        CHECK (escalation_delay_minutes >= 1 AND escalation_delay_minutes <= 1440),
    escalation_contacts TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure one preference per organization
    UNIQUE(org_id)
);

-- 2. Create notification_logs table
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES orgs(id) ON DELETE SET NULL,
    
    notification_type TEXT NOT NULL CHECK (notification_type IN ('sms', 'email')),
    message_type TEXT NOT NULL CHECK (message_type IN ('critical_issue', 'normal_issue', 'daily_digest', 'weekly_digest', 'system')),
    
    recipient TEXT NOT NULL, -- email address or phone number
    subject TEXT, -- for emails
    message TEXT NOT NULL,
    
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('sent', 'failed', 'pending')),
    error_message TEXT,
    
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_notification_prefs_org_id 
    ON organization_notification_preferences(org_id);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id 
    ON notification_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_logs_org_id 
    ON notification_logs(org_id);

CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at 
    ON notification_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_logs_status 
    ON notification_logs(status);

-- 4. Update profiles table to enhance notification_preferences column
-- First, ensure the column exists (it might already exist from previous migrations)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'notification_preferences'
    ) THEN
        ALTER TABLE profiles ADD COLUMN notification_preferences JSONB DEFAULT '{}';
    END IF;
END $$;

-- Update the default notification preferences to include new fields
UPDATE profiles 
SET notification_preferences = COALESCE(notification_preferences, '{}'::jsonb) || '{
    "issue_notifications_enabled": true,
    "flow_notifications_enabled": true,
    "sms_enabled": false,
    "email_enabled": true,
    "phone_number": "",
    "critical_issue_sms": false,
    "critical_issue_email": true,
    "normal_issue_sms": false,
    "normal_issue_email": true,
    "quiet_hours_enabled": false,
    "quiet_start": "22:00",
    "quiet_end": "08:00",
    "timezone": "UTC",
    "daily_digest": false,
    "weekly_digest": true,
    "use_system_defaults": true
}'::jsonb
WHERE notification_preferences IS NULL OR notification_preferences = '{}'::jsonb;

-- 5. Create default organization notification preferences for existing organizations
INSERT INTO organization_notification_preferences (org_id, critical_issue_default_channel, normal_issue_default_channel)
SELECT id, 'both', 'email'
FROM orgs 
WHERE id NOT IN (SELECT org_id FROM organization_notification_preferences)
ON CONFLICT (org_id) DO NOTHING;

-- 6. Create updated_at trigger for organization_notification_preferences
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_org_notification_prefs_updated_at ON organization_notification_preferences;
CREATE TRIGGER update_org_notification_prefs_updated_at
    BEFORE UPDATE ON organization_notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Add Row Level Security (RLS) policies

-- Enable RLS on organization_notification_preferences
ALTER TABLE organization_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their organization's notification preferences
CREATE POLICY "Users can view org notification preferences" ON organization_notification_preferences
    FOR SELECT USING (
        org_id IN (
            SELECT org_id FROM org_members 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Only org admins can update notification preferences
CREATE POLICY "Org admins can update notification preferences" ON organization_notification_preferences
    FOR UPDATE USING (
        org_id IN (
            SELECT org_id FROM org_members 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Only org admins can insert notification preferences
CREATE POLICY "Org admins can insert notification preferences" ON organization_notification_preferences
    FOR INSERT WITH CHECK (
        org_id IN (
            SELECT org_id FROM org_members 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Enable RLS on notification_logs
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notification logs
CREATE POLICY "Users can view their notification logs" ON notification_logs
    FOR SELECT USING (user_id = auth.uid());

-- Policy: Service role can insert notification logs
CREATE POLICY "Service can insert notification logs" ON notification_logs
    FOR INSERT WITH CHECK (true);

-- 8. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON organization_notification_preferences TO authenticated;
GRANT SELECT ON notification_logs TO authenticated;
GRANT INSERT ON notification_logs TO service_role;

-- Comment the tables
COMMENT ON TABLE organization_notification_preferences IS 'Stores notification preferences at the organization level';
COMMENT ON TABLE notification_logs IS 'Logs all notification attempts for auditing and debugging';

COMMENT ON COLUMN organization_notification_preferences.critical_issue_default_channel IS 'Default notification channel for critical issues';
COMMENT ON COLUMN organization_notification_preferences.normal_issue_default_channel IS 'Default notification channel for normal issues';
COMMENT ON COLUMN organization_notification_preferences.allow_user_overrides IS 'Whether users can override organization defaults';
COMMENT ON COLUMN organization_notification_preferences.escalation_enabled IS 'Whether to escalate unacknowledged critical issues';
COMMENT ON COLUMN organization_notification_preferences.escalation_delay_minutes IS 'Minutes to wait before escalating';
COMMENT ON COLUMN organization_notification_preferences.escalation_contacts IS 'Phone numbers for escalation notifications';

COMMENT ON COLUMN notification_logs.notification_type IS 'Type of notification: sms or email';
COMMENT ON COLUMN notification_logs.message_type IS 'Category of message sent';
COMMENT ON COLUMN notification_logs.recipient IS 'Email address or phone number of recipient';
COMMENT ON COLUMN notification_logs.status IS 'Delivery status of the notification'; 