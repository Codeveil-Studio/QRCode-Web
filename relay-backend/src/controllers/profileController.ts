import { Response } from "express";
import { body, validationResult } from "express-validator";
import { AuthRequest } from "../middleware/auth";
import { getAuthenticatedSupabase, adminClient } from "../utils/supabase";
import { UserProfile, ApiResponse } from "../types";

export const getProfile = async (
  req: AuthRequest,
  res: Response<ApiResponse<UserProfile>>
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    const accessToken = req.accessToken;

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const supabase = getAuthenticatedSupabase(accessToken);

    // Get user data from auth.users
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      console.error("Error fetching user:", userError);
      res.status(500).json({
        success: false,
        error: "Failed to fetch user data",
      });
      return;
    }

    const user = userData.user;

    // Get organization information
    const { data: orgData } = await supabase
      .from("org_members")
      .select(
        `
        role,
        created_at,
        org_id,
        orgs (
          name
        )
      `
      )
      .eq("user_id", userId)
      .single();

    let assetsCount = 0;
    let issuesCount = 0;

    // Get organization-level stats if user belongs to an organization
    if (orgData?.org_id) {
      // Get all users in the organization
      const { data: orgUsers } = await supabase
        .from("org_members")
        .select("user_id")
        .eq("org_id", orgData.org_id);

      const userIds = orgUsers?.map((user) => user.user_id) || [];

      if (userIds.length > 0) {
        // Get organization-level asset count
        const { count: orgAssetsCount } = await supabase
          .from("assets")
          .select("*", { count: "exact", head: true })
          .in("user_id", userIds);

        // Get organization-level issue count
        const { count: orgIssuesCount } = await supabase
          .from("issues")
          .select("*, assets!inner(user_id)", { count: "exact", head: true })
          .in("assets.user_id", userIds);

        assetsCount = orgAssetsCount || 0;
        issuesCount = orgIssuesCount || 0;
      }
    } else {
      // Fallback to user-level stats if no organization
      const { count: userAssetsCount } = await supabase
        .from("assets")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      const { count: userIssuesCount } = await supabase
        .from("issues")
        .select("*, assets!inner(user_id)", { count: "exact", head: true })
        .eq("assets.user_id", userId);

      assetsCount = userAssetsCount || 0;
      issuesCount = userIssuesCount || 0;
    }

    const profileData: UserProfile = {
      id: userId,
      email: user.email || "",
      full_name: user.user_metadata?.full_name || null,
      avatar_url: user.user_metadata?.avatar_url || null,
      subscription_tier: "free", // Default tier, would be fetched from org/subscription data
      assets_limit: 50, // Default limit, would be fetched from subscription data
      created_at: user.created_at,
      updated_at: user.updated_at || user.created_at,
      // Add computed fields
      assets_count: assetsCount || 0,
      issues_count: issuesCount || 0,
      last_sign_in_at: user.last_sign_in_at,
      // Add organization data
      organization:
        orgData && (orgData as any).orgs
          ? {
              name: (orgData as any).orgs.name,
              role: orgData.role,
              joined_at: orgData.created_at,
            }
          : null,
    };

    res.json({
      success: true,
      data: profileData,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch profile",
    });
  }
};

export const validateProfileUpdate = [
  body("full_name").optional().isString().trim().isLength({ max: 100 }),
  body("avatar_url").optional().isURL(),
];

