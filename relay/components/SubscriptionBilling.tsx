"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { subscriptionAPI, profileAPI, assetsAPI } from "@/utils/api";
import {
  Package,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Download,
  Clock,
  DollarSign,
  Plus,
  Minus,
  ArrowUp,
  Calculator,
  Info,
} from "lucide-react";

interface Invoice {
  id: string;
  invoice_number: string;
  amount_paid: number;
  amount_due: number;
  currency: string;
  status: string;
  billing_period_start: string;
  billing_period_end: string;
  created_at: string;
  due_date: string;
  hosted_invoice_url: string;
  invoice_pdf: string;
  usage_details?: Array<{
    description: string;
    quantity: number;
    unit_amount: number;
    amount: number;
  }>;
}

interface CurrentUsage {
  asset_count: number;
  billing_period_start: string;
  billing_period_end: string;
  estimated_amount: number;
  tier_breakdown: Array<{
    tier: number;
    range: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
  days_remaining: number;
  prorated_amount: number;
}

interface Subscription {
  id: string;
  status: string;
  current_asset_count: number;
  asset_limit: number;
  billing_cycle: "monthly" | "annual";
  current_period_start: string;
  current_period_end: string;
  next_billing_date: string;
  stripe_subscription_id?: string | null;
  stripe_customer_id?: string | null;
  effective_unit_price: number;
  total_monthly_cost: number;
}

interface PricingPreview {
  estimatedMonthlyTotal: number;
  tierBreakdown: Array<{
    tier: number;
    range: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  potentialSavings?: {
    nextTierAt: number;
    savingsPerMonth: number;
  };
}

interface BillingDetails {
  costDifference: number;
  chargeAmount: number;
  formattedChargeAmount: string;
  billingCycle: string;
  isUpgrade: boolean;
}

interface ProratingDetails {
  billingCycle: string;
  daysRemaining: number;
  proratedPercentage: number;
  proratedAmount: number;
  formattedProratedAmount: string;
}

export function SubscriptionBilling() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [currentUsage, setCurrentUsage] = useState<CurrentUsage | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  const [activeAssets, setActiveAssets] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Asset management state
  const [assetCountInput, setAssetCountInput] = useState<number>(0);
  const [pricingPreview, setPricingPreview] = useState<PricingPreview | null>(
    null
  );
  const [updatingAssets, setUpdatingAssets] = useState(false);
  const [showAssetManager, setShowAssetManager] = useState(false);
  const [billingDetails, setBillingDetails] = useState<BillingDetails | null>(
    null
  );
  const [proratingDetails, setProratingDetails] =
    useState<ProratingDetails | null>(null);

  useEffect(() => {
    loadData();
  }, [orgId]);

  useEffect(() => {
    if (subscription) {
      setAssetCountInput(subscription.current_asset_count);
    }
  }, [subscription]);

  // Update asset count input when activeAssets changes to ensure minimum is respected
  useEffect(() => {
    if (subscription && assetCountInput < activeAssets) {
      setAssetCountInput(
        Math.max(activeAssets, subscription.current_asset_count)
      );
    }
  }, [activeAssets, subscription, assetCountInput]);

  // Get pricing preview when asset count changes
  useEffect(() => {
    if (
      assetCountInput > 0 &&
      assetCountInput !== subscription?.current_asset_count
    ) {
      getPricingPreview(assetCountInput);
    } else {
      setPricingPreview(null);
    }
  }, [assetCountInput, subscription]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get active assets count - this automatically uses the user's organization
      const assetsResponse = await assetsAPI.getAll();
      if (assetsResponse.success) {
        setActiveAssets(assetsResponse.data.length);
      }

      const orgsResponse = await profileAPI.getOrg();
      if (orgsResponse.success) {
        setOrgId(orgsResponse.data.org_id);
      }

      // Try to load subscription details if we have an organization
      if (orgId) {
        try {
          const subResult = await subscriptionAPI.getOrganizationSubscription(
            orgId
          );
          if (subResult.success && subResult.data) {
            setSubscription(subResult.data.subscription);

            // Load invoice history
            const invoicesResult = await subscriptionAPI.getInvoiceHistory(
              orgId
            );
            if (invoicesResult.success) {
              setInvoices(invoicesResult.data);
            }

            // Load current usage and billing projection
            const usageResult = await subscriptionAPI.getCurrentUsage(orgId);
            if (usageResult.success) {
              setCurrentUsage(usageResult.data);
            }
          }
        } catch (error) {
          // No subscription found - this is fine
          console.log("No subscription found");
        }
      }
    } catch (error) {
      console.error("Error loading billing data:", error);
      toast.error("Failed to load billing information");
    } finally {
      setLoading(false);
    }
  };

