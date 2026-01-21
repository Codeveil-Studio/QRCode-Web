import { Request, Response, NextFunction } from "express";
import { verifyAndGetUser, anonClient } from "../utils/supabase";
import { User } from "../types";

// Extend Express Request interface to include user and accessToken
export interface AuthRequest extends Request {
  user?: User;
  accessToken?: string;
}

// Cookie configuration
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite:
    process.env.NODE_ENV === "production"
      ? ("strict" as const)
      : ("lax" as const), // Use 'lax' in development for cross-origin
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
  res: Response,
  accessToken: string,
  refreshToken: string
) => {
  res.cookie("accessToken", accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
  res.cookie("refreshToken", refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
};

// Helper function to clear auth cookies
const clearAuthCookies = (res: Response) => {
  res.clearCookie("accessToken", COOKIE_OPTIONS);
  res.clearCookie("refreshToken", COOKIE_OPTIONS);
};

// Helper function to attempt token refresh
const attemptTokenRefresh = async (
  res: Response,
  refreshToken: string
): Promise<string | null> => {
  try {
    const { data, error } = await anonClient.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      return null;
    }

    // Set new cookies
    setAuthCookies(res, data.session.access_token, data.session.refresh_token);
    return data.session.access_token;
  } catch (error) {
    console.error("Token refresh error:", error);
    return null;
  }
};

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get tokens from cookies or Authorization header
    let accessToken = req.cookies?.accessToken;
    const refreshToken = req.cookies?.refreshToken;

    // Check Authorization header if no cookie
    if (!accessToken && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        accessToken = authHeader.substring(7);
      }
    }

    if (!accessToken) {
      // If no access token but we have a refresh token, try to refresh
      if (refreshToken) {
        accessToken = await attemptTokenRefresh(res, refreshToken);
      }

      if (!accessToken) {
        clearAuthCookies(res);
        res.status(401).json({
          success: false,
          error: "Authentication required",
        });
        return;
      }
    }

    try {
      // Verify token and get user
      const user = await verifyAndGetUser(accessToken);

      // Attach user and token to request object
      req.user = {
        id: user.id,
        email: user.email || "",
        full_name: user.user_metadata?.full_name,
        avatar_url: user.user_metadata?.avatar_url,
        created_at: user.created_at,
        updated_at: user.updated_at,
      };
      req.accessToken = accessToken;

      next();
    } catch (verifyError) {
      // If token verification fails and we have a refresh token, try to refresh
      if (refreshToken) {
        const newAccessToken = await attemptTokenRefresh(res, refreshToken);

        if (newAccessToken) {
          // Retry with new token
          const user = await verifyAndGetUser(newAccessToken);
          req.user = {
            id: user.id,
            email: user.email || "",
            full_name: user.user_metadata?.full_name,
            avatar_url: user.user_metadata?.avatar_url,
            created_at: user.created_at,
            updated_at: user.updated_at,
          };
          req.accessToken = newAccessToken;
          next();
          return;
        }
      }

      // If all fails, clear cookies and return unauthorized
      clearAuthCookies(res);
      res.status(401).json({
        success: false,
        error: "Invalid or expired token",
      });
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    clearAuthCookies(res);
    res.status(401).json({
      success: false,
      error: "Authentication failed",
    });
  }
};

// Optional auth middleware - doesn't fail if no token provided
export const optionalAuthMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let accessToken = req.cookies?.accessToken;
    const refreshToken = req.cookies?.refreshToken;

    if (accessToken) {
      try {
        const user = await verifyAndGetUser(accessToken);
        req.user = {
          id: user.id,
          email: user.email || "",
          full_name: user.user_metadata?.full_name,
          avatar_url: user.user_metadata?.avatar_url,
          created_at: user.created_at,
          updated_at: user.updated_at,
        };
        req.accessToken = accessToken;
      } catch (verifyError) {
        // Try to refresh if access token is invalid
        if (refreshToken) {
          const newAccessToken = await attemptTokenRefresh(res, refreshToken);
          if (newAccessToken) {
            try {
              const user = await verifyAndGetUser(newAccessToken);
              req.user = {
                id: user.id,
                email: user.email || "",
                full_name: user.user_metadata?.full_name,
                avatar_url: user.user_metadata?.avatar_url,
                created_at: user.created_at,
                updated_at: user.updated_at,
              };
              req.accessToken = newAccessToken;
            } catch (error) {
              // Silently fail for optional auth
              console.warn("Optional auth token refresh failed:", error);
            }
          }
        }
      }
    }

    next();
  } catch (error) {
    // For optional auth, we continue even if token is invalid
    console.warn("Optional auth middleware warning:", error);
    next();
  }
};

// Middleware that allows unauthenticated requests only from frontend URL
export const frontendOnlyMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    // Check if request is coming from the frontend
    const isFromFrontend =
      origin === frontendUrl || (referer && referer.startsWith(frontendUrl));

    if (!isFromFrontend) {
      res.status(403).json({
        success: false,
        error: "Access denied: requests only allowed from frontend application",
      });
      return;
    }

    next();
  } catch (error) {
    console.error("Frontend-only middleware error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
