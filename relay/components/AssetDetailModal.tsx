"use client";

import {
  X,
  Package,
  MapPin,
  Tag,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  ExternalLink,
  Edit3,
  Trash2,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { assetsAPI } from "@/utils/api";
import { toast } from "react-hot-toast";
import { EditAssetModal } from "./EditAssetModal";

interface Asset {
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
  status: string;
}

interface Issue {
  id: number;
  uid: string;
  asset_id: string;
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
  tags?: string[];
  metadata?: any;
  confirmation_count?: number;
}

interface AssetDetailModalProps {
  asset: Asset | null;
  issues: Issue[];
  isOpen: boolean;
  onClose: () => void;
  onAssetDeleted?: (assetId: number) => void;
  onAssetUpdated?: (asset: Asset) => void;
}

export function AssetDetailModal({
  asset,
  issues,
  isOpen,
  onClose,
  onAssetDeleted,
  onAssetUpdated,
}: AssetDetailModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!isOpen || !asset) return null;

  const handleDelete = async () => {
    if (!asset) return;

    setDeleting(true);
    try {
      const result = await assetsAPI.delete(asset.id.toString());

      if (result.success) {
        toast.success("Asset deleted successfully!");
        onAssetDeleted?.(asset.id);
        onClose();
      } else {
        toast.error(result.error || "Failed to delete asset");
      }
    } catch (error) {
      console.error("Error deleting asset:", error);
      toast.error("Failed to delete asset");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleAssetUpdated = (updatedAsset: Asset) => {
    onAssetUpdated?.(updatedAsset);
    setShowEditModal(false);
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "active":
        return "bg-green-50 text-green-700";
      case "maintenance_needed":
        return "bg-orange-50 text-orange-700";
      case "inactive":
        return "bg-gray-50 text-gray-700";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };

  const getIssueStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-red-50 text-red-700";
      case "in_progress":
        return "bg-yellow-50 text-yellow-700";
      case "resolved":
        return "bg-green-50 text-green-700";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white p-4 border-b border-gray-200 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <Package className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {asset.name}
                  </h2>
                  <p className="text-sm text-gray-500">Asset #{asset.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Edit Button */}
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Basic Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Basic Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Type</p>
                  <p className="text-sm text-gray-900">
                    {asset.type === null
                      ? "Not specified"
                      : asset.type.toString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <span
                    className={`inline-flex px-2 py-1 rounded text-xs ${getStatusColor(
                      asset.status
                    )}`}
                  >
                    {asset.status?.replace("_", " ") || "Unknown"}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Location</p>
                  <p className="text-sm text-gray-900">
                    {asset.location || "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Created</p>
                  <p className="text-sm text-gray-900">
                    {new Date(asset.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Tags */}
            {asset.tags && asset.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {asset.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Maintenance Information */}
            {asset.last_maintenance_at && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Maintenance
                </h3>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Last Maintenance</p>
                      <p className="text-sm text-gray-900">
                        {new Date(
                          asset.last_maintenance_at
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Metadata */}
            {asset.metadata && Object.keys(asset.metadata).length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Additional Information
                </h3>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="space-y-2">
                    {Object.entries(asset.metadata).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-gray-600 capitalize">
                          {key.replace(/_/g, " ")}:
                        </span>
                        <span className="text-gray-900 font-medium">
                          {typeof value === "object"
                            ? JSON.stringify(value)
                            : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Issues */}
            {issues && issues.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Issues
                </h3>
                <div className="space-y-3">
                  {issues.map((issue) => (
                    <div
                      key={issue.id}
                      className="bg-gray-50 p-3 rounded-lg flex justify-between items-start gap-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {issue.description || "No description"}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                          <span
                            className={`inline-flex px-1 py-0.5 rounded ${getIssueStatusColor(
                              issue.status
                            )}`}
                          >
                            {issue.status.replace("_", " ")}
                          </span>
                          <span
                            className={`inline-flex px-1 py-0.5 rounded ${getUrgencyColor(
                              issue.urgency
                            )}`}
                          >
                            {issue.urgency}
                          </span>
                          <span className="inline-flex items-center px-1 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                            {issue.issue_type}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 text-xs text-gray-500">
                        <p>
                          Reported:{" "}
                          {new Date(issue.reported_at).toLocaleDateString()}
                        </p>
                        {issue.resolved_at && (
                          <p>
                            Resolved:{" "}
                            {new Date(issue.resolved_at).toLocaleDateString()}
                          </p>
                        )}
                        {issue.reported_by && (
                          <p>Reported by: {issue.reported_by}</p>
                        )}
                        {issue.contact_info && (
                          <p>Contact: {issue.contact_info}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Technical Details */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Technical Details
              </h3>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Unique ID:</span>
                    <span className="text-gray-900 font-mono text-xs">
                      {asset.uid}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Database ID:</span>
                    <span className="text-gray-900">{asset.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">User ID:</span>
                    <span className="text-gray-900 font-mono text-xs">
                      {asset.user_id}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Deletion
              </h3>
            </div>
            <p className="text-sm text-gray-700 mb-6">
              Are you sure you want to delete <strong>{asset.name}</strong>?
              This action cannot be undone and will also delete all associated
              data including issues and reports.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                {deleting ? "Deleting..." : "Delete Asset"}
              </button>
            </div>
                     </div>
         </div>
       )}

       {/* Edit Asset Modal */}
       <EditAssetModal
         isOpen={showEditModal}
         onClose={() => setShowEditModal(false)}
         onAssetUpdated={handleAssetUpdated}
         asset={asset}
       />
     </>
    );
  }
