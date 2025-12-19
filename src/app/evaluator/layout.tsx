"use client";

import DashboardShell, { SidebarItem } from "@/components/DashboardShell";
import { withAuth } from "@/hoc";
import { useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";

function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const sidebarItems: SidebarItem[] = useMemo(
    () => [
      {
        id: "overview",
        label: "Overview",
        icon: "📊",
        path: "/evaluator",
      },
      {
        id: "users",
        label: "Employees",
        icon: "📊",
        path: "/evaluator/employees",
      },
      {
        id: "evaluationRecords",
        label: "Evaluation Records",
        icon: "📊",
        path: "/evaluator/evaluationRecords",
      },
      {
        id: "performanceReviews",
        label: "Performance Reviews",
        icon: "📊",
        path: "/evaluator/performanceReviews",
      },
      {
        id: "evaluationHistory",
        label: "Evaluation History",
        icon: "📊",
        path: "/evaluator/evaluationHistory",
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
      title="Employee Dashboard"
      currentPeriod={new Date().toLocaleDateString()}
      sidebarItems={sidebarItems}
      activeItemId={active}
      onChangeActive={setActiveWithRefresh}
    >
      {children}
    </DashboardShell>
  );
}

export default withAuth(EmployeeLayout, { requiredRole: "employee" });
