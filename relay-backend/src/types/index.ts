import { Request } from "express";

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface Asset {
  id: number;
  uid: string;
  user_id: string;
  name: string;
  location: string | null;
  created_at: string;
  type: number | null;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  last_maintenance_at: string | null;
  status: string | null;
}

export interface Issue {
  id: number;
  uid: string;
  asset_id: string;
  description: string;
  status: string;
  reported_at: string;
  resolved_at?: string;
  reported_by?: string;
  contact_info?: string;
  internal_notes?: string;
  is_critical: boolean;
  urgency: string;
  issue_type: string;
  group_id?: string;
  image_path?: string;
  tags?: string[];
  metadata?: {
    reporter_location?: {
      latitude: number;
      longitude: number;
      accuracy?: number;
    };
    device_info?: string;
    user_agent?: string;
    timestamp_with_timezone?: string;
    [key: string]: any;
  };
}

export interface AssetType {
  id: number;
  uid: string;
  name: string;
  description: string | null;
  category: string | null;
  icon: string | null;
  created_at: string;
  is_active: boolean;
  is_custom: boolean;
  created_by: string | null;
  org_id: string | null;
}

export interface OrganizationNotificationPreferences {
  id?: string;
  org_id: string;

  // System defaults
  critical_issue_default_channel: "sms" | "email" | "both";
  normal_issue_default_channel: "email" | "sms" | "both" | "none";

  // Override settings
  allow_user_overrides: boolean;

  // Issue reporter notifications
  notify_issue_reporter: boolean;

  created_at?: string;
  updated_at?: string;
}

export interface NotificationLog {
  id?: string;
  org_id: string | null;
  notification_type: "sms" | "email";
  message_type:
    | "critical_issue"
    | "normal_issue"
    | "daily_digest"
    | "weekly_digest"
    | "system";
  recipient: string; // email or phone number
  subject?: string;
  message: string;
  status: "sent" | "failed" | "pending";
  error_message?: string;
  sent_at?: string;
  created_at?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  subscription_tier: string;
  assets_limit: number;
  created_at: string;
  updated_at: string;
  assets_count?: number;
  issues_count?: number;
  last_sign_in_at?: string;
  organization?: {
    name: string;
    role: string;
    joined_at: string;
  } | null;
}

export interface SidebarStats {
  activeAssets: number;
  openIssues: number;
  criticalAlerts: number;
}

export interface DashboardStats {
  totalAssets: number;
  totalIssues: number;
  activeAssets: number;
  maintenanceNeeded: number;
  criticalIssues: number;
}

export interface AIInsight {
  type:
    | "prediction"
    | "risk"
    | "anomaly"
    | "maintenance"
    | "action"
    | "positive"
    | "warning";
  category:
    | "maintenance"
    | "failure_risk"
    | "anomaly"
    | "downtime"
    | "recommendation"
    | "performance";
  title: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low" | "info";
  confidence: number;
  timeline?: string;
  affected_assets?: string[];
  cost_impact?: "high" | "medium" | "low";
  action_required?: boolean;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthRequest extends Request {
  user?: User;
  accessToken?: string;
}
