import { useState, useEffect } from "react";
import { checkUserSubscriptionStatus } from "../api";

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  subscriptionStatus: string;
  orgId: string | null;
  orgName?: string;
  requiresSubscription: boolean;
  hasStripeCustomer?: boolean;
  trialInfo?: any;
  loading: boolean;
  error: string | null;
}

export const useSubscriptionStatus = (checkOnMount: boolean = true) => {
  const [status, setStatus] = useState<SubscriptionStatus>({
    hasActiveSubscription: false,
    subscriptionStatus: "unknown",
    orgId: null,
    requiresSubscription: true,
    loading: true,
    error: null,
  });

  const checkStatus = async () => {
    setStatus((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const result = await checkUserSubscriptionStatus();
      console.log("Subscription status result:", result);
      setStatus({
        ...result,
        loading: false,
        error: null,
      });
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to check subscription status",
      }));
    }
  };

  useEffect(() => {
    if (checkOnMount) {
      checkStatus();
    }
  }, [checkOnMount]);

  return {
    ...status,
    refetch: checkStatus,
  };
};
