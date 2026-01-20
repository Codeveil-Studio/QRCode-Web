"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, X, TrendingUp } from "lucide-react";
import { profileAPI } from "@/utils/api";

interface UsageData {
  currentItems: number;
  itemLimit: number;
  subscriptionStatus: string;
}

export function UsageWarning() {
  const router = useRouter();
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    loadUsageData();
  }, []);

  const loadUsageData = async () => {
    try {
      const result = await profileAPI.get();
      if (result.success && result.data?.organization) {
        // You'll need to implement getting current item count
        // For now using mock data
        const mockUsageData: UsageData = {
          currentItems: 8, // This would come from your API
          itemLimit: 10,
          subscriptionStatus:
            result.data.organization.subscription_status || "free",
        };

        setUsageData(mockUsageData);

        // Show warning if using more than 80% of limit
        const usagePercentage =
          (mockUsageData.currentItems / mockUsageData.itemLimit) * 100;
        if (usagePercentage >= 80 && !isDismissed) {
          setIsVisible(true);
        }
      }
    } catch (error) {
      console.error("Error loading usage data:", error);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    // Store dismissal in localStorage to prevent showing again this session
    localStorage.setItem("usageWarningDismissed", "true");
  };

  const handleUpgrade = () => {
    router.push("/pricing");
  };

  if (!usageData || !isVisible) {
    return null;
  }

  const usagePercentage = (usageData.currentItems / usageData.itemLimit) * 100;
  const remainingItems = usageData.itemLimit - usageData.currentItems;

  return (
    <div className="fixed top-4 right-4 max-w-sm bg-white border border-yellow-300 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-sm">
            {remainingItems <= 0
              ? "Item Limit Reached"
              : "Approaching Item Limit"}
          </h3>
          <p className="text-gray-600 text-sm mt-1">
            {remainingItems <= 0
              ? "You've reached your item limit. Upgrade to add more items."
              : `You're using ${usageData.currentItems} of ${
                  usageData.itemLimit
                } items (${Math.round(
                  usagePercentage
                )}%). Only ${remainingItems} remaining.`}
          </p>

          {/* Usage Bar */}
          <div className="mt-2 mb-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  usagePercentage >= 100
                    ? "bg-red-500"
                    : usagePercentage >= 90
                    ? "bg-yellow-500"
                    : "bg-orange-500"
                }`}
                style={{ width: `${Math.min(100, usagePercentage)}%` }}
              ></div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleUpgrade}
              className="flex items-center gap-1 px-3 py-1.5 bg-yellow-600 text-white rounded text-xs font-medium hover:bg-yellow-700 transition-colors"
            >
              <TrendingUp className="h-3 w-3" />
              Upgrade
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-gray-600 rounded text-xs hover:bg-gray-100 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
