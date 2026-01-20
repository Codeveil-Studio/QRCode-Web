"use client";

import React, { useState, useEffect } from "react";
import { assetsAPI, assetTypesAPI } from "@/utils/api";
import { toast } from "react-hot-toast";
import {
  X,
  MapPin,
  Loader2,
  Package,
  Tag,
  Building,
  Calendar,
  Hash,
  Settings,
  Plus,
  Trash2,
  Star,
  Edit3,
} from "lucide-react";

interface AssetType {
  id: number;
  uid: string;
  name: string;
  description: string | null;
  category: string | null;
  icon: string | null;
  is_active: boolean;
  org_id: string | null;
  is_custom: boolean;
  created_by: string | null;
  created_at: string;
}

interface Asset {
  id: number;
  uid: string;
  user_id: string;
  name: string;
  location: string | null;
  created_at: string;
  type: number | null;
  tags: string[] | null;
  metadata: Record<string, any> | null;
  last_maintenance_at: string | null;
  status: string;
}

interface EditAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssetUpdated: (asset: Asset) => void;
  asset: Asset;
}

const STATUS_OPTIONS = [
  { value: "active", label: "Active", color: "bg-green-50 text-green-700" },
  {
    value: "maintenance_needed",
    label: "Needs Maintenance",
    color: "bg-orange-50 text-orange-700",
  },
  {
    value: "inactive",
    label: "Inactive",
    color: "bg-gray-50 text-gray-700",
  },
  {
    value: "out_of_service",
    label: "Out of Service",
    color: "bg-red-50 text-red-700",
  },
];

export function EditAssetModal({
  isOpen,
  onClose,
  onAssetUpdated,
  asset,
}: EditAssetModalProps) {
  const [name, setName] = useState("");
  const [typeId, setTypeId] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("active");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [lastMaintenanceAt, setLastMaintenanceAt] = useState("");
  const [metadata, setMetadata] = useState<
    Array<{ key: string; value: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);

  // Initialize form with asset data when modal opens
  useEffect(() => {
    if (isOpen && asset) {
      setName(asset.name || "");
      setTypeId(asset.type?.toString() || "");
      setLocation(asset.location || "");
      setStatus(asset.status || "active");
      setTags(asset.tags || []);
      setLastMaintenanceAt(
        asset.last_maintenance_at
          ? new Date(asset.last_maintenance_at).toISOString().split("T")[0]
          : ""
      );

      // Convert metadata object to array format
      const metadataArray = asset.metadata
        ? Object.entries(asset.metadata).map(([key, value]) => ({
            key,
            value: String(value),
          }))
        : [];
      setMetadata(metadataArray);

      fetchAssetTypes();
    }
  }, [isOpen, asset]);

  const fetchAssetTypes = async () => {
    try {
      setLoadingTypes(true);
      const response = await assetTypesAPI.getAll();

      if (response.success && response.data) {
        setAssetTypes(response.data.assetTypes || []);
      } else {
        console.error("Failed to fetch asset types:", response.error);
        toast.error("Failed to load asset types");
      }
    } catch (error) {
      console.error("Error fetching asset types:", error);
      toast.error("Failed to load asset types");
    } finally {
      setLoadingTypes(false);
    }
  };

  const resetForm = () => {
    setName("");
    setTypeId("");
    setLocation("");
    setStatus("active");
    setTags([]);
    setNewTag("");
    setLastMaintenanceAt("");
    setMetadata([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (indexToRemove: number) => {
    setTags(tags.filter((_, index) => index !== indexToRemove));
  };

  const addMetadataField = () => {
    setMetadata([...metadata, { key: "", value: "" }]);
  };

  const updateMetadataField = (
    index: number,
    field: "key" | "value",
    value: string
  ) => {
    const updatedMetadata = metadata.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    setMetadata(updatedMetadata);
  };

  const removeMetadataField = (indexToRemove: number) => {
    setMetadata(metadata.filter((_, index) => index !== indexToRemove));
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by this browser");
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        setGettingLocation(false);
        toast.success("Location added successfully!");
      },
      (error) => {
        console.error("Error getting location:", error);
        toast.error("Failed to get current location");
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Asset name is required");
      return;
    }

    try {
      setLoading(true);

      // Build metadata object from key-value pairs
      const metadataObj: Record<string, any> = {};
      metadata.forEach(({ key, value }) => {
        if (key.trim() && value.trim()) {
          metadataObj[key.trim()] = value.trim();
        }
      });

      // Prepare the asset data
      const assetData = {
        name: name.trim(),
        type: typeId ? parseInt(typeId) : null,
        location: location.trim() || null,
        status,
        tags: tags.length > 0 ? tags : null,
        metadata: Object.keys(metadataObj).length > 0 ? metadataObj : null,
        last_maintenance_at: lastMaintenanceAt || null,
      };

      // Update the asset using the API utility
      const response = await assetsAPI.update(asset.id.toString(), assetData);

      if (response.success && response.data) {
        toast.success("Asset updated successfully!");
        onAssetUpdated(response.data);
        handleClose();
      } else {
        throw new Error(response.error || "Failed to update asset");
      }
    } catch (error) {
      console.error("Error updating asset:", error);
      toast.error("Failed to update asset. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Group types by category
  const typesByCategory = Array.isArray(assetTypes)
    ? assetTypes.reduce((acc, type) => {
        const category = type.category || "Other";
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(type);
        return acc;
      }, {} as Record<string, AssetType[]>)
    : {};

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-lg flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <Edit3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Edit Asset
              </h2>
              <p className="text-sm text-gray-600">
                Update asset information and tracking details
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Asset Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Asset Name *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="e.g., Lobby Printer, Server Room AC Unit"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Asset Type */}
            <div>
              <label
                htmlFor="type"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Asset Type
              </label>
              {loadingTypes ? (
                <div className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">Loading types...</span>
                </div>
              ) : (
                <select
                  id="type"
                  value={typeId}
                  onChange={(e) => setTypeId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="">Select asset type</option>
                  {Object.entries(typesByCategory).map(([category, types]) => (
                    <optgroup key={category} label={category}>
                      {types.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                          {type.is_custom && " (Custom)"}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              )}
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label
              htmlFor="location"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Location
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="e.g., Building A, Room 101, Floor 2"
              />
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {gettingLocation ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline">Getting...</span>
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4" />
                    <span className="hidden sm:inline">Current</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              You can use coordinates, address, or a descriptive location
            </p>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Add a tag (e.g., critical, maintenance, new)"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200"
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(index)}
                        className="ml-2 text-blue-500 hover:text-blue-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Last Maintenance */}
          <div>
            <label
              htmlFor="lastMaintenance"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Last Maintenance Date
            </label>
            <input
              type="date"
              id="lastMaintenance"
              value={lastMaintenanceAt}
              onChange={(e) => setLastMaintenanceAt(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Additional Metadata */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Additional Information
              </label>
              <button
                type="button"
                onClick={addMetadataField}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Field
              </button>
            </div>

            {metadata.length > 0 && (
              <div className="space-y-3">
                {metadata.map((field, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={field.key}
                      onChange={(e) =>
                        updateMetadataField(index, "key", e.target.value)
                      }
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Field name (e.g., department, model)"
                    />
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) =>
                        updateMetadataField(index, "value", e.target.value)
                      }
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Value"
                    />
                    <button
                      type="button"
                      onClick={() => removeMetadataField(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-500 mt-2">
              Add custom fields to store additional information about this asset
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Updating..." : "Update Asset"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
