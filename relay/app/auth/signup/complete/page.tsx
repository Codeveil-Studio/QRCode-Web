"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { Check, AlertCircle, Loader2 } from "lucide-react";

function SignupCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      setStatus("error");
      setError("Invalid session");
      return;
    }

    // Verify the checkout session and complete signup
    const verifyCheckout = async () => {
      try {
        const response = await fetch("/api/subscriptions/verify-checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId }),
        });

        const result = await response.json();

        if (result.success) {
          setStatus("success");
          toast.success("Welcome! Your account has been set up successfully.");

          // Redirect to dashboard after a short delay
          setTimeout(() => {
            router.push("/");
          }, 2000);
        } else {
          setStatus("error");
          setError(result.error || "Failed to verify checkout session");
        }
      } catch (error) {
        console.error("Error verifying checkout:", error);
        setStatus("error");
        setError("An unexpected error occurred");
      }
    };

    verifyCheckout();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {status === "loading" && (
              <>
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Setting up your account...
                </h2>
                <p className="text-gray-600">
                  Please wait while we complete your setup
                </p>
              </>
            )}

            {status === "success" && (
              <>
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Welcome to Relay!
                </h2>
                <p className="text-gray-600 mb-6">
                  Your account has been created and billing is set up. You'll be
                  redirected to your dashboard shortly.
                </p>
                <div className="space-y-3 text-sm text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    Account created
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    Organization set up
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    Billing configured
                  </div>
                </div>
              </>
            )}

            {status === "error" && (
              <>
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Setup Failed
                </h2>
                <p className="text-gray-600 mb-6">
                  {error || "There was an issue completing your account setup"}
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
    </div>
  );
}

function SignupCompleteSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {/* Icon skeleton */}
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse"></div>

            {/* Title skeleton */}
            <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-2 animate-pulse"></div>

            {/* Description skeleton */}
            <div className="h-5 bg-gray-200 rounded w-64 mx-auto mb-6 animate-pulse"></div>

            {/* Checklist items skeleton */}
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupCompletePage() {
  return (
    <Suspense fallback={<SignupCompleteSkeleton />}>
      <SignupCompleteContent />
    </Suspense>
  );
}
