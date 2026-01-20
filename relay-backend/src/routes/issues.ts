import { Router } from "express";
import multer, { FileFilterCallback } from "multer";
import {
  authMiddleware,
  optionalAuthMiddleware,
  frontendOnlyMiddleware,
} from "../middleware/auth";
import {
  getAllIssues,
  getIssueById,
  createIssue,
  updateIssue,
  deleteIssue,
  reportIssue,
  validateIssue,
  validateIssueReport,
  getAssetIssues,
  getAssetIssuesPublic,
  confirmIssue,
  validateIssueConfirmation,
  uploadIssueImage,
} from "../controllers/issuesController";

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (
    req: Express.Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
  ) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "image"));
    }
  },
});

// POST /api/issues/upload-image - Upload issue image (public route, no auth required)
router.post("/upload-image", upload.single("image"), uploadIssueImage);

// POST /api/issues/report - Report a new issue (public route, no auth required)
router.post("/report", validateIssueReport, reportIssue);

// POST /api/issues/:uid/opt-in - Confirm/opt-in to an existing issue (public route, no auth required)
router.post("/:uid/opt-in", validateIssueConfirmation, confirmIssue);

// GET /api/issues/asset/:assetUid/public - Get issues for a specific asset (public route, frontend only)
router.get(
  "/asset/:assetUid/public",
  frontendOnlyMiddleware,
  getAssetIssuesPublic
);

// GET /api/issues/asset/:assetUid - Get issues for a specific asset (before /:id route)
router.get("/asset/:assetUid", authMiddleware, getAssetIssues);

// Authenticated routes (require login)
router.use(authMiddleware);

// GET /api/issues - Get all issues for authenticated user
router.get("/", getAllIssues);

// GET /api/issues/:id - Get specific issue by ID
router.get("/:id", getIssueById);

// POST /api/issues - Create new issue
router.post("/", validateIssue, createIssue);

// PUT /api/issues/:id - Update issue
router.put("/:id", validateIssue, updateIssue);

// DELETE /api/issues/:id - Delete issue
router.delete("/:id", deleteIssue);

export default router;
