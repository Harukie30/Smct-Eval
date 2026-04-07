"use client";

import DashboardShell, { SidebarItem } from "@/components/DashboardShell";
import { withAuth } from "@/hoc";
import { useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/UserContext";

function EvaluatorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  const sidebarItems: SidebarItem[] = useMemo(() => {
    return [
      { id: "overview", label: "Overview", icon: "📊", path: "/evaluator" },
      {
        id: "feedback",
        label: "All Evaluation Records",
        icon: "🗂️",
        path: "/evaluator/evaluationRecords",
      },
      {
        id: "employees",
        label: "Employees",
        icon: "👥",
        path: "/evaluator/employees",
      },
      
      {
        id: "reviews",
        label: "My Performance Reviews",
        icon: "📝",
        path: "/evaluator/performanceReviews",
      },
      {
        id: "my-violations",
        label: "My Violations",
        icon: "📋",
        path: "/evaluator/myViolations",
      },
      {
        id: "history",
        label: "My Evaluation History",
        icon: "📈",
        path: "/evaluator/evaluationHistory",
      },
    ];
  }, [user?.position_id]);

  // Determine active item based on current URL
  const active =
    sidebarItems.find((item) => item.path === pathname)?.id ?? "overview";

  const setActiveWithRefresh = (id: string) => {
    const item = sidebarItems.find((item) => item.id === id);
    if (item) router.push(item.path);
  };

  return (
    <DashboardShell
      title="Evaluator Dashboard"
      currentPeriod={new Date().toLocaleDateString()}
      sidebarItems={sidebarItems}
      activeItemId={active}
      onChangeActive={setActiveWithRefresh}
    >
      {children}
    </DashboardShell>
  );
}

export default withAuth(EvaluatorLayout, { requiredRole: "evaluator" });