  const getPricingPreview = async (assetCount: number) => {
    try {
      const result = await subscriptionAPI.getPricingPreview(assetCount);
      if (result.success) {
        setPricingPreview(result.data);
      }
    } catch (error) {
      console.error("Error getting pricing preview:", error);
    }
  };

  const handleUpdateAssetCount = async () => {
    if (!orgId || !subscription) {
      toast.error("No active subscription found");
      return;
    }

    // Validate asset count input
    if (
      isNaN(assetCountInput) ||
      !isFinite(assetCountInput) ||
      assetCountInput <= 0
    ) {
      toast.error("Please enter a valid asset count");
      return;
    }

    if (assetCountInput === subscription.current_asset_count) {
      toast.error("Asset count hasn't changed");
      return;
    }

    if (assetCountInput < activeAssets) {
      toast.error(
        `Cannot set asset count below your ${activeAssets} active assets`
      );
      return;
    }

    const isFreeSub = isFreeSubscription(subscription);

    // For free subscriptions, check asset limit
    if (isFreeSub && assetCountInput > subscription.asset_limit) {
      toast.error(
        `Free subscriptions are limited to ${subscription.asset_limit} assets. Please upgrade to add more assets.`,
        {
          duration: 6000,
          icon: "🔒",
        }
      );
      return;
    }

    console.log("🔍 Frontend: Sending asset count update:", {
      orgId,
      assetCountInput,
      currentAssetCount: subscription.current_asset_count,
      activeAssets,
      isFreeSubscription: isFreeSub,
    });

    setUpdatingAssets(true);
    try {
      let result;

      if (isFreeSub) {
        // For free subscriptions, use the regular usage update endpoint
        result = await subscriptionAPI.updateUsage(orgId, assetCountInput);
      } else {
        // For paid subscriptions, use the asset count update endpoint with billing
        result = await subscriptionAPI.updateSubscriptionAssetCount(
          orgId,
          assetCountInput
        );
      }

      if (result.success) {
        const isIncrease = assetCountInput > subscription.current_asset_count;

        if (isFreeSub) {
          // Simple success message for free subscriptions
          toast.success(
            `✅ Successfully ${
              isIncrease ? "increased" : "decreased"
            } your assets to ${assetCountInput}!`,
            { duration: 4000 }
          );
        } else {
          // Handle paid subscription success with proration details
          if (result.data.proration) {
            setProratingDetails(result.data.proration);
          }

          // Show success message with proration details
          if (result.data.proration && isIncrease) {
            toast.success(
              `✅ Successfully upgraded to ${assetCountInput} assets!\n💳 Charged ${result.data.proration.formattedProratedAmount} for remaining ${result.data.proration.daysRemaining} days.`,
              { duration: 6000 }
            );
          } else if (result.data.proration && !isIncrease) {
            toast.success(
              `✅ Successfully downgraded to ${assetCountInput} assets!\n💰 Credit of ${result.data.proration.formattedProratedAmount} applied to next bill.`,
              { duration: 6000 }
            );
          } else {
            toast.success(
              `Successfully ${
                isIncrease ? "increased" : "decreased"
              } asset count to ${assetCountInput}`
            );
          }
        }

        // Reload data to reflect changes
        await loadData();
        setShowAssetManager(false);
      } else {
        toast.error(result.error || "Failed to update asset count");
      }
    } catch (error) {
      console.error("Error updating asset count:", error);
      toast.error("Failed to update asset count");
    } finally {
      setUpdatingAssets(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number, currency: string = "gbp") => {
    // Handle NaN, null, undefined, and invalid numbers
    if (amount == null || isNaN(amount) || !isFinite(amount)) {
      console.warn("formatCurrency received invalid value:", amount);
      return "£0.00";
    }

    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  // Helper function to detect free subscription
  const isFreeSubscription = (sub: Subscription | null): boolean => {
    return sub ? !sub.stripe_subscription_id : false;
  };

  // Helper function to check if user can upgrade from free to paid
  const canUpgradeFromFree = (sub: Subscription | null): boolean => {
    return isFreeSubscription(sub);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "text-green-600 bg-green-100";
      case "open":
        return "text-orange-600 bg-orange-100";
      case "draft":
        return "text-gray-600 bg-gray-100";
      case "void":
      case "uncollectible":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="h-4 w-4" />;
      case "open":
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Billing Dashboard
          </h1>
          <p className="text-gray-600">
            View your billing history and manage your subscription
          </p>
        </div>
      </div>

      {!subscription ? (
        /* No Subscription Found */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <Package className="mx-auto h-16 w-16 text-blue-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No Subscription Found
            </h2>
            <p className="text-gray-600 mb-6">
              You currently have no subscription setup
            </p>

            <div className="bg-blue-50 rounded-lg p-6 max-w-sm mx-auto">
              <div className="text-3xl font-bold text-blue-900 mb-2">
                {activeAssets}
              </div>
              <div className="text-blue-700 font-medium">Active Assets</div>
              <div className="text-sm text-blue-600 mt-1">
                Currently being tracked
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Subscription Overview - Works for both Free and Paid */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  {isFreeSubscription(subscription) ? (
                    <>
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-3">
                        FREE
                      </span>
                      Free Subscription
                    </>
                  ) : (
                    <>
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-3">
                        PAID
                      </span>
                      Current Billing Period
                    </>
                  )}
                </h2>
                {isFreeSubscription(subscription) && (
                  <p className="text-sm text-gray-600 mt-1">
                    You have {subscription.asset_limit} free assets to use
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowAssetManager(!showAssetManager)}
                className="inline-flex items-center px-4 py-2 border border-blue-300 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowUp className="h-4 w-4 mr-2" />
                {isFreeSubscription(subscription)
                  ? "Manage Assets"
                  : "Add More Assets"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm font-medium text-blue-600">
                  Assets Used (Active)
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {activeAssets}
                </div>
                <div className="text-sm text-blue-600">Currently tracked</div>
              </div>

              <div className="bg-orange-50 rounded-lg p-4">
                <div className="text-sm font-medium text-orange-600">
                  {isFreeSubscription(subscription)
                    ? "Assets Available"
                    : "Assets Bought"}
                </div>
                <div className="text-2xl font-bold text-orange-900">
                  {isFreeSubscription(subscription)
                    ? subscription.asset_limit
                    : subscription.current_asset_count}
                </div>
                <div className="text-sm text-orange-600">
                  {isFreeSubscription(subscription)
                    ? "Free limit"
                    : "Subscription limit"}
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm font-medium text-green-600">
                  {isFreeSubscription(subscription) ? "Cost" : "Estimated Bill"}
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {isFreeSubscription(subscription)
                    ? "£0.00"
                    : currentUsage
                    ? formatCurrency(currentUsage.estimated_amount)
                    : formatCurrency(subscription.total_monthly_cost * 100)}
                </div>
                <div className="text-sm text-green-600">
                  {isFreeSubscription(subscription)
                    ? "Free forever"
                    : "For this period"}
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm font-medium text-purple-600">
                  {isFreeSubscription(subscription)
                    ? "Subscription Type"
                    : "Billing Cycle"}
                </div>
                <div className="text-2xl font-bold text-purple-900 capitalize">
                  {isFreeSubscription(subscription)
                    ? "Free"
                    : subscription.billing_cycle}
                </div>
                <div className="text-sm text-purple-600">
                  {isFreeSubscription(subscription)
                    ? "No billing required"
                    : subscription.next_billing_date
                    ? formatDate(subscription.next_billing_date)
                    : "N/A"}
                </div>
              </div>
            </div>
          </div>

          {/* Asset Manager */}
          {showAssetManager && (
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="flex items-center mb-4">
                <Calculator className="h-5 w-5 text-gray-600 mr-2" />
                <h3 className="font-medium text-gray-900">Asset Manager</h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Asset Count Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    New Asset Count
                  </label>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() =>
                        setAssetCountInput(
                          Math.max(activeAssets, assetCountInput - 1)
                        )
                      }
                      disabled={assetCountInput <= activeAssets}
                      className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      value={assetCountInput}
                      onChange={(e) =>
                        setAssetCountInput(
                          Math.max(activeAssets, parseInt(e.target.value) || 0)
                        )
                      }
                      min={activeAssets}
                      max={
                        isFreeSubscription(subscription)
                          ? subscription.asset_limit
                          : undefined
                      }
                      className="w-24 text-center border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => setAssetCountInput(assetCountInput + 1)}
                      disabled={
                        isFreeSubscription(subscription) &&
                        assetCountInput >= subscription.asset_limit
                      }
                      className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    Current subscription: {subscription.current_asset_count}{" "}
                    assets
                  </div>
                  <div className="mt-1 text-sm text-blue-600 flex items-center">
                    <Info className="h-4 w-4 mr-1" />
                    Minimum: {activeAssets} active assets (cannot go below)
                  </div>
                  {isFreeSubscription(subscription) && (
                    <div className="mt-1 text-sm text-green-600 flex items-center">
                      <Info className="h-4 w-4 mr-1" />
                      Free limit: {subscription.asset_limit} assets maximum
                    </div>
                  )}
                  {!isFreeSubscription(subscription) &&
                    subscription.current_asset_count > activeAssets && (
                      <div className="mt-1 text-sm text-green-600 flex items-center">
                        💰 You can save money by reducing to {activeAssets}{" "}
                        assets
                      </div>
                    )}
                </div>

                {/* Pricing Preview - Only for paid subscriptions */}
                <div>
                  {!isFreeSubscription(subscription) && pricingPreview && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Pricing Preview
                      </label>
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="text-lg font-semibold text-gray-900 mb-2">
                          {formatCurrency(pricingPreview.estimatedMonthlyTotal)}
                          <span className="text-sm font-normal text-gray-500 ml-1">
                            /{subscription.billing_cycle}
                          </span>
                        </div>

                        <div className="space-y-1 text-sm">
                          {pricingPreview.tierBreakdown.map((tier, index) => (
                            <div key={index} className="flex justify-between">
                              <span className="text-gray-600">
                                {tier.range}: {tier.quantity} ×{" "}
                                {formatCurrency(tier.unitPrice)}
                              </span>
                              <span className="font-medium">
                                {formatCurrency(tier.subtotal)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {pricingPreview.potentialSavings &&
                          !isNaN(
                            pricingPreview.potentialSavings.savingsPerMonth
                          ) &&
                          pricingPreview.potentialSavings.savingsPerMonth >
                            0 && (
                            <div className="mt-3 p-2 bg-green-50 rounded text-sm text-green-700">
                              💡 Add{" "}
                              {pricingPreview.potentialSavings.nextTierAt -
                                assetCountInput}{" "}
                              more assets to save{" "}
                              {formatCurrency(
                                pricingPreview.potentialSavings.savingsPerMonth
                              )}
                              /month
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {/* Free subscription preview */}
                  {isFreeSubscription(subscription) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Free Subscription
                      </label>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="text-lg font-semibold text-green-900 mb-2">
                          £0.00
                          <span className="text-sm font-normal text-green-600 ml-1">
                            /month
                          </span>
                        </div>
                        <div className="text-sm text-green-700">
                          You're using {assetCountInput} of{" "}
                          {subscription.asset_limit} free assets
                        </div>
                        {assetCountInput >= subscription.asset_limit && (
                          <div className="mt-3 p-2 bg-blue-50 rounded text-sm text-blue-700">
                            🚀 Want more assets? Contact us to upgrade to a paid
                            plan!
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowAssetManager(false);
                      setAssetCountInput(subscription.current_asset_count);
                      setPricingPreview(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateAssetCount}
                    disabled={
                      updatingAssets ||
                      assetCountInput === subscription.current_asset_count ||
                      assetCountInput < activeAssets ||
                      !pricingPreview
                    }
                    className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {updatingAssets ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        {assetCountInput > subscription.current_asset_count ? (
                          <>
                            <ArrowUp className="h-4 w-4 mr-2" />
                            Increase Subscription
                          </>
                        ) : (
                          <>
                            <Minus className="h-4 w-4 mr-2" />
                            Decrease Subscription
                          </>
                        )}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Proration Preview - Only for paid subscriptions */}
          {!isFreeSubscription(subscription) &&
            pricingPreview &&
            subscription &&
            assetCountInput !== subscription.current_asset_count &&
            currentUsage && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-amber-900 mb-2 flex items-center">
                  <Calculator className="h-4 w-4 mr-2" />
                  Proration Preview
                </h4>
                <div className="text-sm text-amber-800 space-y-1">
                  <div className="flex justify-between">
                    <span>Current period ends:</span>
                    <span className="font-medium">
                      {formatDate(subscription.current_period_end)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Days remaining:</span>
                    <span className="font-medium">
                      {currentUsage?.days_remaining || 0} days
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cost difference:</span>
                    <span className="font-medium">
                      {formatCurrency(
                        pricingPreview.estimatedMonthlyTotal -
                          (currentUsage?.estimated_amount || 0)
                      )}
                      /{subscription.billing_cycle}
                    </span>
                  </div>
                  <hr className="border-amber-300 my-2" />
                  <div className="flex justify-between items-center">
                    <span className="font-medium">
                      {assetCountInput > subscription.current_asset_count
                        ? "Immediate charge:"
                        : "Credit to next bill:"}
                    </span>
                    <span className="font-bold text-lg">
                      {(() => {
                        const costDiff =
                          pricingPreview.estimatedMonthlyTotal -
                          currentUsage.estimated_amount;
                        const totalDays =
                          subscription.billing_cycle === "annual" ? 365 : 30;
                        const proratedAmount = Math.round(
                          costDiff * (currentUsage.days_remaining / totalDays)
                        );

                        // Debug log
                        console.log("Frontend proration calc:", {
                          costDiff,
                          daysRemaining: currentUsage.days_remaining,
                          totalDays,
                          proratedAmount,
                        });

                        return formatCurrency(
                          isNaN(proratedAmount) ? 0 : proratedAmount
                        );
                      })()}
                    </span>
                  </div>
                  <div className="text-xs text-amber-600 mt-2">
                    {assetCountInput > subscription.current_asset_count
                      ? "💳 This amount will be charged immediately to your payment method"
                      : "💰 This credit will be applied to your next invoice"}
                  </div>
                </div>
              </div>
            )}

          {/* Tier Breakdown - Only for paid subscriptions */}
          {!isFreeSubscription(subscription) && currentUsage && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">
                Pricing Breakdown
              </h3>
              <div className="space-y-2">
                {currentUsage.tier_breakdown.map((tier, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center text-sm"
                  >
                    <span className="text-gray-600">
                      {tier.range}: {tier.quantity} assets ×{" "}
                      {formatCurrency(tier.unit_price)}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(tier.subtotal)}
                    </span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between items-center font-medium">
                  <span>Total Estimated</span>
                  <span>{formatCurrency(currentUsage.estimated_amount)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Recent Proration Details */}
          {proratingDetails && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calculator className="h-5 w-5 mr-2 text-blue-600" />
                Recent Subscription Change
              </h2>

              <div className="bg-blue-50 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-blue-600 font-medium">
                      Billing Cycle
                    </div>
                    <div className="text-blue-900 font-semibold capitalize">
                      {proratingDetails.billingCycle}
                    </div>
                  </div>

                  <div>
                    <div className="text-blue-600 font-medium">
                      Days Remaining
                    </div>
                    <div className="text-blue-900 font-semibold">
                      {proratingDetails.daysRemaining} days
                    </div>
                  </div>

                  <div>
                    <div className="text-blue-600 font-medium">Proration %</div>
                    <div className="text-blue-900 font-semibold">
                      {proratingDetails.proratedPercentage}%
                    </div>
                  </div>

                  <div>
                    <div className="text-blue-600 font-medium">
                      {proratingDetails.proratedAmount > 0
                        ? "Amount Charged"
                        : "Credit Applied"}
                    </div>
                    <div className="text-blue-900 font-semibold">
                      {proratingDetails.formattedProratedAmount}
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-sm text-blue-700 flex items-center">
                  <Info className="h-4 w-4 mr-2" />
                  {proratingDetails.proratedAmount > 0
                    ? `Charged immediately for the remaining ${proratingDetails.daysRemaining} days of your ${proratingDetails.billingCycle} billing period.`
                    : `Credit will be applied to your next ${proratingDetails.billingCycle} invoice.`}
                </div>
              </div>
            </div>
          )}

          {/* Invoice History */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Invoice History
              </h2>
              <button
                onClick={() =>
                  window.open(
                    `/api/subscriptions/org/${orgId}/invoices/export`,
                    "_blank"
                  )
                }
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>

            {invoices.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No invoices yet
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Your invoices will appear here once billing begins
                </p>
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Period
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {invoice.invoice_number}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatDate(invoice.created_at)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(invoice.billing_period_start)} -{" "}
                          {formatDate(invoice.billing_period_end)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(
                              invoice.amount_paid || invoice.amount_due,
                              invoice.currency
                            )}
                          </div>
                          {invoice.usage_details && (
                            <div className="text-sm text-gray-500">
                              {invoice.usage_details.reduce(
                                (sum, detail) => sum + detail.quantity,
                                0
                              )}{" "}
                              assets
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              invoice.status
                            )}`}
                          >
                            {getStatusIcon(invoice.status)}
                            {invoice.status.charAt(0).toUpperCase() +
                              invoice.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          {invoice.hosted_invoice_url && (
                            <a
                              href={invoice.hosted_invoice_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              View
                            </a>
                          )}
                          {invoice.invoice_pdf && (
                            <a
                              href={invoice.invoice_pdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-600 hover:text-gray-900 inline-flex items-center"
                            >
                              <Download className="h-4 w-4 mr-1" />
                              PDF
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