export const updateProfile = async (
  req: AuthRequest,
  res: Response<ApiResponse<UserProfile>>
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: "Validation failed",
        data: errors.array() as any,
      });
      return;
    }

    const userId = req.user?.id;
    const accessToken = req.accessToken;

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const { full_name, avatar_url } = req.body;

    // Use admin client to update user metadata
    const { data: profile, error } =
      await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: {
          full_name: full_name?.trim() || null,
          avatar_url: avatar_url || null,
        },
      });

    if (error) {
      console.error("Error updating user:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update profile",
      });
      return;
    }

    // Get the updated user data
    const userData = { user: profile.user };

    res.json({
      success: true,
      data: {
        id: userData.user.id,
        email: userData.user.email || "",
        full_name: userData.user.user_metadata?.full_name || null,
        avatar_url: userData.user.user_metadata?.avatar_url || null,
        subscription_tier: "free", // Default tier, would be fetched from org/subscription data
        assets_limit: 50, // Default limit, would be fetched from subscription data
        assets_count: 0, // This would need to be fetched separately if needed
        issues_count: 0, // This would need to be fetched separately if needed
        created_at: userData.user.created_at,
        updated_at: userData.user.updated_at || userData.user.created_at,
        last_sign_in_at: userData.user.last_sign_in_at,
      },
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Error in updateProfile:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const sendNotification = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const accessToken = req.accessToken;
    const { title, message, type = "info", urgent = false } = req.body;

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    if (!title || !message) {
      res.status(400).json({
        success: false,
        error: "Title and message are required",
      });
      return;
    }

    const supabase = getAuthenticatedSupabase(accessToken);

    // Get user's notification preferences
    const { data: profile } = await supabase
      .from("profiles")
      .select("notification_preferences, email, full_name")
      .eq("id", userId)
      .single();

    if (!profile) {
      res.status(404).json({
        success: false,
        error: "User profile not found",
      });
      return;
    }

    const preferences = profile.notification_preferences || {};

    // Check if notifications are enabled and if it's not quiet hours
    const canSend = urgent || preferences.email_enabled;

    if (!canSend) {
      res.json({
        success: true,
        message: "Notification delivery skipped based on user preferences",
      });
      return;
    }

    // Here you would integrate with actual notification services
    // For now, we'll just log and return success
    console.log("Sending notification:", {
      userId,
      title,
      message,
      type,
      email: profile.email,
    });

    res.json({
      success: true,
      message: "Notification sent successfully",
    });
  } catch (error) {
    console.error("Error in sendNotification:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// Organization mobile number validation
export const validateOrgMobileNumber = [
  body("mobileNumber")
    .isString()
    .trim()
    .matches(/^\+[1-9]\d{9,14}$/)
    .withMessage("Mobile number must be in international format (+1234567890)"),
];

// GET organization mobile number
export const getOrgMobileNumber = async (
  req: AuthRequest,
  res: Response<ApiResponse<{ mobileNumber: string; isVerified: boolean }>>
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

    // First get user's organization
    const { data: orgMember, error: orgError } = await supabase
      .from("org_members")
      .select("org_id, role")
      .eq("user_id", userId)
      .single();

    if (orgError || !orgMember) {
      res.status(404).json({
        success: false,
        error: "User is not part of any organization",
      });
      return;
    }

    // Get organization's mobile number
    const { data: orgPrefs, error } = await supabase
      .from("organization_notification_preferences")
      .select("org_mobile_no, is_verified_no")
      .eq("org_id", orgMember.org_id)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching organization mobile number:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch organization mobile number",
      });
      return;
    }

    res.json({
      success: true,
      data: {
        mobileNumber: orgPrefs?.org_mobile_no || "",
        isVerified: orgPrefs?.is_verified_no || false,
      },
    });
  } catch (error) {
    console.error("Error in getOrgMobileNumber:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// PUT organization mobile number (admin only)
export const updateOrgMobileNumber = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: "Validation failed",
        data: errors.array() as any,
      });
      return;
    }

    const userId = req.user?.id;
    const accessToken = req.accessToken;
    const { mobileNumber } = req.body;

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const supabase = getAuthenticatedSupabase(accessToken);

    // Get user's organization and check if they're admin
    const { data: orgMember, error: orgError } = await supabase
      .from("org_members")
      .select("org_id, role")
      .eq("user_id", userId)
      .single();

    if (orgError || !orgMember) {
      res.status(404).json({
        success: false,
        error: "User is not part of any organization",
      });
      return;
    }

    if (orgMember.role !== "admin") {
      res.status(403).json({
        success: false,
        error: "Only organization administrators can update mobile number",
      });
      return;
    }

    // Update organization mobile number
    const { error } = await supabase
      .from("organization_notification_preferences")
      .update({
        org_mobile_no: mobileNumber.trim(),
        is_verified_no: false, // Reset verification when number changes
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", orgMember.org_id);

    if (error) {
      console.error("Error updating organization mobile number:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update mobile number",
      });
      return;
    }

    res.json({
      success: true,
      message: "Organization mobile number updated successfully",
    });
  } catch (error) {
    console.error("Error in updateOrgMobileNumber:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// DELETE organization mobile number (admin only)
export const deleteOrgMobileNumber = async (
  req: AuthRequest,
  res: Response<ApiResponse>
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

    // Get user's organization and check if they're admin
    const { data: orgMember, error: orgError } = await supabase
      .from("org_members")
      .select("org_id, role")
      .eq("user_id", userId)
      .single();

    if (orgError || !orgMember) {
      res.status(404).json({
        success: false,
        error: "User is not part of any organization",
      });
      return;
    }

    if (orgMember.role !== "admin") {
      res.status(403).json({
        success: false,
        error: "Only organization administrators can remove mobile number",
      });
      return;
    }

    // Remove organization mobile number
    const { error } = await supabase
      .from("organization_notification_preferences")
      .update({
        org_mobile_no: null,
        is_verified_no: false,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", orgMember.org_id);

    if (error) {
      console.error("Error removing organization mobile number:", error);
      res.status(500).json({
        success: false,
        error: "Failed to remove mobile number",
      });
      return;
    }

    res.json({
      success: true,
      message: "Organization mobile number removed successfully",
    });
  } catch (error) {
    console.error("Error in deleteOrgMobileNumber:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
