"use client";

import {
  X,
  AlertTriangle,
  Package,
  Calendar,
  Tag,
  Clock,
  ChevronRight,
  CheckCircle,
  Users,
} from "lucide-react";
import { IssueImageDisplay } from "@/components/IssueImageDisplay";

interface Issue {
  id: number;
  uid: string;
  asset_uid: string;
  description: string | null;
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
  image_url?: string;
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
  assets: {
    name: string;
    type: string;
    location: string;
  };
}

interface IssueDetailModalProps {
  issue: Issue | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (issueId: number, newStatus: string) => void;
  onResolveIssue?: (issueId: number) => void;
  onGroupStatusUpdate?: (groupId: string, newStatus: string) => void;
  allIssues?: Issue[];
}

export function IssueDetailModal({
  issue,
  isOpen,
  onClose,
  onStatusUpdate,
  onResolveIssue,
  onGroupStatusUpdate,
  allIssues = [],
}: IssueDetailModalProps) {
  if (!isOpen || !issue) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-orange-50 text-orange-700";
      case "in_progress":
        return "bg-blue-50 text-blue-700";
      case "resolved":
        return "bg-green-50 text-green-700";
      case "closed":
        return "bg-gray-50 text-gray-700";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "bg-red-50 text-red-700";
      case "medium":
        return "bg-orange-50 text-orange-700";
      case "low":
        return "bg-blue-50 text-blue-700";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };

  // Get group description based on asset name and location
  const getGroupDescription = (groupId: string) => {
    if (!groupId || groupId === "ungrouped") return null;

    const groupIssues = allIssues.filter((i) => i.group_id === groupId);
    if (groupIssues.length === 0) return null;

    // Use the first issue's item info for group description
    const firstIssue = groupIssues[0];
    return `${firstIssue.assets?.name || "Unknown Asset"} - ${
      firstIssue.assets?.location || "Unknown Location"
    }`;
  };

  // Get all issues in the same group
  const getGroupIssues = (groupId: string) => {
    if (!groupId || groupId === "ungrouped") return [];
    return allIssues.filter((i) => i.group_id === groupId);
  };

  // Check if all issues in group can be resolved
  const canResolveGroup = (groupId: string) => {
    const groupIssues = getGroupIssues(groupId);
    return groupIssues.some(
      (i) => i.status === "open" || i.status === "in_progress"
    );
  };

  const handleGroupResolve = () => {
    if (issue.group_id && onGroupStatusUpdate) {
      onGroupStatusUpdate(issue.group_id, "resolved");
    }
  };

  const groupDescription = issue.group_id
    ? getGroupDescription(issue.group_id)
    : null;
  const groupIssues = issue.group_id ? getGroupIssues(issue.group_id) : [];
  const unresolvedGroupIssues = groupIssues.filter(
    (i) => i.status !== "resolved" && i.status !== "closed"
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-6 border-b border-gray-100 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle
                className={`h-6 w-6 ${
                  issue.is_critical ? "text-red-500" : "text-orange-500"
                }`}
              />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Issue #{issue.id}
                </h2>
                {groupDescription && (
                  <p className="text-sm text-gray-500 mt-1">
                    <Users className="h-4 w-4 inline mr-1" />
                    Group: {groupDescription}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Group Actions */}
          {issue.group_id &&
            groupDescription &&
            unresolvedGroupIssues.length > 1 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-blue-900 mb-1">
                      Group Management
                    </h3>
                    <p className="text-sm text-blue-700">
                      {unresolvedGroupIssues.length} unresolved issues in this
                      group
                    </p>
                  </div>
                  {canResolveGroup(issue.group_id) && (
                    <button
                      onClick={handleGroupResolve}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Mark All Resolved</span>
                    </button>
                  )}
                </div>
              </div>
            )}

          {/* Issue Details */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Description
            </h3>
            <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-xl">
              {issue.description || "No description provided"}
            </p>
          </div>

          {/* Image Attachment */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Attached Image
            </h3>
            <div className="bg-gray-50 p-4 rounded-xl">
              {issue.image_url ? (
                <IssueImageDisplay imageUrl={issue.image_url} />
              ) : (
                <div className="flex items-center gap-2 text-gray-500">
                  <Package className="h-4 w-4" />
                  <span className="text-sm">No image uploaded</span>
                </div>
              )}
            </div>
          </div>

          {/* Location Information */}
          {issue.metadata?.reporter_location && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Reported Location
              </h3>
              <div className="bg-blue-50 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    GPS Coordinates
                  </span>
                </div>
                <div className="text-sm text-blue-800 font-mono">
                  {issue.metadata.reporter_location.latitude.toFixed(6)},{" "}
                  {issue.metadata.reporter_location.longitude.toFixed(6)}
                </div>
                {issue.metadata.reporter_location.accuracy && (
                  <div className="text-xs text-blue-600 mt-1">
                    Accuracy: ±
                    {Math.round(issue.metadata.reporter_location.accuracy)}{" "}
                    meters
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reporter Information */}
          {(issue.reported_by || issue.contact_info) && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Reporter Information
              </h3>
              <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                {issue.reported_by && (
                  <div>
                    <span className="text-xs text-gray-600">Reported by:</span>
                    <p className="text-sm text-gray-900">{issue.reported_by}</p>
                  </div>
                )}
                {issue.contact_info && (
                  <div>
                    <span className="text-xs text-gray-600">Contact:</span>
                    <p className="text-sm text-gray-900">
                      {issue.contact_info}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          {issue.tags && issue.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {issue.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Internal Notes */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Internal Notes
            </h3>
            {issue.internal_notes ? (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {issue.internal_notes}
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
                <p className="text-sm text-gray-500 italic">
                  No internal notes added
                </p>
              </div>
            )}
          </div>

          {/* Issue Type */}
          {issue.issue_type && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Issue Type
              </h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                {issue.issue_type}
              </span>
            </div>
          )}

          {/* Additional Metadata */}
          {issue.metadata && Object.keys(issue.metadata).length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Additional Information
              </h3>
              <div className="bg-gray-50 p-4 rounded-xl">
                <div className="space-y-2 text-sm">
                  {issue.metadata.device_info && (
                    <div>
                      <span className="text-gray-600">Device:</span>{" "}
                      <span className="text-gray-900 font-mono text-xs">
                        {issue.metadata.device_info}
                      </span>
                    </div>
                  )}
                  {issue.metadata.timezone && (
                    <div>
                      <span className="text-gray-600">Timezone:</span>{" "}
                      <span className="text-gray-900">
                        {issue.metadata.timezone}
                      </span>
                    </div>
                  )}
                  {issue.metadata.source && (
                    <div>
                      <span className="text-gray-600">Source:</span>{" "}
                      <span className="text-gray-900 capitalize">
                        {issue.metadata.source}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Status and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Tag className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <span
                  className={`inline-block px-2.5 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    issue.status
                  )}`}
                >
                  {issue.status.replace("_", " ")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Priority</p>
                <span
                  className={`inline-block px-2.5 py-1 rounded-full text-sm font-medium ${getUrgencyColor(
                    issue.urgency
                  )}`}
                >
                  {issue.urgency}
                </span>
              </div>
            </div>
          </div>

          {/* Affected Item */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Affected Item
            </h3>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {issue.assets?.name || "Unknown Asset"}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                    <span>{issue.assets?.type || "Unknown Type"}</span>
                    <span>{issue.assets?.location || "Unknown Location"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Timeline</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Issue Reported
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(issue.reported_at).toLocaleString()}
                  </p>
                </div>
              </div>
              {issue.status === "in_progress" && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Work In Progress
                    </p>
                    <p className="text-xs text-gray-500">
                      Currently being addressed
                    </p>
                  </div>
                </div>
              )}
              {issue.status === "resolved" && issue.resolved_at && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Issue Resolved
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(issue.resolved_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Related Issues in Group */}
          {issue.group_id && groupIssues.length > 1 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Related Issues in Group ({groupIssues.length})
              </h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {groupIssues
                  .filter((relatedIssue) => relatedIssue.id !== issue.id)
                  .map((relatedIssue) => (
                    <div
                      key={relatedIssue.id}
                      className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-900 mb-1">
                            {relatedIssue.description ||
                              "No description provided"}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>#{relatedIssue.id}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full ${getUrgencyColor(
                                relatedIssue.urgency
                              )}`}
                            >
                              {relatedIssue.urgency} priority
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full ${getStatusColor(
                                relatedIssue.status
                              )}`}
                            >
                              {relatedIssue.status.replace("_", " ")}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Individual Issue Actions */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Individual Issue Actions
            </h3>
            {issue.status === "open" && (
              <div className="flex gap-2">
                <button
                  onClick={() => onStatusUpdate(issue.id, "in_progress")}
                  className="flex-1 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Start Progress
                </button>
                <button
                  onClick={() => onStatusUpdate(issue.id, "resolved")}
                  className="flex-1 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                >
                  Mark Resolved
                </button>
              </div>
            )}
            {issue.status === "in_progress" && (
              <div className="flex gap-2">
                <button
                  onClick={() => onStatusUpdate(issue.id, "resolved")}
                  className="flex-1 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                >
                  Mark Resolved
                </button>
              </div>
            )}
            {issue.status === "resolved" && (
              <div className="flex gap-2">
                <button
                  onClick={() => onStatusUpdate(issue.id, "closed")}
                  className="flex-1 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Close Issue
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
