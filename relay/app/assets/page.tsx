"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { assetsAPI, assetTypesAPI, issuesAPI } from "@/utils/api";

import { AddAssetModal } from "@/components/AddAssetModal";
import { AssetDetailModal } from "@/components/AssetDetailModal";

// Dynamically import QRCodeGenerator to avoid SSR issues with browser APIs
const QRCodeGenerator = dynamic(
  () =>
    import("@/components/QRCodeGenerator").then((mod) => ({
      default: mod.QRCodeGenerator,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>
    ),
  }
);
import {
  Plus,
  Search,
  Filter,
  ChevronDown,
  Calendar,
  Tag,
  MapPin,
  Clock,
  Package,
  QrCode,
  AlertTriangle,
} from "lucide-react";
import { toast } from "react-hot-toast";

interface AssetType {
  id: number;
  name: string;
  description?: string;
  category?: string;
  is_active: boolean;
}

interface Asset {
  id: number;
  uid: string;
  user_id: string;
  name: string;
  location: string | null;
  created_at: string;
  type?: AssetType;
  tags: string[] | null;
  metadata: any | null;
  last_maintenance_at: string | null;
  status: string;
  updated_at?: string;
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

// Asset type for QRCodeGenerator compatibility
interface AssetQrCode {
  id: number;
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

// asset type for assetDetailModal compatibility
interface DetailModalasset {
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

export default function assetsPage() {
  // Data fetching states
  const [assets, setassets] = useState<Asset[]>([]);
  const [types, setTypes] = useState<AssetType[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI states

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [selectedasset, setSelectedasset] = useState<DetailModalasset | null>(
    null
  );
  const router = useRouter();

  // Data fetching effect
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch assets and types in parallel
        const [assetsResponse, typesResponse, issuesResponse] =
          await Promise.all([
            assetsAPI.getAll(),
            assetTypesAPI.getAll(),
            issuesAPI.getAll(),
          ]);

        if (assetsResponse.success && assetsResponse.data) {
          setassets(assetsResponse.data);
          console.log(assetsResponse.data);
        } else {
          console.error("Failed to fetch assets:", assetsResponse.error);
        }

        if (typesResponse.success && typesResponse.data) {
          setTypes(typesResponse.data);
        } else {
          console.error("Failed to fetch types:", typesResponse.error);
        }

        if (issuesResponse.success && issuesResponse.data) {
          setIssues(issuesResponse.data);
        } else {
          console.error("Failed to fetch issues:", issuesResponse.error);
        }

        // Set error only if both requests failed
        if (!assetsResponse.success && !typesResponse.success) {
          setError("Failed to fetch data");
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Convert assets to Assets for QRCodeGenerator
  const convertAssetsToAssetsQrCode = (assets: Asset[]): AssetQrCode[] => {
    return assets.map((asset) => ({
      id: asset.id,
      uid: asset.uid || `asset-${asset.id}`,
      name: asset.name,
      type: asset.type?.name || asset.type?.name || "Type Unknown",
      location: asset.location || "Unknown",
      status: asset.status || "unknown",
      metadata: asset.metadata || {},
    }));
  };

  const handleAssetAdded = (newasset: any) => {
    // Convert the asset from AddassetModal format to our format
    const convertedasset: Asset = {
      id: newasset.id,
      user_id: newasset.user_id,
      name: newasset.name,
      location: newasset.location || undefined,
      type: newasset.type,
      tags: newasset.tags || undefined,
      metadata: newasset.metadata || undefined,
      status: newasset.status,
      created_at: newasset.created_at,
      updated_at: newasset.updated_at,
      uid: newasset.uid,
      last_maintenance_at: newasset.last_maintenance_at || undefined,
    };

    setassets((prev) => [convertedasset, ...prev]);
    setShowAddModal(false);
  };

  const handleassetSelected = (asset: Asset) => {
    // Convert our asset format to DetailModal format
    const convertedasset: DetailModalasset = {
      id: asset.id,
      uid: asset.uid || `asset-${asset.id}`,
      user_id: asset.user_id,
      name: asset.name,
      location: asset.location || null,
      created_at: asset.created_at,
      type: asset.type?.id || null,
      tags: asset.tags || null,
      metadata: asset.metadata || null,
      last_maintenance_at: asset.last_maintenance_at || null,
      status: asset.status || null,
    };
    setSelectedasset(convertedasset);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-50 text-green-700";
      case "maintenance":
      case "maintenance_needed":
        return "bg-orange-50 text-orange-700";
      case "inactive":
        return "bg-gray-50 text-gray-700";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };

  // Helper function to get unresolved issues for an asset
  const getUnresolvedIssues = (assetUid: string) => {
    if (!assetUid) return [];
    return issues.filter(
      (issue) => issue.asset_id === assetUid && issue.status !== "resolved"
    );
  };

  // Helper function to get the highest urgency level from unresolved issues
  const getHighestUrgency = (unresolvedIssues: Issue[]) => {
    if (unresolvedIssues.length === 0) return null;

    const urgencyOrder = { high: 3, medium: 2, low: 1 };
    let highestUrgency = "low";

    unresolvedIssues.forEach((issue) => {
      if (
        urgencyOrder[issue.urgency as keyof typeof urgencyOrder] >
        urgencyOrder[highestUrgency as keyof typeof urgencyOrder]
      ) {
        highestUrgency = issue.urgency;
      }
    });

    return highestUrgency;
  };

  // Helper function to get issue indicator styling
  const getIssueIndicatorColor = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "bg-red-500 text-white";
      case "medium":
        return "bg-yellow-500 text-white";
      case "low":
        return "bg-blue-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  // Get unique values for filters
  const uniqueTypes = Array.isArray(types)
    ? types.map((type) => ({
        id: type.id.toString(),
        name: type.name,
      }))
    : [];
  const uniqueLocations = [
    ...new Set(
      assets
        .map((asset) => asset.location)
        .filter(
          (location): location is string =>
            location !== undefined && location !== null
        )
    ),
  ];

  const filteredAndSortedassets = assets
    .filter((asset) => {
      const matchesSearch = asset.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesStatus = !statusFilter || asset.status === statusFilter;
      const matchesType =
        !typeFilter ||
        asset.type?.toString() === typeFilter ||
        asset.type?.id.toString() === typeFilter;
      const matchesLocation =
        !locationFilter || asset.location === locationFilter;
      const matchesDate =
        !dateFilter ||
        (() => {
          const assetDate = new Date(asset.created_at);
          const now = new Date();
          switch (dateFilter) {
            case "today":
              return assetDate.toDateString() === now.toDateString();
            case "week":
              const weekAgo = new Date(now.setDate(now.getDate() - 7));
              return assetDate >= weekAgo;
            case "month":
              const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
              return assetDate >= monthAgo;
            case "year":
              const yearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
              return assetDate >= yearAgo;
            default:
              return true;
          }
        })();
      return (
        matchesSearch &&
        matchesStatus &&
        matchesType &&
        matchesLocation &&
        matchesDate
      );
    })
    .sort((a, b) => {
      let aValue: string | number | Date, bValue: string | number | Date;

      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "type":
          aValue = (a.type?.name || "Type Unknown").toLowerCase();
          bValue = (b.type?.name || "Type Unknown").toLowerCase();
          break;
        case "location":
          aValue = (a.location || "").toLowerCase();
          bValue = (b.location || "").toLowerCase();
          break;
        case "status":
          aValue = a.status || "";
          bValue = b.status || "";
          break;
        case "created_at":
        default:
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter(null);
    setTypeFilter(null);
    setLocationFilter(null);
    setDateFilter(null);
    setSortBy("created_at");
    setSortOrder("desc");
  };

  const activeFiltersCount = [
    searchQuery,
    statusFilter,
    typeFilter,
    locationFilter,
    dateFilter,
  ].filter(Boolean).length;

  const handleassetDeleted = (assetId: number) => {
    // Remove asset from local state
    setassets(assets.filter((asset) => asset.id !== assetId));
  };

  const handleAssetUpdated = (updatedAsset: any) => {
    // Convert the updated asset to our format
    const convertedAsset: Asset = {
      id: updatedAsset.id,
      uid: updatedAsset.uid || `asset-${updatedAsset.id}`,
      user_id: updatedAsset.user_id,
      name: updatedAsset.name,
      location: updatedAsset.location,
      created_at: updatedAsset.created_at,
      type: updatedAsset.asset_types || updatedAsset.type,
      tags: updatedAsset.tags,
      metadata: updatedAsset.metadata,
      last_maintenance_at: updatedAsset.last_maintenance_at,
      status: updatedAsset.status,
      updated_at: updatedAsset.updated_at,
    };

    // Update the asset in local state
    setassets(
      assets.map((asset) =>
        asset.id === convertedAsset.id ? convertedAsset : asset
      )
    );
  };

  // Loading and error states
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <main className="p-8 max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="h-8 w-24 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-40 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-10 w-28 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>

          {/* Search and Filters Skeleton */}
          <div className="mb-6 space-y-4">
            <div className="flex gap-4 mb-4">
              <div className="flex-1 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-10 w-20 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-10 w-16 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>

          {/* assets Grid Skeleton */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="p-4 bg-white rounded-lg border border-gray-200 animate-pulse"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
                    <div>
                      <div className="h-4 w-24 bg-gray-200 rounded mb-1"></div>
                      <div className="h-3 w-16 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                  <div className="h-5 w-12 bg-gray-200 rounded"></div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-gray-200 rounded"></div>
                    <div className="h-3 w-20 bg-gray-200 rounded"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-gray-200 rounded"></div>
                    <div className="h-3 w-16 bg-gray-200 rounded"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-gray-200 rounded"></div>
                    <div className="h-3 w-28 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Assets</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage your inventory of Assets
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* QR Code Generator Toggle */}
            <button
              onClick={() => setShowQRGenerator(!showQRGenerator)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg hover:cursor-pointer transition-colors font-medium ${
                showQRGenerator
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <QrCode className="h-5 w-5" />
              <span>QR Codes</span>
            </button>

            {/* Add asset Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 hover:cursor-pointer transition-colors font-medium"
            >
              <Plus className="h-5 w-5" />
              <span>Add asset</span>
            </button>
          </div>
        </div>

        {/* QR Code Generator Section */}
        {showQRGenerator && (
          <div className="mb-8">
            <QRCodeGenerator assets={convertAssetsToAssetsQrCode(assets)} />
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                activeFiltersCount > 0
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Filter className="h-5 w-5" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown
                className={`h-5 w-5 transition-transform ${
                  showFilters ? "transform rotate-180" : ""
                }`}
              />
            </button>
            <button
              onClick={() => setShowDateFilter(!showDateFilter)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Calendar className="h-5 w-5 text-gray-400" />
              <span>Date</span>
              <ChevronDown
                className={`h-5 w-5 text-gray-400 transition-transform ${
                  showDateFilter ? "transform rotate-180" : ""
                }`}
              />
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {["active", "maintenance_needed", "inactive"].map(
                    (status) => (
                      <button
                        key={status}
                        onClick={() =>
                          setStatusFilter(
                            statusFilter === status ? null : status
                          )
                        }
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          statusFilter === status
                            ? getStatusColor(status)
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {status.replace("_", " ")}
                      </button>
                    )
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={typeFilter || ""}
                  onChange={(e) => setTypeFilter(e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  {uniqueTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <select
                  value={locationFilter || ""}
                  onChange={(e) => setLocationFilter(e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Locations</option>
                  {uniqueLocations.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <div className="flex gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="created_at">Date</option>
                    <option value="name">Name</option>
                    <option value="type">Type</option>
                    <option value="location">Location</option>
                    <option value="status">Status</option>
                  </select>
                  <button
                    onClick={() =>
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    title={`Sort ${
                      sortOrder === "asc" ? "Descending" : "Ascending"
                    }`}
                  >
                    {sortOrder === "asc" ? "↑" : "↓"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showDateFilter && (
            <div className="p-4 bg-gray-50 rounded-lg mb-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "All Time", value: null },
                  { label: "Today", value: "today" },
                  { label: "Last 7 Days", value: "week" },
                  { label: "Last Month", value: "month" },
                  { label: "Last Year", value: "year" },
                ].map(({ label, value }) => (
                  <button
                    key={label}
                    onClick={() => setDateFilter(value)}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      dateFilter === value
                        ? "bg-blue-50 text-blue-700"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active Filters Summary */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <span>
                  Showing {filteredAndSortedassets.length} of {assets.length}{" "}
                  assets
                </span>
              </div>
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* assets Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedassets.map((asset) => {
            const unresolvedIssues = getUnresolvedIssues(
              asset.uid || `asset-${asset.id}`
            );
            const highestUrgency = getHighestUrgency(unresolvedIssues);

            return (
              <div
                key={asset.id}
                onClick={() => handleassetSelected(asset)}
                className="p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50">
                      <Package className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {asset.name || "Unnamed Asset"}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {asset.type?.name || "Type Unknown"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Issue indicator */}
                    {unresolvedIssues.length > 0 && (
                      <div
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getIssueIndicatorColor(
                          highestUrgency || "low"
                        )}`}
                        title={`${unresolvedIssues.length} unresolved issue${
                          unresolvedIssues.length > 1 ? "s" : ""
                        } (${highestUrgency} priority)`}
                      >
                        <AlertTriangle className="h-3 w-3" />
                        <span>{unresolvedIssues.length}</span>
                      </div>
                    )}
                    <span
                      className={`px-2 py-1 rounded text-xs ${getStatusColor(
                        asset.status
                      )}`}
                    >
                      {asset.status?.replace("_", " ") || "Unknown"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    <span>{asset.location || "No location"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>
                      {new Date(asset.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {asset.tags && asset.tags.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Tag className="h-3 w-3" />
                      <span className="text-xs">
                        {asset.tags.slice(0, 2).join(", ")}
                        {asset.tags.length > 2 &&
                          ` +${asset.tags.length - 2} more`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredAndSortedassets.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No assets found
            </h3>
            <p className="text-gray-500 mb-6">
              {assets.length === 0
                ? "Get started by adding your first asset."
                : "Try adjusting your search or filter criteria."}
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Add Asset</span>
            </button>
          </div>
        )}
      </main>

      <AddAssetModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAssetAdded={handleAssetAdded}
      />

      <AssetDetailModal
        asset={selectedasset as any}
        issues={
          selectedasset
            ? issues.filter((issue) => issue.asset_id === selectedasset.uid)
            : []
        }
        isOpen={!!selectedasset}
        onClose={() => setSelectedasset(null)}
        onAssetDeleted={handleassetDeleted}
        onAssetUpdated={handleAssetUpdated}
      />
    </div>
  );
}
