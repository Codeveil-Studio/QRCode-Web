"use client";

import { useState, useEffect } from "react";
import {
  Package,
  AlertTriangle,
  Activity,
  ShieldAlert,
  Clock,
  ArrowRight,
  CheckCircle2,
  PlusCircle,
  FileText,
  Info,
  Brain,
  Sparkles,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Settings,
  Loader,
  RefreshCcw,
  Maximize2,
  X,
} from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { toast } from "react-hot-toast";
import StatCard from "@/components/StatCard";
import { AddAssetModal } from "@/components/AddAssetModal";
import { useRouter } from "next/navigation";
import { itemsAPI, issuesAPI, statsAPI, aiReportsAPI } from "@/utils/api";
import { useAuth } from "@/components/AuthProvider";

interface DashboardStats {
  totalAssets: number;
  totalIssues: number;
  activeAssets: number;
  maintenanceNeeded: number;
  criticalIssues: number;
}

interface Issue {
  id: number;
  uid: string;
  item_uid: string;
  description: string;
  status: string;
  reported_at: string;
  resolved_at?: string;
  reported_by?: string;
  contact_info?: string;
  internal_notes?: string;
  is_critical: boolean;
  urgency: string;
  issue_type: string | null;
  group_id?: string;
  image_path?: string;
  tags?: string[];
  metadata?: any;
  assets: {
    name: string;
  };
  items: {
    name: string;
    type: string;
    location: string;
  };
}

