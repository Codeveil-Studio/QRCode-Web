import { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { adminClient, anonClient, verifyAndGetUser } from "../utils/supabase";

// Cookie configuration
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production", // Secure in production (HTTPS)
  sameSite:
    process.env.NODE_ENV === "production"
      ? ("none" as const) // Must be 'none' for cross-site (Vercel -> Render)
      : ("lax" as const),
  path: "/",
  // Don't set domain in development to allow localhost cross-port cookies
  ...(process.env.NODE_ENV === "production" &&
    process.env.COOKIE_DOMAIN && { domain: process.env.COOKIE_DOMAIN }),
};

const ACCESS_TOKEN_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
  maxAge: 60 * 60 * 1000, // 1 hour
};

const REFRESH_TOKEN_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// Helper function to set auth cookies
const setAuthCookies = (
  res: any,
  accessToken: string,
  refreshToken: string
) => {
  console.log(
    "Setting accessToken cookie with options:",
    ACCESS_TOKEN_COOKIE_OPTIONS
  );
  res.cookie("accessToken", accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
  console.log(
    "Setting refreshToken cookie with options:",
    REFRESH_TOKEN_COOKIE_OPTIONS
  );
  res.cookie("refreshToken", refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
  console.log("Both cookies set on response object");
};

// Helper function to clear auth cookies
const clearAuthCookies = (res: any) => {
  res.clearCookie("accessToken", COOKIE_OPTIONS);
  res.clearCookie("refreshToken", COOKIE_OPTIONS);
};

// Login controller
export const login: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
      return;
    }

    // Sign in with Supabase using admin client
    const { data, error } = await anonClient.auth.signInWithPassword({
      email,
      password,
    });
    console.log(data, error);
    if (error || !data.user) {
      console.error("Login error:", error);
      res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
      return;
    }

    let accessToken = data.session.access_token;
    let refreshToken = data.session.refresh_token;

    // NO COOKIES SET HERE - tokens returned in JSON for Next.js API route to handle
    // setAuthCookies(res, accessToken, refreshToken);

    // Check if user has an organization
    let hasOrganization = false;
    try {
      const { supabase } = require("../utils/supabase");
      const { data: orgData, error: orgError } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", data.user.id)
        .single();
      
      hasOrganization = !orgError && !!orgData;
    } catch (orgCheckError) {
      console.log("Could not check organization status:", orgCheckError);
      // Don't fail the auth, just assume no org
      hasOrganization = false;
    }

    res.json({
      success: true,
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          emailConfirmed: data.user.email_confirmed_at !== null,
        },
        hasOrganization,
        needsOrgSetup: !hasOrganization,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// Signup controller
export const signup: RequestHandler = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body || {};
    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";
    const trimmedFirstName =
      typeof firstName === "string" ? firstName.trim() : "";
    const trimmedLastName =
      typeof lastName === "string" ? lastName.trim() : "";

    if (!normalizedEmail || typeof password !== "string") {
      res.status(400).json({
        success: false,
        error: "Valid email and password are required",
      });
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(normalizedEmail)) {
      res.status(400).json({
        success: false,
        error: "Please provide a valid email address",
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters long",
      });
      return;
    }

    const userMetadata: Record<string, string> = {};
    if (trimmedFirstName) {
      userMetadata.first_name = trimmedFirstName;
    }
    if (trimmedLastName) {
      userMetadata.last_name = trimmedLastName;
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    // Sign up with Supabase using admin client
    const { data, error } = await adminClient.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: userMetadata,
        emailRedirectTo: `${frontendUrl}/auth/confirm`,
      },
    });

    if (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
      return;
    }

    if (!data.user) {
      res.status(400).json({
        success: false,
        error: "Failed to create user",
      });
      return;
    }

    // If user is confirmed and has a session, return tokens
    let tokens = undefined;
    if (data.session) {
      tokens = {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      };
      // NO COOKIES SET HERE
      // setAuthCookies(
      //   res,
      //   data.session.access_token,
      //   data.session.refresh_token
      // );
    }

    res.json({
      success: true,
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          emailConfirmed: data.user.email_confirmed_at !== null,
        },
        needsEmailConfirmation: !data.user.email_confirmed_at,
      },
      tokens,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};



