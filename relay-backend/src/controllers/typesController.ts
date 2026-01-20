import { Response } from "express";
import { body, validationResult } from "express-validator";
import { AuthRequest } from "../middleware/auth";
import { getAuthenticatedSupabase } from "../utils/supabase";
import { AssetType, ApiResponse } from "../types";

// Validation rules for type creation/update
export const validateType = [
  body("name")
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Name is required and must be between 1-100 characters"),
  body("description").optional({ nullable: true }).isString().trim().isLength({ max: 500 }),
  body("category").optional({ nullable: true }).isString().trim().isLength({ max: 100 }),

  body("is_active").optional().isBoolean(),
  body("is_custom").optional().isBoolean(),
  body("isCustom").optional().isBoolean(), // Support both formats
];

// GET /api/asset-types - Get all active asset types for organization
export const getAllTypes = async (
  req: AuthRequest,
  res: Response<ApiResponse<{ assetTypes: AssetType[] }>>
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const accessToken = req.accessToken;
    const includeInactive = req.query.includeInactive === 'true';

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const supabase = getAuthenticatedSupabase(accessToken);

    // Get organization ID from org_members table
    const { data: orgMember, error: orgError } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", userId)
      .single();

    if (orgError || !orgMember?.org_id) {
      console.error("Error fetching user organization:", orgError);
      res.status(500).json({
        success: false,
        error: "Failed to get user organization",
      });
      return;
    }

    const orgId = orgMember.org_id;

    // Build query based on includeInactive parameter
    let query = supabase
      .from("asset_types")
      .select("*")
      .eq("org_id", orgId);

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data: types, error } = await query.order("name", { ascending: true });

    if (error) {
      console.error("Error fetching types:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch asset types",
      });
      return;
    }

    res.json({
      success: true,
      data: { assetTypes: types || [] },
    });
  } catch (error) {
    console.error("Error in getAllTypes:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// GET /api/asset-types/system - Get system asset types available for adoption
export const getSystemTypes = async (
  req: AuthRequest,
  res: Response<ApiResponse<{ systemTypes: AssetType[] }>>
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

    // Get organization ID from org_members table
    const { data: orgMember, error: orgError } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", userId)
      .single();

    if (orgError || !orgMember?.org_id) {
      console.error("Error fetching user organization:", orgError);
      res.status(500).json({
        success: false,
        error: "Failed to get user organization",
      });
      return;
    }

    const orgId = orgMember.org_id;

    // Get system types (is_custom = false) that are not already adopted by this organization
    const { data: systemTypes, error } = await supabase
      .from("asset_types")
      .select("*")
      .eq("is_active", true)
      .eq("is_custom", false)
      .is("org_id", null) // System types have no org_id initially
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching system types:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch system types",
      });
      return;
    }

    // Filter out types that are already adopted by this organization
    const { data: adoptedTypes, error: adoptedError } = await supabase
      .from("asset_types")
      .select("name")
      .eq("org_id", orgId)
      .eq("is_custom", false);

    if (adoptedError) {
      console.error("Error fetching adopted types:", adoptedError);
      res.status(500).json({
        success: false,
        error: "Failed to check adopted types",
      });
      return;
    }

    const adoptedNames = new Set(adoptedTypes?.map((t) => t.name) || []);
    const availableSystemTypes =
      systemTypes?.filter((type) => !adoptedNames.has(type.name)) || [];

    res.json({
      success: true,
      data: { systemTypes: availableSystemTypes },
    });
  } catch (error) {
    console.error("Error in getSystemTypes:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// POST /api/asset-types/adopt - Adopt a system asset type
export const adoptSystemType = async (
  req: AuthRequest,
  res: Response<ApiResponse<{ assetType: AssetType }>>
): Promise<void> => {
  try {
    const { assetTypeId } = req.body;
    const userId = req.user?.id;
    const accessToken = req.accessToken;

    if (!userId || !accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    if (!assetTypeId) {
      res.status(400).json({
        success: false,
        error: "Asset type ID is required",
      });
      return;
    }

    const supabase = getAuthenticatedSupabase(accessToken);

    // Get organization ID from org_members table
    const { data: orgMember, error: orgError } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", userId)
      .single();

    if (orgError || !orgMember?.org_id) {
      console.error("Error fetching user organization:", orgError);
      res.status(500).json({
        success: false,
        error: "Failed to get user organization",
      });
      return;
    }

    const orgId = orgMember.org_id;

    // Get the system type to adopt
    const { data: systemType, error: fetchError } = await supabase
      .from("asset_types")
      .select("*")
      .eq("id", assetTypeId)
      .eq("is_custom", false)
      .is("org_id", null)
      .single();

    if (fetchError || !systemType) {
      res.status(404).json({
        success: false,
        error: "System type not found or not available for adoption",
      });
      return;
    }

    // Check if already adopted
    const { data: existing, error: existingError } = await supabase
      .from("asset_types")
      .select("id")
      .eq("name", systemType.name)
      .eq("org_id", orgId)
      .eq("is_custom", false)
      .single();

    if (!existingError && existing) {
      res.status(400).json({
        success: false,
        error: "This asset type is already adopted by your organization",
      });
      return;
    }

    // Create a copy of the system type for the organization
    const { data: adoptedType, error: adoptError } = await supabase
      .from("asset_types")
      .insert([
        {
          name: systemType.name,
          description: systemType.description,
          category: systemType.category,
          is_active: true,
          is_custom: false,
          org_id: orgId,
          created_by: userId,
        },
      ])
      .select()
      .single();

    if (adoptError) {
      console.error("Error adopting type:", adoptError);
      res.status(500).json({
        success: false,
        error: "Failed to adopt asset type",
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: { assetType: adoptedType },
      message: "Asset type adopted successfully",
    });
  } catch (error) {
    console.error("Error in adoptSystemType:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// GET /api/asset-types/:id - Get specific asset type by ID
export const getTypeById = async (
  req: AuthRequest,
  res: Response<ApiResponse<AssetType>>
): Promise<void> => {
  try {
    const { id } = req.params;
    const accessToken = req.accessToken;

    if (!accessToken) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const supabase = getAuthenticatedSupabase(accessToken);

    const { data: type, error } = await supabase
      .from("asset_types")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching type:", error);
      res.status(404).json({
        success: false,
        error: "Type not found",
      });
      return;
    }

    res.json({
      success: true,
      data: type,
    });
  } catch (error) {
    console.error("Error in getTypeById:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// POST /api/asset-types - Create new asset type
export const createType = async (
  req: AuthRequest,
  res: Response<ApiResponse<{ assetType: AssetType }>>
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

    // Get organization ID from org_members table
    const { data: orgMember, error: orgError } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", userId)
      .single();

    if (orgError || !orgMember?.org_id) {
      console.error("Error fetching user organization:", orgError);
      res.status(500).json({
        success: false,
        error: "Failed to get user organization",
      });
      return;
    }

    const orgId = orgMember.org_id;
    const { name, description, category, is_active, is_custom, isCustom } =
      req.body;

    // Support both is_custom and isCustom formats
    const customFlag =
      is_custom !== undefined
        ? is_custom
        : isCustom !== undefined
        ? isCustom
        : true;

    const { data: type, error } = await supabase
      .from("asset_types")
      .insert([
        {
          name: name.trim(),
          description: description?.trim() || null,
          category: category?.trim() || null,
          is_active: is_active !== undefined ? is_active : true,
          is_custom: customFlag,
          org_id: orgId,
          created_by: userId,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating type:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create asset type",
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: { assetType: type },
      message: "Asset type created successfully",
    });
  } catch (error) {
    console.error("Error in createType:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// PUT /api/asset-types/:id - Update asset type
export const updateType = async (
  req: AuthRequest,
  res: Response<ApiResponse<AssetType>>
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
    const { name, description, category, is_active, is_custom } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined)
      updateData.description = description?.trim() || null;
    if (category !== undefined) updateData.category = category?.trim() || null;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (is_custom !== undefined) updateData.is_custom = is_custom;

    const { data: type, error } = await supabase
      .from("asset_types")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating type:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update type",
      });
      return;
    }

    res.json({
      success: true,
      data: type,
      message: "Type updated successfully",
    });
  } catch (error) {
    console.error("Error in updateType:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// DELETE /api/asset-types/:id - Delete asset type (soft delete by setting is_active to false)
export const deleteType = async (
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

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from("asset_types")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      console.error("Error deleting type:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete type",
      });
      return;
    }

    res.json({
      success: true,
      message: "Type deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteType:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
