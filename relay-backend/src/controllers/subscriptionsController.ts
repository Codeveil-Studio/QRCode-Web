import { Response } from "express";
import { body, param, validationResult } from "express-validator";
import Stripe from "stripe";
import {
  supabase,
  createAuthenticatedClient,
  getAuthenticatedSupabase,
} from "../utils/supabase";
import { AuthRequest } from "../middleware/auth";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Types
interface Subscription {
  id: string;
  org_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  subscription_item_id: string;
  current_asset_count: number;
  billing_cycle: "monthly" | "annual";
  status: string;
  current_period_start: string;
  current_period_end: string;
  last_usage_reported_at?: string;
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
    savingsPerMonth: number;
    message: string;
  };
}

// Stripe Price IDs (set these from your Stripe dashboard)
const STRIPE_PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_ID_MONTHLY!, // Your volume pricing monthly price ID
  annual: process.env.STRIPE_PRICE_ID_ANNUAL!, // Your volume pricing annual price ID
};

// Volume pricing tiers (matches your Stripe configuration)
// All units are charged at the rate of the tier they fall into
const VOLUME_PRICING_TIERS = [
  { upTo: 25, unitAmount: 499 },
  { upTo: 50, unitAmount: 482 },
  { upTo: 100, unitAmount: 475 },
  { upTo: Infinity, unitAmount: 470 },
];

// Utility functions
const calculatePricingPreview = (assetCount: number): PricingPreview => {
  // Find which tier this asset count falls into
  const currentTier = VOLUME_PRICING_TIERS.find(
    (tier) => assetCount <= tier.upTo
  );

  if (!currentTier) {
    throw new Error("Invalid asset count");
  }

  // In volume pricing, ALL assets are charged at the tier rate
  const totalCost = assetCount * currentTier.unitAmount;

  // Find current tier index for display
  const currentTierIndex = VOLUME_PRICING_TIERS.findIndex(
    (tier) => assetCount <= tier.upTo
  );

  // Create tier breakdown showing the applied tier
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
      quantity: assetCount,
      subtotal: totalCost,
    },
  ];

  // Calculate potential savings (moving to next tier)
  let potentialSavings;
  if (currentTierIndex < VOLUME_PRICING_TIERS.length - 1) {
    const nextTier = VOLUME_PRICING_TIERS[currentTierIndex + 1];
    const nextTierAt = currentTier.upTo + 1;
    const currentUnitPrice = currentTier.unitAmount;
    const nextUnitPrice = nextTier.unitAmount;
    const savingsPerAsset = currentUnitPrice - nextUnitPrice;

    if (savingsPerAsset > 0 && nextTierAt > assetCount) {
      // Calculate monthly savings if user moves to next tier
      const totalSavingsAtNextTier = savingsPerAsset * nextTierAt;
      potentialSavings = {
        nextTierAt,
        savingsPerMonth: totalSavingsAtNextTier, // This matches the frontend interface
        message: `Reach ${nextTierAt} assets to save £${(
          totalSavingsAtNextTier / 100
        ).toFixed(2)} total (£${(savingsPerAsset / 100).toFixed(2)} per asset)`,
      };
    }
  }

  return {
    assetCount,
    estimatedMonthlyTotal: totalCost,
    formattedTotal: `£${(totalCost / 100).toFixed(2)}`,
    tierBreakdown,
    potentialSavings,
  };
};

const formatPrice = (priceInPence: number): string => {
  return `£${(priceInPence / 100).toFixed(2)}`;
};

// Calculate the appropriate price tier for the asset count
const calculateVolumeTier = (assetCount: number) => {
  const tier = VOLUME_PRICING_TIERS.find((t) => assetCount <= t.upTo);
  if (!tier) throw new Error("Invalid asset count");

  const tierIndex = VOLUME_PRICING_TIERS.findIndex((t) => assetCount <= t.upTo);
  return {
    tier: tierIndex + 1,
    unitPrice: tier.unitAmount,
    totalPrice: assetCount * tier.unitAmount,
  };
};

// No longer need timestamp conversion for simplified volume pricing model

// Validation middlewares
export const validatePricingCalculation = [
  body("assetCount")
    .isInt({ min: 1 })
    .withMessage("Asset count must be a positive integer"),
];

