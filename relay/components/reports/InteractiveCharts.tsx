"use client";

import {
  InteractiveChart,
  IssueResolutionChart,
  IssuesPerAssetTypeChart,
  AssetsAddedChart,
  TopAssetsWithIssuesChart,
  UpcomingMaintenanceChart,
  AssetUtilizationPieChart,
} from "@/components/charts/ModernCharts";

interface AnalyticsData {
  assetUtilization: Array<{ type: string; count: number; percentage: number }>;
  issueResolutionTrends: Array<{
    month: string;
    resolved: number;
    created: number;
  }>;
  maintenanceOverdue: Array<{
    name: string;
    daysPastDue: number;
    type: string;
  }>;
  issuesPerAsset: Array<{
    assetName: string;
    issueCount: number;
    assetType: string;
  }>;
  issuesPerAssetType: Array<{ assetType: string; issueCount: number }>;
  assetsAddedOverTime: Array<{ month: string; count: number }>;
  upcomingMaintenance: Array<{
    assetName: string;
    daysUntilMaintenance: number;
    assetType: string;
  }>;
  topAssetsWithIssues: Array<{
    assetName: string;
    issueCount: number;
    assetType: string;
  }>;
}

interface InteractiveChartsProps {
  reportData: AnalyticsData;
}

export default function InteractiveCharts({
  reportData,
}: InteractiveChartsProps) {
  return (
    <div className="space-y-8">
      {/* Interactive Chart Component */}
      <InteractiveChart
        data={{
          issueResolution: reportData.issueResolutionTrends,
          issuesPerAssetType: reportData.issuesPerAssetType,
          assetsAdded: reportData.assetsAddedOverTime,
          topAssets: reportData.topAssetsWithIssues,
          upcomingMaintenance: reportData.upcomingMaintenance,
          assetUtilization: reportData.assetUtilization,
        }}
      />

      {/* Individual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IssueResolutionChart data={reportData.issueResolutionTrends} />
        <IssuesPerAssetTypeChart data={reportData.issuesPerAssetType} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AssetsAddedChart data={reportData.assetsAddedOverTime} />
        <UpcomingMaintenanceChart data={reportData.upcomingMaintenance} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopAssetsWithIssuesChart data={reportData.topAssetsWithIssues} />
        <AssetUtilizationPieChart data={reportData.assetUtilization} />
      </div>
    </div>
  );
}
