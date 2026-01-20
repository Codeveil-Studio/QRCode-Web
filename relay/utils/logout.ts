// Simple logout utility
import { authAPI } from './api';

export const logout = async () => {
  try {
    // Call backend logout endpoint using the authAPI utility
    await authAPI.logout();
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    // Always redirect to login page regardless of API call result
    if (typeof window !== "undefined") {
      window.location.href = "/auth/login";
    }
  }
};
