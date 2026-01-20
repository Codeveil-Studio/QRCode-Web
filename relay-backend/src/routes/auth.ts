import { Router } from "express";
import {
  login,
  signup,
  forgotPassword,
  resetPassword,
  refreshToken,
  getMe,
  logout,
  resendConfirmation,
  checkEmailConfirmation,
  confirmEmail,
  confirmEmailWithAccessToken,
  updatePassword,
} from "../controllers/authcontroller";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// POST /api/auth/login - Login with email and password
router.post("/login", login);

// POST /api/auth/signup - Register new user
router.post("/signup", signup);

// POST /api/auth/forgot-password - Request password reset
router.post("/forgot-password", forgotPassword);

// POST /api/auth/reset-password - Reset password with token
router.post("/reset-password", resetPassword);

// POST /api/auth/resend-confirmation - Resend confirmation email
router.post("/resend-confirmation", resendConfirmation);

// POST /api/auth/confirm - Confirm email with token
router.post("/confirm", confirmEmail);

// POST /api/auth/confirm-with-access-token - Confirm email with Supabase access token
router.post("/confirm-with-access-token", confirmEmailWithAccessToken);

// GET /api/auth/check-email-confirmation/:userId - Check confirmation status
router.get("/check-email-confirmation/:userId", checkEmailConfirmation);

// POST /api/auth/refresh-token - Refresh access token
router.post("/refresh-token", refreshToken);

// GET /api/auth/me - Get current user (protected)
router.get("/me", authMiddleware, getMe);

// POST /api/auth/logout - Logout (protected)
router.post("/logout", authMiddleware, logout);

// PUT /api/auth/update-password - Update password (protected)
router.put("/update-password", authMiddleware, updatePassword);

export default router;
