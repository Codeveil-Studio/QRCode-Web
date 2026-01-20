import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  getProfile,
  updateProfile,
  validateProfileUpdate,
  sendNotification,
  getOrgMobileNumber,
  updateOrgMobileNumber,
  deleteOrgMobileNumber,
  validateOrgMobileNumber,
} from "../controllers/profileController";

const router = Router();

// All profile routes require authentication
router.use(authMiddleware);

// GET /api/profile - Get user profile
router.get("/", getProfile);

// PUT /api/profile - Update user profile
router.put("/", validateProfileUpdate, updateProfile);

// POST /api/profile/notifications/send - Send notification
router.post("/notifications/send", sendNotification);

// GET /api/profile/mobile-number - Get organization mobile number
router.get("/mobile-number", getOrgMobileNumber);

// PUT /api/profile/mobile-number - Update organization mobile number (admin only)
router.put("/mobile-number", validateOrgMobileNumber, updateOrgMobileNumber);

// DELETE /api/profile/mobile-number - Delete organization mobile number (admin only)
router.delete("/mobile-number", deleteOrgMobileNumber);

export default router;
