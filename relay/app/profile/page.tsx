"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { authAPI, profileAPI } from "@/utils/api";
import { useAuth } from "@/components/AuthProvider";

import { NotificationSettings } from "@/components/NotificationSettings";
import { AssetTypeManagement } from "@/components/AssetTypeManagement";
import InviteFeature from "../../components/invite-feature";

import {
  User,
  Mail,
  Calendar,
  LogOut,
  Bell,
  Tag,
  Activity,
  AlertTriangle,
  Edit,
  Save,
  X,
  CreditCard,
  Users,
} from "lucide-react";
import { SubscriptionBilling } from "@/components/SubscriptionBilling";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  assets_count: number;
  issues_count: number;
  created_at: string;
  last_sign_in_at: string | null;
  organization?: {
    name: string;
    role: string;
    joined_at: string;
  } | null;
}

// Skeleton Components
const SkeletonLine = ({
  width = "100%",
  height = "h-4",
}: {
  width?: string;
  height?: string;
}) => (
  <div
    className={`bg-gray-200 rounded animate-pulse ${height}`}
    style={{ width }}
  ></div>
);

const SkeletonCircle = ({ size = "h-16 w-16" }: { size?: string }) => (
  <div className={`bg-gray-200 rounded-full animate-pulse ${size}`}></div>
);

const SkeletonButton = ({ width = "w-24" }: { width?: string }) => (
  <div className={`bg-gray-200 rounded-lg h-10 animate-pulse ${width}`}></div>
);

