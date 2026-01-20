import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { getAuthenticatedSupabase } from "../utils/supabase";
import { ApiResponse } from "../types";

// Types for report data
export interface ReportData {
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

// Download endpoints
export const downloadOpenIssues = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const accessToken = req.accessToken;

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const supabase = getAuthenticatedSupabase(accessToken);
    const userIds = await getUserIds(supabase, userId);

    const { data: issues, error } = await supabase
      .from("issues")
      .select("*, assets!inner(name, user_id, asset_types(name))")
      .in("assets.user_id", userIds)
      .eq("status", "open");

    if (error) throw error;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=open-issues.csv"
    );

    const csvData = convertIssuesToCSV(issues || []);
    res.send(csvData);
  } catch (error) {
    console.error("Error downloading open issues:", error);
    res.status(500).json({
      success: false,
      error: "Failed to download open issues",
    });
  }
};

export const downloadResolvedIssues = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const accessToken = req.accessToken;

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const supabase = getAuthenticatedSupabase(accessToken);
    const userIds = await getUserIds(supabase, userId);

    const { data: issues, error } = await supabase
      .from("issues")
      .select("*, assets!inner(name, user_id, asset_types(name))")
      .in("assets.user_id", userIds)
      .eq("status", "resolved");

    if (error) throw error;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=resolved-issues.csv"
    );

    const csvData = convertIssuesToCSV(issues || []);
    res.send(csvData);
  } catch (error) {
    console.error("Error downloading resolved issues:", error);
    res.status(500).json({
      success: false,
      error: "Failed to download resolved issues",
    });
  }
};

export const downloadInProgressIssues = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const accessToken = req.accessToken;

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const supabase = getAuthenticatedSupabase(accessToken);
    const userIds = await getUserIds(supabase, userId);

    const { data: issues, error } = await supabase
      .from("issues")
      .select("*, assets!inner(name, user_id, asset_types(name))")
      .in("assets.user_id", userIds)
      .eq("status", "in_progress");

    if (error) throw error;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=in-progress-issues.csv"
    );

    const csvData = convertIssuesToCSV(issues || []);
    res.send(csvData);
  } catch (error) {
    console.error("Error downloading in-progress issues:", error);
    res.status(500).json({
      success: false,
      error: "Failed to download in-progress issues",
    });
  }
};

export const downloadAllAssets = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const accessToken = req.accessToken;

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const supabase = getAuthenticatedSupabase(accessToken);
    const userIds = await getUserIds(supabase, userId);

    const { data: assets, error } = await supabase
      .from("assets")
      .select("*, asset_types(name)")
      .in("user_id", userIds);

    if (error) throw error;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=all-assets.csv");

    const csvData = convertAssetsToCSV(assets || []);
    res.send(csvData);
  } catch (error) {
    console.error("Error downloading assets:", error);
    res.status(500).json({
      success: false,
      error: "Failed to download assets",
    });
  }
};

