"use client";

import { withAuth } from "@/hoc";

function HRLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export default withAuth(HRLayout, { requiredRole: "hr" });

