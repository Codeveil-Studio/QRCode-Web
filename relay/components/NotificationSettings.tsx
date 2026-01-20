"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { profileAPI } from "@/utils/api";
import {
  Bell,
  Phone,
  Mail,
  Save,
  Loader2,
  Check,
  AlertTriangle,
  Settings,
  Shield,
  History,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface OrganizationNotificationPreferences {
  id?: string;
  org_id: string;
  critical_issue_default_channel: "sms" | "email" | "both";
  normal_issue_default_channel: "email" | "sms" | "both" | "none";
  allow_user_overrides: boolean;
  notify_issue_reporter: boolean;
  created_at?: string;
  updated_at?: string;
}

interface NotificationLog {
  id: string;
  org_id: string | null;
  notification_type: "sms" | "email";
  message_type:
    | "critical_issue"
    | "normal_issue"
    | "daily_digest"
    | "weekly_digest"
    | "system";
  recipient: string;
  subject?: string;
  message: string;
  status: "sent" | "failed" | "pending";
  error_message?: string;
  sent_at?: string;
  created_at: string;
}

export function NotificationSettings() {
  const [preferences, setPreferences] =
    useState<OrganizationNotificationPreferences | null>(null);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState<
    "preferences" | "user" | "logs"
  >("preferences");
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    critical: true,
    normal: true,
    reporter: false,
    settings: false,
    userMobile: true,
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileNumber, setMobileNumber] = useState("");
  const [savingMobile, setSavingMobile] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch organization notification preferences
      const prefsResult = await profileAPI.getNotificationPreferences();
      if (prefsResult.success) {
        setPreferences(prefsResult.data);
        setIsAdmin(true); // If we can fetch preferences, user has access
      } else {
        toast.error("Failed to load notification settings");
        setIsAdmin(false);
      }

      // Fetch user mobile number
      const mobileResult = await profileAPI.getMobileNumber();
      if (mobileResult.success && mobileResult.data?.mobileNumber) {
        setMobileNumber(mobileResult.data.mobileNumber);
      }

      // Fetch notification logs
      const logsResult = await profileAPI.getNotificationLogs({ limit: 10 });
      if (logsResult.success) {
        setNotificationLogs(logsResult.data);
      }
    } catch (error) {
      console.error("Error fetching notification data:", error);
      toast.error("Failed to load notification settings");
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!preferences) return;

    setSaving(true);
    try {
      const result = await profileAPI.updateNotificationPreferences(
        preferences
      );
      if (result.success) {
        toast.success("Notification settings saved");
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        toast.error(result.error || "Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (
    key: keyof OrganizationNotificationPreferences,
    value: any
  ) => {
    if (!preferences) return;
    setPreferences({ ...preferences, [key]: value });
  };

  const saveMobileNumber = async () => {
    setSavingMobile(true);
    try {
      const result = await profileAPI.updateMobileNumber(mobileNumber);
      if (result.success) {
        toast.success("Mobile number saved successfully");
      } else {
        toast.error(result.error || "Failed to save mobile number");
      }
    } catch (error) {
      console.error("Error saving mobile number:", error);
      toast.error("Failed to save mobile number");
    } finally {
      setSavingMobile(false);
    }
  };

  const deleteMobileNumber = async () => {
    setSavingMobile(true);
    try {
      const result = await profileAPI.deleteMobileNumber();
      if (result.success) {
        setMobileNumber("");
        toast.success("Mobile number removed successfully");
      } else {
        toast.error(result.error || "Failed to remove mobile number");
      }
    } catch (error) {
      console.error("Error removing mobile number:", error);
      toast.error("Failed to remove mobile number");
    } finally {
      setSavingMobile(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const refreshLogs = async () => {
    try {
      const result = await profileAPI.getNotificationLogs({ limit: 10 });
      if (result.success) {
        setNotificationLogs(result.data);
        toast.success("Notification logs refreshed");
      }
    } catch (error) {
      console.error("Error refreshing logs:", error);
      toast.error("Failed to refresh logs");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "text-green-600 bg-green-50";
      case "failed":
        return "text-red-600 bg-red-50";
      case "pending":
        return "text-yellow-600 bg-yellow-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case "critical_issue":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "normal_issue":
        return <Bell className="h-4 w-4 text-blue-500" />;
      case "system":
        return <Settings className="h-4 w-4 text-gray-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">
          Loading notification settings...
        </span>
      </div>
    );
  }

  if (!isAdmin || !preferences) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Access Restricted
        </h3>
        <p className="text-gray-600">
          Only organization administrators can manage notification settings.
        </p>
      </div>
    );
  }

  return (
    <div className="">
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveSection("preferences")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeSection === "preferences"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Settings className="h-4 w-4 inline mr-2" />
            Organization Preferences
          </button>
          <button
            onClick={() => setActiveSection("user")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeSection === "user"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Phone className="h-4 w-4 inline mr-2" />
            My Notification Settings
          </button>
          <button
            onClick={() => setActiveSection("logs")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeSection === "logs"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <History className="h-4 w-4 inline mr-2" />
            Notification Logs
          </button>
        </nav>
      </div>

      <div className="p-6">
        {activeSection === "preferences" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Organization Notification Settings
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Configure notification preferences for your organization
                </p>
              </div>
              <button
                onClick={savePreferences}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : saved ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </>
                )}
              </button>
            </div>

            {/* Critical Issue Notifications */}
            <div className="border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleSection("critical")}
                className="w-full px-4 py-3 text-left border-b border-gray-200 hover:bg-gray-50 flex items-center justify-between"
              >
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
                  <span className="font-medium text-gray-900">
                    Critical Issue Notifications
                  </span>
                </div>
                {expandedSections.critical ? (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                )}
              </button>
              {expandedSections.critical && (
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Channel for Critical Issues
                    </label>
                    <select
                      value={preferences.critical_issue_default_channel}
                      onChange={(e) =>
                        updatePreference(
                          "critical_issue_default_channel",
                          e.target.value as "sms" | "email" | "both"
                        )
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="email">Email Only</option>
                      <option value="sms">SMS Only</option>
                      <option value="both">Both Email and SMS</option>
                    </select>
                    <p className="text-sm text-gray-500 mt-1">
                      How critical issues should be delivered by
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Normal Issue Notifications */}
            <div className="border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleSection("normal")}
                className="w-full px-4 py-3 text-left border-b border-gray-200 hover:bg-gray-50 flex items-center justify-between"
              >
                <div className="flex items-center">
                  <Bell className="h-5 w-5 text-blue-500 mr-3" />
                  <span className="font-medium text-gray-900">
                    Normal Issue Notifications
                  </span>
                </div>
                {expandedSections.normal ? (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                )}
              </button>
              {expandedSections.normal && (
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Channel for Normal Issues
                    </label>
                    <select
                      value={preferences.normal_issue_default_channel}
                      onChange={(e) =>
                        updatePreference(
                          "normal_issue_default_channel",
                          e.target.value as "email" | "sms" | "both" | "none"
                        )
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="email">Email Only</option>
                      <option value="sms">SMS Only</option>
                      <option value="both">Both Email and SMS</option>
                      <option value="none">No Notifications</option>
                    </select>
                    <p className="text-sm text-gray-500 mt-1">
                      How normal issues should be delivered
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Issue Reporter Notifications */}
            <div className="border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleSection("reporter")}
                className="w-full px-4 py-3 text-left border-b border-gray-200 hover:bg-gray-50 flex items-center justify-between"
              >
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-green-500 mr-3" />
                  <span className="font-medium text-gray-900">
                    Issue Reporter Notifications
                  </span>
                </div>
                {expandedSections.reporter ? (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                )}
              </button>
              {expandedSections.reporter && (
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Notify Issue Reporters
                      </label>
                      <p className="text-sm text-gray-500">
                        Send email updates to users who report issues (when they
                        provide their email)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updatePreference(
                          "notify_issue_reporter",
                          !preferences.notify_issue_reporter
                        )
                      }
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        preferences.notify_issue_reporter
                          ? "bg-blue-600"
                          : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          preferences.notify_issue_reporter
                            ? "translate-x-5"
                            : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <Mail className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">
                          How it works
                        </h3>
                        <div className="mt-2 text-sm text-blue-700">
                          <p>
                            When this setting is enabled, users who report
                            issues and provide their email address will receive:
                          </p>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            <li>Confirmation when their issue is received</li>
                            <li>Updates when the issue status changes</li>
                            <li>Notification when the issue is resolved</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* General Settings */}
            <div className="border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleSection("settings")}
                className="w-full px-4 py-3 text-left border-b border-gray-200 hover:bg-gray-50 flex items-center justify-between"
              >
                <div className="flex items-center">
                  <Settings className="h-5 w-5 text-gray-500 mr-3" />
                  <span className="font-medium text-gray-900">
                    General Settings
                  </span>
                </div>
                {expandedSections.settings ? (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                )}
              </button>
              {expandedSections.settings && (
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Allow User Overrides
                      </label>
                      <p className="text-sm text-gray-500">
                        Allow users to override organization notification
                        preferences
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updatePreference(
                          "allow_user_overrides",
                          !preferences.allow_user_overrides
                        )
                      }
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        preferences.allow_user_overrides
                          ? "bg-blue-600"
                          : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          preferences.allow_user_overrides
                            ? "translate-x-5"
                            : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSection === "user" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Organization Mobile Number
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Configure your organization's mobile number for SMS
                  notifications
                  {!isAdmin && " (Admin access required to modify)"}
                </p>
              </div>
            </div>

            {/* Mobile Number Settings */}
            <div className="border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleSection("userMobile")}
                className="w-full px-4 py-3 text-left border-b border-gray-200 hover:bg-gray-50 flex items-center justify-between"
              >
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-green-500 mr-3" />
                  <span className="font-medium text-gray-900">
                    Organization Mobile Number for SMS Notifications
                  </span>
                </div>
                {expandedSections.userMobile ? (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                )}
              </button>
              {expandedSections.userMobile && (
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Organization Mobile Number
                    </label>
                    <div className="flex space-x-3">
                      <input
                        type="tel"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="+44 1234 567890"
                        disabled={!isAdmin}
                        className={`flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                          !isAdmin ? "bg-gray-100 cursor-not-allowed" : ""
                        }`}
                      />
                      {isAdmin && (
                        <>
                          <button
                            onClick={saveMobileNumber}
                            disabled={savingMobile}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                          >
                            {savingMobile ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                Save
                              </>
                            )}
                          </button>
                          {mobileNumber && (
                            <button
                              onClick={deleteMobileNumber}
                              disabled={savingMobile}
                              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                              Remove
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {isAdmin
                        ? "Configure the organization's mobile number for SMS notifications"
                        : "Only organization administrators can modify the mobile number"}
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <Phone className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">
                          SMS Notifications
                        </h3>
                        <div className="mt-2 text-sm text-blue-700">
                          <p>
                            The organization's mobile number will be used to
                            send SMS notifications based on:
                          </p>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            <li>Organization notification settings</li>
                            <li>Issue type and severity</li>
                            <li>
                              All organization members receive SMS notifications
                            </li>
                            <li>Message rates may apply</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSection === "logs" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Notification Logs
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Recent notification delivery history for your organization
                </p>
              </div>
              <button
                onClick={refreshLogs}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>

            {notificationLogs.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No notification logs found</p>
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {notificationLogs.map((log) => (
                    <li key={log.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {getMessageTypeIcon(log.message_type)}
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                              {log.message_type.replace("_", " ").toUpperCase()}
                            </p>
                            <p className="text-sm text-gray-500">
                              {log.notification_type.toUpperCase()} to{" "}
                              {log.recipient}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              log.status
                            )}`}
                          >
                            {log.status}
                          </span>
                          <span className="ml-4 text-sm text-gray-500">
                            {formatDate(log.created_at)}
                          </span>
                        </div>
                      </div>
                      {log.error_message && (
                        <div className="mt-2 text-sm text-red-600">
                          Error: {log.error_message}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
