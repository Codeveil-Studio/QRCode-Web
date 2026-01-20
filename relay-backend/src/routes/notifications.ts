import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  getOrgNotificationPreferences,
  updateOrgNotificationPreferences,
  getNotificationLogs,
  validateOrgNotificationPreferences,
} from "../controllers/notificationsController";

const router = Router();

// All notification routes require authentication
router.use(authMiddleware);

// Organization notification preferences routes
router.get("/preferences", getOrgNotificationPreferences);
router.put(
  "/preferences",
  validateOrgNotificationPreferences,
  updateOrgNotificationPreferences
);

// Notification logs
router.get("/logs", getNotificationLogs);

export default router;
