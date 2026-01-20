import sgMail from "@sendgrid/mail";
import twilio from "twilio";
import { NotificationLog } from "../types";
import { adminClient } from "./supabase";
import dotenv from "dotenv";

dotenv.config();

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Initialize Twilio
let twilioClient: any = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
}

export interface NotificationOptions {
  orgId: string | null;
  type: "sms" | "email";
  messageType:
    | "critical_issue"
    | "normal_issue"
    | "daily_digest"
    | "weekly_digest"
    | "system";
  recipient: string;
  subject?: string;
  message: string;
  urgent?: boolean;
}

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
}

export interface SMSOptions {
  to: string;
  message: string;
  from?: string;
}

/**
 * Send email notification via SendGrid
 */
export const sendEmail = async (
  options: EmailOptions
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn("SendGrid API key not configured");
      return { success: false, error: "Email service not configured" };
    }

    const msg = {
      to: options.to,
      from: process.env.SENDGRID_FROM_EMAIL || "noreply@relay.app",
      subject: options.subject,
      text: options.text,
      html: options.html || `<p>${options.text.replace(/\n/g, "<br>")}</p>`,
    };

    await sgMail.send(msg);
    console.log(`Email sent successfully to ${options.to}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error sending email:", error);
    return {
      success: false,
      error:
        error.response?.body?.errors?.[0]?.message ||
        error.message ||
        "Failed to send email",
    };
  }
};

/**
 * Send SMS notification via Twilio
 */
export const sendSMS = async (
  options: SMSOptions
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!twilioClient) {
      console.warn("Twilio not configured");
      return { success: false, error: "SMS service not configured" };
    }

    const message = await twilioClient.messages.create({
      body: options.message,
      from: options.from || process.env.TWILIO_PHONE_NUMBER,
      to: options.to,
    });

    console.log(`SMS sent successfully to ${options.to}. SID: ${message.sid}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error sending SMS:", error);
    return {
      success: false,
      error: error.message || "Failed to send SMS",
    };
  }
};

/**
 * Log notification attempt to database
 */
export const logNotification = async (log: NotificationLog): Promise<void> => {
  try {
    const { error } = await adminClient.from("notification_logs").insert({
      org_id: log.org_id,
      notification_type: log.notification_type,
      message_type: log.message_type,
      recipient: log.recipient,
      subject: log.subject,
      message: log.message,
      status: log.status,
      error_message: log.error_message,
      sent_at: log.sent_at,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error logging notification:", error);
    }
  } catch (error) {
    console.error("Error logging notification:", error);
  }
};

/**
 * Check if current time is within quiet hours
 */
export const isQuietHours = (
  quietStart: string,
  quietEnd: string,
  timezone: string = "UTC"
): boolean => {
  try {
    const now = new Date();
    const currentTime = now.toLocaleTimeString("en-US", {
      timeZone: timezone,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });

    // Convert times to minutes for easier comparison
    const timeToMinutes = (time: string) => {
      const [hours, minutes] = time.split(":").map(Number);
      return hours * 60 + minutes;
    };

    const currentMinutes = timeToMinutes(currentTime);
    const startMinutes = timeToMinutes(quietStart);
    const endMinutes = timeToMinutes(quietEnd);

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    } else {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }
  } catch (error) {
    console.error("Error checking quiet hours:", error);
    return false;
  }
};

/**
 * Format phone number for SMS
 */
export const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, "");

  // Add + prefix if not present
  if (!phoneNumber.startsWith("+")) {
    // Assume US number if no country code
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith("1")) {
      return `+${cleaned}`;
    } else {
      return `+${cleaned}`;
    }
  }

  return phoneNumber;
};

/**
 * Send notification with proper logging and error handling
 */
export const sendNotification = async (
  options: NotificationOptions
): Promise<{ success: boolean; error?: string }> => {
  const logEntry: NotificationLog = {
    org_id: options.orgId,
    notification_type: options.type,
    message_type: options.messageType,
    recipient: options.recipient,
    subject: options.subject,
    message: options.message,
    status: "pending",
    created_at: new Date().toISOString(),
  };

  try {
    let result: { success: boolean; error?: string };

    if (options.type === "email") {
      result = await sendEmail({
        to: options.recipient,
        subject: options.subject || "Relay Notification",
        text: options.message,
      });
    } else if (options.type === "sms") {
      result = await sendSMS({
        to: formatPhoneNumber(options.recipient),
        message: options.message,
      });
    } else {
      result = { success: false, error: "Invalid notification type" };
    }

    // Update log entry
    logEntry.status = result.success ? "sent" : "failed";
    logEntry.error_message = result.error;
    logEntry.sent_at = result.success ? new Date().toISOString() : undefined;

    // Log to database
    await logNotification(logEntry);

    return result;
  } catch (error: any) {
    // Log failure
    logEntry.status = "failed";
    logEntry.error_message = error.message || "Unknown error";
    await logNotification(logEntry);

    return {
      success: false,
      error: error.message || "Failed to send notification",
    };
  }
};

/**
 * Format message for critical issues
 */
export const formatCriticalIssueMessage = (
  assetName: string,
  description: string,
  issueId: string
): string => {
  return `🚨 CRITICAL ISSUE ALERT

Asset: ${assetName}
Issue: ${description}
ID: ${issueId}

Immediate attention required. Please check the Relay dashboard for full details.`;
};

/**
 * Format message for normal issues
 */
export const formatNormalIssueMessage = (
  assetName: string,
  description: string,
  issueId: string
): string => {
  return `⚠️ New Issue Reported

Asset: ${assetName}
Issue: ${description}
ID: ${issueId}

Please review when convenient. Check the Relay dashboard for more information.`;
};

/**
 * Format email subject for issues
 */
export const formatIssueSubject = (
  assetName: string,
  isCritical: boolean
): string => {
  const prefix = isCritical ? "🚨 CRITICAL" : "⚠️ New Issue";
  return `${prefix} - ${assetName} | Relay`;
};

/**
 * Format confirmation message for issue reporters
 */
export const formatIssueReporterConfirmation = (
  assetName: string,
  description: string,
  issueId: string,
  reporterName?: string
): string => {
  const greeting = reporterName ? `Hi ${reporterName},` : "Hi,";

  return `${greeting}

Thank you for reporting an issue! We have received your report and it has been assigned ID: ${issueId}

Asset: ${assetName}
Issue Description: ${description || "No description provided"}

Your report is important to us and we will investigate it promptly. You will receive email updates as we work to resolve this issue.

If you have any questions or additional information about this issue, please reply to this email with the Issue ID: ${issueId}

Thank you for helping us maintain our assets.

Best regards,
The Relay Team`;
};

/**
 * Format confirmation email subject for issue reporters
 */
export const formatIssueReporterSubject = (assetName: string): string => {
  return `✅ Issue Report Received - ${assetName} | Relay`;
};
