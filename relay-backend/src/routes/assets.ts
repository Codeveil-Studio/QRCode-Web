import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  getAllAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  validateAsset,
} from "../controllers/assetsController";

const router = Router();

// All asset routes require authentication
router.use(authMiddleware);

// GET /api/assets - Get all assets
router.get("/", getAllAssets);

// GET /api/assets/:id - Get specific asset by ID
router.get("/:id", getAssetById);

// POST /api/assets - Create new asset
router.post("/", validateAsset, createAsset);

// PUT /api/assets/:id - Update asset
router.put("/:id", validateAsset, updateAsset);

// DELETE /api/assets/:id - Delete asset
router.delete("/:id", deleteAsset);

export default router;
