import { authAPI } from "@/utils/api";
import { redirect } from "next/navigation";

// Google Sign-In types
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface ActionResponse {
  success: boolean;
  error?: string;
  userId?: string;
  needsEmailConfirmation?: boolean;
  isNewUser?: boolean;
  needsOrgSetup?: boolean;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  hasOrganization?: boolean;
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<ActionResponse> {
  try {
    const result = await authAPI.login(email, password);

    if (!result.success) {
      return { success: false, error: result.error || "Failed to sign in" };
    }

    return { 
      success: true,
      needsOrgSetup: result.data?.needsOrgSetup,
      hasOrganization: result.data?.hasOrganization,
    };
  } catch (error) {
    console.error("Error signing in:", error);
    return {
      success: false,
      error: "An unexpected error occurred during sign in",
    };
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  firstName?: string,
  lastName?: string
): Promise<ActionResponse> {
  try {
    const result = await authAPI.signup(email, password, firstName, lastName);

    if (!result.success) {
      return { success: false, error: result.error || "Failed to sign up" };
    }

    return {
      success: true,
      userId: result.data?.user?.id,
      needsEmailConfirmation: result.data?.needsEmailConfirmation,
      user: {
        id: result.data?.user?.id || "",
        email: email,
        firstName: firstName,
        lastName: lastName,
      },
    };
  } catch (error) {
    console.error("Error signing up:", error);
    return {
      success: false,
      error: "An unexpected error occurred during sign up",
    };
  }
}

export async function resetPassword(email: string): Promise<ActionResponse> {
  try {
    const result = await authAPI.forgotPassword(email);

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Failed to send reset email",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error resetting password:", error);
    return {
      success: false,
      error: "An unexpected error occurred while resetting password",
    };
  }
}

export async function signOut(): Promise<ActionResponse> {
  try {
    const result = await authAPI.logout();

    // Redirect to login regardless of API response since tokens are cleared
    redirect("/auth/login");
  } catch (error) {
    console.error("Error signing out:", error);
    // Still redirect even if there's an error
    redirect("/auth/login");
  }
}
