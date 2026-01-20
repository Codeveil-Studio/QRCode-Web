"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { authAPI } from "@/utils/api";

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

function ConfirmEmailContent() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        // Parse the hash parameters
        const hashParams = parseHashParams();
        const accessToken = hashParams.access_token;
        const refreshToken = hashParams.refresh_token;
        const tokenType = hashParams.token_type;
        const type = hashParams.type;

        console.log("Confirm page - Hash parameters:", hashParams);
        console.log(
          "Confirm page - Type:",
          type,
          "Access Token:",
          accessToken ? "present" : "missing"
        );

        if (!accessToken || tokenType !== "bearer") {
          setStatus("error");
          setError(
            "Invalid confirmation link - missing or invalid access token"
          );
          return;
        }

        // Handle password recovery
        if (type === "recovery") {
          console.log("Confirm page - Processing recovery redirect");
          // Redirect to reset password page with the access token
          router.push(
            `/auth/reset-password?token=${encodeURIComponent(
              accessToken
            )}&type=recovery`
          );
          return;
        }

        if (type !== "signup") {
          console.log("Confirm page - Invalid type:", type);
          setStatus("error");
          setError("Invalid confirmation link - wrong type");
          return;
        }

        console.log("Confirm page - Processing signup confirmation");
        // Call the backend to authenticate with the access token
        const response = await authAPI.confirmWithAccessToken(
          accessToken,
          refreshToken
        );

        if (response.success && response.data) {
          setStatus("success");
          toast.success("Email confirmed successfully!");

          // Check if user needs org setup
          const needsOrgSetup = response.data.needsOrgSetup;
          console.log("Confirm page - Needs org setup:", needsOrgSetup);
          // Add a small delay to ensure cookies are processed before redirect
          setTimeout(() => {
            if (needsOrgSetup) {
              console.log("Confirm page - Redirecting to org-setup");
              router.push("/auth/org-setup");
            } else {
              console.log("Confirm page - Redirecting to dashboard");
              router.push("/");
            }
          }, 1000);
        } else {
          console.log("Confirm page - Confirmation failed:", response.error);
          setStatus("error");
          setError(response.error || "Failed to confirm email");
        }
      } catch (error) {
        console.error("Email confirmation error:", error);
        setStatus("error");
        setError("An unexpected error occurred during confirmation");
      }
    };

    // Only run confirmation if we're in the browser
    if (typeof window !== "undefined") {
      confirmEmail();
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {status === "loading" && (
            <>
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Confirming your email...
              </h2>
              <p className="text-gray-600">
                Please wait while we verify your email address and log you in.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Email Confirmed!
              </h2>
              <p className="text-gray-600 mb-6">
                Your email has been successfully verified and you're now logged
                in. You'll be redirected to complete your setup.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700">
                  Redirecting you to complete your organization setup...
                </p>
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Confirmation Failed
              </h2>
              <p className="text-gray-600 mb-6">
                {error || "There was an issue confirming your email address"}
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => router.push("/auth/signup")}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => router.push("/help")}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Get Help
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfirmEmailSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {/* Icon skeleton */}
          <div className="mx-auto w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4 animate-pulse"></div>

          {/* Title skeleton */}
          <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-2 animate-pulse"></div>

          {/* Description skeleton */}
          <div className="h-5 bg-gray-200 rounded w-64 mx-auto mb-6 animate-pulse"></div>

          {/* Status box skeleton */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="h-4 bg-gray-200 rounded w-56 mx-auto animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={<ConfirmEmailSkeleton />}>
      <ConfirmEmailContent />
    </Suspense>
  );
}