export const getComprehensiveReports = async (
  req: AuthRequest,
  res: Response<ApiResponse<ReportData>>
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const accessToken = req.accessToken;

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const supabase = getAuthenticatedSupabase(accessToken);

    // First, get the user's organization
    const { data: orgMember, error: orgError } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", userId)
      .single();

    if (orgError || !orgMember?.org_id) {
      res.status(500).json({
        success: false,
        error: "User organization not found",
      });
      return;
    }

    const orgId = orgMember.org_id;

    // Get all users in the organization
    const { data: orgUsers, error: usersError } = await supabase
      .from("org_members")
      .select("user_id")
      .eq("org_id", orgId);

    if (usersError) {
      console.error("Error fetching organization users:", usersError);
      throw usersError;
    }

    const userIds = orgUsers?.map((user) => user.user_id) || [];

    if (userIds.length === 0) {
      // Return empty data structure if no users found
      const emptyReportData: ReportData = {
        assetStats: { total: 0, active: 0, inactive: 0, needsMaintenance: 0 },
        issueStats: {
          total: 0,
          open: 0,
          resolved: 0,
          critical: 0,
          byUrgency: { low: 0, medium: 0, high: 0 },
        },
        organizationStats: {
          totalOrgs: 0,
          totalMembers: 0,
          avgMembersPerOrg: 0,
        },
        subscriptionStats: {
          activeSubscriptions: 0,
          totalRevenue: 0,
          avgRevenuePerSub: 0,
        },
        assetUtilization: [],
        issueResolutionTrends: [],
        maintenanceOverdue: [],
        issuesPerAsset: [],
        issuesPerAssetType: [],
        assetsAddedOverTime: [],
        upcomingMaintenance: [],
        topAssetsWithIssues: [],
        aiInsights: {
          predictiveMaintenanceAlerts: [],
          issuePatterns: [],
          resourceOptimization: [],
        },
      };

      res.json({
        success: true,
        data: emptyReportData,
      });
      return;
    }

    // Execute all queries in parallel for better performance
    const [
      assetStatsResult,
      issueStatsResult,
      organizationStatsResult,
      subscriptionStatsResult,
      assetUtilizationResult,
      issueResolutionTrendsResult,
      maintenanceOverdueResult,
      issuesPerAssetResult,
      issuesPerAssetTypeResult,
      assetsAddedOverTimeResult,
      upcomingMaintenanceResult,
      topAssetsWithIssuesResult,
    ] = await Promise.all([
      getAssetStats(supabase, userIds),
      getIssueStats(supabase, userIds),
      getOrganizationStats(supabase, orgId),
      getSubscriptionStats(supabase, orgId),
      getAssetUtilization(supabase, userIds),
      getIssueResolutionTrends(supabase, userIds),
      getMaintenanceOverdue(supabase, userIds),
      getIssuesPerAsset(supabase, userIds),
      getIssuesPerAssetType(supabase, userIds),
      getAssetsAddedOverTime(supabase, userIds),
      getUpcomingMaintenance(supabase, userIds),
      getTopAssetsWithIssues(supabase, userIds),
    ]);

    // Generate AI insights (simplified for now - could be enhanced with actual ML models)
    const aiInsights = generateAIInsights(
      assetStatsResult,
      issueStatsResult,
      maintenanceOverdueResult
    );

    const reportData: ReportData = {
      assetStats: assetStatsResult,
      issueStats: issueStatsResult,
      organizationStats: organizationStatsResult,
      subscriptionStats: subscriptionStatsResult,
      assetUtilization: assetUtilizationResult,
      issueResolutionTrends: issueResolutionTrendsResult,
      maintenanceOverdue: maintenanceOverdueResult,
      issuesPerAsset: issuesPerAssetResult,
      issuesPerAssetType: issuesPerAssetTypeResult,
      assetsAddedOverTime: assetsAddedOverTimeResult,
      upcomingMaintenance: upcomingMaintenanceResult,
      topAssetsWithIssues: topAssetsWithIssuesResult,
      aiInsights,
    };

    res.json({
      success: true,
      data: reportData,
    });
  } catch (error) {
    console.error("Error fetching comprehensive reports:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch comprehensive reports",
    });
  }
};

// Helper function to get asset statistics
async function getAssetStats(supabase: any, userIds: string[]) {
  const [totalResult, activeResult, inactiveResult, maintenanceResult] =
    await Promise.all([
      supabase
        .from("assets")
        .select("id", { count: "exact", head: true })
        .in("user_id", userIds),
      supabase
        .from("assets")
        .select("id", { count: "exact", head: true })
        .in("user_id", userIds)
        .eq("status", "active"),
      supabase
        .from("assets")
        .select("id", { count: "exact", head: true })
        .in("user_id", userIds)
        .neq("status", "active"),
      supabase
        .from("assets")
        .select("id", { count: "exact", head: true })
        .in("user_id", userIds)
        .or(
          "last_maintenance_at.lt.now() - interval '30 days',last_maintenance_at.is.null"
        ),
    ]);

  return {
    total: totalResult.count || 0,
    active: activeResult.count || 0,
    inactive: inactiveResult.count || 0,
    needsMaintenance: maintenanceResult.count || 0,
  };
}

