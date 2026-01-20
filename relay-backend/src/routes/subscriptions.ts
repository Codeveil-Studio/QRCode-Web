import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  createCheckoutSession,
  validateCheckoutRequest,
  getPricingPreview,
  validatePricingCalculation,
  updateUsage,
  validateUsageUpdate,
  createCustomerPortalSession,
  getOrganizationSubscription,
  validateOrgId,
  handleStripeWebhook,
  getInvoiceHistory,
  getCurrentUsage,
  verifyCheckoutSession,
  updateSubscriptionAssetCount,
  validateAssetCountUpdate,
} from "../controllers/subscriptionsController";

const router = Router();

// POST /api/subscriptions/create-checkout - Create Stripe checkout session
router.post(
  "/create-checkout",
  authMiddleware,
  validateCheckoutRequest,
  createCheckoutSession
);

// POST /api/subscriptions/verify-checkout - Verify Stripe checkout session
router.post("/verify-checkout", verifyCheckoutSession);

// POST /api/subscriptions/pricing-preview - Get pricing preview with tier breakdown
router.post("/pricing-preview", validatePricingCalculation, getPricingPreview);

// POST /api/subscriptions/org/:orgId/usage - Update asset usage for organization
router.post(
  "/org/:orgId/usage",
  authMiddleware,
  validateOrgId,
  validateUsageUpdate,
  updateUsage
);

// POST /api/subscriptions/org/:orgId/update-asset-count - Update subscription asset count with Stripe integration
router.post(
  "/org/:orgId/update-asset-count",
  authMiddleware,
  validateOrgId,
  validateAssetCountUpdate,
  updateSubscriptionAssetCount
);

// GET /api/subscriptions/org/:orgId - Get subscription details for organization
router.get(
  "/org/:orgId",
  authMiddleware,
  validateOrgId,
  getOrganizationSubscription
);

// GET /api/subscriptions/org/:orgId/invoices - Get invoice history for organization
router.get(
  "/org/:orgId/invoices",
  authMiddleware,
  validateOrgId,
  getInvoiceHistory
);

// GET /api/subscriptions/org/:orgId/current-usage - Get current usage and billing projection
router.get(
  "/org/:orgId/current-usage",
  authMiddleware,
  validateOrgId,
  getCurrentUsage
);

// POST /api/subscriptions/portal/:orgId - Create Stripe customer portal session
router.post(
  "/portal/:orgId",
  authMiddleware,
  validateOrgId,
  createCustomerPortalSession
);

// Note: Webhook handler is registered directly in server.ts with raw middleware
// to avoid JSON parsing interference with signature verification

export default router;
