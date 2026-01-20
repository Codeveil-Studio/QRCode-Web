"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import OrganizationSelection from "../components/organization-selection";
import OrganizationSetupForm from "../components/billing-setup-form";
import { Building, ArrowLeft } from "lucide-react";

type SetupStep = "selection" | "create";

export default function OrgSetupPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<SetupStep>("selection");

  // Redirect if user is not authenticated or email not confirmed
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/auth/login");
        return;
      }

      if (!user.emailConfirmed) {
        router.push("/auth/signup");
        return;
      }
    }
  }, [user, authLoading, router]);

  const handleJoinOrganization = (orgId: string, orgName: string) => {
    // Redirect to dashboard after joining organization
    router.push("/");
  };

  const handleCreateOrganization = () => {
    setCurrentStep("create");
  };

  const handleBackToSelection = () => {
    setCurrentStep("selection");
  };

  const handleOrganizationCreated = () => {
    // Redirect to dashboard after creating organization
    router.push("/");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!user || !user.emailConfirmed) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen ">
      <div className="max-w-md mx-auto pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className=" rounded-lg">
          {/* Header */}

          {/* Content */}
          {currentStep === "selection" && (
            <OrganizationSelection
              userEmail={user.email}
              userId={user.id}
              onJoinOrganization={handleJoinOrganization}
              onCreateOrganization={handleCreateOrganization}
              onBack={() => router.push("/")}
            />
          )}

          {currentStep === "create" && (
            <div>
              <button
                onClick={handleBackToSelection}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to options
              </button>
              <OrganizationSetupForm
                userEmail={user.email}
                userId={user.id}
                onComplete={handleOrganizationCreated}
                onBack={handleBackToSelection}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
