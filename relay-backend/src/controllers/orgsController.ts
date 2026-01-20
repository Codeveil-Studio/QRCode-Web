import { Response } from "express";
import { body, validationResult } from "express-validator";
import { AuthRequest } from "../middleware/auth";
import { adminClient, getAuthenticatedSupabase } from "../utils/supabase";
import { StripeService } from "../utils/stripe";
import { PricingService } from "../utils/pricing";
import { ApiResponse } from "../types";

export interface OrgUsage {
  id: string;
  org_id: string;
  total_assets: number;
  pricing_tier: string;
  unit_price_pence: number;
  billing_interval: "month" | "year";
  subscription_id: string;
  subscription_item_id: string;
  last_updated: string;
  created_at: string;
}

export interface OrgUsageHistory {
  id: string;
  org_id: string;
  total_assets: number;
  pricing_tier: string;
  unit_price_pence: number;
  billing_interval: "month" | "year";
  subscription_id: string;
  subscription_item_id: string;
  change_type: string;
  changed_by: string;
  timestamp: string;
}

// Validation rules for asset update
export const validateAssetUpdate = [
  body("change")
    .isInt({ min: -1000, max: 1000 })
    .withMessage("Change must be between -1000 and 1000"),
];

// Get organization usage details
export const getOrgUsage = async (
  req: AuthRequest,
  res: Response<ApiResponse<any>>
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { orgId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    // Verify user has permission to view this organization
    const { data: orgMember, error: memberError } = await adminClient
      .from("org_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .single();

    if (memberError || !orgMember) {
      res.status(403).json({
        success: false,
        error: "Access denied: not a member of this organization",
      });
      return;
    }

    // Get usage data from org_usage table
    const { data: usage, error: usageError } = await adminClient
      .from("org_usage")
      .select("*")
      .eq("org_id", orgId)
      .single();

    if (usageError && usageError.code !== "PGRST116") {
      console.error("Error fetching usage:", usageError);
      res.status(500).json({
        success: false,
        error: "Failed to fetch usage data",
      });
      return;
    }

    if (!usage) {
      res.json({
        success: true,
        data: {
          hasUsage: false,
          usage: null,
          message: "No usage record found for this organization",
        },
        message: "Usage data retrieved",
      });
      return;
    }

    res.json({
      success: true,
      data: {
        hasUsage: true,
        usage: {
          id: usage.id,
          orgId: usage.org_id,
          totalAssets: usage.total_assets,
          pricingTier: usage.pricing_tier,
          unitPricePence: usage.unit_price_pence,
          billingInterval: usage.billing_interval,
          subscriptionId: usage.subscription_id,
          subscriptionItemId: usage.subscription_item_id,
          lastUpdated: usage.last_updated,
          createdAt: usage.created_at,
        },
      },
      message: "Usage data retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching org usage:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const updateAssetCount = async (
  req: AuthRequest,
  res: Response<
    ApiResponse<{ newTotal: number; tier: string; unitPrice: number }>
  >
): Promise<void> => {
  const supabase = adminClient; // Use admin client for org operations

  try {
    // Validate request
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
    const { orgId } = req.params;
    const { change } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    // Verify user has permission to modify this organization
    const { data: orgMember, error: memberError } = await supabase
      .from("org_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .single();

    if (memberError || !orgMember) {
      res.status(403).json({
        success: false,
        error: "Access denied: not a member of this organization",
      });
      return;
    }

    // Check if user has admin role (assuming admin/owner can modify assets)
    if (!["admin", "owner"].includes(orgMember.role)) {
      res.status(403).json({
        success: false,
        error: "Access denied: insufficient permissions",
      });
      return;
    }

    // Step 1: Fetch current org_usage
    const { data: currentUsage, error: usageError } = await supabase
      .from("org_usage")
      .select("*")
      .eq("org_id", orgId)
      .single();

    if (usageError || !currentUsage) {
      res.status(404).json({
        success: false,
        error: "Organization usage not found",
      });
      return;
    }

    // Step 2: Calculate new total assets
    const newTotalAssets = currentUsage.total_assets + change;

    if (newTotalAssets < 0) {
      res.status(400).json({
        success: false,
        error: "Cannot reduce assets below zero",
      });
      return;
    }

    // Step 3: Calculate new pricing tier and unit price
    const pricingCalculation = await PricingService.calculatePricingFromDB(
      newTotalAssets,
      currentUsage.billing_interval
    );

    if (!pricingCalculation && newTotalAssets >= 250) {
      res.status(400).json({
        success: false,
        error: "Custom pricing required for 250+ assets. Please contact sales.",
      });
      return;
    }

    if (!pricingCalculation) {
      res.status(400).json({
        success: false,
        error: "Unable to calculate pricing for asset count",
      });
      return;
    }

    const newTierName = pricingCalculation.tier.tier_name;
    const newUnitPrice = pricingCalculation.unitPricePence;

    // Step 4: Update Stripe subscription
    try {
      // Determine product type based on new total assets
      const productType = newTotalAssets >= 100 ? "over_100" : "under_100";

      await StripeService.updateSubscriptionWithInterval({
        subscriptionId: currentUsage.subscription_id,
        subscriptionItemId: currentUsage.subscription_item_id,
        quantity: newTotalAssets,
        unitAmountPence: newUnitPrice,
        interval: currentUsage.billing_interval,
        productType: productType,
      });
    } catch (stripeError) {
      console.error("Stripe update failed:", stripeError);
      res.status(500).json({
        success: false,
        error: "Failed to update subscription with payment provider",
      });
      return;
    }

    // Step 5: Update org_usage table
    const { error: updateError } = await supabase
      .from("org_usage")
      .update({
        total_assets: newTotalAssets,
        pricing_tier: newTierName,
        unit_price_pence: newUnitPrice,
        last_updated: new Date().toISOString(),
      })
      .eq("org_id", orgId);

    if (updateError) {
      console.error("Failed to update org_usage:", updateError);
      res.status(500).json({
        success: false,
        error: "Failed to update organization usage",
      });
      return;
    }

    // Step 6: Log change in org_usage_history
    const { error: historyError } = await supabase
      .from("org_usage_history")
      .insert({
        org_id: orgId,
        total_assets: newTotalAssets,
        pricing_tier: newTierName,
        unit_price_pence: newUnitPrice,
        billing_interval: currentUsage.billing_interval,
        subscription_id: currentUsage.subscription_id,
        subscription_item_id: currentUsage.subscription_item_id,
        change_type:
          change > 0 ? "increase" : change < 0 ? "decrease" : "no_change",
        changed_by: userId,
        timestamp: new Date().toISOString(),
      });

    if (historyError) {
      console.error("Failed to log usage history:", historyError);
      // Don't fail the request for history logging issues
    }

    // Step 7: Return success response
    res.json({
      success: true,
      data: {
        newTotal: newTotalAssets,
        tier: newTierName,
        unitPrice: newUnitPrice,
      },
      message: `Successfully updated asset count by ${change}. New total: ${newTotalAssets}`,
    });
  } catch (error) {
    console.error("Error in updateAssetCount:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const getOrgOfAuthenticatedUser = async (
  req: AuthRequest,
  res: Response<ApiResponse<any>>
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    // Get organization information
    const { data: orgData, error: orgError } = await getAuthenticatedSupabase(
      req.accessToken as string
    )
      .from("org_members")
      .select("org_id, orgs(name)")
      .eq("user_id", userId)
      .single();

    if (orgError || !orgData) {
      res.status(404).json({
        success: false,
        error: "User is not part of any organization",
      });
      return;
    }

    res.json({
      success: true,
      data: orgData,
      message: "Organization data retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching organization data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch organization data",
    });
  }
};