// Forgot Password controller
export const forgotPassword: RequestHandler = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        error: "Email is required",
      });
      return;
    }

    // Send password reset email using Supabase
    const { error } = await adminClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
    });

    if (error) {
      console.error("Password reset error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
      return;
    }

    res.json({
      success: true,
      message: "Password reset email sent successfully",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// Reset Password controller
export const resetPassword: RequestHandler = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({
        success: false,
        error: "Token and new password are required",
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters long",
      });
      return;
    }

    // Get user from the access token
    const { data: userData, error: userError } = await adminClient.auth.getUser(token);

    if (userError || !userData.user) {
      console.error("Token verification error:", userError);
      res.status(401).json({
        success: false,
        error: "Invalid or expired reset token",
      });
      return;
    }

    // Update password using admin client with the user's ID
    const { data, error } = await adminClient.auth.admin.updateUserById(
      userData.user.id,
      {
        password: newPassword,
      }
    );

    if (error) {
      console.error("Update password error:", error);
      res.status(400).json({
        success: false,
        error: error.message || "Failed to reset password",
      });
      return;
    }

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// Refresh token controller
export const refreshToken: RequestHandler = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: "Refresh token not found",
      });
      return;
    }

    // Use Supabase anon client to refresh the session
    const { data, error } = await anonClient.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      console.error("Supabase refresh error:", error);
      clearAuthCookies(res);
      res.status(401).json({
        success: false,
        error: "Invalid refresh token",
      });
      return;
    }

    // Set new HttpOnly cookies
    setAuthCookies(res, data.session.access_token, data.session.refresh_token);

    res.json({
      success: true,
      message: "Tokens refreshed successfully",
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    clearAuthCookies(res);
    res.status(401).json({
      success: false,
      error: "Invalid refresh token",
    });
  }
};

// Verify token controller / Get current user
export const getMe: RequestHandler = async (req, res) => {
  try {
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      res.status(401).json({
        success: false,
        error: "Access token not found",
      });
      return;
    }

    const user = await verifyAndGetUser(accessToken);

    // Check if user has an organization
    let hasOrganization = false;
    try {
      const { supabase } = require("../utils/supabase");
      const { data: orgData, error: orgError } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", user.id)
        .single();
      
      hasOrganization = !orgError && !!orgData;
    } catch (orgCheckError) {
      console.log("Could not check organization status:", orgCheckError);
      // Don't fail the auth, just assume no org
      hasOrganization = false;
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          emailConfirmed: user.email_confirmed_at !== null,
          full_name: user.user_metadata?.full_name,
          avatar_url: user.user_metadata?.avatar_url,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
        hasOrganization,
        needsOrgSetup: !hasOrganization,
      },
    });
  } catch (error) {
    console.error("Get me error:", error);
    // If token is invalid, clear cookies
    clearAuthCookies(res);
    res.status(401).json({
      success: false,
      error: "Invalid or expired token",
    });
  }
};

// Legacy verify token controller (keeping for backward compatibility)
export const verifyToken: RequestHandler = async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      res.status(400).json({
        success: false,
        error: "Access token is required",
      });
      return;
    }

    // Use Supabase to verify the token and get user data
    const user = await verifyAndGetUser(accessToken);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          emailConfirmed: user.email_confirmed_at !== null,
        },
        valid: true,
      },
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({
      success: false,
      error: "Token verification failed",
    });
  }
};

// Logout controller
export const logout: RequestHandler = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      // Revoke the refresh token on the server side
      const { error } = await adminClient.auth.admin.signOut(refreshToken);
      if (error) {
        console.error("Error revoking token:", error);
      }
    }

    // Clear auth cookies
    clearAuthCookies(res);

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    clearAuthCookies(res);
    res.json({
      success: true,
      message: "Logged out successfully",
    });
  }
};

