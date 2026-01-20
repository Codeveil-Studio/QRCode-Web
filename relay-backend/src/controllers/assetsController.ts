import { Response } from "express";
import { body, validationResult } from "express-validator";
import { AuthRequest } from "../middleware/auth";
import { getAuthenticatedSupabase } from "../utils/supabase";
import { Asset, ApiResponse } from "../types";

export const getAllAssets = async (
  req: AuthRequest,
  res: Response<ApiResponse<Asset[]>>
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
      // Fallback to user-level assets if no organization
      const { data: assets, error } = await supabase
        .from("assets")
        .select(
          `
          *,
          type:asset_types(
            id,
            name,
            description,
            category
          )
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching user assets:", error);
        res.status(500).json({
          success: false,
          error: "Failed to fetch assets",
        });
        return;
      }

      res.json({
        success: true,
        data: assets || [],
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
      res.status(500).json({
        success: false,
        error: "Failed to fetch organization users",
      });
      return;
    }

    const userIds = orgUsers?.map((user) => user.user_id) || [];

    if (userIds.length === 0) {
      res.json({
        success: true,
        data: [],
      });
      return;
    }

    // Get assets for all users in the organization
    const { data: assets, error } = await supabase
      .from("assets")
      .select(
        `
        *,
        type:asset_types(
          id,
          name,
          description,
          category
        )
      `
      )
      .in("user_id", userIds)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching organization assets:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch assets",
      });
      return;
    }

    res.json({
      success: true,
      data: assets || [],
    });
  } catch (error) {
    console.error("Error in getAllAssets:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const getAssetById = async (
  req: AuthRequest,
  res: Response<ApiResponse<Asset>>
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const accessToken = req.accessToken;
    const { id } = req.params;

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
      // Fallback to user-level access if no organization
      const { data: asset, error } = await supabase
        .from("assets")
        .select(
          `
          *,
          asset_types:type(
            id,
            name,
            description,
            category
          )
        `
        )
        .eq("id", id)
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("Error fetching user asset:", error);
        res.status(404).json({
          success: false,
          error: "Asset not found",
        });
        return;
      }

      res.json({
        success: true,
        data: asset,
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
      res.status(500).json({
        success: false,
        error: "Failed to fetch organization users",
      });
      return;
    }

    const userIds = orgUsers?.map((user) => user.user_id) || [];

    // Get asset if it belongs to any user in the organization
    const { data: asset, error } = await supabase
      .from("assets")
      .select(
        `
        *,
        asset_types:type(
          id,
          name,
          description,
          category
        )
      `
      )
      .eq("id", id)
      .in("user_id", userIds)
      .single();

    if (error) {
      console.error("Error fetching organization asset:", error);
      res.status(404).json({
        success: false,
        error: "Asset not found",
      });
      return;
    }

    res.json({
      success: true,
      data: asset,
    });
  } catch (error) {
    console.error("Error in getAssetById:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// Validation rules for creating/updating assets
export const validateAsset = [
  body("name")
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Name is required and must be between 1-100 characters"),
  body("location")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 200 }),
  body("type")
    .optional({ nullable: true })
    .isNumeric()
    .withMessage("Type must be a number"),
  body("tags").optional({ nullable: true }).isArray(),
  body("metadata").optional({ nullable: true }).isObject(),
  body("status")
    .optional({ nullable: true })
    .isIn(["active", "inactive", "maintenance"]),
];

export const createAsset = async (
  req: AuthRequest,
  res: Response<ApiResponse<Asset>>
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

    const supabase = getAuthenticatedSupabase(accessToken);
    const { name, location, type, tags, metadata, status } = req.body;

    // Get user's organization to check subscription limits
    const { data: orgMember, error: orgError } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", userId)
      .single();

    if (orgError || !orgMember?.org_id) {
      res.status(403).json({
        success: false,
        error: "User is not a member of any organization",
      });
      return;
    }

    const orgId = orgMember.org_id;

    // Check subscription and asset limits
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("id, current_asset_count, asset_limit, status")
      .eq("org_id", orgId)
      .eq("status", "active")
      .single();

    if (subError || !subscription) {
      res.status(403).json({
        success: false,
        error: "No active subscription found for organization",
      });
      return;
    }

    // Check if organization has reached asset limit
    if (subscription.current_asset_count >= subscription.asset_limit) {
      res.status(400).json({
        success: false,
        error: `Asset limit reached. Your organization is limited to ${subscription.asset_limit} assets. Please upgrade your subscription to add more assets.`,
      });
      return;
    }

    const { data: asset, error } = await supabase
      .from("assets")
      .insert([
        {
          user_id: userId,
          name: name.trim(),
          location: location?.trim() || null,
          type: type || null,
          tags: tags || null,
          metadata: metadata || null,
          status: status || "active",
        },
      ])
      .select(
        `
        *,
        asset_types:type(
          id,
          name,
          description,
          category
        )
      `
      )
      .single();

    if (error) {
      console.error("Error creating asset:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create asset",
      });
      return;
    }

    // Update subscription asset count
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        current_asset_count: subscription.current_asset_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id);

    if (updateError) {
      console.error("Error updating subscription count:", updateError);
      // Don't fail the asset creation, but log the error
    }

    res.status(201).json({
      success: true,
      data: asset,
      message: "Asset created successfully",
    });
  } catch (error) {
    console.error("Error in createAsset:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const updateAsset = async (
  req: AuthRequest,
  res: Response<ApiResponse<Asset>>
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
    const { id } = req.params;

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const supabase = getAuthenticatedSupabase(accessToken);
    const { name, location, type, tags, metadata, status } = req.body;

    const { data: asset, error } = await supabase
      .from("assets")
      .update({
        name: name.trim(),
        location: location?.trim() || null,
        type: type || null,
        tags: tags || null,
        metadata: metadata || null,
        status: status || "active",
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select(
        `
        *,
        asset_types:type(
          id,
          name,
          description,
          category
        )
      `
      )
      .single();

    if (error) {
      console.error("Error updating asset:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update asset",
      });
      return;
    }

    res.json({
      success: true,
      data: asset,
      message: "Asset updated successfully",
    });
  } catch (error) {
    console.error("Error in updateAsset:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const deleteAsset = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const accessToken = req.accessToken;
    const { id } = req.params;

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const supabase = getAuthenticatedSupabase(accessToken);

    // Get user's organization to update subscription
    const { data: orgMember, error: orgError } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", userId)
      .single();

    if (orgError || !orgMember?.org_id) {
      res.status(403).json({
        success: false,
        error: "User is not a member of any organization",
      });
      return;
    }

    const orgId = orgMember.org_id;

    // Get subscription to update asset count
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("id, current_asset_count")
      .eq("org_id", orgId)
      .eq("status", "active")
      .single();

    if (subError || !subscription) {
      res.status(403).json({
        success: false,
        error: "No active subscription found for organization",
      });
      return;
    }

    const { error } = await supabase
      .from("assets")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting asset:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete asset",
      });
      return;
    }

    // Update subscription asset count
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        current_asset_count: Math.max(0, subscription.current_asset_count - 1),
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id);

    if (updateError) {
      console.error("Error updating subscription count:", updateError);
      // Don't fail the asset deletion, but log the error
    }

    res.json({
      success: true,
      message: "Asset deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteAsset:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
