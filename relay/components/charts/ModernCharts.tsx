"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// Modern color palette
const COLORS = {
  primary: "#3B82F6",
  secondary: "#10B981",
  tertiary: "#F59E0B",
  quaternary: "#EF4444",
  quinary: "#8B5CF6",
  senary: "#06B6D4",
  gray: "#6B7280",
  light: "#F3F4F6",
};

const PIE_COLORS = [
  COLORS.primary,
  COLORS.secondary,
  COLORS.tertiary,
  COLORS.quaternary,
  COLORS.quinary,
  COLORS.senary,
];

interface ChartWrapperProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

function ChartWrapper({ title, children, className = "" }: ChartWrapperProps) {
  return (
    <div
      className={`bg-white rounded-lg border border-gray-100 p-6 ${className}`}
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="h-80">{children}</div>
    </div>
  );
}

// Custom tooltip for modern styling
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="text-sm font-medium text-gray-900 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Issue Resolution Trends Chart
interface IssueResolutionData {
  month: string;
  resolved: number;
  created: number;
}

export function IssueResolutionChart({
  data,
}: {
  data: IssueResolutionData[];
}) {
  // Empty state data - show last 6 months with zero values
  const emptyData = [
    { month: "Jan 2024", resolved: 0, created: 0 },
    { month: "Feb 2024", resolved: 0, created: 0 },
    { month: "Mar 2024", resolved: 0, created: 0 },
    { month: "Apr 2024", resolved: 0, created: 0 },
    { month: "May 2024", resolved: 0, created: 0 },
    { month: "Jun 2024", resolved: 0, created: 0 },
  ];

  const chartData = data && data.length > 0 ? data : emptyData;
  const isEmpty = !data || data.length === 0;

  return (
    <ChartWrapper title="Issue Resolution Trends">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.light} />
          <XAxis
            dataKey="month"
            stroke={COLORS.gray}
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke={COLORS.gray}
            fontSize={12}
            tickLine={false}
            domain={[0, "dataMax + 5"]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="created"
            stroke={isEmpty ? COLORS.light : COLORS.quaternary}
            strokeWidth={3}
            dot={{
              fill: isEmpty ? COLORS.light : COLORS.quaternary,
              strokeWidth: 0,
              r: 4,
            }}
            name="Created"
            strokeDasharray={isEmpty ? "5 5" : "0"}
          />
          <Line
            type="monotone"
            dataKey="resolved"
            stroke={isEmpty ? COLORS.light : COLORS.secondary}
            strokeWidth={3}
            dot={{
              fill: isEmpty ? COLORS.light : COLORS.secondary,
              strokeWidth: 0,
              r: 4,
            }}
            name="Resolved"
            strokeDasharray={isEmpty ? "5 5" : "0"}
          />
          {isEmpty && (
            <text
              x="50%"
              y="45%"
              textAnchor="middle"
              fill={COLORS.gray}
              fontSize={14}
            >
              No data available - Issues will appear here
            </text>
          )}
        </LineChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

// Issues Per Asset Type Chart
interface IssuesPerAssetTypeData {
  assetType: string;
  issueCount: number;
}

export function IssuesPerAssetTypeChart({
  data,
}: {
  data: IssuesPerAssetTypeData[];
}) {
  // Empty state data - show common asset types with zero values
  const emptyData = [
    { assetType: "Equipment", issueCount: 0 },
    { assetType: "Machinery", issueCount: 0 },
    { assetType: "Vehicles", issueCount: 0 },
    { assetType: "Tools", issueCount: 0 },
    { assetType: "Infrastructure", issueCount: 0 },
  ];

  const chartData = data && data.length > 0 ? data : emptyData;
  const isEmpty = !data || data.length === 0;

  return (
    <ChartWrapper title="Issues by Asset Type">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.light} />
          <XAxis
            dataKey="assetType"
            stroke={COLORS.gray}
            fontSize={12}
            tickLine={false}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            stroke={COLORS.gray}
            fontSize={12}
            tickLine={false}
            domain={[0, "dataMax + 2"]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="issueCount"
            fill={isEmpty ? COLORS.light : COLORS.primary}
            radius={[4, 4, 0, 0]}
            name="Issues"
            stroke={isEmpty ? COLORS.gray : "none"}
            strokeWidth={isEmpty ? 1 : 0}
            strokeDasharray={isEmpty ? "3 3" : "0"}
          />
          {isEmpty && (
            <text
              x="50%"
              y="40%"
              textAnchor="middle"
              fill={COLORS.gray}
              fontSize={14}
            >
              No issues reported yet
            </text>
          )}
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

// Assets Added Over Time Chart
interface AssetsAddedData {
  month: string;
  count: number;
}

export function AssetsAddedChart({ data }: { data: AssetsAddedData[] }) {
  // Empty state data - show last 6 months with zero values
  const emptyData = [
    { month: "Jan 2024", count: 0 },
    { month: "Feb 2024", count: 0 },
    { month: "Mar 2024", count: 0 },
    { month: "Apr 2024", count: 0 },
    { month: "May 2024", count: 0 },
    { month: "Jun 2024", count: 0 },
  ];

  const chartData = data && data.length > 0 ? data : emptyData;
  const isEmpty = !data || data.length === 0;

  return (
    <ChartWrapper title="Assets Added Over Time">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.light} />
          <XAxis
            dataKey="month"
            stroke={COLORS.gray}
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke={COLORS.gray}
            fontSize={12}
            tickLine={false}
            domain={[0, "dataMax + 2"]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="count"
            stroke={isEmpty ? COLORS.light : COLORS.tertiary}
            strokeWidth={3}
            dot={{
              fill: isEmpty ? COLORS.light : COLORS.tertiary,
              strokeWidth: 0,
              r: 4,
            }}
            name="Assets Added"
            strokeDasharray={isEmpty ? "5 5" : "0"}
          />
          {isEmpty && (
            <text
              x="50%"
              y="45%"
              textAnchor="middle"
              fill={COLORS.gray}
              fontSize={14}
            >
              No assets added yet
            </text>
          )}
        </LineChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

// Top Assets With Issues Chart
interface TopAssetsData {
  assetName: string;
  issueCount: number;
  assetType: string;
}

export function TopAssetsWithIssuesChart({ data }: { data: TopAssetsData[] }) {
  // Empty state data - show sample asset names with zero values
  const emptyData = [
    { assetName: "Generator A", issueCount: 0, assetType: "Equipment" },
    { assetName: "Truck B", issueCount: 0, assetType: "Vehicle" },
    { assetName: "Forklift C", issueCount: 0, assetType: "Machinery" },
    { assetName: "Computer D", issueCount: 0, assetType: "IT Equipment" },
    { assetName: "Building E", issueCount: 0, assetType: "Infrastructure" },
  ];

  const chartData = data && data.length > 0 ? data : emptyData;
  const isEmpty = !data || data.length === 0;

  return (
    <ChartWrapper title="Top 10 Assets with Most Issues">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="horizontal"
          margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.light} />
          <XAxis
            type="number"
            stroke={COLORS.gray}
            fontSize={12}
            tickLine={false}
            domain={[0, "dataMax + 1"]}
          />
          <YAxis
            type="category"
            dataKey="assetName"
            stroke={COLORS.gray}
            fontSize={12}
            tickLine={false}
            width={90}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="issueCount"
            fill={isEmpty ? COLORS.light : COLORS.quaternary}
            radius={[0, 4, 4, 0]}
            name="Issues"
            stroke={isEmpty ? COLORS.gray : "none"}
            strokeWidth={isEmpty ? 1 : 0}
            strokeDasharray={isEmpty ? "3 3" : "0"}
          />
          {isEmpty && (
            <text
              x="60%"
              y="50%"
              textAnchor="middle"
              fill={COLORS.gray}
              fontSize={14}
            >
              No issues to display
            </text>
          )}
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

// Upcoming Maintenance Chart
interface UpcomingMaintenanceData {
  assetName: string;
  daysUntilMaintenance: number;
  assetType: string;
}

export function UpcomingMaintenanceChart({
  data,
}: {
  data: UpcomingMaintenanceData[];
}) {
  // Empty state data - show sample assets with maintenance schedules
  const emptyData = [
    {
      assetName: "No scheduled",
      daysUntilMaintenance: 0,
      assetType: "maintenance",
    },
    { assetName: "maintenance", daysUntilMaintenance: 0, assetType: "due" },
    { assetName: "in next", daysUntilMaintenance: 0, assetType: "30 days" },
  ];

  const chartData = data && data.length > 0 ? data : emptyData;
  const isEmpty = !data || data.length === 0;

  return (
    <ChartWrapper title="Assets with Upcoming Maintenance (Next 30 Days)">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.light} />
          <XAxis
            dataKey="assetName"
            stroke={COLORS.gray}
            fontSize={12}
            tickLine={false}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            stroke={COLORS.gray}
            fontSize={12}
            tickLine={false}
            domain={[0, "dataMax + 2"]}
            label={{
              value: "Days Until Maintenance",
              angle: -90,
              position: "insideLeft",
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="daysUntilMaintenance"
            fill={isEmpty ? COLORS.light : COLORS.tertiary}
            radius={[4, 4, 0, 0]}
            name="Days Until Maintenance"
            stroke={isEmpty ? COLORS.gray : "none"}
            strokeWidth={isEmpty ? 1 : 0}
            strokeDasharray={isEmpty ? "3 3" : "0"}
          />
          {isEmpty && (
            <text
              x="50%"
              y="35%"
              textAnchor="middle"
              fill={COLORS.gray}
              fontSize={14}
            >
              No upcoming maintenance scheduled
            </text>
          )}
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

// Asset Utilization Pie Chart
interface AssetUtilizationData {
  type: string;
  count: number;
  percentage: number;
}

export function AssetUtilizationPieChart({
  data,
}: {
  data: AssetUtilizationData[];
}) {
  // Empty state data - show common asset types with zero values
  const emptyData = [
    { type: "Equipment", count: 0, percentage: 25 },
    { type: "Machinery", count: 0, percentage: 25 },
    { type: "Vehicles", count: 0, percentage: 25 },
    { type: "Tools", count: 0, percentage: 25 },
  ];

  const chartData = data && data.length > 0 ? data : emptyData;
  const isEmpty = !data || data.length === 0;

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    if (isEmpty) return null; // Don't show percentages for empty state

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={12}
        fontWeight={500}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <ChartWrapper title="Asset Distribution by Type" className="col-span-1">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={120}
            fill="#8884d8"
            dataKey="count"
            stroke={isEmpty ? COLORS.gray : "none"}
            strokeWidth={isEmpty ? 2 : 0}
            strokeDasharray={isEmpty ? "5 5" : "0"}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  isEmpty ? COLORS.light : PIE_COLORS[index % PIE_COLORS.length]
                }
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => value}
          />
          {isEmpty && (
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              fill={COLORS.gray}
              fontSize={14}
            >
              No assets to display
            </text>
          )}
        </PieChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

// Interactive Chart Selector Component
interface InteractiveChartProps {
  data: {
    issueResolution: IssueResolutionData[];
    issuesPerAssetType: IssuesPerAssetTypeData[];
    assetsAdded: AssetsAddedData[];
    topAssets: TopAssetsData[];
    upcomingMaintenance: UpcomingMaintenanceData[];
    assetUtilization: AssetUtilizationData[];
  };
}

export function InteractiveChart({ data }: InteractiveChartProps) {
  const [selectedChart, setSelectedChart] = useState<string>("issueResolution");

  const chartOptions = [
    { id: "issueResolution", label: "Issue Resolution Trends", icon: "📈" },
    { id: "issuesPerAssetType", label: "Issues by Asset Type", icon: "📊" },
    { id: "assetsAdded", label: "Assets Added Over Time", icon: "📦" },
    { id: "topAssets", label: "Top Assets with Issues", icon: "⚠️" },
    { id: "upcomingMaintenance", label: "Upcoming Maintenance", icon: "🔧" },
    { id: "assetUtilization", label: "Asset Distribution", icon: "🥧" },
  ];

  const renderChart = () => {
    switch (selectedChart) {
      case "issueResolution":
        return <IssueResolutionChart data={data.issueResolution} />;
      case "issuesPerAssetType":
        return <IssuesPerAssetTypeChart data={data.issuesPerAssetType} />;
      case "assetsAdded":
        return <AssetsAddedChart data={data.assetsAdded} />;
      case "topAssets":
        return <TopAssetsWithIssuesChart data={data.topAssets} />;
      case "upcomingMaintenance":
        return <UpcomingMaintenanceChart data={data.upcomingMaintenance} />;
      case "assetUtilization":
        return <AssetUtilizationPieChart data={data.assetUtilization} />;
      default:
        return <IssueResolutionChart data={data.issueResolution} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Chart Selector */}
      <div className="bg-white rounded-lg border border-gray-100 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Interactive Analytics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {chartOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setSelectedChart(option.id)}
              className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                selectedChart === option.id
                  ? "bg-blue-50 border-blue-200 text-blue-800"
                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <div className="text-lg mb-1">{option.icon}</div>
              <div className="text-xs">{option.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Chart */}
      <div>{renderChart()}</div>
    </div>
  );
}
