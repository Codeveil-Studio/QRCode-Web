"use client";

import { useState, useEffect } from "react";
import {
  Package,
  AlertTriangle,
  Clock,
  CheckCircle,
  Calendar,
  MessageSquare,
  Plus,
  ThumbsUp,
  User,
  Mail,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { notFound } from "next/navigation";
import { getAssetDataFromUrl } from "@/utils/assetUrl";
import { issuesAPI } from "@/utils/api";
import { ReportIssueForm } from "@/components/ReportIssueForm";

interface Asset {
  uid: string;
  name: string;
  type: string;
  location: string;
  status: string;
  metadata?: {
    department?: string;
    criticality?: string;
    description?: string;
  };
}

interface Issue {
  id: number;
  uid: string;
  item_id: string;
  description: string;
  status: "open" | "in_progress" | "resolved";
  reported_at: string;
  resolved_at?: string;
  urgency: "low" | "medium" | "high";
  issue_type: string;
  is_critical: boolean;
  confirmation_count?: number;
  items?: {
    name: string;
    location: string;
    uid: string;
  };
}

interface IssuesData {
  openIssues: Issue[];
  resolvedIssues: Issue[];
}

const getUrgencyColor = (urgency: string, isCritical?: boolean) => {
  // If marked as critical, always show red regardless of urgency level
  if (isCritical) {
    return "bg-red-100 text-red-800";
  }

  switch (urgency) {
    case "low":
      return "bg-green-100 text-green-800";
    case "medium":
      return "bg-yellow-100 text-yellow-800";
    case "high":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};
const collectMetadata = async () => {
  const metadata: any = {
    timestamp_with_timezone: new Date().toISOString(),
    user_agent: navigator.userAgent,
    device_info: `${navigator.platform} - ${navigator.userAgent}`,
    screen_resolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    browser_language: navigator.language,
    viewport_size: `${window.innerWidth}x${window.innerHeight}`,
    color_depth: screen.colorDepth,
    pixel_ratio: window.devicePixelRatio,
    online_status: navigator.onLine,
    referrer: document.referrer || "direct",
    cookies_enabled: navigator.cookieEnabled,
  };

  // Add performance timing if available
  if (performance && performance.timing) {
    metadata.page_load_time =
      performance.timing.loadEventEnd - performance.timing.navigationStart;
  }

  return metadata;
};
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-UK", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function ReportIssuePage({
  params,
  searchParams,
}: {
  params: Promise<{ uid: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [uid, setUid] = useState<string>("");
  const [asset, setAsset] = useState<Asset | null>(null);
  const [issuesData, setIssuesData] = useState<IssuesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showMeTooForm, setShowMeTooForm] = useState<string | null>(null);
  const [meTooForm, setMeTooForm] = useState({
    reporter_name: "",
    reporter_email: "",
    message: "",
  });
  const [submittingMeToo, setSubmittingMeToo] = useState(false);
  const [loadingMeToo, setLoadingMeToo] = useState<string | null>(null);
  const [confirmedIssues, setConfirmedIssues] = useState<Set<string>>(
    new Set()
  );
  const [confirmationUids, setConfirmationUids] = useState<Map<string, string>>(
    new Map()
  );
  const [showResolvedIssues, setShowResolvedIssues] = useState(false);
  const [showCurrentIssues, setShowCurrentIssues] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const resolvedParams = await params;
        const resolvedSearchParams = await searchParams;

        setUid(resolvedParams.uid);

        // Extract asset data from URL parameters
        const searchParamsObj = new URLSearchParams();
        Object.entries(resolvedSearchParams).forEach(([key, value]) => {
          if (typeof value === "string") {
            searchParamsObj.set(key, value);
          }
        });

        const assetData = getAssetDataFromUrl(searchParamsObj);

        if (!assetData) {
          notFound();
          return;
        }

        // Create asset object
        const assetObject: Asset = {
          uid: resolvedParams.uid,
          name: assetData.name,
          type: "Equipment",
          location: assetData.location,
          status: "unknown",
          metadata: {},
        };

        setAsset(assetObject);

        // Fetch issues data
        const response = await issuesAPI.getByAssetPublic(resolvedParams.uid);

        if (response.success) {
          setIssuesData(response.data);
        } else {
          setError(response.error || "Failed to load issues");
        }
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [params, searchParams]);

  const handleOptInToIssue = async (issueUid: string) => {
    setLoadingMeToo(issueUid);

    try {
      // Immediately store the "me too" confirmation with default values
      const response = await issuesAPI.optIn(issueUid, {
        reporter_name: null,
        reporter_email: null,
        message: "I'm experiencing this issue too",
        metadata: await collectMetadata(),
      });

      if (response.success) {
        // Store the confirmation UID for potential updates
        const confirmationUid = response.data?.confirmation_uid;
        if (confirmationUid) {
          setConfirmationUids((prev) =>
            new Map(prev).set(issueUid, confirmationUid)
          );
        }

        // Add this issue to the confirmed issues set
        setConfirmedIssues((prev) => new Set(prev).add(issueUid));

        // Refresh issues data to show updated count
        const updatedResponse = await issuesAPI.getByAssetPublic(uid);
        if (updatedResponse.success) {
          setIssuesData(updatedResponse.data);
        }

        // Now show the form for additional details
        setShowMeTooForm(issueUid);
        setMeTooForm({
          reporter_name: "",
          reporter_email: "",
          message: "",
        });
      } else {
        setError(response.error || "Failed to confirm issue");
      }
    } catch (err) {
      console.error("Error confirming issue:", err);
      setError("Failed to confirm issue");
    } finally {
      setLoadingMeToo(null);
    }
  };

  const handleMeTooSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showMeTooForm) return;

    // Check if user entered any additional details
    const hasAdditionalDetails =
      meTooForm.reporter_name.trim() ||
      meTooForm.reporter_email.trim() ||
      meTooForm.message.trim();

    if (hasAdditionalDetails) {
      setSubmittingMeToo(true);

      try {
        // Get the confirmation UID for this issue
        const confirmationUid = confirmationUids.get(showMeTooForm);

        if (confirmationUid) {
          // Update existing confirmation with additional details
          const response = await issuesAPI.updateConfirmation(confirmationUid, {
            reporter_name: meTooForm.reporter_name.trim() || null,
            reporter_email: meTooForm.reporter_email.trim() || null,
            message: meTooForm.message.trim() || "Additional details provided",
            metadata: await collectMetadata(),
          });

          if (response.success) {
            // Refresh issues data
            const updatedResponse = await issuesAPI.getByAssetPublic(uid);
            if (updatedResponse.success) {
              setIssuesData(updatedResponse.data);
            }
          } else {
            setError(response.error || "Failed to submit additional details");
          }
        } else {
          setError("Could not find confirmation to update");
        }
      } catch (err) {
        console.error("Error submitting additional details:", err);
        setError("Failed to submit additional details");
      } finally {
        setSubmittingMeToo(false);
      }
    }

    // Close form regardless of whether additional details were submitted
    setShowMeTooForm(null);
    setMeTooForm({
      reporter_name: "",
      reporter_email: "",
      message: "",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-3 px-3">
        <div className="max-w-md mx-auto">
          <div className="animate-pulse">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="min-h-screen bg-gray-50 py-3 px-3">
        <div className="max-w-md mx-auto text-center">
          <div className="text-red-600 mb-4">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>{error || "Asset not found"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-10 bg-gray-50 py-3 px-3">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="flex justify-center mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">
            {asset.name}
          </h1>
          <p className="text-sm text-gray-600 mb-1">
            {asset.location}
          </p>
          <p className="text-xs text-gray-500">
            Current and recent issues
          </p>
        </div>

        {/* Current Issues */}
        {issuesData?.openIssues && issuesData.openIssues.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
            <button
              onClick={() => setShowCurrentIssues(!showCurrentIssues)}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <h3 className="text-base font-semibold text-gray-900">
                  Current Issues ({issuesData.openIssues.length})
                </h3>
              </div>
              {showCurrentIssues ? (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-400" />
              )}
            </button>

            {showCurrentIssues && (
              <div className="space-y-3 mt-4">
                {issuesData.openIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="border border-gray-200 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(
                              issue.urgency,
                              issue.is_critical
                            )}`}
                          >
                            {issue.is_critical ? "Critical" : issue.urgency}{" "}
                            urgency
                          </span>
                        </div>
                        {issue.issue_type && (
                          <p className="text-xs text-gray-600 mb-1 mt-2">
                            {issue.issue_type}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        {formatDate(issue.reported_at)}
                      </div>
                    </div>
                    {issue.description && (
                      <div className="flex items-start gap-2 mb-3">
                        <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700">
                          {issue.description}
                        </p>
                      </div>
                    )}
                    {/* Add confirmation count and "Me Too" button */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {issue.confirmation_count !== undefined &&
                          issue.confirmation_count > 0 && (
                            <span className="text-xs text-gray-500">
                              {issue.confirmation_count}{" "}
                              {issue.confirmation_count === 1
                                ? "person"
                                : "people"}{" "}
                              experiencing this
                            </span>
                          )}
                      </div>
                      {confirmedIssues.has(issue.uid) ? (
                        <div className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-md">
                          <CheckCircle className="h-3 w-3" />
                          <span>Confirmed</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOptInToIssue(issue.uid)}
                          disabled={loadingMeToo === issue.uid}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            loadingMeToo === issue.uid
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "text-blue-600 bg-blue-50 hover:bg-blue-100"
                          }`}
                        >
                          {loadingMeToo === issue.uid ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
                              <span>Adding...</span>
                            </>
                          ) : (
                            <>
                              <ThumbsUp className="h-3 w-3" />
                              Me Too
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Me Too Form */}
        {showMeTooForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  ✅ Confirmation Recorded!
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Your "me too" has been counted. Want to add more details?
                  (Optional)
                </p>
              </div>
              <button
                onClick={() => setShowMeTooForm(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleMeTooSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="meTooName"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    <User className="inline h-4 w-4 mr-1" />
                    Your Name (Optional)
                  </label>
                  <input
                    type="text"
                    id="meTooName"
                    value={meTooForm.reporter_name}
                    onChange={(e) =>
                      setMeTooForm({
                        ...meTooForm,
                        reporter_name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label
                    htmlFor="meTooEmail"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    <Mail className="inline h-4 w-4 mr-1" />
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    id="meTooEmail"
                    value={meTooForm.reporter_email}
                    onChange={(e) =>
                      setMeTooForm({
                        ...meTooForm,
                        reporter_email: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="meTooMessage"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  <MessageSquare className="inline h-4 w-4 mr-1" />
                  Additional Details (Optional)
                </label>
                <textarea
                  id="meTooMessage"
                  value={meTooForm.message}
                  onChange={(e) =>
                    setMeTooForm({ ...meTooForm, message: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900"
                  placeholder="Any additional details about your experience with this issue..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submittingMeToo}
                  className={`flex-1 py-2 px-4 rounded-md font-medium text-white transition-colors text-sm ${
                    submittingMeToo
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {submittingMeToo ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="inline h-4 w-4 mr-2" />
                      Add Details
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowMeTooForm(null)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium"
                >
                  Skip
                </button>
              </div>
            </form>
          </div>
        )}
        {/* Action Options - Show when there are open issues */}
        {issuesData?.openIssues && issuesData.openIssues.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">
              What would you like to do?
            </h3>
            <div className="space-y-2">
              <p className="text-sm text-gray-600 mb-4">
                You can add your voice to an existing issue above, or report a
                completely different problem.
              </p>
              <button
                onClick={() => setShowReportForm(true)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Report a Different Issue
              </button>
            </div>
          </div>
        )}

        {/* Report Issue Form - Show when requested */}
        {showReportForm && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-900">
                Report New Issue
              </h3>
              <button
                onClick={() => setShowReportForm(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>
            <ReportIssueForm asset={asset} />
          </div>
        )}

        {/* Recently Resolved Issues */}
        {issuesData?.resolvedIssues && issuesData.resolvedIssues.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
            <button
              onClick={() => setShowResolvedIssues(!showResolvedIssues)}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="text-base font-semibold text-gray-900">
                  Resolved Issues ({issuesData.resolvedIssues.length})
                </h3>
              </div>
              {showResolvedIssues ? (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-400" />
              )}
            </button>

            {showResolvedIssues && (
              <div className="space-y-3 mt-4">
                {issuesData.resolvedIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 relative overflow-hidden"
                  >
                    {/* Success indicator */}
                    <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>

                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Resolved
                          </span>
                          {issue.issue_type && (
                            <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded-md">
                              {issue.issue_type}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-baseline gap-1 text-xs text-green-700 mb-1">
                          <CheckCircle className="h-2.5 w-2.5" />
                          Resolved @{" "}
                          {issue.resolved_at
                            ? formatDate(issue.resolved_at)
                            : "Recently"}
                        </div>
                        <div className="flex items-baseline gap-1 text-xs text-green-700">
                          <Calendar className="h-2.5 w-2.5" />
                          Reported @ {formatDate(issue.reported_at)}
                        </div>
                      </div>
                    </div>

                    {issue.description && (
                      <div className="bg-white/60 rounded p-3 border border-green-100">
                        <p className="text-sm text-green-900 leading-relaxed">
                          {issue.description}
                        </p>
                      </div>
                    )}
                    {issue.confirmation_count !== undefined &&
                      issue.confirmation_count > 0 && (
                        <p className="text-xs text-green-700 mt-3 ms-2 text-right">
                          {issue.confirmation_count}{" "}
                          {issue.confirmation_count === 1 ? "person" : "people"}{" "}
                          reported this issue
                        </p>
                      )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Report Issue Option - Show when no open issues but there are resolved issues */}
        {issuesData &&
          issuesData.openIssues.length === 0 &&
          issuesData.resolvedIssues.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
              <h3 className="text-base font-semibold text-gray-900 mb-3">
                No Current Issues
              </h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-600 mb-4">
                  Great! All previous issues have been resolved. Need to report
                  a new issue?
                </p>
                <button
                  onClick={() => setShowReportForm(true)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Plus className="h-4 w-4" />
                  Report an Issue
                </button>
              </div>
            </div>
          )}

        {/* No Issues Message - Show ReportIssueForm */}
        {issuesData &&
          issuesData.openIssues.length === 0 &&
          issuesData.resolvedIssues.length === 0 && (
            <ReportIssueForm asset={asset} />
          )}
      </div>
    </div>
  );
}