export const validateCheckoutRequest = [
  body("assetCount")
    .isInt({ min: 1 })
    .withMessage("Asset count must be a positive integer"),
  body("billingCycle")
    .isIn(["monthly", "annual"])
    .withMessage("Billing cycle must be monthly or annual"),
  body("orgId").isUUID().withMessage("Organization ID must be a valid UUID"),
];

export const validateUsageUpdate = [
  body("assetCount")
    .isInt({ min: 0 })
    .withMessage("Asset count must be a non-negative integer"),
];

export const validateOrgId = [
  param("orgId").isUUID().withMessage("Organization ID must be a valid UUID"),
];

// Validation for the new endpoint
export const validateAssetCountUpdate = [
  body("assetCount")
    .isInt({ min: 1 })
    .withMessage("Asset count must be a positive integer"),
];

// GET /api/subscriptions/pricing-preview - Get pricing preview with tier breakdown
export const getPricingPreview = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: "Validation error",
        details: errors.array(),
      });
      return;
    }

    const { assetCount } = req.body;
    const pricing = calculatePricingPreview(assetCount);

    res.json({
      success: true,
      data: pricing,
    });
  } catch (error) {
    console.error("Error in getPricingPreview:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// POST /api/subscriptions/create-checkout - Create Stripe checkout session
export const createCheckoutSession = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: "Validation error",
        details: errors.array(),
      });
      return;
    }

    const { assetCount, billingCycle, orgId } = req.body;
    const userId = req.user?.id;
    const accessToken = req.accessToken;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }
    const supabase = getAuthenticatedSupabase(accessToken!);
    // Check if org exists and user has access
    const { data: orgMember, error: orgError } = await supabase
      .from("org_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .single();

    if (orgError || !orgMember) {
      res.status(403).json({
        success: false,
        error: "Access denied to organization",
      });
      return;
    }

    // Check if org exists
    const { data: org, error: orgFetchError } = await supabase
      .from("orgs")
      .select("name")
      .eq("id", orgId)
      .single();

    if (orgFetchError || !org) {
      res.status(404).json({
        success: false,
        error: "Organization not found",
      });
      return;
    }

    // Check if there's already a subscription (and thus a Stripe customer) for this org
    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("org_id", orgId)
      .single();

    let customerId = existingSubscription?.stripe_customer_id;

    if (!customerId) {
      // Create new Stripe customer since this org doesn't have one yet
      const customer = await stripe.customers.create({
        name: org.name,
        metadata: {
          org_id: orgId,
          user_id: userId,
        },
      });

      customerId = customer.id;
      // Note: The stripe_customer_id will be stored in the subscriptions table
      // when the subscription is created via the webhook
    }

    // Create checkout session with metered billing
    const priceId =
      billingCycle === "annual"
        ? STRIPE_PRICE_IDS.annual
        : STRIPE_PRICE_IDS.monthly;

    if (!priceId) {
      console.error("Price ID is undefined for billing cycle:", billingCycle);
      res.status(500).json({
        success: false,
        error: "Price configuration error. Please check environment variables.",
      });
      return;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: assetCount, // Customer pays for the exact number of assets they want
        },
      ],
      mode: "subscription",
      allow_promotion_codes: true,
      metadata: {
        org_id: orgId,
        user_id: userId,
        initial_asset_count: assetCount.toString(),
        billing_cycle: billingCycle,
      },
      success_url: `${process.env.FRONTEND_URL}/profile?subscription=success`,
      cancel_url: `${process.env.FRONTEND_URL}/profile?subscription=cancelled`,
      subscription_data: {
        metadata: {
          org_id: orgId,
          user_id: userId,
          initial_asset_count: assetCount.toString(),
        },
      },
    });

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
      },
    });
  } catch (error) {
    console.error("Error in createCheckoutSession:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create checkout session",
    });
  }
};

