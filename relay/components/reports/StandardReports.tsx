"use client";

import StatCard from "@/components/StatCard";
import {
  Package,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  Clock,
  Users,
  Target,
  TrendingUp,
} from "lucide-react";

interface ReportData {
  assetStats: {
    total: number;
    active: number;
    inactive: number;
    needsMaintenance: number;
  };
  issueStats: {
    total: number;
    open: number;
    resolved: number;
    critical: number;
    byUrgency: { low: number; medium: number; high: number };
  };
  organizationStats: {
    totalOrgs: number;
    totalMembers: number;
    avgMembersPerOrg: number;
  };
  subscriptionStats: {
    activeSubscriptions: number;
    totalRevenue: number;
    avgRevenuePerSub: number;
  };
}

interface StandardReportsProps {
  reportData: ReportData;
}

export default function StandardReports({ reportData }: StandardReportsProps) {
  return (
    <div className="space-y-8">
      {/* Asset Overview */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Package className="w-5 h-5 mr-2" />
          Asset Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Assets"
            value={reportData.assetStats.total}
            icon={<Package className="w-6 h-6" />}
          />
          <StatCard
            title="Active Assets"
            value={reportData.assetStats.active}
            icon={<CheckCircle className="w-6 h-6 text-green-500" />}
          />
          <StatCard
            title="Inactive Assets"
            value={reportData.assetStats.inactive}
            icon={<XCircle className="w-6 h-6 text-red-500" />}
          />
          <StatCard
            title="Needs Maintenance"
            value={reportData.assetStats.needsMaintenance}
            icon={<AlertTriangle className="w-6 h-6 text-yellow-500" />}
          />
        </div>
      </section>

      {/* Issue Management */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          Issue Management
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total Issues"
            value={reportData.issueStats.total}
            icon={<Activity className="w-6 h-6" />}
          />
          <StatCard
            title="Open Issues"
            value={reportData.issueStats.open}
            icon={<Clock className="w-6 h-6 text-orange-500" />}
          />
          <StatCard
            title="Resolved Issues"
            value={reportData.issueStats.resolved}
            icon={<CheckCircle className="w-6 h-6 text-green-500" />}
          />
          <StatCard
            title="Critical Issues"
            value={reportData.issueStats.critical}
            icon={<AlertTriangle className="w-6 h-6 text-red-500" />}
          />
        </div>

        {/* Issue Urgency Breakdown */}
        <div className="bg-white rounded-lg border border-gray-100 p-6">
          <h3 className="font-medium text-gray-900 mb-4">Issues by Urgency</h3>
          <div className="space-y-3">
            {Object.entries(reportData.issueStats.byUrgency).map(
              ([urgency, count]) => (
                <div
                  key={urgency}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <div
                      className={`w-3 h-3 rounded-full mr-3 ${
                        urgency === "high"
                          ? "bg-red-500"
                          : urgency === "medium"
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                    />
                    <span className="text-sm font-medium capitalize">
                      {urgency}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600">{count}</span>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* Organization & Subscription Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Organization Stats
          </h2>
          <div className="grid grid-cols-1 gap-4">
            <StatCard
              title="Total Organizations"
              value={reportData.organizationStats.totalOrgs}
              icon={<Users className="w-6 h-6" />}
            />
            <StatCard
              title="Total Members"
              value={reportData.organizationStats.totalMembers}
              icon={<Users className="w-6 h-6" />}
            />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Subscription Metrics
          </h2>
          <div className="grid grid-cols-1 gap-4">
            <StatCard
              title="Active Subscriptions"
              value={reportData.subscriptionStats.activeSubscriptions}
              icon={<CheckCircle className="w-6 h-6 text-green-500" />}
            />
            <StatCard
              title="Monthly Revenue"
              value={Math.round(
                reportData.subscriptionStats.totalRevenue / 100
              )}
              icon={<TrendingUp className="w-6 h-6 text-blue-500" />}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
