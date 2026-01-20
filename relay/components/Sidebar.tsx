"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  AlertTriangle,
  BarChart2,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  User,
  CreditCard,
  Crown,
} from "lucide-react";
import { statsAPI } from "@/utils/api";

interface SidebarStats {
  activeItems: number;
  openIssues: number;
  criticalAlerts: number;
}

interface SidebarProps {
  expanded: boolean;
  onToggle: () => void;
}

export function Sidebar({ expanded, onToggle }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [stats, setStats] = useState<SidebarStats>({
    activeItems: 0,
    openIssues: 0,
    criticalAlerts: 0,
  });
  const [loading, setLoading] = useState(true);

  // Fetch sidebar stats on component mount and when expanded
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await statsAPI.getSidebar();

        if (response.success && response.data) {
          setStats(response.data);
        } else {
          console.error("Failed to fetch sidebar stats:", response.error);
        }
      } catch (error) {
        console.error("Error fetching sidebar stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [pathname]);

  const menuItems = [
    {
      name: "Dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      path: "/",
    },
    {
      name: "Inventory",
      icon: <Package className="h-5 w-5" />,
      path: "/assets",
    },
    {
      name: "Issues",
      icon: <AlertTriangle className="h-5 w-5" />,
      path: "/issues",
    },
    {
      name: "Reports",
      icon: <BarChart2 className="h-5 w-5" />,
      path: "/reports",
    },
    {
      name: "Profile",
      icon: <User className="h-5 w-5" />,
      path: "/profile",
    },
    {
      name: "Help & Support",
      icon: <HelpCircle className="h-5 w-5" />,
      path: "/help",
    },
  ];

  return (
    <div
      className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 transition-all duration-300 ${
        expanded ? "w-64" : "w-20"
      }`}
    >
      {/* Logo Section */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
        {expanded ? (
          <span className="text-xl font-bold">QResolve</span>
        ) : (
          <span className="text-xl font-bold">Q</span>
        )}
        <button
          onClick={onToggle}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          title={expanded ? "Close sidebar" : "Open sidebar"}
        >
          {expanded ? (
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-600" />
          )}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => (
          <div key={item.path} className="relative group">
            <button
              onClick={() => router.push(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                pathname === item.path
                  ? "bg-black text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {item.icon}
              {expanded && <span>{item.name}</span>}
            </button>

            {/* Tooltip for collapsed state */}
            {!expanded && (
              <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                <div className="bg-gray-900 text-white text-sm px-2 py-1 rounded whitespace-nowrap">
                  {item.name}
                  <div className="absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                </div>
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Quick Stats */}
      {expanded && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Active Items</span>
              <span className="font-medium text-gray-900">
                {loading ? "..." : stats.activeItems}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Open Issues</span>
              <span className="font-medium text-gray-900">
                {loading ? "..." : stats.openIssues}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Critical Alerts</span>
              <span
                className={`font-medium ${
                  stats.criticalAlerts > 0 ? "text-red-600" : "text-gray-900"
                }`}
              >
                {loading ? "..." : stats.criticalAlerts}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
