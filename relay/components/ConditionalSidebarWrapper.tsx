"use client";

import { usePathname } from "next/navigation";
import { SidebarLayout } from "@/components/SidebarLayout";

interface ConditionalSidebarWrapperProps {
  children: React.ReactNode;
}

export function ConditionalSidebarWrapper({
  children,
}: ConditionalSidebarWrapperProps) {
  const pathname = usePathname();
  const isExcludedPage = pathname?.startsWith("/auth") || pathname?.startsWith("/report/");

  if (isExcludedPage) {
    return <>{children}</>;
  }

  return <SidebarLayout>{children}</SidebarLayout>;
}
