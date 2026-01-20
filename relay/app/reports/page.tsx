"use client";

import { useState, useEffect } from "react";
import { apiCall, downloadAPI } from "@/utils/api";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  StatCardSkeleton,
  ChartSkeleton,
  TableSkeleton,
  AIInsightCardSkeleton,
  OptimizationCardSkeleton,
} from "@/components/skeletons/ReportsSkeleton";
import StandardReports from "@/components/reports/StandardReports";
import InteractiveCharts from "@/components/reports/InteractiveCharts";
import AIPoweredReports from "@/components/reports/AIPoweredReports";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Users,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  Target,
  Brain,
  Download,
  RefreshCw,
  Server,
  Wrench,
} from "lucide-react";

interface ReportData {
  // Standard Reports
  assetStats: {
    total: number;
    active: number;
    inactive: number;
    needsMaintenance: number;
  };
  issueStats: {
    total: number;
    open: number;
    resolved: number;
    critical: number;
    byUrgency: { low: number; medium: number; high: number };
  };
  organizationStats: {
    totalOrgs: number;
    totalMembers: number;
    avgMembersPerOrg: number;
  };
  subscriptionStats: {
    activeSubscriptions: number;
    totalRevenue: number;
    avgRevenuePerSub: number;
  };

  // Advanced Reports
  assetUtilization: Array<{ type: string; count: number; percentage: number }>;
  issueResolutionTrends: Array<{
    month: string;
    resolved: number;
    created: number;
  }>;
  maintenanceOverdue: Array<{
    name: string;
    daysPastDue: number;
    type: string;
  }>;

  // New Graph Data
  issuesPerAsset: Array<{
    assetName: string;
    issueCount: number;
    assetType: string;
  }>;
  issuesPerAssetType: Array<{ assetType: string; issueCount: number }>;
  assetsAddedOverTime: Array<{ month: string; count: number }>;
  upcomingMaintenance: Array<{
    assetName: string;
    daysUntilMaintenance: number;
    assetType: string;
  }>;
  topAssetsWithIssues: Array<{
    assetName: string;
    issueCount: number;
    assetType: string;
  }>;

  // AI Insights
  aiInsights: {
    predictiveMaintenanceAlerts: Array<{
      assetName: string;
      probability: number;
      daysUntilMaintenance: number;
    }>;
    issuePatterns: Array<{
      pattern: string;
      frequency: number;
      recommendation: string;
    }>;
    resourceOptimization: Array<{
      area: string;
      currentUsage: number;
      recommendedUsage: number;
      savings: string;
    }>;
  };
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<
    "network" | "api" | "server" | null
  >(null);
  const [activeTab, setActiveTab] = useState<"standard" | "analytics" | "ai">(
    "standard"
  );
  const [refreshing, setRefreshing] = useState(false);

