"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import {
  Users,
  Plus,
  Copy,
  ExternalLink,
  Clock,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { orgsAPI } from "@/utils/api";

interface InviteFeatureProps {
  organizationName: string;
}

export default function InviteFeature({
  organizationName,
}: InviteFeatureProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedInvite, setGeneratedInvite] = useState<{
    code: string;
    expiresAt: string;
    maxUses: number;
  } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [maxUses, setMaxUses] = useState(1);

  const handleCreateInvite = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await orgsAPI.createInvite({
        email: email.trim() || undefined,
        maxUses: maxUses,
      });

      if (result.success) {
        setGeneratedInvite({
          code: result.data.inviteCode,
          expiresAt: result.data.expiresAt,
          maxUses: result.data.maxUses,
        });
        toast.success("Invite code created successfully!");
        setShowForm(false);
        setEmail("");
        setMaxUses(1);
      } else {
        setError(result.error || "Failed to create invite");
      }
    } catch (error) {
      setError("Failed to create invite");
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = () => {
    if (!generatedInvite) return;

    const inviteUrl = `${window.location.origin}/auth/signup?invite=${generatedInvite.code}`;
    navigator.clipboard.writeText(inviteUrl);
    toast.success("Invite link copied to clipboard!");
  };

  const copyInviteCode = () => {
    if (!generatedInvite) return;

    navigator.clipboard.writeText(generatedInvite.code);
    toast.success("Invite code copied to clipboard!");
  };

  const getExpiryTime = () => {
    if (!generatedInvite) return "";

    const expiresAt = new Date(generatedInvite.expiresAt);
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (diff <= 0) return "Expired";
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Users className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Team Invites</h3>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            disabled={loading}
          >
            <Plus className="h-4 w-4" />
            Create Invite
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Create Invite Form */}
      {showForm && (
        <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-4">Create New Invite</h4>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email (Optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Leave empty for general invite"
                disabled={loading}
              />
              <p className="mt-1 text-sm text-gray-500">
                If specified, only this email can use the invite
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Uses
              </label>
              <select
                value={maxUses}
                onChange={(e) => setMaxUses(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              >
                <option value={1}>1 use</option>
                <option value={5}>5 uses</option>
                <option value={10}>10 uses</option>
                <option value={25}>25 uses</option>
                <option value={50}>50 uses</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCreateInvite}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create Invite
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEmail("");
                  setMaxUses(1);
                  setError(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Invite Display */}
      {generatedInvite && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <span className="font-medium text-green-900">Invite Created</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-green-900 mb-1">
                Invite Code
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-white border border-green-300 rounded font-mono text-lg tracking-wider">
                  {generatedInvite.code}
                </code>
                <button
                  onClick={copyInviteCode}
                  className="p-2 text-green-600 hover:bg-green-100 rounded transition-colors"
                  title="Copy code"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-green-900 mb-1">
                Invite Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={`${window.location.origin}/auth/signup?invite=${generatedInvite.code}`}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white border border-green-300 rounded text-sm"
                />
                <button
                  onClick={copyInviteLink}
                  className="p-2 text-green-600 hover:bg-green-100 rounded transition-colors"
                  title="Copy link"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <a
                  href={`/auth/signup?invite=${generatedInvite.code}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-green-600 hover:bg-green-100 rounded transition-colors"
                  title="Open link"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-green-700">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>Expires in: {getExpiryTime()}</span>
              </div>
              <span>Max uses: {generatedInvite.maxUses}</span>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!generatedInvite && !showForm && (
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="font-medium text-gray-900 mb-2">
            Invite Team Members
          </h4>
          <p className="text-sm text-gray-600 mb-4">
            Create invite codes to allow new users to join{" "}
            <strong>{organizationName}</strong>
          </p>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> Only organization admins can create invite
              codes.
            </p>
          </div>
          <ul className="text-sm text-gray-500 space-y-1 text-left max-w-sm mx-auto">
            <li>• Invite codes expire in 24 hours</li>
            <li>• Set maximum number of uses per code</li>
            <li>• Optionally restrict to specific email addresses</li>
            <li>• Share via link or code</li>
          </ul>
        </div>
      )}
    </div>
  );
}
