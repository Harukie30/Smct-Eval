"use client";

import DashboardShell, { SidebarItem } from "@/components/DashboardShell";
import { withAuth } from "@/hoc";
import { useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";

function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const sidebarItems: SidebarItem[] = useMemo(
    () => [
      { id: "overview", label: "Overview", icon: "📊", path: "/admin" },
      {
        id: "evaluated-reviews",
        label: "All Evaluation",
        icon: "🗂️",
        path: "/admin/evaluatedReviews",
      },
      {
        id: "users",
        label: "Employees",
        icon: "👥",
        path: "/admin/userManagement",
      },
      {
        id: "departments",
        label: "Departments",
        icon: "🏢",
        path: "/admin/departments",
      },
      {
        id: "branches",
        label: "Branches",
        icon: "📍",
        path: "/admin/branches",
      },
      {
        id: "positions",
        label: "Positions",
        icon: "🧑‍💼",
        path: "/admin/positions",
      },
      {
        id: "branch-heads",
        label: "Branch Heads",
        icon: "👔",
        path: "/admin/branchHeads",
      },
      {
        id: "area-managers",
        label: "Area Managers",
        icon: "🎯",
        path: "/admin/areaManagers",
      },
      {
        id: "signature-reset",
        label: "Signature Requests",
        icon: "✍️",
        path: "/admin/signatureResetRequests",
      },
    ],
    []
  );

  // Determine active item based on current URL
  const active =
    sidebarItems.find((item) => item.path === pathname)?.id ?? "overview";

  const setActiveWithRefresh = (id: string) => {
    const item = sidebarItems.find((item) => item.id === id);
    if (item) router.push(item.path);
  };

  return (
    <DashboardShell
      title="Admin Dashboard"
      currentPeriod={new Date().toLocaleDateString()}
      sidebarItems={sidebarItems}
      activeItemId={active}
      onChangeActive={setActiveWithRefresh}
    >
      {children}
    </DashboardShell>
  );
}

export default withAuth(AdminLayout, { requiredRole: "admin" });
