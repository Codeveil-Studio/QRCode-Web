import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  getComprehensiveReports,
  downloadOpenIssues,
  downloadResolvedIssues,
  downloadInProgressIssues,
  downloadAllAssets,
  
  getAssetStatsController,
  getIssueStatsController,
  getOrganizationStatsController,
  getSubscriptionStatsController,
  
  getAssetUtilizationController,
  getIssueResolutionTrendsController,
  getMaintenanceOverdueController,
  getIssuesPerAssetController,
  getIssuesPerAssetTypeController,
  getAssetsAddedOverTimeController,
  getUpcomingMaintenanceController,
  getTopAssetsWithIssuesController,
} from "../controllers/reportsController";

// Import AI Controllers from separate AI controller
import {
  getAllAIInsights,
  getPredictiveMaintenanceAlerts,
  analyzePredictiveMaintenance,
  getIssuePatterns,
  analyzeIssuePatterns,
  getResourceOptimization,
  getOptimizationRecommendations,
  getAIConfig,
  updateAIConfig,
  retrainModels,
  getModelStatus,
  generateCustomInsights,
  getAssetLifecycleRecommendations,
  analyzeCostOptimization,
} from "../controllers/aiReportsController";

const router = Router();

// All reports routes require authentication
router.use(authMiddleware);

// === CORE REPORTS API ===

// GET /api/reports/comprehensive - Get comprehensive reports data
router.get("/comprehensive", getComprehensiveReports);

// === STANDARD REPORTS ===

// GET /api/reports/asset-stats - Get asset statistics
router.get("/asset-stats", getAssetStatsController);

// GET /api/reports/issue-stats - Get issue statistics
router.get("/issue-stats", getIssueStatsController);

// GET /api/reports/organization-stats - Get organization statistics
router.get("/organization-stats", getOrganizationStatsController);

// GET /api/reports/subscription-stats - Get subscription statistics
router.get("/subscription-stats", getSubscriptionStatsController);

// === ANALYTICS & CHARTS DATA ===

// GET /api/reports/analytics/asset-utilization - Get asset utilization data
router.get("/analytics/asset-utilization", getAssetUtilizationController);

// GET /api/reports/analytics/issue-resolution-trends - Get issue resolution trends
router.get("/analytics/issue-resolution-trends", getIssueResolutionTrendsController);

// GET /api/reports/analytics/maintenance-overdue - Get overdue maintenance data
router.get("/analytics/maintenance-overdue", getMaintenanceOverdueController);

// GET /api/reports/analytics/issues-per-asset - Get issues per asset data
router.get("/analytics/issues-per-asset", getIssuesPerAssetController);

// GET /api/reports/analytics/issues-per-asset-type - Get issues per asset type
router.get("/analytics/issues-per-asset-type", getIssuesPerAssetTypeController);

// GET /api/reports/analytics/assets-added-over-time - Get assets added over time
router.get("/analytics/assets-added-over-time", getAssetsAddedOverTimeController);

// GET /api/reports/analytics/upcoming-maintenance - Get upcoming maintenance
router.get("/analytics/upcoming-maintenance", getUpcomingMaintenanceController);

// GET /api/reports/analytics/top-assets-with-issues - Get top assets with issues
router.get("/analytics/top-assets-with-issues", getTopAssetsWithIssuesController);

// === AI-POWERED REPORTS ===

// GET /api/reports/ai/insights - Get all AI insights
router.get("/ai/insights", getAllAIInsights);

// Predictive Maintenance Routes
// GET /api/reports/ai/predictive-maintenance - Get predictive maintenance alerts
router.get("/ai/predictive-maintenance", getPredictiveMaintenanceAlerts);

// POST /api/reports/ai/predictive-maintenance/analyze - Analyze specific assets
router.post("/ai/predictive-maintenance/analyze", analyzePredictiveMaintenance);

// Issue Pattern Detection Routes
// GET /api/reports/ai/issue-patterns - Get issue patterns
router.get("/ai/issue-patterns", getIssuePatterns);

// POST /api/reports/ai/issue-patterns/analyze - Analyze patterns with criteria
router.post("/ai/issue-patterns/analyze", analyzeIssuePatterns);

// Resource Optimization Routes
// GET /api/reports/ai/resource-optimization - Get resource optimization data
router.get("/ai/resource-optimization", getResourceOptimization);

// POST /api/reports/ai/resource-optimization/recommendations - Get specific recommendations
router.post("/ai/resource-optimization/recommendations", getOptimizationRecommendations);

// === AI CONFIGURATION & MANAGEMENT ===

// GET /api/reports/ai/config - Get AI configuration
router.get("/ai/config", getAIConfig);

// PUT /api/reports/ai/config - Update AI configuration
router.put("/ai/config", updateAIConfig);

// POST /api/reports/ai/models/retrain - Retrain AI models
router.post("/ai/models/retrain", retrainModels);

// GET /api/reports/ai/models/status - Get AI model status
router.get("/ai/models/status", getModelStatus);

// === ADVANCED AI FEATURES ===

// POST /api/reports/ai/insights/custom - Generate custom insights
router.post("/ai/insights/custom", generateCustomInsights);

// GET /api/reports/ai/asset-lifecycle - Get asset lifecycle recommendations
router.get("/ai/asset-lifecycle", getAssetLifecycleRecommendations);

// POST /api/reports/ai/cost-optimization - Analyze cost optimization
router.post("/ai/cost-optimization", analyzeCostOptimization);

// === DOWNLOAD ENDPOINTS (existing) ===

// GET /api/reports/download/open-issues - Download open issues CSV
router.get("/download/open-issues", downloadOpenIssues);

// GET /api/reports/download/resolved-issues - Download resolved issues CSV
router.get("/download/resolved-issues", downloadResolvedIssues);

// GET /api/reports/download/in-progress-issues - Download in-progress issues CSV
router.get("/download/in-progress-issues", downloadInProgressIssues);

// GET /api/reports/download/assets - Download all assets CSV
router.get("/download/assets", downloadAllAssets);

export default router;
