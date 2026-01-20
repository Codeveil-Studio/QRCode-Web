import React from "react";
import { useSubscriptionStatus } from "@/utils/hooks/useSubscriptionStatus";
import { AlertCircle, CreditCard, Clock } from "lucide-react";

interface SubscriptionGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showPrompt?: boolean;
}

export const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({
  children,
  fallback,
  showPrompt = true,
}) => {
  const {
    hasActiveSubscription,
    subscriptionStatus,
    orgName,
    requiresSubscription,
    loading,
    error,
  } = useSubscriptionStatus();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
        <span className="ml-3 text-gray-600">
          Checking subscription status...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <p className="text-sm text-red-700">
            Unable to verify subscription status: {error}
          </p>
        </div>
      </div>
    );
  }

  // If subscription is active, show children
  if (hasActiveSubscription) {
    return <>{children}</>;
  }

  // If subscription is not required, show children
  if (!requiresSubscription) {
    return <>{children}</>;
  }

  // If custom fallback is provided, use it
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show default subscription prompt
  if (showPrompt) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <CreditCard className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Subscription Required
          </h3>
          <p className="text-gray-600 mb-4">
            {orgName ? `${orgName} needs` : "Your organization needs"} an active
            subscription to access this feature.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
            <Clock className="h-4 w-4" />
            <span>Status: {subscriptionStatus}</span>
          </div>
          <button
            onClick={() => {
              // Navigate to subscription/billing page
              window.location.href = "/subscription";
            }}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Set Up Subscription
          </button>
        </div>
      </div>
    );
  }

  // If no prompt should be shown, return null
  return null;
};

export default SubscriptionGuard;
