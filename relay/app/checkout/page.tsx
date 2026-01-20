"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { subscriptionAPI, profileAPI } from "@/utils/api";
import { Check, CreditCard, Zap, ChevronRight, ArrowLeft } from "lucide-react";

interface PricingTier {
  tier: number;
  range: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

interface PricingPreview {
  assetCount: number;
  estimatedMonthlyTotal: number;
  formattedTotal: string;
  tierBreakdown: PricingTier[];
  potentialSavings?: {
    nextTierAt: number;
    savingsAmount: number;
    message: string;
  };
}

export default function CheckoutPage() {
  const router = useRouter();
  const [assetCount, setAssetCount] = useState(25);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    "monthly"
  );
  const [pricing, setPricing] = useState<PricingPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  // Load organization info
  useEffect(() => {
    const loadOrg = async () => {
      try {
        const result = await profileAPI.getOrg();
        if (result.success && result.data?.org_id) {
          setOrgId(result.data.org_id);
        }
      } catch (error) {
        console.error("Failed to load organization:", error);
      }
    };
    loadOrg();
  }, []);

  // Load pricing preview when asset count changes
  useEffect(() => {
    const loadPricing = async () => {
      setLoading(true);
      try {
        const result = await subscriptionAPI.getPricingPreview(assetCount);
        if (result.success) {
          setPricing(result.data);
        }
      } catch (error) {
        console.error("Failed to load pricing:", error);
        toast.error("Failed to load pricing");
      } finally {
        setLoading(false);
      }
    };

    if (assetCount > 0) {
      loadPricing();
    }
  }, [assetCount]);

  const handleAssetCountChange = (value: string) => {
    const count = parseInt(value) || 0;
    if (count >= 1 && count <= 10000) {
      setAssetCount(count);
    }
  };

  const handleCheckout = async () => {
    if (!orgId) {
      toast.error("Organization not found. Please refresh and try again.");
      return;
    }

    setLoadingCheckout(true);
    try {
      const result = await subscriptionAPI.createCheckoutSession({
        assetCount,
        billingCycle,
        orgId,
      });

      if (result.success && result.data?.url) {
        // Redirect to Stripe checkout
        window.location.href = result.data.url;
      } else {
        toast.error(result.error || "Failed to create checkout session");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to start checkout");
    } finally {
      setLoadingCheckout(false);
    }
  };

  const formatPrice = (pence: number) => `£${(pence / 100).toFixed(2)}`;

  const annualDiscount = pricing
    ? Math.round(pricing.estimatedMonthlyTotal * 12 * 0.2)
    : 0;
  const annualTotal = pricing
    ? pricing.estimatedMonthlyTotal * 12 - annualDiscount
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Choose Your Plan</h1>
          <p className="text-gray-600 mt-2">
            Select the number of assets you plan to manage. You can adjust this
            anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuration Panel */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-6">
              Configure Your Subscription
            </h2>

            {/* Asset Count Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Assets to Manage
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={assetCount}
                  onChange={(e) => handleAssetCountChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-medium text-center"
                  placeholder="25"
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Choose based on your current or expected asset count. You can
                change this later.
              </p>
            </div>

            {/* Quick Selection Buttons */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Quick Select:
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[25, 50, 100, 250].map((count) => (
                  <button
                    key={count}
                    onClick={() => setAssetCount(count)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      assetCount === count
                        ? "bg-blue-100 text-blue-700 border-blue-200"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {/* Billing Cycle Toggle */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Billing Cycle
              </label>
              <div className="bg-gray-100 p-1 rounded-lg flex">
                <button
                  onClick={() => setBillingCycle("monthly")}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    billingCycle === "monthly"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle("annual")}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors relative ${
                    billingCycle === "annual"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Annual
                  <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    Save 20%
                  </span>
                </button>
              </div>
            </div>

            {/* Pricing Tiers Breakdown */}
            {pricing && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Pricing Breakdown
                </h3>
                <div className="space-y-2">
                  {pricing.tierBreakdown.map((tier, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        Assets {tier.range}: {tier.quantity} ×{" "}
                        {formatPrice(tier.unitPrice)}
                      </span>
                      <span className="font-medium">
                        {formatPrice(tier.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Potential Savings */}
            {pricing?.potentialSavings && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Savings Opportunity
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      {pricing.potentialSavings.message}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Summary Panel */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-6">Order Summary</h2>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : pricing ? (
              <>
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{assetCount} assets</span>
                    <span className="font-medium">
                      {billingCycle === "monthly"
                        ? `${pricing.formattedTotal}/month`
                        : `${formatPrice(annualTotal)}/year`}
                    </span>
                  </div>

                  {billingCycle === "annual" && (
                    <>
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Monthly equivalent</span>
                        <span>{pricing.formattedTotal}/month</span>
                      </div>
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Annual discount (20%)</span>
                        <span>-{formatPrice(annualDiscount)}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="border-t pt-4 mb-6">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>
                      {billingCycle === "monthly"
                        ? `${pricing.formattedTotal}/month`
                        : `${formatPrice(annualTotal)}/year`}
                    </span>
                  </div>
                </div>

                {/* Features List */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    What's included:
                  </h3>
                  <ul className="space-y-2">
                    {[
                      "Unlimited asset tracking",
                      "Real-time notifications",
                      "Advanced reporting",
                      "Support",
                    ].map((feature, index) => (
                      <li
                        key={index}
                        className="flex items-center text-sm text-gray-600"
                      >
                        <Check className="h-4 w-4 text-green-500 mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Checkout Button */}
                <button
                  onClick={handleCheckout}
                  disabled={loadingCheckout}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loadingCheckout ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5" />
                      <span>Continue to Checkout</span>
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-500 text-center mt-3">
                  Secure payment processed by Stripe. Cancel anytime.
                </p>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Enter asset count to see pricing
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