  const fetchReportData = async () => {
    try {
      setRefreshing(true);
      setError(null);
      setErrorType(null);

      const response = await apiCall<ReportData>("/api/reports/comprehensive");

      if (response.success && response.data) {
        setReportData(response.data);
        setError(null);
        setErrorType(null);
      } else {
        // Handle specific error types
        if (
          response.error?.includes("404") ||
          response.error?.includes("Not Found")
        ) {
          setErrorType("api");
          setError(
            "Reports API endpoint not implemented yet. The backend needs to implement /api/reports/comprehensive"
          );
        } else if (
          response.error?.includes("500") ||
          response.error?.includes("Internal Server Error")
        ) {
          setErrorType("server");
          setError(
            "Server error occurred. Please try again later or contact support if the issue persists."
          );
        } else if (
          response.error?.includes("Network") ||
          response.error?.includes("fetch")
        ) {
          setErrorType("network");
          setError(
            "Network error. Please check your internet connection and try again."
          );
        } else {
          setErrorType("server");
          setError(response.error || "Failed to fetch report data");
        }
      }
    } catch (err) {
      setErrorType("network");
      setError("An unexpected error occurred while fetching reports");
      console.error("Reports fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  const renderSkeletonContent = () => {
    if (activeTab === "standard") {
      return (
        <div className="space-y-8">
          {/* Asset Overview Skeleton */}
          <section>
            <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <StatCardSkeleton key={i} />
              ))}
            </div>
          </section>

          {/* Issue Management Skeleton */}
          <section>
            <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <StatCardSkeleton key={i} />
              ))}
            </div>
            <ChartSkeleton />
          </section>

          {/* Organization & Subscription Stats Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section>
              <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
              <div className="grid grid-cols-1 gap-4">
                {[...Array(2)].map((_, i) => (
                  <StatCardSkeleton key={i} />
                ))}
              </div>
            </section>
            <section>
              <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
              <div className="grid grid-cols-1 gap-4">
                {[...Array(2)].map((_, i) => (
                  <StatCardSkeleton key={i} />
                ))}
              </div>
            </section>
          </div>
        </div>
      );
    } else if (activeTab === "analytics") {
      return (
        <div className="space-y-8">
          <section>
            <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
            <ChartSkeleton />
          </section>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </div>
      );
    } else {
      return (
        <div className="space-y-8">
          <section>
            <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
            <TableSkeleton />
          </section>
          <section>
            <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <AIInsightCardSkeleton key={i} />
              ))}
            </div>
          </section>
          <section>
            <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <OptimizationCardSkeleton key={i} />
              ))}
            </div>
          </section>
        </div>
      );
    }
  };

  const getErrorIcon = () => {
    switch (errorType) {
      case "api":
        return <Server className="w-8 h-8 text-yellow-600" />;
      case "network":
        return <XCircle className="w-8 h-8 text-red-600" />;
      case "server":
        return <AlertTriangle className="w-8 h-8 text-red-600" />;
      default:
        return <XCircle className="w-8 h-8 text-red-600" />;
    }
  };

  const getErrorColor = () => {
    switch (errorType) {
      case "api":
        return "bg-yellow-50 border-yellow-200";
      case "network":
        return "bg-red-50 border-red-200";
      case "server":
        return "bg-red-50 border-red-200";
      default:
        return "bg-red-50 border-red-200";
    }
  };

  const getErrorTextColor = () => {
    switch (errorType) {
      case "api":
        return "text-yellow-800";
      case "network":
        return "text-red-800";
      case "server":
        return "text-red-800";
      default:
        return "text-red-800";
    }
  };

  const exportReport = () => {
    // Simple CSV export functionality
    const csvData =
      "data:text/csv;charset=utf-8," +
      "Report Type,Metric,Value\n" +
      `Assets,Total,${reportData?.assetStats.total || 0}\n` +
      `Assets,Active,${reportData?.assetStats.active || 0}\n` +
      `Issues,Total,${reportData?.issueStats.total || 0}\n` +
      `Issues,Open,${reportData?.issueStats.open || 0}\n`;

    const encodedUri = encodeURI(csvData);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `relay-report-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadData = async (type: string) => {
    try {
      const downloadFunctions = {
        "open-issues": downloadAPI.downloadOpenIssues,
        "resolved-issues": downloadAPI.downloadResolvedIssues,
        "in-progress-issues": downloadAPI.downloadInProgressIssues,
        assets: downloadAPI.downloadAllAssets,
      };

      const downloadFunction =
        downloadFunctions[type as keyof typeof downloadFunctions];
      if (!downloadFunction) return;

      // Use the downloadAPI from utils/api.ts
      const response = await downloadFunction();

      if (response.success && response.blob) {
        // Handle blob download
        const url = window.URL.createObjectURL(response.blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${type}-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error(response.error || `Failed to download ${type}`);
      }
    } catch (error) {
      console.error(`Error downloading ${type}:`, error);
      // You could add a toast notification here
    }
  };

  // Show loading skeleton while fetching data
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-8 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
          </div>
          <div className="flex space-x-3">
            <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
          </div>
        </div>

        {/* Tab Navigation Skeleton */}
        <div className="border-b border-gray-200 mb-8">
          <div className="flex space-x-8">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-10 bg-gray-200 rounded w-32 animate-pulse"
              ></div>
            ))}
          </div>
        </div>

        {/* Content Skeleton */}
        {renderSkeletonContent()}
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={`${getErrorColor()} border rounded-lg p-8`}>
          <div className="flex flex-col items-center text-center">
            {getErrorIcon()}
            <h3 className={`mt-4 text-lg font-semibold ${getErrorTextColor()}`}>
              {errorType === "api"
                ? "API Not Ready"
                : errorType === "network"
                ? "Connection Error"
                : "Server Error"}
            </h3>
            <p className={`mt-2 text-sm ${getErrorTextColor()} max-w-2xl`}>
              {error}
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={fetchReportData}
                disabled={refreshing}
                className="flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 min-w-[120px]"
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
                />
                {refreshing ? "Retrying..." : "Try Again"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Reports & Analytics
          </h1>
          <p className="text-gray-600 mt-1">
            Comprehensive insights into your asset management
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={fetchReportData}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>

          {/* Download Menu */}
          <div className="relative group">
            <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              <Download className="w-4 h-4 mr-2" />
              Download Data
              <svg
                className="w-4 h-4 ml-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <div className="py-2">
                <button
                  onClick={() => downloadData("open-issues")}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Open Issues
                </button>
                <button
                  onClick={() => downloadData("resolved-issues")}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Resolved Issues
                </button>
                <button
                  onClick={() => downloadData("in-progress-issues")}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  In Progress Issues
                </button>
                <button
                  onClick={() => downloadData("assets")}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  All Assets
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={exportReport}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Summary
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "standard", label: "Standard Reports", icon: BarChart3 },
            { id: "analytics", label: "Interactive Charts", icon: Activity },
            { id: "ai", label: "🤖 AI Powered", icon: Brain },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Standard Reports */}
      {activeTab === "standard" && reportData && (
        <StandardReports reportData={reportData} />
      )}

      {/* Interactive Analytics */}
      {activeTab === "analytics" && reportData && (
        <InteractiveCharts reportData={reportData} />
      )}

      {/* AI Powered */}
      {activeTab === "ai" && reportData && (
        <AIPoweredReports aiInsights={reportData.aiInsights} />
      )}
    </div>
  );
}
