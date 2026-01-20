import React, { useState, useEffect } from "react";

interface PricingTier {
  upTo: number;
  unitAmount: number;
  description: string;
}

interface PricingPreview {
  assetCount: number;
  estimatedMonthlyTotal: number;
  formattedTotal: string;
  tierBreakdown: Array<{
    tier: number;
    range: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
  }>;
  potentialSavings?: {
    nextTierAt: number;
    savingsAmount: number;
    message: string;
  };
}

// Volume pricing tiers matching backend
const VOLUME_PRICING_TIERS: PricingTier[] = [
  { upTo: 25, unitAmount: 499, description: "Small teams" },
  { upTo: 50, unitAmount: 449, description: "Growing teams" },
  { upTo: 100, unitAmount: 399, description: "Medium teams" },
  { upTo: Infinity, unitAmount: 349, description: "Large teams" },
];

const VolumePricingCalculator: React.FC = () => {
  const [assetCount, setAssetCount] = useState<number>(10);
  const [pricing, setPricing] = useState<PricingPreview | null>(null);

  // Calculate pricing preview (mimics backend logic)
  const calculatePricing = (count: number): PricingPreview => {
    const currentTier = VOLUME_PRICING_TIERS.find((tier) => count <= tier.upTo);

    if (!currentTier) {
      throw new Error("Invalid asset count");
    }

    const totalCost = count * currentTier.unitAmount;
    const currentTierIndex = VOLUME_PRICING_TIERS.findIndex(
      (tier) => count <= tier.upTo
    );

    const tierBreakdown = [
      {
        tier: currentTierIndex + 1,
        range:
          currentTierIndex === 0
            ? `1-${currentTier.upTo}`
            : currentTier.upTo === Infinity
            ? `${VOLUME_PRICING_TIERS[currentTierIndex - 1].upTo + 1}+`
            : `${VOLUME_PRICING_TIERS[currentTierIndex - 1].upTo + 1}-${
                currentTier.upTo
              }`,
        unitPrice: currentTier.unitAmount,
        quantity: count,
        subtotal: totalCost,
      },
    ];

    let potentialSavings;
    if (currentTierIndex < VOLUME_PRICING_TIERS.length - 1) {
      const nextTier = VOLUME_PRICING_TIERS[currentTierIndex + 1];
      const nextTierAt = currentTier.upTo + 1;
      const currentUnitPrice = currentTier.unitAmount;
      const nextUnitPrice = nextTier.unitAmount;
      const savingsPerAsset = currentUnitPrice - nextUnitPrice;

      if (savingsPerAsset > 0) {
        const totalSavingsAtNextTier = savingsPerAsset * nextTierAt;
        potentialSavings = {
          nextTierAt,
          savingsAmount: totalSavingsAtNextTier,
          message: `Reach ${nextTierAt} assets to save £${(
            totalSavingsAtNextTier / 100
          ).toFixed(2)} total (£${(savingsPerAsset / 100).toFixed(
            2
          )} per asset)`,
        };
      }
    }

    return {
      assetCount: count,
      estimatedMonthlyTotal: totalCost,
      formattedTotal: `£${(totalCost / 100).toFixed(2)}`,
      tierBreakdown,
      potentialSavings,
    };
  };

  useEffect(() => {
    setPricing(calculatePricing(assetCount));
  }, [assetCount]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Volume Pricing Calculator
        </h2>

        {/* Pricing Tiers Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {VOLUME_PRICING_TIERS.map((tier, index) => (
            <div
              key={index}
              className={`border rounded-lg p-4 text-center ${
                pricing &&
                index ===
                  VOLUME_PRICING_TIERS.findIndex((t) => assetCount <= t.upTo)
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200"
              }`}
            >
              <h3 className="font-semibold text-gray-900">
                {tier.description}
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                {index === 0
                  ? `1-${tier.upTo} assets`
                  : tier.upTo === Infinity
                  ? `${VOLUME_PRICING_TIERS[index - 1].upTo + 1}+ assets`
                  : `${VOLUME_PRICING_TIERS[index - 1].upTo + 1}-${
                      tier.upTo
                    } assets`}
              </p>
              <p className="text-lg font-bold text-blue-600">
                £{(tier.unitAmount / 100).toFixed(2)}/asset
              </p>
            </div>
          ))}
        </div>

        {/* Asset Count Input */}
        <div className="mb-6">
          <label
            htmlFor="assetCount"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Number of Assets
          </label>
          <input
            type="number"
            id="assetCount"
            min="1"
            max="1000"
            value={assetCount}
            onChange={(e) => setAssetCount(parseInt(e.target.value) || 1)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Pricing Breakdown */}
        {pricing && (
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Pricing Breakdown
            </h3>

            <div className="space-y-4">
              {pricing.tierBreakdown.map((breakdown, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center py-2 border-b border-gray-200"
                >
                  <div>
                    <span className="font-medium">Tier {breakdown.tier}</span>
                    <span className="text-gray-600 ml-2">
                      ({breakdown.range})
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {breakdown.quantity} × £
                      {(breakdown.unitPrice / 100).toFixed(2)}
                    </div>
                    <div className="text-lg font-bold text-blue-600">
                      £{(breakdown.subtotal / 100).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-between items-center py-4 text-xl font-bold border-t-2 border-gray-300">
                <span>Total Monthly Cost:</span>
                <span className="text-blue-600">{pricing.formattedTotal}</span>
              </div>
            </div>

            {/* Potential Savings */}
            {pricing.potentialSavings && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-green-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-green-800">
                      Potential Savings
                    </h4>
                    <p className="text-sm text-green-700">
                      {pricing.potentialSavings.message}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Volume Pricing Explanation */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">
            How Volume Pricing Works
          </h4>
          <p className="text-sm text-blue-800">
            With volume pricing, <strong>all</strong> your assets are charged at
            the rate of the tier you reach. For example, if you have 60 assets,
            all 60 are charged at £3.99 each (the 51-100 tier rate), not a mix
            of different tier rates.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VolumePricingCalculator;
