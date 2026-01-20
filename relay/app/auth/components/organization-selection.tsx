"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  Building,
  Users,
  Plus,
  AlertCircle,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { orgsAPI } from "@/utils/api";

interface OrganizationSelectionProps {
  userEmail: string;
  userId?: string;
  onJoinOrganization: (orgId: string, orgName: string) => void;
  onCreateOrganization: () => void;
  onBack: () => void;
  inviteCode?: string; // If user came from invite link
}

export default function OrganizationSelection({
  userEmail,
  userId,
  onJoinOrganization,
  onCreateOrganization,
  onBack,
  inviteCode: initialInviteCode,
}: OrganizationSelectionProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState(initialInviteCode || "");
  const [inviteInfo, setInviteInfo] = useState<any>(null);
  const [emailDomainOrg, setEmailDomainOrg] = useState<any>(null);
  const [checkingDomain, setCheckingDomain] = useState(true);

  // Check if user's email domain has an existing organization
  useEffect(() => {
    const checkEmailDomain = async () => {
      setCheckingDomain(true);
      try {
        const result = await orgsAPI.checkEmailDomain(userEmail);
        if (result.success && result.data.hasOrganization) {
          setEmailDomainOrg(result.data);
        }
      } catch (error) {
        console.error("Error checking email domain:", error);
      } finally {
        setCheckingDomain(false);
      }
    };

    checkEmailDomain();
  }, [userEmail]);

  // Validate invite code when it changes
  useEffect(() => {
    if (inviteCode && inviteCode.length >= 6) {
      validateInviteCode();
    } else {
      setInviteInfo(null);
    }
  }, [inviteCode]);

  const validateInviteCode = async () => {
    if (!inviteCode.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await orgsAPI.validateInvite(inviteCode.trim());
      if (result.success) {
        setInviteInfo(result.data);
      } else {
        setError(result.error || "Invalid invite code");
        setInviteInfo(null);
      }
    } catch (error) {
      setError("Failed to validate invite code");
      setInviteInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWithInvite = async () => {
    if (!inviteInfo || !userId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await orgsAPI.joinWithInvite(inviteCode.trim(), userId);
      if (result.success) {
        toast.success(`Joined ${result.data.orgName} successfully!`);
        onJoinOrganization(result.data.orgId, result.data.orgName);
      } else {
        setError(result.error || "Failed to join organization");
      }
    } catch (error) {
      setError("Failed to join organization");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinDomainOrg = () => {
    if (emailDomainOrg) {
      onJoinOrganization(emailDomainOrg.orgId, emailDomainOrg.orgName);
    }
  };

  if (checkingDomain) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Setting up your account...
          </h2>
          <p className="text-gray-600">
            Checking if your organization already exists
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Join Your Organization
        </h2>
        <p className="text-gray-600">
          Choose how you'd like to set up your organization
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

      <div className="space-y-6">
        {/* Email Domain Organization */}
        {emailDomainOrg && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <Building className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="font-semibold text-blue-900">
                    Organization Found
                  </h3>
                </div>
                <p className="text-sm text-blue-700 mb-3">
                  We found an organization for your email domain:{" "}
                  <strong>{emailDomainOrg.orgName}</strong>
                </p>
                <button
                  onClick={handleJoinDomainOrg}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  disabled={loading}
                >
                  <Users className="h-4 w-4" />
                  Join {emailDomainOrg.orgName}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Invite Code Section */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center mb-4">
            <Users className="h-5 w-5 text-gray-600 mr-2" />
            <h3 className="font-semibold text-gray-900">
              Join with Invite Code
            </h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            If you have an invite code from a team member, enter it below.
          </p>

          <div className="space-y-4">
            <div>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-mono"
                placeholder="Enter invite code (e.g., ABC12345)"
                disabled={loading}
              />
            </div>

            {inviteInfo && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span className="font-medium text-green-900">
                    Valid Invite Code
                  </span>
                </div>
                <p className="text-sm text-green-700 mb-3">
                  You can join <strong>{inviteInfo.orgName}</strong>
                </p>
                <button
                  onClick={handleJoinWithInvite}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Joining...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4" />
                      Join {inviteInfo.orgName}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Create New Organization */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center mb-4">
            <Plus className="h-5 w-5 text-gray-600 mr-2" />
            <h3 className="font-semibold text-gray-900">
              Create New Organization
            </h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Start a new organization if you're the first person from your
            company or team.
          </p>
          <button
            onClick={onCreateOrganization}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
            disabled={loading}
          >
            <Building className="h-4 w-4" />
            Create Organization
          </button>
        </div>
      </div>

      {/* Back Button */}
      <div className="pt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium"
          disabled={loading}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>
    </div>
  );
}