// Helper function to get issue statistics
async function getIssueStats(supabase: any, userIds: string[]) {
  const [
    totalResult,
    openResult,
    resolvedResult,
    criticalResult,
    urgencyResult,
  ] = await Promise.all([
    supabase
      .from("issues")
      .select("*, assets!inner(user_id)", { count: "exact", head: true })
      .in("assets.user_id", userIds),
    supabase
      .from("issues")
      .select("*, assets!inner(user_id)", { count: "exact", head: true })
      .in("assets.user_id", userIds)
      .eq("status", "open"),
    supabase
      .from("issues")
      .select("*, assets!inner(user_id)", { count: "exact", head: true })
      .in("assets.user_id", userIds)
      .eq("status", "resolved"),
    supabase
      .from("issues")
      .select("*, assets!inner(user_id)", { count: "exact", head: true })
      .in("assets.user_id", userIds)
      .eq("is_critical", true),
    supabase
      .from("issues")
      .select("urgency, assets!inner(user_id)")
      .in("assets.user_id", userIds),
  ]);

  // Count issues by urgency
  const urgencyData = urgencyResult.data || [];
  const byUrgency = {
    low: urgencyData.filter((issue: any) => issue.urgency === "low").length,
    medium: urgencyData.filter((issue: any) => issue.urgency === "medium")
      .length,
    high: urgencyData.filter((issue: any) => issue.urgency === "high").length,
  };

  return {
    total: totalResult.count || 0,
    open: openResult.count || 0,
    resolved: resolvedResult.count || 0,
    critical: criticalResult.count || 0,
    byUrgency,
  };
}

// Helper function to get organization statistics
async function getOrganizationStats(supabase: any, orgId: string) {
  const [totalOrgsResult, totalMembersResult] = await Promise.all([
    supabase.from("orgs").select("id", { count: "exact", head: true }),
    supabase.from("org_members").select("id", { count: "exact", head: true }),
  ]);

  const totalOrgs = totalOrgsResult.count || 0;
  const totalMembers = totalMembersResult.count || 0;
  const avgMembersPerOrg =
    totalOrgs > 0 ? Math.round((totalMembers / totalOrgs) * 10) / 10 : 0;

  return {
    totalOrgs,
    totalMembers,
    avgMembersPerOrg,
  };
}

// Helper function to get subscription statistics
async function getSubscriptionStats(supabase: any, orgId: string) {
  const [activeSubsResult, revenueResult] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("subscriptions")
      .select("total_monthly_cost")
      .eq("status", "active"),
  ]);

  const activeSubscriptions = activeSubsResult.count || 0;
  const revenueData = revenueResult.data || [];
  const totalRevenue = revenueData.reduce(
    (sum: number, sub: any) => sum + (sub.total_monthly_cost * 100 || 0),
    0
  ); // Convert to pence
  const avgRevenuePerSub =
    activeSubscriptions > 0
      ? Math.round(totalRevenue / activeSubscriptions)
      : 0;

  return {
    activeSubscriptions,
    totalRevenue,
    avgRevenuePerSub,
  };
}

// Helper function to get asset utilization by type
async function getAssetUtilization(supabase: any, userIds: string[]) {
  const { data: assetData, error } = await supabase
    .from("assets")
    .select("type, asset_types(name)")
    .in("user_id", userIds);

  if (error) {
    console.error("Error fetching asset utilization:", error);
    return [];
  }

  // Group by asset type
  const typeMap = new Map<string, number>();
  const totalAssets = assetData?.length || 0;

  assetData?.forEach((asset: any) => {
    const typeName = asset.asset_types?.name || "Unknown";
    typeMap.set(typeName, (typeMap.get(typeName) || 0) + 1);
  });

  return Array.from(typeMap.entries()).map(([type, count]) => ({
    type,
    count,
    percentage:
      totalAssets > 0 ? Math.round((count / totalAssets) * 1000) / 10 : 0,
  }));
}

// Helper function to get issue resolution trends
async function getIssueResolutionTrends(supabase: any, userIds: string[]) {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: issueData, error } = await supabase
    .from("issues")
    .select("reported_at, resolved_at, assets!inner(user_id)")
    .in("assets.user_id", userIds)
    .gte("reported_at", sixMonthsAgo.toISOString());

  if (error) {
    console.error("Error fetching issue resolution trends:", error);
    return [];
  }

  // Group by month
  const monthlyData = new Map<string, { created: number; resolved: number }>();

  issueData?.forEach((issue: any) => {
    const reportedMonth = new Date(issue.reported_at).toLocaleDateString(
      "en-US",
      { year: "numeric", month: "short" }
    );

    if (!monthlyData.has(reportedMonth)) {
      monthlyData.set(reportedMonth, { created: 0, resolved: 0 });
    }

    monthlyData.get(reportedMonth)!.created++;

    if (issue.resolved_at) {
      const resolvedMonth = new Date(issue.resolved_at).toLocaleDateString(
        "en-US",
        { year: "numeric", month: "short" }
      );
      if (!monthlyData.has(resolvedMonth)) {
        monthlyData.set(resolvedMonth, { created: 0, resolved: 0 });
      }
      monthlyData.get(resolvedMonth)!.resolved++;
    }
  });

  return Array.from(monthlyData.entries()).map(([month, data]) => ({
    month,
    created: data.created,
    resolved: data.resolved,
  }));
}

