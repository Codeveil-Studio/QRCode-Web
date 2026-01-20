import { Response } from "express";
import { body, validationResult } from "express-validator";
import { AuthRequest } from "../middleware/auth";
import { getAuthenticatedSupabase, adminClient } from "../utils/supabase";
import {
  OrganizationNotificationPreferences,
  NotificationLog,
  ApiResponse,
} from "../types";
import {
  sendNotification,
  formatCriticalIssueMessage,
  formatNormalIssueMessage,
  formatIssueSubject,
} from "../utils/notifications";

// Get organization notification preferences
export const getOrgNotificationPreferences = async (
  req: AuthRequest,
  res: Response<ApiResponse<OrganizationNotificationPreferences>>
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const accessToken = req.accessToken;

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const supabase = getAuthenticatedSupabase(accessToken);

    // Get user's organization
    const { data: orgMember } = await supabase
      .from("org_members")
      .select("org_id, role")
      .eq("user_id", userId)
      .single();

    if (!orgMember) {
      res.status(404).json({
        success: false,
        error: "User is not part of any organization",
      });
      return;
    }

    // Get organization notification preferences
    const { data: orgPrefs, error } = await adminClient
      .from("organization_notification_preferences")
      .select("*")
      .eq("org_id", orgMember.org_id)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching org notification preferences:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch organization preferences",
      });
      return;
    }

    // Default organization preferences
    const defaultOrgPreferences: OrganizationNotificationPreferences = {
      org_id: orgMember.org_id,
      critical_issue_default_channel: "both",
      normal_issue_default_channel: "email",
      allow_user_overrides: true,
      notify_issue_reporter: false,
    };

    const preferences = orgPrefs || defaultOrgPreferences;

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error("Error in getOrgNotificationPreferences:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// Update organization notification preferences (admin only)
export const updateOrgNotificationPreferences = async (
  req: AuthRequest,
  res: Response<ApiResponse<OrganizationNotificationPreferences>>
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: "Validation failed",
        data: errors.array() as any,
      });
      return;
    }

    const userId = req.user?.id;
    const accessToken = req.accessToken;

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const supabase = getAuthenticatedSupabase(accessToken);

    // Check if user is admin of the organization
    const { data: orgMember } = await supabase
      .from("org_members")
      .select("org_id, role")
      .eq("user_id", userId)
      .single();

    if (!orgMember || orgMember.role !== "admin") {
      res.status(403).json({
        success: false,
        error: "Only organization admins can update notification preferences",
      });
      return;
    }

    const preferences = req.body;
    preferences.org_id = orgMember.org_id;

    // Upsert organization notification preferences
    const { data, error } = await adminClient
      .from("organization_notification_preferences")
      .upsert({
        ...preferences,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", orgMember.org_id)
      .select()
      .single();

    if (error) {
      console.error("Error updating org notification preferences:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update organization preferences",
      });
      return;
    }

    res.json({
      success: true,
      data: data,
      message: "Organization notification preferences updated successfully",
    });
  } catch (error) {
    console.error("Error in updateOrgNotificationPreferences:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// Send issue notification (simplified to use only org preferences)
export const sendIssueNotification = async (
  orgId: string,
  assetName: string,
  description: string,
  issueId: string,
  isCritical: boolean = false,
  recipientEmail?: string,
  recipientPhone?: string
): Promise<{ success: boolean; errors: string[] }> => {
  const errors: string[] = [];

  try {
    // Get organization notification preferences
    const { data: orgPrefs } = await adminClient
      .from("organization_notification_preferences")
      .select("*")
      .eq("org_id", orgId)
      .single();

    // Use default preferences if none set
    const critical_channel = orgPrefs?.critical_issue_default_channel || "both";
    const normal_channel = orgPrefs?.normal_issue_default_channel || "email";

    // Determine notification channels based on criticality
    const defaultChannel = isCritical ? critical_channel : normal_channel;

    const shouldSendEmail =
      defaultChannel === "email" || defaultChannel === "both";
    const shouldSendSMS = defaultChannel === "sms" || defaultChannel === "both";

    // Send email notification
    if (shouldSendEmail && recipientEmail) {
      const message = isCritical
        ? formatCriticalIssueMessage(assetName, description, issueId)
        : formatNormalIssueMessage(assetName, description, issueId);

      const emailResult = await sendNotification({
        orgId,
        type: "email",
        messageType: isCritical ? "critical_issue" : "normal_issue",
        recipient: recipientEmail,
        subject: formatIssueSubject(assetName, isCritical),
        message,
      });

      if (!emailResult.success) {
        errors.push(`Email failed: ${emailResult.error}`);
      }
    }

    // Send SMS notification
    if (shouldSendSMS && recipientPhone) {
      const message = isCritical
        ? formatCriticalIssueMessage(assetName, description, issueId)
        : formatNormalIssueMessage(assetName, description, issueId);

      const smsResult = await sendNotification({
        orgId,
        type: "sms",
        messageType: isCritical ? "critical_issue" : "normal_issue",
        recipient: recipientPhone,
        message,
      });

      if (!smsResult.success) {
        errors.push(`SMS failed: ${smsResult.error}`);
      }
    }

    return { success: errors.length === 0, errors };
  } catch (error: any) {
    console.error("Error in sendIssueNotification:", error);
    errors.push(error.message || "Unknown error");
    return { success: false, errors };
  }
};

// Get notification logs
export const getNotificationLogs = async (
  req: AuthRequest,
  res: Response<ApiResponse<NotificationLog[]>>
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const accessToken = req.accessToken;
    const { page = 1, limit = 20, type, status } = req.query;

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const supabase = getAuthenticatedSupabase(accessToken);

    // Get user's organization
    const { data: orgMember } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", userId)
      .single();

    if (!orgMember) {
      res.status(404).json({
        success: false,
        error: "User is not part of any organization",
      });
      return;
    }

    let query = adminClient
      .from("notification_logs")
      .select("*")
      .eq("org_id", orgMember.org_id)
      .order("created_at", { ascending: false });

    if (type) {
      query = query.eq("notification_type", type as string);
    }

    if (status) {
      query = query.eq("status", status as string);
    }

    const offset = (Number(page) - 1) * Number(limit);
    query = query.range(offset, offset + Number(limit) - 1);

    const { data: logs, error } = await query;

    if (error) {
      console.error("Error fetching notification logs:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch notification logs",
      });
      return;
    }

    res.json({
      success: true,
      data: logs || [],
    });
  } catch (error) {
    console.error("Error in getNotificationLogs:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// Validation middleware for organization notification preferences
export const validateOrgNotificationPreferences = [
  body("critical_issue_default_channel").isIn(["sms", "email", "both"]),
  body("normal_issue_default_channel").isIn(["email", "sms", "both", "none"]),
  body("allow_user_overrides").isBoolean(),
  body("notify_issue_reporter").isBoolean(),
];