// Resend email confirmation controller
export const resendConfirmation: RequestHandler = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        error: "Email is required",
      });
      return;
    }

    // Resend confirmation email using Supabase
    const { error } = await adminClient.auth.resend({
      type: "signup",
      email: email,
      options: {
        emailRedirectTo: `${process.env.FRONTEND_URL}/auth/confirm`,
      },
    });
    console.log("error", error);
    if (error) {
      console.error("Resend confirmation error:", error);
      res.status(400).json({
        success: false,
        error: error.message || "Failed to resend confirmation email",
      });
      return;
    }

    res.json({
      success: true,
      message: "Confirmation email sent successfully",
    });
  } catch (error) {
    console.error("Resend confirmation error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// Check email confirmation status by user ID
export const checkEmailConfirmation: RequestHandler = async (req, res) => {
  try {
    //  /api/auth/check-email-confirmation/${userId
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: "User ID is required",
      });
      return;
    }

    // Get user data from Supabase using admin client
    const { data, error } = await adminClient.auth.admin.getUserById(userId);

    if (error) {
      console.error("Error fetching user:", error);
      res.status(400).json({
        success: false,
        error: error.message || "Failed to fetch user",
      });
      return;
    }

    if (!data.user) {
      res.status(404).json({
        success: false,
        error: "User not found",
      });
      return;
    }
    console.log(data.user.user_metadata.email_verified)
    res.json({
      success: true,
      data: {
        userId: data.user.id,
        emailConfirmed: data.user.user_metadata.email_verified,
        needsEmailConfirmation: !data.user.user_metadata.email_verified,
      },
    });
  } catch (error) {
    console.error("Check email confirmation error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// Confirm email with access token (handles Supabase redirect with access token)
export const confirmEmailWithAccessToken: RequestHandler = async (req, res) => {
  try {
    const { access_token, refresh_token } = req.body;

    if (!access_token) {
      res.status(400).json({
        success: false,
        error: "Access token is required",
      });
      return;
    }

    // Get user info using the access token
    const { data: userData, error: userError } = await adminClient.auth.getUser(access_token);

    if (userError || !userData.user) {
      console.error("Access token verification error:", userError);
      res.status(401).json({
        success: false,
        error: "Invalid or expired access token",
      });
      return;
    }

    // Set auth cookies
    // setAuthCookies(res, access_token, refresh_token);

    // Check if user has an organization
    let hasOrganization = false;
    try {
      const { supabase } = require("../utils/supabase");
      const { data: orgData, error: orgError } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", userData.user.id)
        .single();
      
      hasOrganization = !orgError && !!orgData;
    } catch (orgCheckError) {
      console.log("Could not check organization status:", orgCheckError);
      hasOrganization = false;
    }

    res.json({
      success: true,
      data: {
        user: {
          id: userData.user.id,
          email: userData.user.email,
          emailConfirmed: userData.user.email_confirmed_at !== null,
        },
        hasOrganization,
        needsOrgSetup: !hasOrganization,
        message: "Email confirmed and user authenticated successfully",
      },
      tokens: {
        accessToken: access_token,
        refreshToken: refresh_token,
      },
    });
  } catch (error) {
    console.error("Email confirmation with access token error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// Confirm email with token (handles email confirmation link clicks)
export const confirmEmail: RequestHandler = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({
        success: false,
        error: "Confirmation token is required",
      });
      return;
    }

    // Verify the token and exchange it for a session
    const { data, error } = await adminClient.auth.verifyOtp({
      token_hash: token,
      type: 'signup'
    });

    if (error) {
      console.error("Email confirmation error:", error);
      res.status(400).json({
        success: false,
        error: error.message || "Invalid or expired confirmation token",
      });
      return;
    }

    if (!data.user) {
      res.status(400).json({
        success: false,
        error: "Failed to confirm email",
      });
      return;
    }

    // Set auth cookies if we have a session
    if (data.session) {
      setAuthCookies(
        res,
        data.session.access_token,
        data.session.refresh_token
      );
    }

    res.json({
      success: true,
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          emailConfirmed: data.user.email_confirmed_at !== null,
        },
        message: "Email confirmed successfully",
      },
    });
  } catch (error) {
    console.error("Email confirmation error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// Update Password controller (for authenticated users)
export const updatePassword: RequestHandler = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const user = (req as any).user;

    if (!newPassword) {
      res.status(400).json({
        success: false,
        error: "New password is required",
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters",
      });
      return;
    }

    // Update password using admin client with the user's ID
    const { data, error } = await adminClient.auth.admin.updateUserById(
      user.id,
      {
        password: newPassword,
      }
    );

    if (error) {
      console.error("Update password error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
      return;
    }

    res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Update password error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};





