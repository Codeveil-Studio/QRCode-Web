const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Standard API call with credentials for authenticated requests
export const apiCall = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}> => {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      credentials: "include", // Always include cookies
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

// Public API call wrapper for unauthenticated endpoints
export const publicApiCall = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}> => {
  try {
    const headers: Record<string, string> = {
      ...((options.headers as Record<string, string>) || {}),
    };

    // Only set Content-Type to application/json if body is not FormData
    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    console.log("API_BASE_URL", `${API_BASE_URL}${endpoint}`);
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      credentials: "include",
      headers,
    });

    console.log(
      "Response headers:",
      Object.fromEntries(response.headers.entries())
    );
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || `HTTP Error: ${response.status}`,
      };
    }

    return {
      success: true,
      data: data.data,
      message: data.message,
    };
  } catch (error) {
    console.error("Public API call failed:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
};

// Auth API functions
export const authAPI = {
  // Login with email and password
  login: async (email: string, password: string) => {
    console.log("Making login request...");
    const result = await publicApiCall("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    console.log("Login result:", result);
    return result;
  },

  // Register new user
  signup: async (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) => {
    const result = await publicApiCall("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, firstName, lastName }),
    });

    return result;
  },

  // Forgot password
  forgotPassword: async (email: string) => {
    return await publicApiCall("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  // Reset password
  resetPassword: async (token: string, newPassword: string) => {
    return await publicApiCall("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    });
  },

  // Refresh token
  refreshToken: async () => {
    const result = await publicApiCall("/api/auth/refresh-token", {
      method: "POST",
    });

    return result;
  },

  // Logout
  logout: async () => {
    const result = await apiCall("/api/auth/logout", {
      method: "POST",
    });

    return result;
  },

  // Get current user info
  getCurrentUser: async () => {
    return await apiCall("/api/auth/me");
  },

  // Check if user is authenticated (helper method)
  isAuthenticated: async () => {
    try {
      const result = await apiCall("/api/auth/me");
      return result.success;
    } catch (error) {
      return false;
    }
  },

  // Resend email confirmation
  resendConfirmation: async (email: string) => {
    return await apiCall("/api/auth/resend-confirmation", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  // Check email confirmation status by user ID
  checkEmailConfirmation: async (userId: string) => {
    return await publicApiCall(`/api/auth/check-email-confirmation/${userId}`);
  },

  // Update password for authenticated user
  updatePassword: async (newPassword: string) => {
    return await apiCall("/api/auth/update-password", {
      method: "PUT",
      body: JSON.stringify({ newPassword }),
    });
  },

  // Confirm email with access token from Supabase redirect
  confirmWithAccessToken: async (accessToken: string, refreshToken?: string) => {
    return await publicApiCall("/api/auth/confirm-with-access-token", {
      method: "POST",
      body: JSON.stringify({ 
        access_token: accessToken, 
        refresh_token: refreshToken 
      }),
    });
  },
};

// Specific API functions

// Stats API
export const statsAPI = {
  getSidebar: () => apiCall("/api/stats/sidebar"),
  getDashboard: () => apiCall("/api/stats/dashboard"),
  getDashboardData: () => apiCall("/api/stats/dashboard-data"),
};

// Issues API - Full CRUD
export const issuesAPI = {
  // GET all issues
  getAll: () => apiCall("/api/issues"),

  // GET issue by ID
  getById: (id: string) => apiCall(`/api/issues/${id}`),

  // POST create new issue
  create: (issueData: any) =>
    apiCall("/api/issues", {
      method: "POST",
      body: JSON.stringify(issueData),
    }),

  // PUT update issue
  update: (id: string, issueData: any) =>
    apiCall(`/api/issues/${id}`, {
      method: "PUT",
      body: JSON.stringify(issueData),
    }),

  // DELETE issue
  delete: (id: string) =>
    apiCall(`/api/issues/${id}`, {
      method: "DELETE",
    }),

  // GET issues by asset
  getByAsset: (assetUid: string) => apiCall(`/api/issues/asset/${assetUid}`),

  // GET issues by asset (public endpoint, no auth required)
  getByAssetPublic: (assetUid: string) =>
    publicApiCall(`/api/issues/asset/${assetUid}/public`),

  // POST report issue (public endpoint)
  report: (issueData: any) =>
    publicApiCall("/api/issues/report", {
      method: "POST",
      body: JSON.stringify(issueData),
    }),

  // POST upload image (public endpoint, no auth required)
  uploadImage: (file: File, assetId: string) => {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("assetId", assetId);

    return publicApiCall("/api/issues/upload-image", {
      method: "POST",
      body: formData,
      headers: {}, // Don't set Content-Type, let browser set it with boundary for FormData
    });
  },

  // POST opt-in/confirm issue (public endpoint, no auth required)
  optIn: (issueUid: string, confirmationData: any) =>
    publicApiCall(`/api/issues/${issueUid}/opt-in`, {
      method: "POST",
      body: JSON.stringify(confirmationData),
    }),

  // PUT update issue confirmation (public endpoint, no auth required)
  updateConfirmation: (confirmationUid: string, confirmationData: any) =>
    publicApiCall(`/api/confirmations/${confirmationUid}`, {
      method: "PUT",
      body: JSON.stringify(confirmationData),
    }),
};

// Assets API - Full CRUD
export const assetsAPI = {
  // GET all assets
  getAll: () => apiCall("/api/assets"),

  // GET asset by ID
  getById: (id: string) => apiCall(`/api/assets/${id}`),

  // POST create new asset
  create: (assetData: any) =>
    apiCall("/api/assets", {
      method: "POST",
      body: JSON.stringify(assetData),
    }),

  // PUT update asset
  update: (id: string, assetData: any) =>
    apiCall(`/api/assets/${id}`, {
      method: "PUT",
      body: JSON.stringify(assetData),
    }),

  // DELETE asset
  delete: (id: string) =>
    apiCall(`/api/assets/${id}`, {
      method: "DELETE",
    }),
};

// Asset Types API - Full CRUD for asset types
export const assetTypesAPI = {
  // GET all asset types for organization
  getAll: (includeInactive = false) => 
    apiCall(`/api/asset-types${includeInactive ? '?includeInactive=true' : ''}`),

  // GET system/standard asset types available for adoption
  getSystem: () => apiCall("/api/asset-types/system"),

  // POST create new custom asset type
  create: (assetTypeData: {
    name: string;
    description?: string | null;
    category?: string | null;
    isCustom: boolean;
  }) =>
    apiCall("/api/asset-types", {
      method: "POST",
      body: JSON.stringify(assetTypeData),
    }),

  // POST adopt a system asset type
  adopt: (assetTypeId: number) =>
    apiCall("/api/asset-types/adopt", {
      method: "POST",
      body: JSON.stringify({ assetTypeId }),
    }),

  // PUT update asset type
  update: (id: string, assetTypeData: any) =>
    apiCall(`/api/asset-types/${id}`, {
      method: "PUT",
      body: JSON.stringify(assetTypeData),
    }),

  // PUT reactivate asset type
  reactivate: (id: string) =>
    apiCall(`/api/asset-types/${id}`, {
      method: "PUT",
      body: JSON.stringify({ is_active: true }),
    }),

  // DELETE asset type
  delete: (id: string) =>
    apiCall(`/api/asset-types/${id}`, {
      method: "DELETE",
    }),
};

// Profile API
export const profileAPI = {
  // GET profile
  get: () => apiCall("/api/profile"),

  // PUT update profile
  update: (profileData: any) =>
    apiCall("/api/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    }),
  getOrg: () => apiCall("/api/orgs/me"),

  // GET organization notification preferences (organization preferences only)
  getNotificationPreferences: () => apiCall("/api/notifications/preferences"),

  // PUT update organization notification preferences (organization preferences only)
  updateNotificationPreferences: (preferences: any) =>
    apiCall("/api/notifications/preferences", {
      method: "PUT",
      body: JSON.stringify(preferences),
    }),

  // Backward compatibility aliases for old method names
  getOrgNotificationPreferences: () =>
    apiCall("/api/notifications/preferences"),
  updateOrgNotificationPreferences: (preferences: any) =>
    apiCall("/api/notifications/preferences", {
      method: "PUT",
      body: JSON.stringify(preferences),
    }),

  // GET notification logs
  getNotificationLogs: (params?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.type) searchParams.append("type", params.type);
    if (params?.status) searchParams.append("status", params.status);

    const queryString = searchParams.toString();
    return apiCall(
      `/api/notifications/logs${queryString ? "?" + queryString : ""}`
    );
  },

  // POST send notification (legacy - keeping for backwards compatibility)
  sendNotification: (notificationData: any) =>
    apiCall("/api/profile/notifications/send", {
      method: "POST",
      body: JSON.stringify(notificationData),
    }),

  // GET user mobile number
  getMobileNumber: () => apiCall("/api/profile/mobile-number"),

  // PUT update user mobile number
  updateMobileNumber: (mobileNumber: string) =>
    apiCall("/api/profile/mobile-number", {
      method: "PUT",
      body: JSON.stringify({ mobileNumber }),
    }),

  // DELETE user mobile number
  deleteMobileNumber: () =>
    apiCall("/api/profile/mobile-number", {
      method: "DELETE",
    }),
};

// Backward compatibility aliases
export const getStats = statsAPI;
export const itemsAPI = assetsAPI; // Backward compatibility
export const itemTypesAPI = assetTypesAPI; // Backward compatibility
export const unauthenticatedApiCall = publicApiCall; // Backward compatibility

// Subscription API
export const subscriptionAPI = {
  // GET pricing tiers
  getPricingTiers: () => apiCall("/api/subscription/pricing"),

  // POST calculate pricing for asset count
  calculatePricing: (assetCount: number) =>
    apiCall("/api/subscription/pricing/calculate", {
      method: "POST",
      body: JSON.stringify({ assetCount }),
    }),

  // POST get pricing preview with tier breakdown
  getPricingPreview: (assetCount: number) =>
    apiCall("/api/subscriptions/pricing-preview", {
      method: "POST",
      body: JSON.stringify({ assetCount }),
    }),

  // POST create checkout session (updated to match backend endpoint)
  createCheckoutSession: (data: {
    assetCount: number;
    billingCycle: "monthly" | "annual";
    orgId: string;
  }) =>
    apiCall("/api/subscriptions/create-checkout", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // GET subscription details for organization
  getSubscriptionDetails: (orgId: string) =>
    apiCall(`/api/subscription/manage/${orgId}`),

  // Create customer portal session
  createCustomerPortalSession: (orgId: string) =>
    apiCall(`/api/subscriptions/portal/${orgId}`, {
      method: "POST",
    }),

  // Update this method name to match the new controller
  getOrganizationSubscription: (orgId: string) =>
    apiCall(`/api/subscriptions/org/${orgId}`),

  // New method for invoice history
  getInvoiceHistory: (orgId: string) =>
    apiCall(`/api/subscriptions/org/${orgId}/invoices`),

  // New method for current usage and billing projection
  getCurrentUsage: (orgId: string) =>
    apiCall(`/api/subscriptions/org/${orgId}/current-usage`),

  // Update usage reporting
  updateUsage: (orgId: string, assetCount: number) =>
    apiCall(`/api/subscriptions/org/${orgId}/usage`, {
      method: "POST",
      body: JSON.stringify({ assetCount }),
    }),

  // Update subscription asset count
  updateSubscriptionAssetCount: (orgId: string, assetCount: number) =>
    apiCall(`/api/subscriptions/org/${orgId}/update-asset-count`, {
      method: "POST",
      body: JSON.stringify({ assetCount }),
    }),
};

// Organization API
export const orgsAPI = {
  // POST create new organization
  create: (data: { name: string; userId?: string }) =>
    apiCall("/api/organizations/create", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // GET check subscription status for user's organization
  checkSubscriptionStatus: () =>
    apiCall("/api/organizations/subscription-status"),

  // POST update asset count for organization
  updateAssetCount: (orgId: string, change: number) =>
    apiCall(`/api/orgs/${orgId}/assets`, {
      method: "POST",
      body: JSON.stringify({ change }),
    }),

  // POST create invite code for organization
  createInvite: (data: { email?: string; maxUses?: number }) =>
    apiCall("/api/organizations/create-invite", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // POST validate invite code (public)
  validateInvite: (inviteCode: string) =>
    publicApiCall("/api/organizations/validate-invite", {
      method: "POST",
      body: JSON.stringify({ inviteCode }),
    }),

  // POST join organization with invite code
  joinWithInvite: (inviteCode: string, userId: string) =>
    publicApiCall("/api/organizations/join-with-invite", {
      method: "POST",
      body: JSON.stringify({ inviteCode, userId }),
    }),

  // GET check if email domain has existing organization (public)
  checkEmailDomain: (email: string) =>
    publicApiCall(
      `/api/organizations/check-email-domain?email=${encodeURIComponent(email)}`
    ),
};

// Health check
export const healthCheck = () => apiCall("/health");

// Support API
export const supportAPI = {
  // Submit support contact form
  submitContactForm: async (formData: {
    name: string;
    email: string;
    subject: string;
    message: string;
    priority: 'low' | 'medium' | 'high';
  }) => {
    return await apiCall("/api/support/contact", {
      method: "POST",
      body: JSON.stringify({
        ...formData,
        timestamp: new Date().toISOString().slice(0, 19).replace('T', ' ')
      }),
    });
  },
};

// Download API for blob responses (CSV files, etc.)
export const downloadAPI = {
  downloadFile: async (
    endpoint: string
  ): Promise<{ success: boolean; blob?: Blob; error?: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "GET",
        credentials: "include", // Use same credential pattern as apiCall
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const blob = await response.blob();
      return { success: true, blob };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },

  // Specific download functions for reports
  downloadOpenIssues: () =>
    downloadAPI.downloadFile("/api/reports/download/open-issues"),
  downloadResolvedIssues: () =>
    downloadAPI.downloadFile("/api/reports/download/resolved-issues"),
  downloadInProgressIssues: () =>
    downloadAPI.downloadFile("/api/reports/download/in-progress-issues"),
  downloadAllAssets: () =>
    downloadAPI.downloadFile("/api/reports/download/assets"),
};

// Reports API
export const reportsAPI = {
  // GET comprehensive report data (current endpoint)
  getComprehensiveReport: () => apiCall("/api/reports/comprehensive"),

  // Standard Reports
  getAssetStats: () => apiCall("/api/reports/asset-stats"),
  getIssueStats: () => apiCall("/api/reports/issue-stats"),
  getOrganizationStats: () => apiCall("/api/reports/organization-stats"),
  getSubscriptionStats: () => apiCall("/api/reports/subscription-stats"),

  // Analytics/Charts Data
  getAssetUtilization: () => apiCall("/api/reports/analytics/asset-utilization"),
  getIssueResolutionTrends: () => apiCall("/api/reports/analytics/issue-resolution-trends"),
  getMaintenanceOverdue: () => apiCall("/api/reports/analytics/maintenance-overdue"),
  getIssuesPerAsset: () => apiCall("/api/reports/analytics/issues-per-asset"),
  getIssuesPerAssetType: () => apiCall("/api/reports/analytics/issues-per-asset-type"),
  getAssetsAddedOverTime: () => apiCall("/api/reports/analytics/assets-added-over-time"),
  getUpcomingMaintenance: () => apiCall("/api/reports/analytics/upcoming-maintenance"),
  getTopAssetsWithIssues: () => apiCall("/api/reports/analytics/top-assets-with-issues"),
};

// AI-Powered Reports API
export const aiReportsAPI = {
  // GET all AI insights (current structure)
  getAllAIInsights: () => apiCall("/api/reports/ai/insights"),

  // Individual AI Report Endpoints
  // 1. Predictive Maintenance
  getPredictiveMaintenanceAlerts: () => 
    apiCall("/api/reports/ai/predictive-maintenance"),
  
  // POST trigger predictive maintenance analysis for specific assets
  analyzePredictiveMaintenance: (assetIds: string[]) =>
    apiCall("/api/reports/ai/predictive-maintenance/analyze", {
      method: "POST",
      body: JSON.stringify({ assetIds }),
    }),

  // 2. Issue Pattern Detection
  getIssuePatterns: () => apiCall("/api/reports/ai/issue-patterns"),
  
  // POST analyze patterns for specific time period
  analyzeIssuePatterns: (params: {
    startDate?: string;
    endDate?: string;
    assetTypes?: string[];
    minimumFrequency?: number;
  }) =>
    apiCall("/api/reports/ai/issue-patterns/analyze", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  // 3. Resource Optimization
  getResourceOptimization: () => apiCall("/api/reports/ai/resource-optimization"),
  
  // POST get optimization recommendations for specific areas
  getOptimizationRecommendations: (areas: string[]) =>
    apiCall("/api/reports/ai/resource-optimization/recommendations", {
      method: "POST",
      body: JSON.stringify({ areas }),
    }),

  // AI Configuration & Settings
  getAIConfig: () => apiCall("/api/reports/ai/config"),
  updateAIConfig: (config: {
    enablePredictiveMaintenance?: boolean;
    maintenancePredictionDays?: number;
    patternDetectionSensitivity?: number;
    optimizationThreshold?: number;
  }) =>
    apiCall("/api/reports/ai/config", {
      method: "PUT",
      body: JSON.stringify(config),
    }),

  // AI Model Training & Management
  // POST retrain AI models with latest data
  retrainModels: () =>
    apiCall("/api/reports/ai/models/retrain", {
      method: "POST",
    }),

  // GET AI model status and performance metrics
  getModelStatus: () => apiCall("/api/reports/ai/models/status"),

  // Advanced AI Features
  // POST generate custom AI insights for specific criteria
  generateCustomInsights: (criteria: {
    assetTypes?: string[];
    timeRange?: { start: string; end: string };
    focusAreas?: string[];
    insightTypes?: string[];
  }) =>
    apiCall("/api/reports/ai/insights/custom", {
      method: "POST",
      body: JSON.stringify(criteria),
    }),

  // GET AI recommendations for asset lifecycle management
  getAssetLifecycleRecommendations: () =>
    apiCall("/api/reports/ai/asset-lifecycle"),

  // POST analyze cost optimization opportunities
  analyzeCostOptimization: (params: {
    timeHorizon?: number; // months
    includeMaintenanceCosts?: boolean;
    includeReplacementCosts?: boolean;
  }) =>
    apiCall("/api/reports/ai/cost-optimization", {
      method: "POST",
      body: JSON.stringify(params),
    }),
};

// Debug function to test token refresh manually
export const debugTokenRefresh = async () => {
  try {
    // Test the refresh endpoint (relies on HttpOnly cookies)
    const result = await authAPI.refreshToken();
    return {
      success: true,
      refreshResponse: result,
    };
  } catch (error) {
    return { success: false, error: error };
  }
};

// Subscription status check utility
export const checkUserSubscriptionStatus = async () => {
  try {
    const result = await orgsAPI.checkSubscriptionStatus();
    if (result.success && result.data) {
      return {
        hasActiveSubscription: result.data.hasActiveSubscription || false,
        subscriptionStatus: result.data.status,
        orgId: result.data.orgId,
        requiresSubscription: result.data.requiresSubscription || false,
        trialInfo: result.data.trialInfo,
      };
    }
    return {
      hasActiveSubscription: false,
      subscriptionStatus: "none",
      orgId: null,
      requiresSubscription: true,
      trialInfo: null,
    };
  } catch (error) {
    console.error("Error checking subscription status:", error);
    return {
      hasActiveSubscription: false,
      subscriptionStatus: "error",
      orgId: null,
      requiresSubscription: true,
      trialInfo: null,
    };
  }
};
