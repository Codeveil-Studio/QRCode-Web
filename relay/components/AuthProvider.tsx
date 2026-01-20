"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authAPI } from "@/utils/api";
import { useSubscriptionStatus } from "@/utils/hooks/useSubscriptionStatus";
import { CreditCard, X, Zap } from "lucide-react";

interface User {
  id: string;
  email: string;
  emailConfirmed: boolean;
  full_name?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

interface AuthData {
  user: User;
  hasOrganization?: boolean;
  needsOrgSetup?: boolean;
}

interface AuthContextType {
  user: User | null;
  hasOrganization?: boolean;
  needsOrgSetup?: boolean;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

// Subscription notification component
const SubscriptionNotification = ({
  onVisibilityChange,
}: {
  onVisibilityChange?: (visible: boolean) => void;
}) => {
  const [dismissed, setDismissed] = useState(false);
  const {
    hasActiveSubscription,
    subscriptionStatus,
    requiresSubscription,
    loading,
    orgId,
  } = useSubscriptionStatus();

  // Determine if notification should be visible
  const shouldShow =
    !loading && !dismissed && !hasActiveSubscription && requiresSubscription;

  // Notify parent about visibility changes
  useEffect(() => {
    onVisibilityChange?.(shouldShow);
  }, [shouldShow, onVisibilityChange]);

  // Don't render if not visible
  if (!shouldShow) {
    return null;
  }

  const handleUpgrade = () => {
    window.location.href = `/checkout`;
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform transition-transform duration-300 ease-in-out animate-in slide-in-from-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <Zap className="h-5 w-5 text-yellow-300" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                <span className="hidden sm:inline">
                  Upgrade to our volume-based pricing to unlock higher usage
                  limits and premium features.
                </span>
                <span className="sm:hidden">
                  Upgrade for higher usage limits.
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleUpgrade}
              className="bg-white text-blue-600 px-4 py-1.5 rounded-md text-sm font-semibold hover:bg-gray-100 transition-colors duration-200 flex items-center space-x-1"
            >
              <CreditCard className="h-4 w-4" />
              <span>Buy Assets Now</span>
            </button>
            <button
              onClick={handleDismiss}
              className="text-white hover:text-gray-200 transition-colors duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

const UNAUTHENTICATED_ROUTES = [
  "/auth/login",
  "/auth/signup",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
  "/auth/callback",
  "/auth/confirm",
  "/auth/auth-code-error",
  "/auth/signup/complete",
  "/report/",
  "/health",
];

const shouldSkipAuthCheck = (pathname: string | null) =>
  pathname
    ? pathname.startsWith("/report/") ||
      pathname === "/health" ||
      UNAUTHENTICATED_ROUTES.some((route) => pathname.startsWith(route))
    : false;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [hasOrganization, setHasOrganization] = useState<boolean | undefined>(
    undefined
  );
  const [needsOrgSetup, setNeedsOrgSetup] = useState<boolean | undefined>(
    undefined
  );
  const [loading, setLoading] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [notificationVisible, setNotificationVisible] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const checkAuth = async () => {
    if (shouldSkipAuthCheck(pathname)) {
      setUser(null);
      setLoading(false);
      return;
    }

    // Prevent multiple simultaneous auth checks
    if (isCheckingAuth) {
      return;
    }

    try {
      setIsCheckingAuth(true);
      setLoading(true);
      const result = await authAPI.getCurrentUser();

      if (result.success && result.data) {
        const authData = result.data as AuthData;
        setUser(authData.user);
        setHasOrganization(authData.hasOrganization);
        setNeedsOrgSetup(authData.needsOrgSetup);

        // Check if user needs organization setup
        if (authData.needsOrgSetup && authData.user.emailConfirmed) {
          // Only redirect if not already on org setup pages or confirm page
          if (
            !pathname.startsWith("/auth/org-setup") &&
            !pathname.startsWith("/auth/signup") &&
            !pathname.startsWith("/auth/confirm")
          ) {
            router.push("/auth/org-setup");
            return;
          }
        }
      } else {
        setUser(null);
        setHasOrganization(undefined);
        setNeedsOrgSetup(undefined);
      }
    } catch (error) {
      setUser(null);
      setHasOrganization(undefined);
      setNeedsOrgSetup(undefined);
    } finally {
      setLoading(false);
      setIsCheckingAuth(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const result = await authAPI.login(email, password);

      if (result.success) {
        // Check if user has organization setup after login
        const authResult = await authAPI.getCurrentUser();
        if (authResult.success && authResult.data) {
          const authData = authResult.data as AuthData;
          setUser(authData.user);
          setHasOrganization(authData.hasOrganization);
          setNeedsOrgSetup(authData.needsOrgSetup);

          // If user needs org setup, redirect there instead of dashboard
          if (authData.needsOrgSetup && authData.user.emailConfirmed) {
            router.push("/auth/org-setup");
          } else {
            router.push("/");
          }
        } else {
          router.push("/");
        }
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      // Continue with logout even if API fails
    }
    setUser(null);
    setHasOrganization(undefined);
    setNeedsOrgSetup(undefined);
    router.push("/auth/login");
  };

  useEffect(() => {
    // Debounce auth checks when pathname changes rapidly
    const timeoutId = setTimeout(() => {
      checkAuth();
    }, 100); // 100ms debounce

    return () => clearTimeout(timeoutId);
  }, [pathname]); // Check auth when route changes

  const isAuthenticated = user !== null;

  const value: AuthContextType = {
    user,
    hasOrganization,
    needsOrgSetup,
    loading,
    isAuthenticated,
    login,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Show subscription notification only for authenticated users */}
      {isAuthenticated && (
        <SubscriptionNotification onVisibilityChange={setNotificationVisible} />
      )}
      {/* Add padding only when notification is actually visible */}
      <div className={notificationVisible ? "pt-12" : ""}>{children}</div>
    </AuthContext.Provider>
  );
};
