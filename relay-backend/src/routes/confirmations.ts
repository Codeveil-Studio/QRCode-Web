import { Router } from "express";
import {
  updateIssueConfirmation,
  validateIssueConfirmationUpdate,
} from "../controllers/issuesController";

const router = Router();

// PUT /api/confirmations/:uid - Update an existing issue confirmation (public route, no auth required)
router.put("/:uid", validateIssueConfirmationUpdate, updateIssueConfirmation);

export default router;
