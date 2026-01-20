import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { getAuthenticatedSupabase } from "../utils/supabase";
import { SidebarStats, DashboardStats, Issue, ApiResponse } from "../types";

export const getSidebarStats = async (
  req: AuthRequest,
  res: Response<ApiResponse<SidebarStats>>
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
      res.json({
        success: true,
        data: {
          activeAssets: 0,
          openIssues: 0,
          criticalAlerts: 0,
        },
      });
      return;
    }

    // Fetch active assets count for all users in the organization
    const { count: activeItemsCount, error: assetsError } = await supabase
      .from("assets")
      .select("id", { count: "exact", head: true })
      .in("user_id", userIds)
      .eq("status", "active");

    if (assetsError) {
      console.error("Error fetching active assets count:", assetsError);
      throw assetsError;
    }

    // Fetch open issues count (including in_progress) for all assets in the organization
    const { count: openIssuesCount, error: openIssuesError } = await supabase
      .from("issues")
      .select("*, assets!inner(user_id)", { count: "exact", head: true })
      .in("assets.user_id", userIds)
      .in("status", ["open", "in_progress"]);

    if (openIssuesError) {
      console.error("Error fetching open issues count:", openIssuesError);
      throw openIssuesError;
    }

    // Fetch critical alerts count for all assets in the organization
    const { count: criticalAlertsCount, error: criticalError } = await supabase
      .from("issues")
      .select("*, assets!inner(user_id)", { count: "exact", head: true })
      .in("assets.user_id", userIds)
      .eq("is_critical", true)
      .in("status", ["open", "in_progress"]);

    if (criticalError) {
      console.error("Error fetching critical alerts count:", criticalError);
      throw criticalError;
    }

    const stats: SidebarStats = {
      activeAssets: activeItemsCount || 0,
      openIssues: openIssuesCount || 0,
      criticalAlerts: criticalAlertsCount || 0,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching sidebar stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch sidebar statistics",
    });
  }
};

export const getDashboardStats = async (
  req: AuthRequest,
  res: Response<ApiResponse<DashboardStats>>
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
      res.json({
        success: true,
        data: {
          totalAssets: 0,
          totalIssues: 0,
          activeAssets: 0,
          maintenanceNeeded: 0,
          criticalIssues: 0,
        },
      });
      return;
    }

    // Get total assets count for all users in the organization
    const { count: totalItems, error: totalItemsError } = await supabase
      .from("assets")
      .select("*", { count: "exact", head: true })
      .in("user_id", userIds);

    if (totalItemsError) throw totalItemsError;

    // Get active assets count for all users in the organization
    const { count: activeItems, error: activeItemsError } = await supabase
      .from("assets")
      .select("*", { count: "exact", head: true })
      .in("user_id", userIds)
      .eq("status", "active");

    if (activeItemsError) throw activeItemsError;

    // Get total issues count for all assets in the organization
    const { count: totalIssues, error: totalIssuesError } = await supabase
      .from("issues")
      .select("*, assets!inner(user_id)", { count: "exact", head: true })
      .in("assets.user_id", userIds);

    if (totalIssuesError) throw totalIssuesError;

    // Get critical issues count for all assets in the organization
    const { count: criticalIssues, error: criticalIssuesError } = await supabase
      .from("issues")
      .select("*, assets!inner(user_id)", { count: "exact", head: true })
      .in("assets.user_id", userIds)
      .eq("is_critical", true)
      .in("status", ["open", "in_progress"]);

    if (criticalIssuesError) throw criticalIssuesError;

    // Get maintenance needed count (assets with last_maintenance_at older than 30 days) for all users in the organization
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: maintenanceNeeded, error: maintenanceError } = await supabase
      .from("assets")
      .select("*", { count: "exact", head: true })
      .in("user_id", userIds)
      .eq("status", "active")
      .or(
        `last_maintenance_at.is.null,last_maintenance_at.lt.${thirtyDaysAgo.toISOString()}`
      );

    if (maintenanceError) throw maintenanceError;

    const stats: DashboardStats = {
      totalAssets: totalItems || 0,
      totalIssues: totalIssues || 0,
      activeAssets: activeItems || 0,
      maintenanceNeeded: maintenanceNeeded || 0,
      criticalIssues: criticalIssues || 0,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch dashboard statistics",
    });
  }
};

export const getDashboardData = async (
  req: AuthRequest,
  res: Response<ApiResponse<{ stats: DashboardStats; issues: Issue[] }>>
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
      res.json({
        success: true,
        data: {
          stats: {
            totalAssets: 0,
            totalIssues: 0,
            activeAssets: 0,
            maintenanceNeeded: 0,
            criticalIssues: 0,
          },
          issues: [],
        },
      });
      return;
    }

    // Get assets data for stats for all users in the organization
    const { data: assetsData, error: assetsError } = await supabase
      .from("assets")
      .select("id, name, status, created_at, type, location, user_id")
      .in("user_id", userIds)
      .order("created_at", { ascending: false });

    if (assetsError) {
      console.error("Error fetching assets:", assetsError);
      throw assetsError;
    }

    // Get issues data for all assets in the organization
    const { data: rawIssuesData, error: issuesError } = await supabase
      .from("issues")
      .select(
        `
        id,
        uid,
        asset_id,
        description,
        status,
        reported_at,
        resolved_at,
        reported_by,
        contact_info,
        internal_notes,
        is_critical,
        urgency,
        issue_type,
        group_id,
        image_path,
        tags,
        metadata,
        assets!issues_asset_id_fkey(name, type, location, user_id)
      `
      )
      .in("assets.user_id", userIds)
      .order("reported_at", { ascending: false });

    // Transform data to match new Issue interface (temporary until DB is updated)
    const issuesData =
      rawIssuesData?.map((issue: any) => ({
        ...issue,
        asset_id: issue.asset_id, // Map asset_id to asset_id for compatibility
      })) || [];

    if (issuesError) {
      console.error("Error fetching issues:", issuesError);
      throw issuesError;
    }

    // Process assets data for stats
    const totalItems = assetsData?.length || 0;
    const activeItems =
      assetsData?.filter((asset) => asset.status === "active").length || 0;
    const maintenanceNeeded =
      assetsData?.filter((asset) => asset.status === "maintenance_needed")
        .length || 0;

    // Process issues data for stats
    const totalIssues = issuesData?.length || 0;
    const criticalIssues =
      issuesData?.filter((issue) => issue.is_critical).length || 0;

    const stats: DashboardStats = {
      totalAssets: totalItems,
      totalIssues,
      activeAssets: activeItems,
      maintenanceNeeded,
      criticalIssues,
    };

    res.json({
      success: true,
      data: {
        stats,
        issues: issuesData || [],
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch dashboard data",
    });
  }
};