// Helper function to get maintenance overdue items
async function getMaintenanceOverdue(supabase: any, userIds: string[]) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: overdueAssets, error } = await supabase
    .from("assets")
    .select("name, last_maintenance_at, asset_types(name)")
    .in("user_id", userIds)
    .or(
      `last_maintenance_at.lt.${thirtyDaysAgo.toISOString()},last_maintenance_at.is.null`
    )
    .limit(10);

  if (error) {
    console.error("Error fetching overdue maintenance:", error);
    return [];
  }

  return (
    overdueAssets?.map((asset: any) => {
      const daysPastDue = asset.last_maintenance_at
        ? Math.floor(
            (Date.now() - new Date(asset.last_maintenance_at).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 365; // Default for assets with no maintenance history

      return {
        name: asset.name,
        daysPastDue,
        type: asset.asset_types?.name || "Unknown",
      };
    }) || []
  );
}

// Helper function to generate AI insights (simplified version)
function generateAIInsights(
  assetStats: any,
  issueStats: any,
  maintenanceOverdue: any[]
) {
  // Generate predictive maintenance alerts based on overdue items
  const predictiveMaintenanceAlerts = maintenanceOverdue
    .slice(0, 5)
    .map((asset, index) => ({
      assetName: asset.name,
      probability: Math.max(0.3, Math.min(0.9, asset.daysPastDue / 30)), // Higher probability for more overdue assets
      daysUntilMaintenance: Math.max(1, 30 - asset.daysPastDue),
    }));

  // Generate issue patterns (simplified examples)
  const issuePatterns = [
    {
      pattern: "Equipment issues increase during high usage periods",
      frequency: Math.floor(issueStats.total * 0.3),
      recommendation:
        "Schedule preventive maintenance during low-usage periods",
    },
    {
      pattern: "Critical issues often follow minor unresolved issues",
      frequency: Math.floor(issueStats.critical * 2),
      recommendation:
        "Implement proactive resolution of minor issues to prevent escalation",
    },
  ];

  // Generate resource optimization recommendations
  const resourceOptimization = [
    {
      area: "Asset Maintenance Scheduling",
      currentUsage: 85,
      recommendedUsage: 70,
      savings: "15% cost reduction",
    },
    {
      area: "Issue Response Time",
      currentUsage: Math.min(95, issueStats.open * 5),
      recommendedUsage: 65,
      savings: `${Math.floor(issueStats.open * 0.2)} hours/week`,
    },
  ];

  return {
    predictiveMaintenanceAlerts,
    issuePatterns,
    resourceOptimization,
  };
}

// Helper function to get issues per asset
async function getIssuesPerAsset(supabase: any, userIds: string[]) {
  const { data: issueData, error } = await supabase
    .from("issues")
    .select("assets!inner(name, user_id, asset_types(name))")
    .in("assets.user_id", userIds);

  if (error) {
    console.error("Error fetching issues per asset:", error);
    return [];
  }

  // Group by asset
  const assetMap = new Map<string, { count: number; type: string }>();

  issueData?.forEach((issue: any) => {
    const assetName = issue.assets?.name || "Unknown";
    const assetType = issue.assets?.asset_types?.name || "Unknown";

    if (assetMap.has(assetName)) {
      assetMap.get(assetName)!.count++;
    } else {
      assetMap.set(assetName, { count: 1, type: assetType });
    }
  });

  return Array.from(assetMap.entries())
    .map(([assetName, data]) => ({
      assetName,
      issueCount: data.count,
      assetType: data.type,
    }))
    .sort((a, b) => b.issueCount - a.issueCount)
    .slice(0, 20); // Top 20 assets with issues
}

// Helper function to get issues per asset type
async function getIssuesPerAssetType(supabase: any, userIds: string[]) {
  const { data: issueData, error } = await supabase
    .from("issues")
    .select("assets!inner(user_id, asset_types(name))")
    .in("assets.user_id", userIds);

  if (error) {
    console.error("Error fetching issues per asset type:", error);
    return [];
  }

  // Group by asset type
  const typeMap = new Map<string, number>();

  issueData?.forEach((issue: any) => {
    const assetType = issue.assets?.asset_types?.name || "Unknown";
    typeMap.set(assetType, (typeMap.get(assetType) || 0) + 1);
  });

  return Array.from(typeMap.entries()).map(([assetType, issueCount]) => ({
    assetType,
    issueCount,
  }));
}

// Helper function to get assets added over time
async function getAssetsAddedOverTime(supabase: any, userIds: string[]) {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: assetData, error } = await supabase
    .from("assets")
    .select("created_at")
    .in("user_id", userIds)
    .gte("created_at", sixMonthsAgo.toISOString());

  if (error) {
    console.error("Error fetching assets added over time:", error);
    return [];
  }

  // Group by month
  const monthlyData = new Map<string, number>();

  assetData?.forEach((asset: any) => {
    const month = new Date(asset.created_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
    });
    monthlyData.set(month, (monthlyData.get(month) || 0) + 1);
  });

  return Array.from(monthlyData.entries()).map(([month, count]) => ({
    month,
    count,
  }));
}

