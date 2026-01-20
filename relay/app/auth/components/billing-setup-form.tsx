"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  Building,
  AlertCircle,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { orgsAPI } from "@/utils/api";

interface OrganizationSetupFormProps {
  userEmail: string;
  userId?: string;
  onComplete: () => void;
  onBack: () => void;
}

export default function OrganizationSetupForm({
  userEmail,
  userId,
  onComplete,
  onBack,
}: OrganizationSetupFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orgName.trim()) {
      setError("Organization name is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create the organization
      const orgResult = await orgsAPI.create({
        name: orgName.trim(),
        userId: userId,
      });

      if (!orgResult.success) {
        throw new Error(orgResult.error || "Failed to create organization");
      }

      setSuccess(true);
      toast.success("Organization created successfully!");

      // Delay to show success message, then complete
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (error) {
      console.error("Organization creation error:", error);
      setError(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to QResolve!
          </h2>
          <p className="text-gray-600">
            Your organization has been created successfully. You'll be
            redirected to the dashboard shortly.
          </p>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">What's Next?</h3>
          <p className="text-sm text-blue-700">
            You now have 3 free assets to get started! You can purchase more
            anytime in your profile settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Set Up Your Organization
        </h2>
        <p className="text-gray-600">
          Create your organization to get started with Relay
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Organization Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Building className="inline h-4 w-4 mr-2" />
            Organization Name
          </label>
          <input
            type="text"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Enter your organization name"
            required
            disabled={loading}
            autoFocus
          />
          <p className="mt-2 text-sm text-gray-500">
            This will be used to identify your organization in Relay
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3 text-lg">
            Ready to Get Started
          </h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>✓ Your organization will be created instantly</p>
            <p>✓ Get 3 free assets to start managing right away</p>
            <p>✓ Upgrade anytime to add more assets</p>
            <p>✓ No upfront payment required</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium"
            disabled={loading}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Creating Organization...
              </>
            ) : (
              <>
                Create Organization
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