// POST /api/subscriptions/verify-checkout - Verify Stripe checkout session
export const verifyCheckoutSession = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { sessionId } = req.body;
    const accessToken = req.accessToken;

    if (!sessionId) {
      res.status(400).json({
        success: false,
        error: "Session ID is required",
      });
      return;
    }

    const authenticatedSupabase = getAuthenticatedSupabase(accessToken!);

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      res.status(404).json({
        success: false,
        error: "Checkout session not found",
      });
      return;
    }

    if (session.payment_status !== "paid") {
      res.status(400).json({
        success: false,
        error: "Payment not completed",
      });
      return;
    }

    // Check if subscription was created in our database
    const { data: subscription, error: subscriptionError } = await authenticatedSupabase
      .from("subscriptions")
      .select("id, org_id, status")
      .eq("stripe_subscription_id", session.subscription as string)
      .single();

    if (subscriptionError || !subscription) {
      res.status(500).json({
        success: false,
        error: "Subscription not found in database",
      });
      return;
    }

    res.json({
      success: true,
      data: {
        subscriptionId: subscription.id,
        orgId: subscription.org_id,
        status: subscription.status,
      },
    });
  } catch (error) {
    console.error("Error verifying checkout session:", error);
    res.status(500).json({
      success: false,
      error: "Failed to verify checkout session",
    });
  }
};

// POST /api/subscriptions/update-usage - Update asset count and report to Stripe
export const updateUsage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: "Validation error",
        details: errors.array(),
      });
      return;
    }

    const { orgId } = req.params;
    const { assetCount } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const accessToken = req.accessToken;
    const authenticatedSupabase = getAuthenticatedSupabase(accessToken!);

    // Check if user has access to organization
    const { data: orgMember, error: orgError } = await authenticatedSupabase
      .from("org_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .single();

    if (orgError || !orgMember) {
      res.status(403).json({
        success: false,
        error: "Access denied to organization",
      });
      return;
    }

    // Get subscription
    const { data: subscription, error: subError } = await authenticatedSupabase
      .from("subscriptions")
      .select("*")
      .eq("org_id", orgId)
      .eq("status", "active")
      .single();

    if (subError || !subscription) {
      res.status(404).json({
        success: false,
        error: "No active subscription found",
      });
      return;
    }

    // Check if this is a free subscription or paid subscription
    const isFreeSubscription = !subscription.stripe_subscription_id;

    // For free subscriptions, check asset limit
    if (isFreeSubscription && assetCount > subscription.asset_limit) {
      res.status(400).json({
        success: false,
        error: `Asset limit exceeded. Free subscriptions are limited to ${subscription.asset_limit} assets. Please upgrade to add more assets.`,
      });
      return;
    }

    // Update local record with new asset count
    await authenticatedSupabase
      .from("subscriptions")
      .update({
        current_asset_count: assetCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id);

    // Get pricing preview for response
    const pricing = calculatePricingPreview(assetCount);

    res.json({
      success: true,
      data: {
        assetCount,
        pricing,
        message: "Usage updated successfully",
      },
    });
  } catch (error) {
    console.error("Error in updateUsage:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update usage",
    });
  }
};