// Helper function to get upcoming maintenance
async function getUpcomingMaintenance(supabase: any, userIds: string[]) {
  const today = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const { data: assetData, error } = await supabase
    .from("assets")
    .select("name, last_maintenance_at, asset_types(name)")
    .in("user_id", userIds)
    .not("last_maintenance_at", "is", null);

  if (error) {
    console.error("Error fetching upcoming maintenance:", error);
    return [];
  }

  return (
    assetData
      ?.map((asset: any) => {
        const lastMaintenance = new Date(asset.last_maintenance_at);
        const nextMaintenance = new Date(lastMaintenance);
        nextMaintenance.setDate(nextMaintenance.getDate() + 90); // Assume 90-day maintenance cycle

        const daysUntilMaintenance = Math.ceil(
          (nextMaintenance.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          assetName: asset.name,
          daysUntilMaintenance,
          assetType: asset.asset_types?.name || "Unknown",
        };
      })
      .filter(
        (asset: any) =>
          asset.daysUntilMaintenance <= 30 && asset.daysUntilMaintenance > 0
      ) || []
  );
}

// Helper function to get top assets with most/least issues
async function getTopAssetsWithIssues(supabase: any, userIds: string[]) {
  const { data: issueData, error } = await supabase
    .from("issues")
    .select("assets!inner(name, user_id, asset_types(name))")
    .in("assets.user_id", userIds);

  if (error) {
    console.error("Error fetching top assets with issues:", error);
    return [];
  }

  // Group by asset
  const assetMap = new Map<string, { count: number; type: string }>();

  issueData?.forEach((issue: any) => {
    const assetName = issue.assets?.name || "Unknown";
    const assetType = issue.assets?.asset_types?.name || "Unknown";

    if (assetMap.has(assetName)) {
      assetMap.get(assetName)!.count++;
    } else {
      assetMap.set(assetName, { count: 1, type: assetType });
    }
  });

  return Array.from(assetMap.entries())
    .map(([assetName, data]) => ({
      assetName,
      issueCount: data.count,
      assetType: data.type,
    }))
    .sort((a, b) => b.issueCount - a.issueCount)
    .slice(0, 10); // Top 10 assets with most issues
}

// Utility function to get user IDs for organization
async function getUserIds(supabase: any, userId: string): Promise<string[]> {
  const { data: orgMember, error: orgError } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", userId)
    .single();

  if (orgError || !orgMember?.org_id) {
    throw new Error("User organization not found");
  }

  const { data: orgUsers, error: usersError } = await supabase
    .from("org_members")
    .select("user_id")
    .eq("org_id", orgMember.org_id);

  if (usersError) {
    throw usersError;
  }

  return orgUsers?.map((user: any) => user.user_id) || [];
}

// Utility function to convert issues to CSV
function convertIssuesToCSV(issues: any[]): string {
  const headers = [
    "ID",
    "Description",
    "Status",
    "Urgency",
    "Reported By",
    "Contact Info",
    "Reported At",
    "Resolved At",
    "Is Critical",
    "Issue Type",
    "Asset Name",
    "Asset Type",
  ];

  const rows = issues.map((issue) => [
    issue.id || "",
    (issue.description || "").replace(/"/g, '""'),
    issue.status || "",
    issue.urgency || "",
    issue.reported_by || "",
    issue.contact_info || "",
    issue.reported_at || "",
    issue.resolved_at || "",
    issue.is_critical ? "Yes" : "No",
    issue.issue_type || "",
    issue.assets?.name || "",
    issue.assets?.asset_types?.name || "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((field) => `"${field}"`).join(",")),
  ].join("\n");

  return csvContent;
}

// Utility function to convert assets to CSV
function convertAssetsToCSV(assets: any[]): string {
  const headers = [
    "ID",
    "Name",
    "Location",
    "Status",
    "Type",
    "Created At",
    "Last Maintenance At",
    "Tags",
    "Metadata",
  ];

  const rows = assets.map((asset) => [
    asset.id || "",
    (asset.name || "").replace(/"/g, '""'),
    (asset.location || "").replace(/"/g, '""'),
    asset.status || "",
    asset.asset_types?.name || "",
    asset.created_at || "",
    asset.last_maintenance_at || "",
    Array.isArray(asset.tags) ? asset.tags.join("; ") : "",
    asset.metadata ? JSON.stringify(asset.metadata).replace(/"/g, '""') : "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((field) => `"${field}"`).join(",")),
  ].join("\n");

  return csvContent;
}

// Individual endpoint controllers for standard reports and analytics

// === STANDARD REPORTS CONTROLLERS ===

// GET /api/reports/asset-stats
export const getAssetStatsController = async (
  req: AuthRequest,
  res: Response<ApiResponse<any>>
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const accessToken = req.accessToken;

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const supabase = getAuthenticatedSupabase(accessToken);
    const userIds = await getUserIds(supabase, userId);
    const assetStats = await getAssetStats(supabase, userIds);

    res.json({
      success: true,
      data: assetStats,
      message: "Asset statistics retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching asset stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch asset statistics",
    });
  }
};

// GET /api/reports/issue-stats
export const getIssueStatsController = async (
  req: AuthRequest,
  res: Response<ApiResponse<any>>
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const accessToken = req.accessToken;

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const supabase = getAuthenticatedSupabase(accessToken);
    const userIds = await getUserIds(supabase, userId);
    const issueStats = await getIssueStats(supabase, userIds);

    res.json({
      success: true,
      data: issueStats,
      message: "Issue statistics retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching issue stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch issue statistics",
    });
  }
};

// GET /api/reports/organization-stats
export const getOrganizationStatsController = async (
  req: AuthRequest,
  res: Response<ApiResponse<any>>
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const accessToken = req.accessToken;

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const supabase = getAuthenticatedSupabase(accessToken);
    
    // Get user's organization
    const { data: orgMember } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", userId)
      .single();

    if (!orgMember?.org_id) {
      res.status(404).json({
        success: false,
        error: "User is not part of an organization",
      });
      return;
    }

    const organizationStats = await getOrganizationStats(supabase, orgMember.org_id);

    res.json({
      success: true,
      data: organizationStats,
      message: "Organization statistics retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching organization stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch organization statistics",
    });
  }
};

// GET /api/reports/subscription-stats
export const getSubscriptionStatsController = async (
  req: AuthRequest,
  res: Response<ApiResponse<any>>
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const accessToken = req.accessToken;

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const supabase = getAuthenticatedSupabase(accessToken);
    
    // Get user's organization
    const { data: orgMember } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", userId)
      .single();

    if (!orgMember?.org_id) {
      res.status(404).json({
        success: false,
        error: "User is not part of an organization",
      });
      return;
    }

    const subscriptionStats = await getSubscriptionStats(supabase, orgMember.org_id);

    res.json({
      success: true,
      data: subscriptionStats,
      message: "Subscription statistics retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching subscription stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch subscription statistics",
    });
  }
};

// === ANALYTICS CONTROLLERS ===

// GET /api/reports/analytics/asset-utilization
export const getAssetUtilizationController = async (
  req: AuthRequest,
  res: Response<ApiResponse<any>>
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const accessToken = req.accessToken;

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const supabase = getAuthenticatedSupabase(accessToken);
    const userIds = await getUserIds(supabase, userId);
    const assetUtilization = await getAssetUtilization(supabase, userIds);

    res.json({
      success: true,
      data: assetUtilization,
      message: "Asset utilization data retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching asset utilization:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch asset utilization data",
    });
  }
};

// GET /api/reports/analytics/issue-resolution-trends
export const getIssueResolutionTrendsController = async (
  req: AuthRequest,
  res: Response<ApiResponse<any>>
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const accessToken = req.accessToken;

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const supabase = getAuthenticatedSupabase(accessToken);
    const userIds = await getUserIds(supabase, userId);
    const issueResolutionTrends = await getIssueResolutionTrends(supabase, userIds);

    res.json({
      success: true,
      data: issueResolutionTrends,
      message: "Issue resolution trends retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching issue resolution trends:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch issue resolution trends",
    });
  }
};

