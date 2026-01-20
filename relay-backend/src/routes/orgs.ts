import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  updateAssetCount,
  validateAssetUpdate,
  getOrgUsage,
  getOrgOfAuthenticatedUser,
} from "../controllers/orgsController";

const router = Router();

// GET /api/orgs/:orgId/usage - Get organization usage details
router.get("/:orgId/usage", authMiddleware, getOrgUsage);

// POST /api/orgs/:orgId/assets - Update asset count for organization
router.post(
  "/:orgId/assets",
  authMiddleware,
  validateAssetUpdate,
  updateAssetCount
);

// GET /api/orgs/me - Get organization of authenticated user
router.get("/me", authMiddleware, getOrgOfAuthenticatedUser);

export default router;
