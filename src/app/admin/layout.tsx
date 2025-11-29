"use client";

import DashboardShell, { SidebarItem } from "@/components/DashboardShell";
import { withAuth } from "@/hoc";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [active, setActive] = useState("overview");
  const sidebarItems: SidebarItem[] = useMemo(
    () => [
      { id: "overview", label: "Overview", icon: "📊", path: "/admin" },
      {
        id: "users",
        label: "User Management",
        icon: "👥",
        path: "/admin/userManagement",
      },
      {
        id: "evaluated-reviews",
        label: "Evaluation Records",
        icon: "📋",
        path: "/admin/evaluatedReviews",
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
    ],
    []
  );

  const setActiveWithRefresh = (id: string) => {
    setActive(id);
    const item = sidebarItems.find((item) => item.id === id);
    if (item) {
      router.push(item.path);
    }
  };
  return (
    <>
      <DashboardShell
        title="Admin Dashboard"
        currentPeriod={new Date().toLocaleDateString()}
        sidebarItems={sidebarItems}
        activeItemId={active}
        onChangeActive={setActiveWithRefresh}
      >
        {children}
      </DashboardShell>
    </>
  );
}

export default withAuth(AdminLayout, { requiredRole: "admin" });