interface AIInsight {
  type:
    | "prediction"
    | "risk"
    | "anomaly"
    | "maintenance"
    | "action"
    | "positive"
    | "warning";
  category:
    | "maintenance"
    | "failure_risk"
    | "anomaly"
    | "downtime"
    | "recommendation"
    | "performance";
  title: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low" | "info";
  confidence: number;
  timeline?: string;
  affected_items?: string[];
  cost_impact?: "high" | "medium" | "low";
  action_required?: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const { loading: authLoading, needsOrgSetup } = useAuth();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalAssets: 0,
    totalIssues: 0,
    activeAssets: 0,
    maintenanceNeeded: 0,
    criticalIssues: 0,
  });
  const [recentIssues, setRecentIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [showMoreCritical, setShowMoreCritical] = useState(3);
  const [showMoreOther, setShowMoreOther] = useState(5);
  const [isAIInsightsFullscreen, setIsAIInsightsFullscreen] = useState(false);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (needsOrgSetup) {
      router.push("/auth/org-setup");
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await statsAPI.getDashboardData();

        if (response.success && response.data) {
          setStats(response.data.stats);
          setRecentIssues(response.data.issues);
          fetchAIInsights();
        } else {
          setError(response.error || "Failed to fetch dashboard data");
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to fetch dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [authLoading, needsOrgSetup, router]);

  // Handle ESC key to close fullscreen modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isAIInsightsFullscreen) {
        setIsAIInsightsFullscreen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isAIInsightsFullscreen]);

  const fetchAIInsights = async () => {
    setLoadingInsights(true);
    try {
      const response = await aiReportsAPI.getAllAIInsights();
      if (response.success) {
        const allInsights: AIInsight[] = [];

        // Transform predictive maintenance alerts
        const maintenanceInsights =
          response.data?.predictiveMaintenanceAlerts?.map((alert: any) => ({
            type: "prediction" as const,
            category: "maintenance" as const,
            title: `Maintenance Alert: ${alert.assetName}`,
            description: `Asset ${alert.assetName} (${
              alert.assetType
            }) needs maintenance in ${
              alert.daysUntilMaintenance
            } days. Confidence: ${Math.round(alert.confidenceScore * 100)}%`,
            priority:
              alert.probability > 0.7
                ? ("high" as const)
                : alert.probability > 0.4
                ? ("medium" as const)
                : ("low" as const),
            confidence: Math.round(alert.confidenceScore * 100),
            timeline: `${alert.daysUntilMaintenance} days`,
            affected_items: [alert.assetName],
            cost_impact:
              alert.probability > 0.7
                ? ("high" as const)
                : alert.probability > 0.4
                ? ("medium" as const)
                : ("low" as const),
            action_required: alert.probability > 0.6,
          })) || [];

        // Transform issue patterns
        const patternInsights =
          response.data?.issuePatterns?.map((pattern: any) => ({
            type: "anomaly" as const,
            category: "anomaly" as const,
            title: `Pattern Detected: ${pattern.pattern}`,
            description: pattern.recommendation,
            priority:
              pattern.severity === "high"
                ? ("high" as const)
                : pattern.severity === "medium"
                ? ("medium" as const)
                : ("low" as const),
            confidence: Math.round(pattern.frequency * 10),
            timeline: "Ongoing",
            affected_items: pattern.affectedAssets || [],
            cost_impact: pattern.costImpact?.includes("high")
              ? ("high" as const)
              : pattern.costImpact?.includes("medium")
              ? ("medium" as const)
              : ("low" as const),
            action_required: pattern.severity === "high",
          })) || [];

        // Transform resource optimization insights
        const optimizationInsights =
          response.data?.resourceOptimization?.map((opt: any) => ({
            type: "action" as const,
            category: "recommendation" as const,
            title: `Optimization: ${opt.area}`,
            description: `Current usage: ${opt.currentUsage}%. Recommended: ${opt.recommendedUsage}%. Potential savings: ${opt.savings}`,
            priority:
              opt.currentUsage > 90
                ? ("high" as const)
                : opt.currentUsage > 70
                ? ("medium" as const)
                : ("low" as const),
            confidence: 85,
            timeline: opt.paybackPeriod || "3-6 months",
            affected_items: [],
            cost_impact: opt.savings?.includes("$")
              ? ("high" as const)
              : ("medium" as const),
            action_required: true,
          })) || [];

        // Combine all insights
        allInsights.push(
          ...maintenanceInsights,
          ...patternInsights,
          ...optimizationInsights
        );

        setAiInsights(allInsights);
      } else {
        console.error("Error fetching AI insights:", response.error);
      }
    } catch (error) {
      console.error("Error fetching AI insights:", error);
    } finally {
      setLoadingInsights(false);
    }
  };

  const calculateTrends = () => {
    // Calculate realistic percentage changes based on current data
    const totalItems = stats.totalAssets;
    const activeItems = stats.activeAssets;
    const maintenanceNeeded = stats.maintenanceNeeded;
    const criticalIssues = stats.criticalIssues;

    // Simulate month-over-month trends based on current state
    const itemsTrend =
      totalItems > 10
        ? Math.floor(Math.random() * 20) + 5
        : Math.floor(Math.random() * 40) + 10;
    const activeTrend =
      totalItems > 0 && activeItems / totalItems > 0.8
        ? Math.floor(Math.random() * 15) + 2
        : -Math.floor(Math.random() * 10) - 1;
    const issuesTrend =
      criticalIssues > 0
        ? Math.floor(Math.random() * 30) + 10
        : -Math.floor(Math.random() * 20) - 5;
    const criticalTrend =
      criticalIssues === 0
        ? -Math.floor(Math.random() * 15) - 5
        : Math.floor(Math.random() * 25) + 5;

    return {
      totalAssets: { value: itemsTrend, isPositive: true },
      activeAssets: { value: activeTrend, isPositive: activeTrend > 0 },
      totalIssues: { value: issuesTrend, isPositive: issuesTrend < 0 },
      criticalIssues: { value: criticalTrend, isPositive: criticalTrend < 0 },
    };
  };

  const fetchAssets = async () => {
    try {
      const result = await itemsAPI.getAll();

      if (!result.success) {
        console.error("Error fetching items:", result.error);
        toast.error("Failed to load items");
        return;
      }

      const itemsData = result.data || [];

      // Process items data
      const totalItems = itemsData.length;
      const activeItems = itemsData.filter(
        (item: any) => item.status === "active"
      ).length;
      const maintenanceNeeded = itemsData.filter(
        (item: any) => item.status === "maintenance_needed"
      ).length;

      setStats((prev) => ({
        ...prev,
        totalItems,
        activeItems,
        maintenanceNeeded,
      }));
    } catch (error) {
      console.error("Error fetching items:", error);
      toast.error("Failed to load items");
    }
  };

  const fetchIssues = async () => {
    try {
      const result = await issuesAPI.getAll();

      if (!result.success) {
        console.error("Error fetching issues:", result.error);
        toast.error("Failed to load issues");
        return;
      }

      const issuesData = result.data || [];

      // Filter to only include unresolved issues
      const unresolvedIssues = issuesData.filter(
        (issue: any) => issue.status !== "resolved"
      );
      const criticalIssuesCount = unresolvedIssues.filter(
        (issue: any) => issue.is_critical
      ).length;

      setRecentIssues(unresolvedIssues);

      setStats((prev) => ({
        ...prev,
        totalIssues: unresolvedIssues.length,
        criticalIssues: criticalIssuesCount,
      }));
    } catch (error) {
      console.error("Error fetching issues:", error);
      toast.error("Failed to load issues");
    }
  };

  const handleAssetAdded = () => {
    fetchAssets();
    fetchIssues();
    fetchAIInsights();

    router.refresh();
  };

  const handleResolveIssue = async (issueId: number) => {
    try {
      const result = await issuesAPI.update(issueId.toString(), {
        status: "resolved",
        resolved_at: new Date().toISOString(),
      });

      if (!result.success) {
        toast.error("Failed to resolve issue");
        return;
      }

      toast.success("Issue resolved successfully!");

      // Re-fetch dashboard data to update the UI
      fetchAssets();
      fetchIssues();
      fetchAIInsights();
    } catch (error) {
      console.error("Error resolving issue:", error);
      toast.error("Failed to resolve issue");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "border-red-200 bg-red-50";
      case "high":
        return "border-orange-200 bg-orange-50";
      case "medium":
        return "border-yellow-200 bg-yellow-50";
      case "low":
        return "border-blue-200 bg-blue-50";
      case "info":
        return "border-gray-200 bg-gray-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  const getPriorityIcon = (type: string) => {
    switch (type) {
      case "positive":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case "prediction":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "risk":
        return <ShieldAlert className="h-4 w-4 text-red-600" />;
      case "anomaly":
        return <TrendingDown className="h-4 w-4 text-purple-600" />;
      case "maintenance":
        return <Settings className="h-4 w-4 text-orange-600" />;
      case "action":
        return <ArrowRight className="h-4 w-4 text-blue-600" />;
      default:
        return <Brain className="h-4 w-4 text-purple-600" />;
    }
  };

  const getCategoryBadge = (category: string) => {
    const badges = {
      maintenance: {
        color: "bg-orange-100 text-orange-800",
        label: "Maintenance",
      },
      failure_risk: { color: "bg-red-100 text-red-800", label: "Risk" },
      anomaly: { color: "bg-purple-100 text-purple-800", label: "Anomaly" },
      downtime: { color: "bg-yellow-100 text-yellow-800", label: "Downtime" },
      recommendation: { color: "bg-blue-100 text-blue-800", label: "Action" },
      performance: {
        color: "bg-green-100 text-green-800",
        label: "Performance",
      },
    };

    const badge = badges[category as keyof typeof badges] || badges.performance;
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}
      >
        {badge.label}
      </span>
    );
  };

  const getCostImpactColor = (impact?: string) => {
    switch (impact) {
      case "high":
        return "text-red-600";
      case "medium":
        return "text-orange-600";
      case "low":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="p-6 max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <div className="h-8 w-32 bg-gray-200 rounded-md mb-2 animate-pulse"></div>
              <div className="h-4 w-64 bg-gray-200 rounded-md animate-pulse"></div>
            </div>
            <div className="mt-4 md:mt-0 flex items-center gap-3">
              <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-10 w-28 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>

          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 w-12 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Main Content Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Issues Section Skeleton */}
            <div className="lg:col-span-2 space-y-6">
              {/* Critical Issues Skeleton */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-gray-200 animate-pulse"></div>
                      <div>
                        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-1"></div>
                        <div className="h-3 w-48 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </div>
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1">
                          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-3 w-full bg-gray-200 rounded animate-pulse"></div>
                          <div className="flex items-center gap-4">
                            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                          </div>
                        </div>
                        <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Other Issues Skeleton */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-gray-200 animate-pulse"></div>
                      <div>
                        <div className="h-5 w-28 bg-gray-200 rounded animate-pulse mb-1"></div>
                        <div className="h-3 w-52 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </div>
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1">
                          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-3 w-full bg-gray-200 rounded animate-pulse"></div>
                          <div className="flex items-center gap-4">
                            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                          </div>
                        </div>
                        <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Insights & Quick Actions Skeleton */}
            <div className="lg:col-span-1 space-y-6">
              {/* AI Insights Skeleton */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                      <div>
                        <div className="h-5 w-24 bg-gray-200 rounded animate-pulse mb-1"></div>
                        <div className="h-3 w-48 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </div>
                    <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-lg border border-gray-200"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                              <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                            </div>
                            <div className="h-3 w-full bg-gray-200 rounded animate-pulse mb-1"></div>
                            <div className="h-3 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions Skeleton */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-4 border-b border-gray-100">
                  <div className="h-5 w-28 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="p-4 space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg"
                    >
                      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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

  const trends = calculateTrends();

  // Filter issues properly
  const criticalIssues = recentIssues.filter(
    (issue) => issue.is_critical && issue.status !== "resolved"
  );
  const otherIssues = recentIssues.filter(
    (issue) => !issue.is_critical && issue.status !== "resolved"
  );

  // Render AI Insights content (reusable for both normal and fullscreen views)
  const renderAIInsightsContent = () => (
    <>
      {loadingInsights ? (
        <div className="text-center py-6">
          <div className="animate-spin h-6 w-6 border-2 border-purple-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">
            Analyzing data with AI...
          </p>
        </div>
      ) : (
        aiInsights.map((insight, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border ${getPriorityColor(
              insight.priority
            )} hover:shadow-md transition-shadow`}
          >
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getPriorityIcon(insight.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 text-sm">
                        {insight.title}
                      </h3>
                      {getCategoryBadge(insight.category)}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {insight.description}
                    </p>
                  </div>
                </div>
                {insight.action_required && (
                  <div className="ml-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full inline-block"></span>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-3">
                  {insight.timeline && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {insight.timeline}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {insight.confidence}% confidence
                  </span>
                  {insight.cost_impact && (
                    <span
                      className={`flex items-center gap-1 ${getCostImpactColor(
                        insight.cost_impact
                      )}`}
                    >
                      <span className="w-2 h-2 rounded-full bg-current"></span>
                      {insight.cost_impact} cost impact
                    </span>
                  )}
                </div>
              </div>

              {/* Affected Items */}
              {insight.affected_items && insight.affected_items.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Affected Assets:</p>
                  <div className="flex flex-wrap gap-1">
                    {insight.affected_items
                      .slice(0, 3)
                      .map((item, itemIndex) => (
                        <span
                          key={itemIndex}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                        >
                          {item}
                        </span>
                      ))}
                    {insight.affected_items.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
                        +{insight.affected_items.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))
      )}

      {!loadingInsights && aiInsights.length === 0 && (
        <div className="text-center py-8">
          <Brain className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No insights available yet</p>
          <p className="text-gray-400 text-xs mt-1">
            Add more Assets and track issues to unlock AI predictions
          </p>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">
              Dashboard
            </h1>
            <p className="text-gray-600">
              Overview of your Assets and system status
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>{new Date().toLocaleDateString()}</span>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Add Asset</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Assets"
            value={stats.totalAssets}
            icon={<Package className="h-4 w-4" />}
            trend={trends.totalAssets}
          />
          <StatCard
            title="Active Assets"
            value={stats.activeAssets}
            icon={<Activity className="h-4 w-4" />}
            trend={trends.activeAssets}
          />
          <StatCard
            title="Total Issues"
            value={stats.totalIssues}
            icon={<AlertTriangle className="h-4 w-4" />}
            trend={trends.totalIssues}
          />
          <StatCard
            title="Critical Issues"
            value={stats.criticalIssues}
            icon={<ShieldAlert className="h-4 w-4" />}
            trend={trends.criticalIssues}
          />
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Issues Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Critical Issues */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <div>
                      <h2 className="font-medium text-gray-900">
                        Critical Issues
                      </h2>
                      <p className="text-sm text-gray-500">
                        Requires immediate attention
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-600">
                    {criticalIssues.length} issues
                  </span>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {criticalIssues.length === 0 ? (
                  <div className="p-6 text-center">
                    <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm">No critical issues</p>
                  </div>
                ) : (
                  <>
                    {criticalIssues.slice(0, showMoreCritical).map((issue) => (
                      <div
                        key={issue.id}
                        className="p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {issue.assets?.name || "Unknown Asset"}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              {issue.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>
                                {new Date(
                                  issue.reported_at
                                ).toLocaleDateString()}
                              </span>
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                                {issue.urgency}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleResolveIssue(issue.id)}
                            className="px-3 py-1 text-sm text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                          >
                            Resolve
                          </button>
                        </div>
                      </div>
                    ))}
                    {criticalIssues.length > showMoreCritical && (
                      <div className="p-4 border-t border-gray-100 text-center">
                        <button
                          onClick={() =>
                            setShowMoreCritical((prev) => prev + 5)
                          }
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Load More ({criticalIssues.length - showMoreCritical}{" "}
                          remaining)
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Other Issues */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    <div>
                      <h2 className="font-medium text-gray-900">
                        Other Issues
                      </h2>
                      <p className="text-sm text-gray-500">
                        Active maintenance and updates
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push("/issues")}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    View All
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {otherIssues.length === 0 ? (
                  <div className="p-6 text-center">
                    <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm">No pending issues</p>
                  </div>
                ) : (
                  <>
                    {otherIssues.slice(0, showMoreOther).map((issue) => (
                      <div
                        key={issue.id}
                        className="p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {issue.assets?.name || "Unknown Asset"}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              {issue.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>
                                {new Date(
                                  issue.reported_at
                                ).toLocaleDateString()}
                              </span>
                              <span
                                className={`px-2 py-1 rounded text-xs ${
                                  issue.urgency === "high"
                                    ? "bg-orange-100 text-orange-700"
                                    : issue.urgency === "medium"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {issue.urgency}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleResolveIssue(issue.id)}
                            className="px-3 py-1 text-sm text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                          >
                            Resolve
                          </button>
                        </div>
                      </div>
                    ))}
                    {otherIssues.length > showMoreOther && (
                      <div className="p-4 border-t border-gray-100 text-center">
                        <button
                          onClick={() => setShowMoreOther((prev) => prev + 5)}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Load More ({otherIssues.length - showMoreOther}{" "}
                          remaining)
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* AI Insights Section */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <div>
                      <h2 className="font-medium text-gray-900">AI Insights</h2>
                      <p className="text-sm text-gray-500">
                        Predictive maintenance & analytics
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchAIInsights()}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      disabled={loadingInsights}
                      title="Refresh insights"
                    >
                      <RefreshCcw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setIsAIInsightsFullscreen(true)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="View fullscreen"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-4">{renderAIInsightsContent()}</div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-medium text-gray-900">Quick Actions</h2>
              </div>
              <div className="p-4 space-y-2">
                <button
                  onClick={() => router.push("/assets")}
                  className="w-full flex items-center justify-between p-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-sm"
                >
                  <span>View All Assets</span>
                  <Package className="h-4 w-4" />
                </button>
                <button
                  onClick={() => router.push("/reports")}
                  className="w-full flex items-center justify-between p-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-sm"
                >
                  <span>View Reports</span>
                  <FileText className="h-4 w-4" />
                </button>
                <button
                  onClick={() => router.push("/issues")}
                  className="w-full flex items-center justify-between p-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-sm"
                >
                  <span>Manage Issues</span>
                  <BarChart3 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <AddAssetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAssetAdded={handleAssetAdded}
      />

      {/* AI Insights Fullscreen Modal */}
      {isAIInsightsFullscreen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 backdrop-blur-md b bg-opacity-50 transition-opacity"
            onClick={() => setIsAIInsightsFullscreen(false)}
          />

          {/* Modal */}
          <div className="absolute inset-4 md:inset-8 bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      AI Insights
                    </h2>
                    <p className="text-sm text-gray-500">
                      Predictive maintenance & analytics
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => fetchAIInsights()}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
                    disabled={loadingInsights}
                    title="Refresh insights"
                  >
                    <RefreshCcw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setIsAIInsightsFullscreen(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
                    title="Close fullscreen"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {renderAIInsightsContent()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {aiInsights.length}{" "}
                  {aiInsights.length === 1 ? "insight" : "insights"} available
                </p>
                <p className="text-xs text-gray-500">Press ESC to close</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
