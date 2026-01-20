import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  getAllTypes,
  getSystemTypes,
  adoptSystemType,
  getTypeById,
  createType,
  updateType,
  deleteType,
  validateType,
} from "../controllers/typesController";

const router = Router();

// All asset type routes require authentication
router.use(authMiddleware);

// GET /api/asset-types - Get all active asset types for organization
router.get("/", getAllTypes);

// GET /api/asset-types/system - Get system asset types available for adoption
router.get("/system", getSystemTypes);

// POST /api/asset-types/adopt - Adopt a system asset type
router.post("/adopt", adoptSystemType);

// GET /api/asset-types/:id - Get specific asset type by ID
router.get("/:id", getTypeById);

// POST /api/asset-types - Create new asset type
router.post("/", validateType, createType);

// PUT /api/asset-types/:id - Update asset type
router.put("/:id", validateType, updateType);

// DELETE /api/asset-types/:id - Delete asset type (soft delete)
router.delete("/:id", deleteType);

export default router;
