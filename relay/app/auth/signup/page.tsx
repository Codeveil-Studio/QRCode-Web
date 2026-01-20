"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { signUpWithEmail } from "../actions";
import { authAPI } from "../../../utils/api";
import SignUpForm from "../components/sign-up-form";
import EmailConfirmation from "../components/email-confirmation";
import OrganizationSetupForm from "../components/billing-setup-form";
import OrganizationSelection from "../components/organization-selection";

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState<
    "account" | "email-confirmation" | "organization-selection" | "organization"
  >("account");
  const [accountData, setAccountData] = useState<{
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    userId?: string;
    needsEmailConfirmation?: boolean;
  } | null>(null);
  const [emailConfirmationStatus, setEmailConfirmationStatus] = useState<{
    isConfirmed: boolean;
    loading: boolean;
  }>({ isConfirmed: false, loading: false });
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [joinedOrgData, setJoinedOrgData] = useState<{
    orgId: string;
    orgName: string;
  } | null>(null);

  // Extract invite code from URL on component mount
  useEffect(() => {
    const inviteParam = searchParams.get("invite");
    if (inviteParam) {
      setInviteCode(inviteParam);
    }

    // Handle confirmed parameter (when redirected from email confirmation)
    const confirmedParam = searchParams.get("confirmed");
    if (confirmedParam === "true") {
      toast.success("Email confirmed successfully!");
      // If user is already on organization step, update email confirmation status
      if (currentStep === "email-confirmation") {
        setEmailConfirmationStatus({ isConfirmed: true, loading: false });
        setCurrentStep("organization-selection");
      }
    }

    // Handle existing user redirected from login (needs org setup)
    const needsOrgSetup = searchParams.get("setup");
    if (needsOrgSetup === "true") {
      // Check if user is already authenticated and get their info
      checkAuthenticatedUser();
    }
  }, [searchParams, currentStep]);

  // Check if user is already authenticated (redirected from login)
  const checkAuthenticatedUser = async () => {
    try {
      const result = await authAPI.getCurrentUser();
      if (result.success && result.data?.user) {
        // User is authenticated, set their data and go to org selection
        setAccountData({
          email: result.data.user.email || "",
          password: "", // Not needed since they're already authenticated
          firstName: result.data.user.first_name || "",
          lastName: result.data.user.last_name || "",
          userId: result.data.user.id,
          needsEmailConfirmation: false, // They're already authenticated
        });
        setCurrentStep("organization-selection");
      }
    } catch (error) {
      console.error("Error checking authenticated user:", error);
      // If there's an error, continue with normal signup flow
    }
  };

  // Check email confirmation status when we have a userId
  const checkEmailConfirmationStatus = async (userId: string) => {
    setEmailConfirmationStatus({ isConfirmed: false, loading: true });
    try {
      const result = await authAPI.checkEmailConfirmation(userId);
      if (result.success) {
        setEmailConfirmationStatus({
          isConfirmed: result.data.emailConfirmed,
          loading: false,
        });
      }
    } catch (error) {
      console.error("Error checking email confirmation:", error);
      setEmailConfirmationStatus({ isConfirmed: false, loading: false });
    }
  };

  // Check confirmation status when accountData changes
  useEffect(() => {
    if (accountData?.userId && accountData.needsEmailConfirmation) {
      checkEmailConfirmationStatus(accountData.userId);
    }
  }, [accountData?.userId]);

  const handleAccountSubmit = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => {
    const result = await signUpWithEmail(email, password, firstName, lastName);
    if (result.success) {
      setAccountData({
        email,
        password,
        firstName,
        lastName,
        userId: result.userId,
        needsEmailConfirmation: result.needsEmailConfirmation,
      });

      // If email confirmation is needed, go to email confirmation step
      if (result.needsEmailConfirmation) {
        setCurrentStep("email-confirmation");
      } else {
        // If email is already confirmed, go to organization selection
        setCurrentStep("organization-selection");
      }
    } else {
      throw new Error(result.error || "Failed to sign up");
    }
  };

  const handleEmailConfirmed = () => {
    // Update the email confirmation status
    setEmailConfirmationStatus({ isConfirmed: true, loading: false });
    setCurrentStep("organization-selection");
  };

  const handleJoinOrganization = (orgId: string, orgName: string) => {
    setJoinedOrgData({ orgId, orgName });
    // Complete the signup process since they joined an existing org
    handleOrganizationComplete();
  };

  const handleCreateOrganization = () => {
    setCurrentStep("organization");
  };

  // Function to refresh email confirmation status
  const refreshEmailConfirmationStatus = () => {
    if (accountData?.userId) {
      checkEmailConfirmationStatus(accountData.userId);
    }
  };

  const handleOrganizationComplete = () => {
    const orgName = joinedOrgData?.orgName || "your organization";
    toast.success(`Welcome to ${orgName}!`);
    router.push("/");
  };

  const handleBackFromEmailConfirmation = () => {
    setCurrentStep("account");
  };

  const handleBackFromOrganizationSelection = () => {
    // If they needed email confirmation, go back to that step
    if (
      accountData?.needsEmailConfirmation &&
      !emailConfirmationStatus.isConfirmed
    ) {
      setCurrentStep("email-confirmation");
    } else {
      setCurrentStep("account");
    }
  };

  const handleBackFromOrganization = () => {
    setCurrentStep("organization-selection");
  };

  const getProgressSteps = () => {
    // If user joined an existing organization, skip the org creation step
    if (joinedOrgData) {
      // If we have account data and it's confirmed
      if (
        accountData &&
        (!accountData.needsEmailConfirmation ||
          emailConfirmationStatus.isConfirmed)
      ) {
        // 2-step flow: Account → Join Organization
        return [
          { key: "account", label: "Account", number: 1 },
          {
            key: "organization-selection",
            label: "Join Organization",
            number: 2,
          },
        ];
      } else {
        // 3-step flow: Account → Email → Join Organization
        return [
          { key: "account", label: "Account", number: 1 },
          { key: "email-confirmation", label: "Email Confirmation", number: 2 },
          {
            key: "organization-selection",
            label: "Join Organization",
            number: 3,
          },
        ];
      }
    }

    // Standard flow with organization creation
    if (
      accountData &&
      (!accountData.needsEmailConfirmation ||
        emailConfirmationStatus.isConfirmed)
    ) {
      // 3-step flow: Account → Organization Selection → Organization Setup
      return [
        { key: "account", label: "Account", number: 1 },
        { key: "organization-selection", label: "Organization", number: 2 },
        { key: "organization", label: "Setup", number: 3 },
      ];
    } else {
      // 4-step flow: Account → Email → Organization Selection → Organization Setup
      return [
        { key: "account", label: "Account", number: 1 },
        { key: "email-confirmation", label: "Email Confirmation", number: 2 },
        { key: "organization-selection", label: "Organization", number: 3 },
        { key: "organization", label: "Setup", number: 4 },
      ];
    }
  };

  const progressSteps = getProgressSteps();
  const currentStepIndex = progressSteps.findIndex(
    (step) => step.key === currentStep
  );

  return (
    <div className="w-full max-w-lg mx-auto ">
      {/* Header */}
      <div className="mb-8 text-center ">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Create Account
        </h1>
        <p className="text-gray-600">Enter your details to get started</p>
      </div>

      {/* Progress indicator */}
      <div className="mb-8">
        <div
          className={`flex items-center justify-between max-w-sm mx-auto ${
            progressSteps.length === 2 ? "max-w-xs" : ""
          }`}
        >
          {progressSteps.map((step, index) => (
            <div key={step.key} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 ${
                    index <= currentStepIndex
                      ? "bg-blue-600 text-white shadow-lg"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {step.number}
                </div>
                <span className="mt-2 text-xs font-medium text-gray-700">
                  {step.label}
                </span>
              </div>
              {index < progressSteps.length - 1 && (
                <div className="flex-1 mx-4">
                  <div className="h-0.5 bg-gray-200 relative">
                    <div
                      className={`h-full bg-blue-600 transition-all duration-300 ${
                        index < currentStepIndex ? "w-full" : "w-0"
                      }`}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content Card */}
      <div className="">
        <div className="px-6 py-8 sm:px-8 sm:py-10">
          {currentStep === "account" && (
            <SignUpForm onSubmit={handleAccountSubmit} />
          )}
          {currentStep === "email-confirmation" && accountData && (
            <EmailConfirmation
              userEmail={accountData.email}
              userId={accountData.userId}
              onConfirmed={handleEmailConfirmed}
              onBack={handleBackFromEmailConfirmation}
            />
          )}
          {currentStep === "organization-selection" && accountData && (
            <OrganizationSelection
              userEmail={accountData.email}
              userId={accountData.userId}
              onJoinOrganization={handleJoinOrganization}
              onCreateOrganization={handleCreateOrganization}
              onBack={handleBackFromOrganizationSelection}
              inviteCode={inviteCode || undefined}
            />
          )}
          {currentStep === "organization" && accountData && (
            <OrganizationSetupForm
              userEmail={accountData.email}
              userId={accountData.userId}
              onComplete={handleOrganizationComplete}
              onBack={handleBackFromOrganization}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function SignupSkeleton() {
  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Header Skeleton */}
      <div className="mb-8 text-center">
        <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-2 animate-pulse"></div>
        <div className="h-5 bg-gray-200 rounded w-64 mx-auto animate-pulse"></div>
      </div>

      {/* Progress indicator skeleton */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-sm mx-auto">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
                <div className="mt-2 h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
              </div>
              {index < 2 && (
                <div className="flex-1 mx-4">
                  <div className="h-0.5 bg-gray-200 animate-pulse"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content Card Skeleton */}
      <div className="">
        <div className="px-6 py-8 sm:px-8 sm:py-10">
          <div className="space-y-6">
            {/* Form fields skeleton */}
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            </div>

            {/* Button skeleton */}
            <div className="h-12 bg-gray-200 rounded animate-pulse"></div>

            {/* Footer links skeleton */}
            <div className="text-center space-y-2">
              <div className="h-4 bg-gray-200 rounded w-48 mx-auto animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-32 mx-auto animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupSkeleton />}>
      <SignupContent />
    </Suspense>
  );
}