// GET /api/reports/analytics/maintenance-overdue
export const getMaintenanceOverdueController = async (
  req: AuthRequest,
  res: Response<ApiResponse<any>>
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const accessToken = req.accessToken;

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const supabase = getAuthenticatedSupabase(accessToken);
    const userIds = await getUserIds(supabase, userId);
    const maintenanceOverdue = await getMaintenanceOverdue(supabase, userIds);

    res.json({
      success: true,
      data: maintenanceOverdue,
      message: "Maintenance overdue data retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching maintenance overdue:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch maintenance overdue data",
    });
  }
};

// GET /api/reports/analytics/issues-per-asset
export const getIssuesPerAssetController = async (
  req: AuthRequest,
  res: Response<ApiResponse<any>>
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const accessToken = req.accessToken;

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const supabase = getAuthenticatedSupabase(accessToken);
    const userIds = await getUserIds(supabase, userId);
    const issuesPerAsset = await getIssuesPerAsset(supabase, userIds);

    res.json({
      success: true,
      data: issuesPerAsset,
      message: "Issues per asset data retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching issues per asset:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch issues per asset data",
    });
  }
};

// GET /api/reports/analytics/issues-per-asset-type
export const getIssuesPerAssetTypeController = async (
  req: AuthRequest,
  res: Response<ApiResponse<any>>
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const accessToken = req.accessToken;

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const supabase = getAuthenticatedSupabase(accessToken);
    const userIds = await getUserIds(supabase, userId);
    const issuesPerAssetType = await getIssuesPerAssetType(supabase, userIds);

    res.json({
      success: true,
      data: issuesPerAssetType,
      message: "Issues per asset type data retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching issues per asset type:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch issues per asset type data",
    });
  }
};