// GET /api/subscriptions/org/:orgId - Get organization subscription details
export const getOrganizationSubscription = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: "Validation error",
        details: errors.array(),
      });
      return;
    }

    const { orgId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const accessToken = req.accessToken;
    const authenticatedSupabase = getAuthenticatedSupabase(accessToken!);

    // Check if user has access to organization
    const { data: orgMember, error: orgError } = await authenticatedSupabase
      .from("org_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .single();

    if (orgError || !orgMember) {
      res.status(403).json({
        success: false,
        error: "Access denied to organization",
      });
      return;
    }

    // Get subscription details
    const { data: subscription, error: subError } = await authenticatedSupabase
      .from("subscriptions")
      .select("*")
      .eq("org_id", orgId)
      .single();

    if (subError) {
      if (subError.code === "PGRST116") {
        // No subscription found
        res.json({
          success: true,
          data: null,
        });
        return;
      }
      console.error("Error fetching subscription:", subError);
      res.status(500).json({
        success: false,
        error: "Failed to fetch subscription",
      });
      return;
    }

    // Get pricing preview
    const pricing = calculatePricingPreview(subscription.current_asset_count);
    const { count,error } = await authenticatedSupabase
      .from("assets")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");
    res.json({
      success: true,
      data: {
        subscription,
        pricing,
        activeAssets: count,
      },
    });
  } catch (error) {
    console.error("Error in getOrganizationSubscription:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// Simplified webhook handler for metered billing
export const handleStripeWebhook = async (
  req: any,
  res: Response
): Promise<void> => {
  let event: any = null;

  try {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      res.status(400).send("Webhook signature verification failed");
      return;
    }

    // Log all webhook events for debugging
    console.log(`📥 Received webhook: ${event.type} - ${event.id}`);

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;

      case "invoice.payment_succeeded":
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;

      case "invoice.payment_failed":
        const failedInvoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(failedInvoice);
        break;

      case "invoice.payment_action_required":
        const actionRequiredInvoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentActionRequired(actionRequiredInvoice);
        break;

      case "invoice.upcoming":
        const upcomingInvoice = event.data.object as Stripe.Invoice;
        await handleInvoiceUpcoming(upcomingInvoice);
        break;

      case "customer.subscription.updated":
        const updatedSubscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(updatedSubscription);
        break;

      case "customer.subscription.deleted":
        const deletedSubscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(deletedSubscription);
        break;

      case "customer.subscription.trial_will_end":
        const trialEndingSubscription = event.object as Stripe.Subscription;
        await handleSubscriptionTrialWillEnd(trialEndingSubscription);
        break;

      case "payment_method.attached":
        const paymentMethod = event.data.object as Stripe.PaymentMethod;
        await handlePaymentMethodAttached(paymentMethod);
        break;

      case "customer.created":
        const customer = event.data.object as Stripe.Customer;
        await handleCustomerCreated(customer);
        break;

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
    }

    // Log successful processing
    if (event) {
      await logWebhookEvent(event, "completed");
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Error handling webhook:", error);

    // Log failed processing
    if (event) {
      try {
        await logWebhookEvent(
          event,
          "failed",
          error instanceof Error ? error.message : "Unknown error"
        );
      } catch (logError) {
        console.error("Failed to log webhook event:", logError);
      }
    }

    res.status(500).json({ error: "Webhook handler error" });
  }
};

// Helper function to log webhook events
const logWebhookEvent = async (
  event: any,
  status: "completed" | "failed",
  errorMessage?: string
) => {
  try {
    await supabase.from("subscription_events").insert({
      event_type: "webhook_received",
      event_data: {
        stripe_event_id: event.id,
        stripe_event_type: event.type,
        processed_at: new Date().toISOString(),
        status,
        error_message: errorMessage,
      },
      stripe_event_id: event.id,
      stripe_event_type: event.type,
      processing_status: status,
      error_message: errorMessage,
      processed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to log webhook event:", error);
  }
};

// Helper functions for webhook handling
const handleCheckoutCompleted = async (session: Stripe.Checkout.Session) => {
  try {
    console.log("Processing checkout completion:", session.id);

    const orgId = session.metadata?.org_id;
    const initialAssetCount = parseInt(
      session.metadata?.initial_asset_count || "0"
    );
    const userId = session.metadata?.user_id;
    const billingCycle = session.metadata?.billing_cycle || "monthly";

    if (!orgId) {
      console.error("No org_id in session metadata");
      return;
    }

    if (!session.subscription) {
      console.error("No subscription ID in session");
      return;
    }



    // Get the subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );
    const subscriptionItem = subscription.items.data[0];

    // Calculate the volume tier pricing for this asset count
    const volumeTier = calculateVolumeTier(initialAssetCount);

    // Check if subscription already exists (avoid duplicates)
    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("stripe_subscription_id", subscription.id)
      .single();

    if (existingSubscription) {
      return;
    }

    // Check if there's already a free subscription for this org (to upgrade it)
    const { data: freeSubscription } = await supabase
      .from("subscriptions")
      .select("id, current_asset_count")
      .eq("org_id", orgId)
      .is("stripe_subscription_id", null)
      .single();

    if (freeSubscription) {
      // Update existing free subscription to paid subscription
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscription.id,
          stripe_product_id: subscriptionItem.price.product as string,
          stripe_price_id: subscriptionItem.price.id,
          subscription_item_id: subscriptionItem.id,
          current_asset_count: Math.max(freeSubscription.current_asset_count, initialAssetCount),
          asset_limit: initialAssetCount, // They paid for this exact number
          stripe_base_price: (subscriptionItem.price.unit_amount || 0) / 100,
          volume_tier: volumeTier.tier,
          effective_unit_price: volumeTier.unitPrice / 100, // Store in pounds
          total_monthly_cost: volumeTier.totalPrice / 100, // Store in pounds
          billing_cycle: billingCycle as "monthly" | "annual",
          status: subscription.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", freeSubscription.id);

      if (updateError) {
        console.error("Error upgrading free subscription:", updateError);
        return;
      }

      console.log("Successfully upgraded free subscription to paid subscription");
      return;
    }

    // Create subscription record (for orgs without any existing subscription)
    const { data: subscriptionRecord, error: subscriptionError } =
      await supabase
        .from("subscriptions")
        .insert({
          org_id: orgId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscription.id,
          stripe_product_id: subscriptionItem.price.product as string,
          stripe_price_id: subscriptionItem.price.id,
          subscription_item_id: subscriptionItem.id,
          current_asset_count: initialAssetCount,
          asset_limit: initialAssetCount, // They paid for this exact number
          stripe_base_price: (subscriptionItem.price.unit_amount || 0) / 100,
          volume_tier: volumeTier.tier,
          effective_unit_price: volumeTier.unitPrice / 100, // Store in pounds
          total_monthly_cost: volumeTier.totalPrice / 100, // Store in pounds
          billing_cycle: billingCycle as "monthly" | "annual",
          status: subscription.status,
          created_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

    if (subscriptionError) {
      console.error("Error creating subscription record:", subscriptionError);
      return;
    }

    // Subscription successfully created - no usage tracking needed for volume pricing
  } catch (error) {
    console.error("Error handling checkout completion:", error);
  }
};

const handleInvoicePaymentSucceeded = async (invoice: Stripe.Invoice) => {
  try {
    // Update subscription status if needed
    if ((invoice as any).subscription) {
      await supabase
        .from("subscriptions")
        .update({
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", (invoice as any).subscription as string);
    }
  } catch (error) {
    console.error("Error handling payment success:", error);
  }
};

const handleInvoicePaymentFailed = async (invoice: Stripe.Invoice) => {
  try {
    // Update subscription status
    if ((invoice as any).subscription) {
      await supabase
        .from("subscriptions")
        .update({
          status: "past_due",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", (invoice as any).subscription as string);
    }
  } catch (error) {
    console.error("Error handling payment failure:", error);
  }
};

const handleInvoicePaymentActionRequired = async (invoice: Stripe.Invoice) => {
  try {
    // Update subscription status
    if ((invoice as any).subscription) {
      await supabase
        .from("subscriptions")
        .update({
          status: "past_due",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", (invoice as any).subscription as string);
    }
  } catch (error) {
    console.error("Error handling payment action required:", error);
  }
};

const handleInvoiceUpcoming = async (invoice: Stripe.Invoice) => {
  try {
    // Handle upcoming invoice
  } catch (error) {
    console.error("Error handling upcoming invoice:", error);
  }
};

const handleSubscriptionUpdated = async (subscription: Stripe.Subscription) => {
  try {
    const subscriptionItem = subscription.items.data[0];

    await supabase
      .from("subscriptions")
      .update({
        status: subscription.status,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscription.id);
  } catch (error) {
    console.error("Error handling subscription update:", error);
  }
};

const handleSubscriptionDeleted = async (subscription: Stripe.Subscription) => {
  try {
    await supabase
      .from("subscriptions")
      .update({
        status: "canceled",
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscription.id);
  } catch (error) {
    console.error("Error handling subscription deletion:", error);
  }
};

const handleSubscriptionTrialWillEnd = async (
  subscription: Stripe.Subscription
) => {
  try {
    // Handle subscription trial ending
  } catch (error) {
    console.error("Error handling subscription trial ending:", error);
  }
};

const handlePaymentMethodAttached = async (
  paymentMethod: Stripe.PaymentMethod
) => {
  try {
    // Handle payment method attached
  } catch (error) {
    console.error("Error handling payment method attached:", error);
  }
};

const handleCustomerCreated = async (customer: Stripe.Customer) => {
  try {
    // Handle customer created
  } catch (error) {
    console.error("Error handling customer created:", error);
  }
};

// Placeholder functions for additional features
export const createCustomerPortalSession = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  // Implementation for customer portal
  res.status(501).json({
    success: false,
    error: "Customer portal not yet implemented",
  });
};

// GET /api/subscriptions/org/:orgId/invoices - Get invoice history
export const getInvoiceHistory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: "Validation error",
        details: errors.array(),
      });
      return;
    }

    const { orgId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const accessToken = req.accessToken;
    const authenticatedSupabase = getAuthenticatedSupabase(accessToken!);

    // Check if user has access to organization
    const { data: orgMember, error: orgError } = await authenticatedSupabase
      .from("org_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .single();

    if (orgError || !orgMember) {
      res.status(403).json({
        success: false,
        error: "Access denied to organization",
      });
      return;
    }

    // Get subscription to find stripe customer
    const { data: subscription, error: subError } = await authenticatedSupabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("org_id", orgId)
      .single();

    if (subError || !subscription) {
      res.json({
        success: true,
        data: [], // No subscription means no invoices
      });
      return;
    }

    // Get invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: subscription.stripe_customer_id,
      limit: 50,
      expand: ["data.subscription", "data.lines.data.price"],
    });

    // Format invoice data
    const formattedInvoices = invoices.data.map((invoice) => ({
      id: invoice.id,
      invoice_number: invoice.number,
      amount_paid: invoice.amount_paid,
      amount_due: invoice.amount_due,
      currency: invoice.currency,
      status: invoice.status,
      billing_period_start: new Date(invoice.period_start * 1000).toISOString(),
      billing_period_end: new Date(invoice.period_end * 1000).toISOString(),
      created_at: new Date(invoice.created * 1000).toISOString(),
      due_date: invoice.due_date
        ? new Date(invoice.due_date * 1000).toISOString()
        : null,
      hosted_invoice_url: invoice.hosted_invoice_url,
      invoice_pdf: invoice.invoice_pdf,
      usage_details: invoice.lines.data
        .filter((line) => line.amount > 0)
        .map((line) => ({
          description: line.description || "Asset usage",
          quantity: line.quantity || 0,
          unit_amount: 0, // Will be populated from Stripe price data later
          amount: line.amount,
        })),
    }));

    res.json({
      success: true,
      data: formattedInvoices,
    });
  } catch (error) {
    console.error("Error in getInvoiceHistory:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// GET /api/subscriptions/org/:orgId/current-usage - Get current usage and billing projection
export const getCurrentUsage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: "Validation error",
        details: errors.array(),
      });
      return;
    }

    const { orgId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const accessToken = req.accessToken;
    const authenticatedSupabase = getAuthenticatedSupabase(accessToken!);

    // Check if user has access to organization
    const { data: orgMember, error: orgError } = await authenticatedSupabase
      .from("org_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .single();

    if (orgError || !orgMember) {
      res.status(403).json({
        success: false,
        error: "Access denied to organization",
      });
      return;
    }

    // Get subscription details
    const { data: subscription, error: subError } = await authenticatedSupabase
      .from("subscriptions")
      .select("*")
      .eq("org_id", orgId)
      .eq("status", "active")
      .single();

    if (subError || !subscription) {
      res.status(404).json({
        success: false,
        error: "No active subscription found",
      });
      return;
    }

    // Calculate current billing period
    const now = new Date();
    const periodStart = new Date(subscription.current_period_start);
    const periodEnd = new Date(subscription.current_period_end);
    const daysRemaining = Math.ceil(
      (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Get pricing breakdown
    const pricing = calculatePricingPreview(subscription.current_asset_count);

    // Calculate prorated amount (for mid-cycle changes)
    const totalDaysInPeriod = Math.ceil(
      (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysUsed = totalDaysInPeriod - daysRemaining;
    const proratedAmount = Math.round(
      (pricing.estimatedMonthlyTotal * daysUsed) / totalDaysInPeriod
    );

    res.json({
      success: true,
      data: {
        asset_count: subscription.current_asset_count,
        billing_period_start: subscription.current_period_start,
        billing_period_end: subscription.current_period_end,
        estimated_amount: pricing.estimatedMonthlyTotal,
        tier_breakdown: pricing.tierBreakdown.map((tier) => ({
          tier: tier.tier,
          range: tier.range,
          quantity: tier.quantity,
          unit_price: tier.unitPrice,
          subtotal: tier.subtotal,
        })),
        days_remaining: daysRemaining,
        prorated_amount: proratedAmount,
      },
    });
  } catch (error) {
    console.error("Error in getCurrentUsage:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// POST /api/subscriptions/org/:orgId/update-asset-count - Update subscription asset count with Stripe integration
export const updateSubscriptionAssetCount = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: "Validation error",
        details: errors.array(),
      });
      return;
    }

    const { orgId } = req.params;
    const { assetCount } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    // Get current active assets count for the organization
    const accessToken = req.accessToken;
    const authenticatedSupabase = createAuthenticatedClient(accessToken!);

    // Check if user has access to organization
    const { data: orgMember, error: orgError } = await authenticatedSupabase
      .from("org_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .single();

    if (orgError || !orgMember) {
      res.status(403).json({
        success: false,
        error: "Access denied to organization",
      });
      return;
    }

    // First get all users who are members of this organization
    const { data: orgMembers, error: membersError } =
      await authenticatedSupabase
        .from("org_members")
        .select("user_id")
        .eq("org_id", orgId);

    if (membersError) {
      console.error("Error fetching organization members:", membersError);
      res.status(500).json({
        success: false,
        error: "Failed to fetch organization members",
      });
      return;
    }

    const memberUserIds = orgMembers.map((member) => member.user_id);

    // Get assets for all organization members
    const { data: assets, error: assetsError } = await authenticatedSupabase
      .from("assets")
      .select("id")
      .in("user_id", memberUserIds);

    if (assetsError) {
      console.error("Error fetching assets:", assetsError);
      res.status(500).json({
        success: false,
        error: "Failed to fetch active assets",
      });
      return;
    }

    const activeAssetCount = assets.length;

    // Get subscription
    const { data: subscription, error: subError } = await authenticatedSupabase
      .from("subscriptions")
      .select("*")
      .eq("org_id", orgId)
      .eq("status", "active")
      .single();

    if (subError || !subscription) {
      res.status(404).json({
        success: false,
        error: "No active subscription found",
      });
      return;
    }

    // Check if this is a free subscription (no Stripe integration)
    const isFreeSubscription = !subscription.stripe_subscription_id;

    // For free subscriptions, check asset limit
    if (isFreeSubscription && assetCount > subscription.asset_limit) {
      res.status(400).json({
        success: false,
        error: `Asset limit exceeded. Free subscriptions are limited to ${subscription.asset_limit} assets. Please upgrade to add more assets.`,
        data: {
          assetLimit: subscription.asset_limit,
          requested: assetCount,
        },
      });
      return;
    }

    // Calculate pricing variables (for both free and paid subscriptions)
    let newPricing, newVolumeTier, oldPricing, costDifference = 0, chargeAmount = 0;

    if (isFreeSubscription) {
      // For free subscriptions, use default values
      newPricing = { estimatedMonthlyTotal: 0, tiers: [] };
      newVolumeTier = { tier: 1, unitPrice: 0, totalPrice: 0 };
      oldPricing = { estimatedMonthlyTotal: 0, tiers: [] };
    } else {
      // For paid subscriptions, calculate actual pricing
      newPricing = calculatePricingPreview(assetCount);
      newVolumeTier = calculateVolumeTier(assetCount);
      oldPricing = calculatePricingPreview(subscription.current_asset_count);
      
      // Simplified charging: charge full difference for upgrades, credit for downgrades
      costDifference = newPricing.estimatedMonthlyTotal - oldPricing.estimatedMonthlyTotal;
      chargeAmount = Math.abs(costDifference);
    }

    // Validate asset count - cannot go below active assets
    if (assetCount < activeAssetCount) {
      res.status(400).json({
        success: false,
        error: `Cannot set asset count below active assets. You currently have ${activeAssetCount} active assets.`,
        data: {
          minAllowed: activeAssetCount,
          activeAssets: activeAssetCount,
          requested: assetCount,
        },
      });
      return;
    }

    if (assetCount === subscription.current_asset_count) {
      res.status(400).json({
        success: false,
        error: "Asset count hasn't changed",
      });
      return;
    }

    // Handle Stripe operations only for paid subscriptions
    if (!isFreeSubscription) {
      // Validate calculations to prevent NaN
      if (isNaN(costDifference) || isNaN(chargeAmount)) {
        console.error("❌ Invalid billing calculation:", {
          costDifference,
          chargeAmount,
          assetCount,
          currentAssetCount: subscription.current_asset_count,
        });
        res.status(400).json({
          success: false,
          error: "Invalid pricing calculation. Please try again.",
        });
        return;
      }

      try {
        // For upgrades, create an immediate invoice first
        const isUpgrade = assetCount > subscription.current_asset_count;

        if (isUpgrade) {
          if (chargeAmount > 0) {
            // Create invoice item for the upgrade charge
            await stripe.invoiceItems.create({
              customer: subscription.stripe_customer_id,
              amount: chargeAmount,
              currency: "gbp",
              description: `Asset count increase from ${subscription.current_asset_count} to ${assetCount} assets - immediate charge`,
            });

            // Create and pay the invoice immediately
            const invoice = await stripe.invoices.create({
              customer: subscription.stripe_customer_id,
              collection_method: "charge_automatically",
              auto_advance: true,
            });

            if (!invoice.id) {
              throw new Error("Failed to create upgrade invoice");
            }

            const paidInvoice = await stripe.invoices.pay(invoice.id);
          }
        } else {
          // Processing downgrade
        }

        // Now update the subscription for future billing
        await stripe.subscriptionItems.update(subscription.subscription_item_id, {
          quantity: assetCount,
          proration_behavior: "none", // We handled proration manually above
        });
      } catch (stripeError) {
        console.error("Stripe update failed:", stripeError);
        res.status(500).json({
          success: false,
          error: "Failed to update subscription with payment provider",
          details:
            stripeError instanceof Error ? stripeError.message : "Unknown error",
        });
        return;
      }
    }

    // Update local subscription record
    const updateData: any = {
      current_asset_count: assetCount,
      updated_at: new Date().toISOString(),
    };

    // Only update paid subscription fields for non-free subscriptions
    if (!isFreeSubscription) {
      updateData.asset_limit = assetCount;
      updateData.volume_tier = newVolumeTier.tier;
      updateData.effective_unit_price = newVolumeTier.unitPrice / 100;
      updateData.total_monthly_cost = newVolumeTier.totalPrice / 100;
    }

    const { error: updateError } = await authenticatedSupabase
      .from("subscriptions")
      .update(updateData)
      .eq("id", subscription.id);

    if (updateError) {
      console.error("Failed to update subscription record:", updateError);
      res.status(500).json({
        success: false,
        error: "Failed to update subscription record",
      });
      return;
    }

    // Log the change in usage history
    const { error: historyError } = await authenticatedSupabase
      .from("usage_history")
      .insert({
        org_id: orgId,
        subscription_id: subscription.id,
        asset_count: assetCount,
        previous_count: subscription.current_asset_count,
        subscription_item_id: subscription.subscription_item_id,
        changed_by: userId,
        change_reason: "manual",
        change_context: {
          method: "subscription_update",
          user_id: userId,
          timestamp: new Date().toISOString(),
          direction:
            assetCount > subscription.current_asset_count
              ? "increase"
              : "decrease",
          active_assets_at_time: activeAssetCount,
        },
      });

    if (historyError) {
      console.error("Failed to log usage history:", historyError);
      // Don't fail the request for history logging issues
    }

    res.json({
      success: true,
      data: {
        assetCount,
        activeAssets: activeAssetCount,
        pricing: newPricing,
        volumeTier: newVolumeTier,
        billing: {
          costDifference,
          chargeAmount,
          formattedChargeAmount: formatPrice(chargeAmount),
          billingCycle: subscription.billing_cycle,
          isUpgrade: assetCount > subscription.current_asset_count,
        },
        message:
          assetCount > subscription.current_asset_count
            ? `Successfully increased asset count to ${assetCount}. You've been charged ${formatPrice(
                chargeAmount
              )} immediately for the upgrade.`
            : `Successfully decreased asset count to ${assetCount}. A credit of ${formatPrice(
                chargeAmount
              )} will be applied to your next ${
                subscription.billing_cycle
              } invoice.`,
      },
    });
  } catch (error) {
    console.error("Error in updateSubscriptionAssetCount:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
