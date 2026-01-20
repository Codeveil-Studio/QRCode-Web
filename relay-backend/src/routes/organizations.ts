import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  createOrganization,
  validateOrganizationCreation,
  checkSubscriptionStatus,
  createInvite,
  validateInvite,
  joinWithInvite,
  checkEmailDomain,
  validateInviteCreation,
  validateInviteCode,
  validateJoinWithInvite,
} from "../controllers/organizationController";

const router = Router();

// POST /api/organizations/create - Create new organization
router.post("/create", authMiddleware, validateOrganizationCreation, createOrganization);

// GET /api/organizations/subscription-status - Check subscription status
router.get("/subscription-status", authMiddleware, checkSubscriptionStatus);

// POST /api/organizations/create-invite - Create invite code (requires auth)
router.post(
  "/create-invite",
  authMiddleware,
  validateInviteCreation,
  createInvite
);

// POST /api/organizations/validate-invite - Validate invite code (public)
router.post("/validate-invite", validateInviteCode, validateInvite);

// POST /api/organizations/join-with-invite - Join organization with invite (requires userId)
router.post(
  "/join-with-invite",
  validateJoinWithInvite,
  joinWithInvite
);

// GET /api/organizations/check-email-domain - Check if email domain has existing org (public)
router.get("/check-email-domain", checkEmailDomain);

export default router;
