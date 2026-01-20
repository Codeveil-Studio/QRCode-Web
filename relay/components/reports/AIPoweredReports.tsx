"use client";

import { Brain, AlertTriangle, Activity, Target } from "lucide-react";

interface AIInsights {
  predictiveMaintenanceAlerts: Array<{
    assetName: string;
    probability: number;
    daysUntilMaintenance: number;
  }>;
  issuePatterns: Array<{
    pattern: string;
    frequency: number;
    recommendation: string;
  }>;
  resourceOptimization: Array<{
    area: string;
    currentUsage: number;
    recommendedUsage: number;
    savings: string;
  }>;
}

interface AIPoweredReportsProps {
  aiInsights: AIInsights;
}

export default function AIPoweredReports({
  aiInsights,
}: AIPoweredReportsProps) {
  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-100">
        <div className="flex items-center mb-3">
          <div className="bg-blue-100 p-2 rounded-lg mr-3">
            <Brain className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              🤖 AI-Powered Insights
            </h2>
            <p className="text-sm text-gray-600">
              Smart analytics and predictive recommendations for your assets
            </p>
          </div>
        </div>
      </div>

      {/* Predictive Maintenance */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <div className="bg-orange-100 p-1.5 rounded-lg mr-3">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          Smart Maintenance Predictions
        </h2>
        <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-500">
              <span>Asset Name</span>
              <span>Risk Probability</span>
              <span>Estimated Days</span>
              <span>Action Required</span>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {aiInsights.predictiveMaintenanceAlerts.map((item, index) => (
              <div
                key={index}
                className="px-6 py-4 grid grid-cols-4 gap-4 text-sm"
              >
                <span className="font-medium">{item.assetName}</span>
                <div className="flex items-center">
                  <div
                    className={`w-3 h-3 rounded-full mr-2 ${
                      item.probability > 0.7
                        ? "bg-red-500"
                        : item.probability > 0.4
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }`}
                  />
                  {Math.round(item.probability * 100)}%
                </div>
                <span>{item.daysUntilMaintenance} days</span>
                <span
                  className={`font-medium ${
                    item.probability > 0.7
                      ? "text-red-600"
                      : item.probability > 0.4
                      ? "text-yellow-600"
                      : "text-green-600"
                  }`}
                >
                  {item.probability > 0.7
                    ? "Urgent"
                    : item.probability > 0.4
                    ? "Schedule Soon"
                    : "Monitor"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Issue Patterns */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <div className="bg-purple-100 p-1.5 rounded-lg mr-3">
            <Activity className="w-5 h-5 text-purple-600" />
          </div>
          🔍 Intelligent Issue Pattern Detection
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {aiInsights.issuePatterns.map((pattern, index) => (
            <div
              key={index}
              className="bg-white rounded-lg border border-gray-100 p-6"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-medium text-gray-900">{pattern.pattern}</h3>
                <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {pattern.frequency}x
                </span>
              </div>
              <p className="text-sm text-gray-600">{pattern.recommendation}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Resource Optimization */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <div className="bg-green-100 p-1.5 rounded-lg mr-3">
            <Target className="w-5 h-5 text-green-600" />
          </div>
          💡 Smart Resource Optimization
        </h2>
        <div className="space-y-4">
          {aiInsights.resourceOptimization.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-lg border border-gray-100 p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{item.area}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Current: {item.currentUsage}% → Recommended:{" "}
                    {item.recommendedUsage}%
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-green-600">
                    {item.savings}
                  </span>
                  <p className="text-xs text-gray-500">potential savings</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
