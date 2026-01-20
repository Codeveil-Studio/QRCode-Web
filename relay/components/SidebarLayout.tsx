"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  return (
    <>
      <Sidebar
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(!sidebarExpanded)}
      />
      <div
        className={`transition-all duration-300 ${
          sidebarExpanded ? "ml-64" : "ml-20"
        }`}
      >
        {children}
      </div>
    </>
  );
}
