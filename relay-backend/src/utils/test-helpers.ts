import { adminClient } from "./supabase";

export class TestHelpers {
  /**
   * Create a sample org_usage record for testing
   */
  static async createTestOrgUsage(
    orgId: string,
    data: {
      totalAssets?: number;
      pricingTier?: string;
      unitPricePence?: number;
      billingInterval?: "month" | "year";
      subscriptionId?: string;
      subscriptionItemId?: string;
    } = {}
  ) {
    const {
      totalAssets = 100,
      pricingTier = "Business",
      unitPricePence = 339,
      billingInterval = "month",
      subscriptionId = "sub_test_123",
      subscriptionItemId = "si_test_123",
    } = data;

    const { data: usage, error } = await adminClient
      .from("org_usage")
      .insert({
        org_id: orgId,
        total_assets: totalAssets,
        pricing_tier: pricingTier,
        unit_price_pence: unitPricePence,
        billing_interval: billingInterval,
        subscription_id: subscriptionId,
        subscription_item_id: subscriptionItemId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create test org usage: ${error.message}`);
    }

    return usage;
  }

  /**
   * Clean up test data
   */
  static async cleanupTestOrgUsage(orgId: string) {
    await adminClient.from("org_usage").delete().eq("org_id", orgId);

    await adminClient.from("org_usage_history").delete().eq("org_id", orgId);
  }

  /**
   * Get usage history for an organization
   */
  static async getUsageHistory(orgId: string) {
    const { data, error } = await adminClient
      .from("org_usage_history")
      .select("*")
      .eq("org_id", orgId)
      .order("timestamp", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch usage history: ${error.message}`);
    }

    return data;
  }

  /**
   * Verify pricing tier calculation
   */
  static async verifyPricingTier(
    assetCount: number,
    expectedTier: string,
    billingInterval: "month" | "year" = "month"
  ) {
    const { PricingService } = await import("./pricing");

    const calculation = await PricingService.calculatePricingFromDB(
      assetCount,
      billingInterval
    );

    if (!calculation) {
      throw new Error(`No pricing calculation found for ${assetCount} assets`);
    }

    if (calculation.tier.tier_name !== expectedTier) {
      throw new Error(
        `Expected tier ${expectedTier}, got ${calculation.tier.tier_name}`
      );
    }

    return calculation;
  }
}
