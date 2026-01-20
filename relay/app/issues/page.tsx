"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authAPI, issuesAPI, assetsAPI } from "@/utils/api";

import { IssueDetailModal } from "@/components/IssueDetailModal";
import {
  ChevronDown,
  ChevronUp,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  X,
  Search,
  ImageIcon,
  Edit,
  Save,
  MessageSquare,
} from "lucide-react";
import { toast } from "react-hot-toast";

interface Issue {
  id: number;
  uid: string;
  asset_id: string;
  description: string;
  status: "open" | "in_progress" | "resolved";
  reported_by: string;
  contact_info: string;
  reported_at: string;
  resolved_at: string | null;
  internal_notes: string;
  is_critical: boolean;
  issue_type: string;
  tags: string[];
  image_path: string | null;
  image_url?: string; // Generated URL from backend
  group_id: string | null;
  metadata: any;
  urgency: "low" | "medium" | "high";
  confirmation_count?: number;
}

interface Asset {
  id: number;
  uid: string;
  name: string;
  asset_types: {
    name: string;
    icon: string;
  };
}

interface GroupedAssets {
  [assetUid: string]: {
    asset: Asset;
    issues: Record<string, Issue[]>;
  };
}

export default function IssuesPage() {
  const router = useRouter();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(new Set());
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [editingNotes, setEditingNotes] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [noteContent, setNoteContent] = useState<{ [key: string]: string }>({});

  // Filters
  const [filters, setFilters] = useState({
    status: ["open", "in_progress"], // Default to show open and in_progress issues
    urgency: [] as string[],
    dateFrom: "",
    dateTo: "",
    search: "",
    tags: [] as string[],
    isCritical: false,
    showResolved: false,
  });

  useEffect(() => {
    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [issuesResult, assetsResult] = await Promise.all([
        issuesAPI.getAll(),
        assetsAPI.getAll(),
      ]);
      if (issuesResult.success && issuesResult.data) {
        setIssues(issuesResult.data);

        // Extract all unique tags from issues
        const tagsSet = new Set<string>();
        issuesResult.data.forEach((issue: Issue) => {
          if (issue.tags && Array.isArray(issue.tags)) {
            issue.tags.forEach((tag) => tagsSet.add(tag));
          }
        });
        setAllTags(Array.from(tagsSet));
      }
      if (assetsResult.success && assetsResult.data) {
        setAssets(assetsResult.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const filteredIssues = issues.filter((issue) => {
    // Status filter - modified to work with showResolved
    if (filters.status.length > 0) {
      // If showResolved is true, we need to include resolved issues in addition to the selected statuses
      if (filters.showResolved && issue.status === "resolved") {
        // Allow resolved issues to pass through when showResolved is enabled
      } else if (!filters.status.includes(issue.status)) {
        return false;
      }
    }

    // Urgency filter
    if (filters.urgency.length > 0 && !filters.urgency.includes(issue.urgency))
      return false;

    // Date filters
    if (
      filters.dateFrom &&
      new Date(issue.reported_at) < new Date(filters.dateFrom)
    )
      return false;
    if (
      filters.dateTo &&
      new Date(issue.reported_at) > new Date(filters.dateTo)
    )
      return false;

    // Search filter
    if (
      filters.search &&
      !issue.description.toLowerCase().includes(filters.search.toLowerCase())
    )
      return false;

    // Tags filter
    if (filters.tags.length > 0) {
      const hasSelectedTag = filters.tags.some(
        (selectedTag) => issue.tags && issue.tags.includes(selectedTag)
      );
      if (!hasSelectedTag) return false;
    }

    // Critical filter
    if (filters.isCritical && !issue.is_critical) return false;

    return true;
  });

  const groupedIssues: GroupedAssets = filteredIssues.reduce((acc, issue) => {
    if (!acc[issue.asset_id]) {
      const asset = assets.find((a) => a.uid === issue.asset_id);
      acc[issue.asset_id] = {
        asset: asset || {
          id: issue.id,
          uid: issue.asset_id,
          name: "Unknown Asset",
          asset_types: {
            name: "unknown",
            icon: "",
          },
        },
        issues: {},
      };
    }

    const groupKey = issue.group_id || issue.uid;
    if (!acc[issue.asset_id].issues[groupKey]) {
      acc[issue.asset_id].issues[groupKey] = [];
    }
    acc[issue.asset_id].issues[groupKey].push(issue);

    return acc;
  }, {} as GroupedAssets);

  const toggleAssetExpansion = (assetUid: string) => {
    const newExpanded = new Set(expandedAssets);
    if (newExpanded.has(assetUid)) {
      newExpanded.delete(assetUid);
    } else {
      newExpanded.add(assetUid);
    }
    setExpandedAssets(newExpanded);
  };

  const handleResolveIssue = async (issueId: number) => {
    try {
      // Optimistic update - update local state immediately
      const updatedIssues = issues.map((issue) =>
        issue.id === issueId
          ? {
              ...issue,
              status: "resolved" as const,
              resolved_at: new Date().toISOString(),
            }
          : issue
      );
      setIssues(updatedIssues);

      const result = await issuesAPI.update(issueId.toString(), {
        status: "resolved",
        resolved_at: new Date().toISOString(),
      });

      if (result.success) {
        toast.success("Issue resolved successfully");
      } else {
        // Revert optimistic update on failure
        setIssues(issues);
        toast.error(result.error || "Failed to resolve issue");
      }
    } catch (error) {
      // Revert optimistic update on error
      setIssues(issues);
      console.error("Error resolving issue:", error);
      toast.error("Failed to resolve issue");
    }
  };

  const handleEditNotes = (issueId: number, currentNotes: string) => {
    setEditingNotes((prev) => ({ ...prev, [issueId.toString()]: true }));
    setNoteContent((prev) => ({
      ...prev,
      [issueId.toString()]: currentNotes || "",
    }));
  };

  const handleSaveNotes = async (issueId: number) => {
    try {
      const newNotes = noteContent[issueId.toString()] || "";

      // Optimistic update - update local state immediately
      const updatedIssues = issues.map((issue) =>
        issue.id === issueId ? { ...issue, internal_notes: newNotes } : issue
      );
      setIssues(updatedIssues);
      setEditingNotes((prev) => ({ ...prev, [issueId.toString()]: false }));

      const result = await issuesAPI.update(issueId.toString(), {
        internal_notes: newNotes,
      });

      if (result.success) {
        toast.success("Notes updated successfully");
      } else {
        // Revert optimistic update on failure
        const originalIssue = issues.find((issue) => issue.id === issueId);
        if (originalIssue) {
          const revertedIssues = issues.map((issue) =>
            issue.id === issueId
              ? { ...issue, internal_notes: originalIssue.internal_notes }
              : issue
          );
          setIssues(revertedIssues);
        }
        setEditingNotes((prev) => ({ ...prev, [issueId.toString()]: true })); // Re-enable editing
        toast.error(result.error || "Failed to update notes");
      }
    } catch (error) {
      // Revert optimistic update on error
      const originalIssue = issues.find((issue) => issue.id === issueId);
      if (originalIssue) {
        const revertedIssues = issues.map((issue) =>
          issue.id === issueId
            ? { ...issue, internal_notes: originalIssue.internal_notes }
            : issue
        );
        setIssues(revertedIssues);
      }
      setEditingNotes((prev) => ({ ...prev, [issueId.toString()]: true })); // Re-enable editing
      console.error("Error updating notes:", error);
      toast.error("Failed to update notes");
    }
  };

  const handleCancelEdit = (issueId: number) => {
    setEditingNotes((prev) => ({ ...prev, [issueId.toString()]: false }));
    setNoteContent((prev) => ({ ...prev, [issueId.toString()]: "" }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "resolved":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-600 animate-pulse" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
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

  const toggleFilter = (filterType: string, value: string) => {
    setFilters((prev) => {
      if (filterType === "status") {
        const newStatus = prev.status.includes(value)
          ? prev.status.filter((s) => s !== value)
          : [...prev.status, value];
        return { ...prev, status: newStatus };
      }
      if (filterType === "urgency") {
        const newUrgency = prev.urgency.includes(value)
          ? prev.urgency.filter((u) => u !== value)
          : [...prev.urgency, value];
        return { ...prev, urgency: newUrgency };
      }
      if (filterType === "tags") {
        const newTags = prev.tags.includes(value)
          ? prev.tags.filter((t) => t !== value)
          : [...prev.tags, value];
        return { ...prev, tags: newTags };
      }
      return prev;
    });
  };

  const convertIssueForModal = (issue: Issue) => {
    const asset = assets.find((asset) => asset.uid === issue.asset_id);
    return {
      ...issue,
      resolved_at: issue.resolved_at || undefined,
      group_id: issue.group_id || undefined,
      image_path: issue.image_path || undefined,
      image_url: issue.image_url || undefined,
      assets: {
        name: asset?.name || "Unknown Asset",
        type: asset?.asset_types?.name || "unknown",
        location: "Unknown Location", // Add this if you have location data
      },
    } as any; // Type assertion to handle incompatible interfaces
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="p-6 max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="h-8 bg-gray-200 rounded-lg w-32 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded-lg w-48 animate-pulse"></div>
          </div>

          {/* Filters Skeleton */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
            </div>

            {/* Filter Tags Skeleton */}
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="h-6 bg-gray-200 rounded-full w-20 animate-pulse"
                  ></div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i}>
                  <div className="h-4 bg-gray-200 rounded w-16 mb-1 animate-pulse"></div>
                  <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Issues List Skeleton */}
          <div className="space-y-4">
            {[...Array(3)].map((_, itemIndex) => (
              <div
                key={itemIndex}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                {/* Item Header Skeleton */}
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                    <div>
                      <div className="h-5 bg-gray-200 rounded w-32 mb-1 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="h-5 w-5 bg-gray-200 rounded animate-pulse"></div>
                </div>

                {/* Expanded Issues Skeleton */}
                <div className="border-t border-gray-200 bg-gray-50">
                  <div className="p-6 border-b border-gray-200">
                    {/* Group Badge Skeleton */}
                    <div className="mb-3">
                      <div className="h-5 bg-blue-100 rounded-md w-28 animate-pulse"></div>
                    </div>

                    {/* Issue Cards Skeleton */}
                    <div className="space-y-3">
                      {[...Array(2)].map((_, issueIndex) => (
                        <div
                          key={issueIndex}
                          className="bg-white rounded-lg border border-gray-200 p-4"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {/* Status and Urgency Badges Skeleton */}
                              <div className="flex items-center gap-2 mb-2">
                                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                                <div className="h-5 bg-yellow-100 rounded-md w-16 animate-pulse"></div>
                                <div className="h-5 bg-red-100 rounded-md w-12 animate-pulse"></div>
                              </div>

                              {/* Description Skeleton */}
                              <div className="mb-2">
                                <div className="h-4 bg-gray-200 rounded w-full mb-1 animate-pulse"></div>
                                <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                              </div>

                              {/* Image Skeleton */}
                              <div className="mb-3">
                                <div className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
                              </div>

                              {/* Reporter Info Skeleton */}
                              <div className="flex items-center gap-4 mb-3">
                                <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                                <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                              </div>

                              {/* Internal Notes Skeleton */}
                              <div className="pt-3 border-t border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                                    <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                                  </div>
                                  <div className="h-3 w-3 bg-gray-200 rounded animate-pulse"></div>
                                </div>
                                <div className="h-10 bg-gray-100 rounded-lg animate-pulse"></div>
                              </div>
                            </div>

                            {/* Action Buttons Skeleton */}
                            <div className="flex items-center gap-2 ml-4">
                              <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse"></div>
                              <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Issues</h1>
          <p className="text-gray-600">Manage and track asset issues</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Filters</span>
          </div>

          {/* Filter Tags */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {/* Status Tags */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600">
                  Status:
                </span>
                {["open", "in_progress"].map((status) => (
                  <button
                    key={status}
                    onClick={() => toggleFilter("status", status)}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      filters.status.includes(status)
                        ? "bg-blue-100 text-blue-800 border border-blue-200"
                        : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                    }`}
                  >
                    {status === "in_progress"
                      ? "In Progress"
                      : status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
                <button
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      showResolved: !prev.showResolved,
                    }))
                  }
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filters.showResolved
                      ? "bg-green-100 text-green-800 border border-green-200"
                      : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                  }`}
                >
                  Show Resolved
                </button>
              </div>

              {/* Urgency Tags */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600">
                  Urgency:
                </span>
                {["high", "medium", "low"].map((urgency) => (
                  <button
                    key={urgency}
                    onClick={() => toggleFilter("urgency", urgency)}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      filters.urgency.includes(urgency)
                        ? urgency === "high"
                          ? "bg-red-100 text-red-800 border border-red-200"
                          : urgency === "medium"
                          ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                          : "bg-green-100 text-green-800 border border-green-200"
                        : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                    }`}
                  >
                    {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
                  </button>
                ))}
              </div>

              {/* Critical Tag */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      isCritical: !prev.isCritical,
                    }))
                  }
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filters.isCritical
                      ? "bg-red-100 text-red-800 border border-red-200"
                      : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                  }`}
                >
                  Critical Only
                </button>
              </div>

              {/* Clear Filters */}
              {(filters.status.length < 2 ||
                filters.urgency.length > 0 ||
                filters.tags.length > 0 ||
                filters.isCritical ||
                filters.showResolved) && (
                <button
                  onClick={() =>
                    setFilters({
                      status: ["open", "in_progress"],
                      urgency: [],
                      dateFrom: "",
                      dateTo: "",
                      search: "",
                      tags: [],
                      isCritical: false,
                      showResolved: false,
                    })
                  }
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700 border border-gray-300 hover:bg-gray-300"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    dateFrom: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, dateTo: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      search: e.target.value,
                    }))
                  }
                  placeholder="Search description..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tags
              </label>
              <select
                multiple
                value={filters.tags}
                onChange={(e) => {
                  const selectedTags = Array.from(
                    e.target.selectedOptions,
                    (option) => option.value
                  );
                  setFilters((prev) => ({ ...prev, tags: selectedTags }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                size={3}
              >
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selected Tags Display */}
          {filters.tags.length > 0 && (
            <div className="mt-4">
              <span className="text-xs font-medium text-gray-700 mr-2">
                Selected Tags:
              </span>
              <div className="flex flex-wrap gap-2 mt-1">
                {filters.tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleFilter("tags", tag)}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200"
                  >
                    {tag}
                    <X className="h-3 w-3 ml-1" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Issues List */}
        <div className="space-y-4">
          {Object.entries(groupedIssues).map(
            ([assetUid, { asset, issues: assetIssues }]) => (
              <div
                key={assetUid}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                <button
                  onClick={() => toggleAssetExpansion(assetUid)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-left">
                      <h3 className="font-medium text-gray-900">
                        {asset.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {Object.keys(assetIssues).length} issue group(s)
                      </p>
                    </div>
                  </div>
                  {expandedAssets.has(assetUid) ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </button>

                {expandedAssets.has(assetUid) && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    {(Object.entries(assetIssues) as [string, Issue[]][]).map(
                      ([groupId, groupIssues]) => (
                        <div
                          key={groupId}
                          className="p-6 border-b border-gray-200 last:border-b-0"
                        >
                          {groupIssues.length > 1 && (
                            <div className="mb-3">
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                                {groupIssues.length} related issues
                              </span>
                            </div>
                          )}
                          <div className="space-y-3">
                            {groupIssues.map((issue: Issue) => (
                              <div
                                key={issue.id}
                                className={`bg-white rounded-lg border p-4 ${
                                  issue.status === "in_progress"
                                    ? "border-blue-300 bg-blue-50/30 shadow-blue-100 shadow-md"
                                    : "border-gray-200"
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div
                                        title={`Status: ${issue.status.replace(
                                          "_",
                                          " "
                                        )}`}
                                        className="cursor-help"
                                      >
                                        {getStatusIcon(issue.status)}
                                      </div>
                                      <span
                                        title={`Priority: ${issue.urgency}`}
                                        className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium cursor-help ${getUrgencyColor(
                                          issue.urgency
                                        )}`}
                                      >
                                        {issue.urgency}
                                      </span>
                                      {issue.is_critical && (
                                        <span
                                          title="This is a critical issue requiring immediate attention"
                                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800 cursor-help"
                                        >
                                          Critical
                                        </span>
                                      )}
                                      {issue.image_path && (
                                        <span
                                          title="This issue has an attached image"
                                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 cursor-help"
                                        >
                                          <ImageIcon className="h-3 w-3 mr-1" />
                                          Image
                                        </span>
                                      )}
                                      {issue.status === "in_progress" && (
                                        <span
                                          title="Work is currently in progress on this issue"
                                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 cursor-help animate-pulse"
                                        >
                                          <Clock className="h-3 w-3 mr-1" />
                                          In Progress
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-900 mb-2">
                                      {issue.description}
                                    </p>

                                    {/* Image Display */}
                                    {issue.image_url && (
                                      <div className="mb-3">
                                        <img
                                          src={issue.image_url}
                                          alt="Issue attachment"
                                          title="Click to view this issue in detail"
                                          className="max-w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                          onClick={() => {
                                            setSelectedIssue(issue);
                                            setShowModal(true);
                                          }}
                                          onError={(e) => {
                                            e.currentTarget.style.display =
                                              "none";
                                          }}
                                        />
                                      </div>
                                    )}

                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                      <span>
                                        Reported by:{" "}
                                        {issue.reported_by || "Unknown"} at
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <span>
                                          {new Date(
                                            issue.reported_at
                                          ).toLocaleDateString()}
                                        </span>
                                        <span>
                                          {new Date(
                                            issue.reported_at
                                          ).toLocaleTimeString()}
                                        </span>
                                      </span>
                                    </div>

                                    {/* Confirmation Count */}
                                    {(issue.confirmation_count || 0) > 0 && (
                                      <div className="mt-1">
                                        <span
                                          title={`${
                                            issue.confirmation_count
                                          } additional ${
                                            Number(issue.confirmation_count) ===
                                            1
                                              ? "person has"
                                              : "people have"
                                          } confirmed this issue`}
                                          className="text-xs text-blue-600 font-medium cursor-help"
                                        >
                                          {issue.confirmation_count}
                                          {" additional "}
                                          {Number(issue.confirmation_count) ===
                                          1
                                            ? "person"
                                            : "people"}{" "}
                                          confirmed this issue
                                        </span>
                                      </div>
                                    )}

                                    {/* Internal Notes Section */}
                                    <div className="mt-3 pt-3 border-t border-gray-100">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <div
                                            title="Internal notes for team communication"
                                            className="cursor-help"
                                          >
                                            <MessageSquare className="h-4 w-4 text-gray-400" />
                                          </div>
                                          <span className="text-xs font-medium text-gray-700">
                                            Internal Notes
                                          </span>
                                        </div>
                                        {!editingNotes[issue.id.toString()] && (
                                          <button
                                            onClick={() =>
                                              handleEditNotes(
                                                issue.id,
                                                issue.internal_notes
                                              )
                                            }
                                            title="Edit internal notes"
                                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                          >
                                            <Edit className="h-3 w-3" />
                                          </button>
                                        )}
                                      </div>

                                      {editingNotes[issue.id.toString()] ? (
                                        <div className="space-y-2">
                                          <textarea
                                            value={
                                              noteContent[
                                                issue.id.toString()
                                              ] || ""
                                            }
                                            onChange={(e) =>
                                              setNoteContent((prev) => ({
                                                ...prev,
                                                [issue.id.toString()]:
                                                  e.target.value,
                                              }))
                                            }
                                            placeholder="Add internal notes..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                            rows={3}
                                          />
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={() =>
                                                handleSaveNotes(issue.id)
                                              }
                                              className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                                            >
                                              <Save className="h-3 w-3" />
                                              Save
                                            </button>
                                            <button
                                              onClick={() =>
                                                handleCancelEdit(issue.id)
                                              }
                                              className="flex items-center gap-1 px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div
                                          className="text-sm text-gray-600 bg-gray-50 rounded-lg p-2 min-h-[2.5rem] flex items-center cursor-pointer hover:bg-gray-100 transition-colors"
                                          onClick={() =>
                                            handleEditNotes(
                                              issue.id,
                                              issue.internal_notes
                                            )
                                          }
                                          title="Click to edit notes"
                                        >
                                          {issue.internal_notes || (
                                            <span className="text-gray-400 italic">
                                              No internal notes yet - click to
                                              add
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-2 ml-4">
                                    <button
                                      onClick={() => {
                                        setSelectedIssue(issue);
                                        setShowModal(true);
                                      }}
                                      title="View detailed information about this issue"
                                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors"
                                    >
                                      <Eye className="h-4 w-4" />
                                      View Details
                                    </button>

                                    {issue.status === "open" && (
                                      <button
                                        onClick={async () => {
                                          try {
                                            // Optimistic update
                                            const updatedIssues = issues.map(
                                              (i) =>
                                                i.id === issue.id
                                                  ? {
                                                      ...i,
                                                      status:
                                                        "in_progress" as const,
                                                    }
                                                  : i
                                            );
                                            setIssues(updatedIssues);

                                            const result =
                                              await issuesAPI.update(
                                                issue.id.toString(),
                                                {
                                                  status: "in_progress",
                                                }
                                              );

                                            if (result.success) {
                                              toast.success(
                                                "Issue marked as in progress"
                                              );
                                            } else {
                                              setIssues(issues);
                                              toast.error(
                                                result.error ||
                                                  "Failed to update issue"
                                              );
                                            }
                                          } catch (error) {
                                            setIssues(issues);
                                            console.error(
                                              "Error updating issue:",
                                              error
                                            );
                                            toast.error(
                                              "Failed to update issue"
                                            );
                                          }
                                        }}
                                        title="Mark this issue as in progress"
                                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors"
                                      >
                                        <Clock className="h-4 w-4" />
                                        Start Progress
                                      </button>
                                    )}

                                    {issue.status === "in_progress" && (
                                      <div
                                        title="This issue is currently being worked on"
                                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-lg"
                                      >
                                        <Clock className="h-4 w-4 animate-pulse" />
                                        Working on it
                                      </div>
                                    )}

                                    {issue.status !== "resolved" && (
                                      <button
                                        onClick={() =>
                                          handleResolveIssue(issue.id)
                                        }
                                        title="Mark this issue as resolved"
                                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-300 rounded-lg hover:bg-green-100 transition-colors"
                                      >
                                        <CheckCircle className="h-4 w-4" />
                                        Mark Resolved
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {Object.keys(groupedIssues).length === 0 && (
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No issues found
            </h3>
            <p className="text-gray-600">
              No issues match your current filters.
            </p>
          </div>
        )}
      </main>

      {/* Issue Detail Modal */}
      <IssueDetailModal
        issue={selectedIssue ? convertIssueForModal(selectedIssue) : null}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onStatusUpdate={async (issueId: number, newStatus: string) => {
          try {
            // Optimistic update - update local state immediately
            const updatedIssues = issues.map((issue) =>
              issue.id === issueId
                ? {
                    ...issue,
                    status: newStatus as "open" | "in_progress" | "resolved",
                    resolved_at:
                      newStatus === "resolved"
                        ? new Date().toISOString()
                        : issue.resolved_at,
                  }
                : issue
            );
            setIssues(updatedIssues);

            const updateData: any = { status: newStatus };
            if (newStatus === "resolved") {
              updateData.resolved_at = new Date().toISOString();
            }

            const result = await issuesAPI.update(
              issueId.toString(),
              updateData
            );

            if (result.success) {
              toast.success(
                `Issue status updated to ${newStatus.replace("_", " ")}`
              );
            } else {
              // Revert optimistic update on failure
              setIssues(issues);
              toast.error(result.error || "Failed to update issue status");
            }
          } catch (error) {
            // Revert optimistic update on error
            setIssues(issues);
            console.error("Error updating issue status:", error);
            toast.error("Failed to update issue status");
          }
        }}
        onResolveIssue={handleResolveIssue}
        allIssues={[]}
      />
    </div>
  );
}
