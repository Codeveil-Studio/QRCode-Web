"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import SignInForm from "../components/sign-in-form";

// Function to parse URL hash parameters
function parseHashParams(): Record<string, string> {
  if (typeof window === "undefined") return {};

  const hash = window.location.hash.substring(1); // Remove the # character
  const params: Record<string, string> = {};

  if (hash) {
    const pairs = hash.split("&");
    for (const pair of pairs) {
      const [key, value] = pair.split("=");
      if (key && value) {
        params[decodeURIComponent(key)] = decodeURIComponent(value);
      }
    }
  }

  return params;
}

export default function LoginPage() {
  const router = useRouter();
  const { loading } = useAuth();

  useEffect(() => {
    // Check if this is a password recovery redirect
    const hashParams = parseHashParams();
    const type = hashParams.type;
    const accessToken = hashParams.access_token;

    console.log("Login page - Hash params:", hashParams);
    console.log(
      "Login page - Type:",
      type,
      "Access Token:",
      accessToken ? "present" : "missing"
    );

    if (type === "recovery" && accessToken) {
      // Redirect to reset password page with the token
      router.push(
        `/auth/reset-password?token=${encodeURIComponent(
          accessToken
        )}&type=recovery`
      );
      return;
    }

    // Handle post-signup redirect - user has confirmed their email
    if (type === "signup" && accessToken) {
      console.log("Detected signup redirect");
      // The user has completed email verification after signup
      // Clear the hash to prevent loops
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }
  }, [router, loading]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <SignInForm />;
}
