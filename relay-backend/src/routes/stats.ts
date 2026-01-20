import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  getSidebarStats,
  getDashboardStats,
  getDashboardData,
} from "../controllers/statsController";

const router = Router();

// All stats routes require authentication
router.use(authMiddleware);

// GET /api/stats/sidebar - Get sidebar statistics
router.get("/sidebar", getSidebarStats);

// GET /api/stats/dashboard - Get dashboard statistics
router.get("/dashboard", getDashboardStats);

// GET /api/stats/dashboard-data - Get dashboard data (stats + issues)
router.get("/dashboard-data", getDashboardData);

export default router;