const ProfileSkeleton = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="max-w-6xl mx-auto">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between p-6">
        <div>
          <SkeletonLine width="150px" height="h-8" />
          <div className="mt-2">
            <SkeletonLine width="300px" height="h-4" />
          </div>
        </div>
        <SkeletonButton width="w-28" />
      </div>

      {/* Navigation Tabs Skeleton */}
      <div className="border-b border-gray-200">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-6 py-4">
              <SkeletonLine width="80px" height="h-5" />
            </div>
          ))}
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="bg-white mt-8 rounded">
        <div className="p-8">
          {/* Edit Button Area */}
          <div className="float-end mb-6">
            <SkeletonButton width="w-32" />
          </div>

          <div className="space-y-6">
            {/* Avatar and Basic Info Skeleton */}
            <div className="flex items-center gap-4 pb-6">
              <SkeletonCircle />
              <div className="space-y-2">
                <SkeletonLine width="200px" height="h-6" />
                <SkeletonLine width="250px" height="h-5" />
              </div>
            </div>

            {/* Form Fields Skeleton */}
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <SkeletonLine width="120px" height="h-5" />
                <div className="mt-2">
                  <SkeletonLine width="100%" height="h-10" />
                </div>
                {i === 2 && (
                  <div className="mt-1">
                    <SkeletonLine width="200px" height="h-4" />
                  </div>
                )}
              </div>
            ))}

            {/* Stats Skeleton */}
            <div className="pt-6 border-t border-gray-200">
              <SkeletonLine width="150px" height="h-5" />
              <div className="grid grid-cols-3 gap-4 mt-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="text-center p-3 bg-gray-50 rounded-lg"
                  >
                    <SkeletonLine width="40px" height="h-6" />
                    <div className="mt-2">
                      <SkeletonLine width="60px" height="h-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default function ProfilePage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setInitialLoading(true);
      setError(null);

      if (!authAPI.isAuthenticated()) {
        router.push("/auth/login");
        return;
      }

      const result = await profileAPI.get();

      if (result.success && result.data) {
        setProfile(result.data);
        setEditForm({
          full_name: result.data.full_name || "",
          email: result.data.email || "",
        });
      } else {
        setError(result.error || "Failed to load profile");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      setError("An unexpected error occurred");
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await logout();
      toast.success("Signed out successfully");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    } finally {
      setLoading(false);
    }
  };

  const getAccountAge = () => {
    if (!profile) return 0;
    return Math.floor(
      (Date.now() - new Date(profile.created_at).getTime()) /
        (1000 * 60 * 60 * 24)
    );
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Reset form to original values when canceling
      setEditForm({
        full_name: profile?.full_name || "",
        email: profile?.email || "",
      });
    }
    setIsEditing(!isEditing);
  };

  const handleFormChange = (field: string, value: string) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      const result = await profileAPI.update({
        full_name: editForm.full_name.trim() || null,
      });

      if (result.success) {
        // Update the profile state with new data
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                full_name: editForm.full_name.trim() || null,
              }
            : null
        );
        setIsEditing(false);
        toast.success("Profile updated successfully");
      } else {
        throw new Error(result.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  // Filter tabs based on user's organization status
  const getNavigationTabs = () => {
    const baseTabs = [
      { id: "overview", label: "Overview", icon: Activity },
      { id: "notifications", label: "Notifications", icon: Bell },
      { id: "asset-types", label: "Asset Types", icon: Tag },
      {
        id: "subscriptions",
        label: "Subscription & Billing",
        icon: CreditCard,
      },
    ];

    // Add team tab only for organization members
    if (profile?.organization) {
      baseTabs.splice(1, 0, { id: "team", label: "Team", icon: Users });
    }

    return baseTabs;
  };

  const navigationTabs = getNavigationTabs();

  // Show skeleton loading during initial load
  if (initialLoading) {
    return <ProfileSkeleton />;
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md space-y-6">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="h-10 w-10 text-red-500" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Unable to Load Profile
            </h3>
            <p className="text-gray-600">
              {error || "Your profile could not be found"}
            </p>
          </div>
          <div className="space-y-3">
            <button
              onClick={loadProfile}
              className="w-full px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push("/auth/login")}
              className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 ">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Profile</h1>
            <p className="text-gray-600 text-sm mt-1">
              Manage your account information and settings
            </p>
          </div>
          <button
            onClick={handleSignOut}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            <span className="font-medium">
              {loading ? "Signing out..." : "Sign Out"}
            </span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            {navigationTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-gray-900 text-gray-900"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white mt-8 rounded ">
          {activeTab === "overview" && (
            <div className="p-8">
              <div className="w-full ">
                {/* Header with Edit Button */}
                <div className=" float-end">
                  <div className="">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSaveProfile}
                          disabled={loading}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 mr-2"
                        >
                          <Save className="h-4 w-4" />
                          {loading ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={handleEditToggle}
                          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleEditToggle}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                        Edit Profile
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  {/* User Avatar and Basic Info */}
                  <div className="flex items-center gap-4 pb-6">
                    <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center">
                      <User className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {profile.full_name || "User"}
                      </h3>
                      <p className="text-gray-600">{profile.email}</p>
                    </div>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.full_name}
                        onChange={(e) =>
                          handleFormChange("full_name", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        placeholder="Enter your full name"
                      />
                    ) : (
                      <p className="text-gray-900">
                        {profile.full_name || (
                          <span className="text-gray-500 italic">
                            Not provided
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <p className="text-gray-900">{profile.email}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Email address cannot be changed
                    </p>
                  </div>

                  {/* Organization */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Organization
                    </label>
                    {profile.organization ? (
                      <div className="space-y-2">
                        <p className="text-gray-900 font-medium">
                          {profile.organization.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              profile.organization.role === "admin"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {profile.organization.role === "admin"
                              ? "Admin"
                              : "Member"}
                          </span>
                          <span className="text-sm text-gray-500">
                            since{" "}
                            {new Date(
                              profile.organization.joined_at
                            ).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">No organization</p>
                    )}
                  </div>

                  {/* Member Since */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Member since
                    </label>
                    <p className="text-gray-900">
                      {new Date(profile.created_at).toLocaleDateString(
                        "en-UK",
                        {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        }
                      )}
                    </p>
                  </div>

                  {/* Account Stats */}
                  <div className="pt-6 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-4">
                      Account Statistics
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-semibold text-gray-900">
                          {profile.assets_count}
                        </div>
                        <div className="text-sm text-gray-600">Assets</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-semibold text-gray-900">
                          {profile.issues_count}
                        </div>
                        <div className="text-sm text-gray-600">Issues</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-semibold text-gray-900">
                          {getAccountAge()}
                        </div>
                        <div className="text-sm text-gray-600">Days</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="p-8">
              <NotificationSettings />
            </div>
          )}

          {activeTab === "asset-types" && (
            <div className="p-8">
              <AssetTypeManagement />
            </div>
          )}

          {activeTab === "subscriptions" && (
            <div className="p-8">
              <SubscriptionBilling />
            </div>
          )}

          {activeTab === "team" && (
            <div className="p-8">
              {profile.organization ? (
                <InviteFeature organizationName={profile.organization.name} />
              ) : (
                <div className="text-center max-w-lg mx-auto space-y-6">
                  <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto">
                    <Users className="h-10 w-10 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                      No Organization
                    </h3>
                    <p className="text-gray-600">
                      You need to be part of an organization to invite team
                      members.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
