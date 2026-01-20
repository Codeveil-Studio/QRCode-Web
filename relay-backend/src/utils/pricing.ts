import { adminClient } from "./supabase";

export interface PricingTier {
  id: string;
  tier_name: string;
  min_assets: number;
  max_assets: number | null;
  price_month_pence: number;
  price_year_pence: number;
  is_active: boolean;
}

export interface PricingCalculation {
  tier: PricingTier;
  unitPricePence: number;
  totalPricePence: number;
}

export class PricingService {
  // Default pricing tiers based on the frontend component
  static defaultTiers: PricingTier[] = [
    {
      id: "tier-1",
      tier_name: "Starter",
      min_assets: 1,
      max_assets: 9,
      price_month_pence: 499, // £4.99
      price_year_pence: 4990, // £49.90
      is_active: true,
    },
    {
      id: "tier-2",
      tier_name: "Value",
      min_assets: 10,
      max_assets: 49,
      price_month_pence: 459, // £4.59
      price_year_pence: 4590, // £45.90
      is_active: true,
    },
    {
      id: "tier-3",
      tier_name: "Popular",
      min_assets: 50,
      max_assets: 99,
      price_month_pence: 379, // £3.79
      price_year_pence: 3790, // £37.90
      is_active: true,
    },
    {
      id: "tier-4",
      tier_name: "Business",
      min_assets: 100,
      max_assets: 249,
      price_month_pence: 339, // £3.39
      price_year_pence: 3390, // £33.90
      is_active: true,
    },
  ];

  // Fetch pricing tiers from database
  static async fetchPricingTiers(): Promise<PricingTier[]> {
    try {
      const { data: tiers, error } = await adminClient
        .from("pricing_tiers")
        .select("*")
        .eq("is_active", true)
        .order("min_assets", { ascending: true });

      if (error) {
        console.error("Error fetching pricing tiers:", error);
        return this.defaultTiers;
      }

      return tiers || this.defaultTiers;
    } catch (error) {
      console.error("Error fetching pricing tiers:", error);
      return this.defaultTiers;
    }
  }

  static findTierForAssetCount(
    assetCount: number,
    tiers: PricingTier[] = this.defaultTiers
  ): PricingTier | null {
    return (
      tiers.find(
        (tier) =>
          tier.is_active &&
          assetCount >= tier.min_assets &&
          (tier.max_assets === null || assetCount <= tier.max_assets)
      ) || null
    );
  }

  static calculatePricing(
    assetCount: number,
    billingInterval: "month" | "year",
    tiers: PricingTier[] = this.defaultTiers
  ): PricingCalculation | null {
    const tier = this.findTierForAssetCount(assetCount, tiers);

    if (!tier) {
      return null; // Custom pricing for 250+ assets
    }

    const isMonthly = billingInterval === "month";
    const basePricePence = isMonthly
      ? tier.price_month_pence
      : tier.price_year_pence;

    // Calculate unit price per asset
    const unitPricePence = basePricePence;

    // Calculate total price (unit price * quantity)
    const totalPricePence = unitPricePence * assetCount;

    return {
      tier,
      unitPricePence,
      totalPricePence,
    };
  }

  // Async version that fetches tiers from database
  static async calculatePricingFromDB(
    assetCount: number,
    billingInterval: "month" | "year"
  ): Promise<PricingCalculation | null> {
    const tiers = await this.fetchPricingTiers();
    return this.calculatePricing(assetCount, billingInterval, tiers);
  }

  static getUnitPrice(
    assetCount: number,
    billingInterval: "month" | "year",
    tiers: PricingTier[] = this.defaultTiers
  ): number | null {
    const calculation = this.calculatePricing(
      assetCount,
      billingInterval,
      tiers
    );
    return calculation?.unitPricePence || null;
  }

  static getTierName(
    assetCount: number,
    tiers: PricingTier[] = this.defaultTiers
  ): string {
    const tier = this.findTierForAssetCount(assetCount, tiers);
    return tier?.tier_name || "Custom";
  }

  // Async versions that use database tiers
  static async getUnitPriceFromDB(
    assetCount: number,
    billingInterval: "month" | "year"
  ): Promise<number | null> {
    const calculation = await this.calculatePricingFromDB(
      assetCount,
      billingInterval
    );
    return calculation?.unitPricePence || null;
  }

  static async getTierNameFromDB(assetCount: number): Promise<string> {
    const tiers = await this.fetchPricingTiers();
    return this.getTierName(assetCount, tiers);
  }
}
