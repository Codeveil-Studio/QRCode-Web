// Frontend auth utilities for cookie-based authentication
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "https://app.qresolve.io" : "http://localhost:5000");

// Configure fetch with credentials to include cookies
const fetchWithCredentials = (url: string, options: RequestInit = {}) => {
  return fetch(url, {
    ...options,
    credentials: "include", // Always include cookies
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
};

export interface User {
  id: string;
  email: string;
  emailConfirmed: boolean;
  full_name?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
  };
  error?: string;
  message?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface GoogleSignInCredentials {
  idToken: string;
}

// Authentication API functions
export const authApi = {
  // Login with email and password
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetchWithCredentials(
      `${API_BASE_URL}/api/auth/login`,
      {
        method: "POST",
        body: JSON.stringify(credentials),
      }
    );
    return response.json();
  },

  // Sign up with email and password
  async signup(credentials: SignupCredentials): Promise<AuthResponse> {
    const response = await fetchWithCredentials(
      `${API_BASE_URL}/api/auth/signup`,
      {
        method: "POST",
        body: JSON.stringify(credentials),
      }
    );
    return response.json();
  },

  // Google Sign In
  async googleSignIn(
    credentials: GoogleSignInCredentials
  ): Promise<AuthResponse> {
    const response = await fetchWithCredentials(
      `${API_BASE_URL}/api/auth/google-signin`,
      {
        method: "POST",
        body: JSON.stringify(credentials),
      }
    );
    return response.json();
  },

  // Get current user (check authentication status)
  async getMe(): Promise<AuthResponse> {
    const response = await fetchWithCredentials(`${API_BASE_URL}/api/auth/me`);
    return response.json();
  },

  // Refresh access token
  async refreshToken(): Promise<AuthResponse> {
    const response = await fetchWithCredentials(
      `${API_BASE_URL}/api/auth/refresh-token`,
      {
        method: "POST",
      }
    );
    return response.json();
  },

  // Logout (clears HttpOnly cookies)
  async logout(): Promise<AuthResponse> {
    const response = await fetchWithCredentials(
      `${API_BASE_URL}/api/auth/logout`,
      {
        method: "POST",
      }
    );
    return response.json();
  },

  // Forgot password
  async forgotPassword(email: string): Promise<AuthResponse> {
    const response = await fetchWithCredentials(
      `${API_BASE_URL}/api/auth/forgot-password`,
      {
        method: "POST",
        body: JSON.stringify({ email }),
      }
    );
    return response.json();
  },

  // Reset password
  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<AuthResponse> {
    const response = await fetchWithCredentials(
      `${API_BASE_URL}/api/auth/reset-password`,
      {
        method: "POST",
        body: JSON.stringify({ token, newPassword }),
      }
    );
    return response.json();
  },
};

// Hook for checking authentication status
export const useAuth = () => {
  // This could be enhanced with React Query or SWR for caching
  const checkAuth = async (): Promise<User | null> => {
    try {
      const response = await authApi.getMe();
      if (response.success && response.data?.user) {
        return response.data.user;
      }
      return null;
    } catch (error) {
      console.error("Auth check failed:", error);
      return null;
    }
  };

  return { checkAuth };
};