// GET /api/reports/analytics/assets-added-over-time
export const getAssetsAddedOverTimeController = async (
  req: AuthRequest,
  res: Response<ApiResponse<any>>
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const accessToken = req.accessToken;

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const supabase = getAuthenticatedSupabase(accessToken);
    const userIds = await getUserIds(supabase, userId);
    const assetsAddedOverTime = await getAssetsAddedOverTime(supabase, userIds);

    res.json({
      success: true,
      data: assetsAddedOverTime,
      message: "Assets added over time data retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching assets added over time:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch assets added over time data",
    });
  }
};

// GET /api/reports/analytics/upcoming-maintenance
export const getUpcomingMaintenanceController = async (
  req: AuthRequest,
  res: Response<ApiResponse<any>>
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const accessToken = req.accessToken;

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const supabase = getAuthenticatedSupabase(accessToken);
    const userIds = await getUserIds(supabase, userId);
    const upcomingMaintenance = await getUpcomingMaintenance(supabase, userIds);

    res.json({
      success: true,
      data: upcomingMaintenance,
      message: "Upcoming maintenance data retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching upcoming maintenance:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch upcoming maintenance data",
    });
  }
};

// GET /api/reports/analytics/top-assets-with-issues
export const getTopAssetsWithIssuesController = async (
  req: AuthRequest,
  res: Response<ApiResponse<any>>
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const accessToken = req.accessToken;

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const supabase = getAuthenticatedSupabase(accessToken);
    const userIds = await getUserIds(supabase, userId);
    const topAssetsWithIssues = await getTopAssetsWithIssues(supabase, userIds);

    res.json({
      success: true,
      data: topAssetsWithIssues,
      message: "Top assets with issues data retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching top assets with issues:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch top assets with issues data",
    });
  }
};
