"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Bell,
  X,
  Trash2,
  ChevronDown,
  HelpCircle,
  ChevronUp,
  Clock,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import ProfileCard, { UserProfile } from "./ProfileCard";
import ProfileModal from "./ProfileModal";
import ContactDevsModal from "./ContactDevsModal";
import { HRDashboardGuideModal } from "./HRDashboardGuideModal";
import { EmployeeDashboardGuideModal } from "./EmployeeDashboardGuideModal";
import { EvaluatorDashboardGuideModal } from "./EvaluatorDashboardGuideModal";
import { useUser } from "@/contexts/UserContext";
import { useWelcomeModal } from "@/hooks/useWelcomeModal";
import { useNotifications } from "@/hooks/useNotifications";
import { Notification } from "@/lib/types";
import { apiService } from "@/lib/apiService";
import { useRouter } from "next/navigation";
import { toastMessages } from "@/lib/toastMessages";
import echo from "@/utils/echo";
import appMeta from "../../package.json";

export type SidebarItem = {
  id: string;
  label: string;
  icon: string;
  path: string;
};

type DashboardShellProps = {
  title: string;
  currentPeriod?: string;
  sidebarItems: SidebarItem[];
  activeItemId: string;
  onChangeActive: (id: string) => void;
  children: React.ReactNode;
  profile?: UserProfile | null;
  onSaveProfile?: (updatedProfile: UserProfile) => void;
  topSummary?: React.ReactNode;
  dashboardType?: "hr" | "admin" | "employee" | "evaluator";
};

const APP_VERSION = String((appMeta as { version?: string })?.version ?? "1.0.0");

/** Main sidebar nav: scroll when needed, no visible scrollbar. */
const SIDEBAR_SCROLL_HIDE_CLASS =
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

const SIDEBAR_NAV_SCROLL_CLASS = cn(
  "min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain",
  SIDEBAR_SCROLL_HIDE_CLASS
);

/** Management submenu: natural height when all items fit; else fill sidebar and scroll inside. */
const MANAGEMENT_OVERFLOW_SCROLL_CLASS =
  "min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent hover:scrollbar-thumb-white/50";

/** Sidebar submenu — container fade; items use `.sidebar-submenu-stagger` in globals.css. */
const SIDEBAR_SUBMENU_COLLAPSE_CLASS = cn(
  "sidebar-submenu-stagger mt-2",
  "motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out",
  "motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=open]:fade-in-0",
  "motion-safe:duration-500 motion-safe:ease-out"
);

const SIDEBAR_SUBMENU_ITEM_CLASS = "sidebar-submenu-item";

/** Outer collapsible wrapper (Radix keeps overflow-hidden for open/close). */
const MANAGEMENT_DROPDOWN_CONTENT_CLASS = SIDEBAR_SUBMENU_COLLAPSE_CLASS;

/** Inner scroll list — ref + maxHeight apply here so all items stay reachable. */
const MANAGEMENT_SCROLL_INNER_CLASS = cn(
  "space-y-1.5 pl-3 pr-2 pb-4 sm:pl-4 sm:pr-2.5",
  MANAGEMENT_OVERFLOW_SCROLL_CLASS
);

/** Sidebar width tracks viewport (footer `left-*` must match). */
const SIDEBAR_WIDTH_CLASS = "w-56 xl:w-64";

const SIDEBAR_HEADING_CLASS =
  "mb-3 shrink-0 text-sm font-semibold tracking-wide text-white sm:mb-4 sm:text-base";

const SIDEBAR_NAV_ICON_CLASS = "shrink-0 text-sm leading-none sm:text-base";

const SIDEBAR_NAV_LABEL_CLASS =
  "min-w-0 truncate font-medium text-xs leading-snug sm:text-sm";

const SIDEBAR_NAV_SUB_LABEL_CLASS =
  "min-w-0 truncate font-medium text-[11px] leading-snug sm:text-xs";

const SIDEBAR_NAV_ITEM_BASE_CLASS =
  "w-full rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer";

const SIDEBAR_NAV_ROW_CLASS =
  "flex items-center space-x-2.5 px-3 py-2 sm:space-x-3 sm:px-4 sm:py-2.5";

const SIDEBAR_NAV_ROW_SUB_CLASS =
  "flex items-center space-x-2.5 px-3 py-1.5 sm:space-x-3 sm:px-4 sm:py-2";

/** Management submenu rows — extra padding; labels may wrap (e.g. Violation Summary). */
const MANAGEMENT_NAV_ROW_SUB_CLASS = cn(
  SIDEBAR_NAV_ROW_SUB_CLASS,
  "items-start py-2 sm:py-2.5"
);

const MANAGEMENT_NAV_SUB_LABEL_CLASS =
  "min-w-0 flex-1 font-medium text-xs leading-snug sm:text-sm whitespace-normal break-words";

const SIDEBAR_NAV_TRIGGER_ROW_CLASS =
  "flex w-full items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5";

const SIDEBAR_CHEVRON_CLASS = "h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4";

/** Bottom area reserved for faded role art (must match absolute art height classes). */
const SIDEBAR_BOTTOM_ART_ZONE_PX = 128;

const SIDEBAR_BOTTOM_ART_ABSOLUTE_CLASS =
  "absolute bottom-0 left-0 right-0 z-0 h-28 bg-contain bg-center bg-no-repeat pointer-events-none sm:h-32 xl:h-36";

/** Fixed top header height — main/sidebar layout offsets use this, not the sidebar. */
const DASHBOARD_HEADER_OFFSET_CLASS = "mt-14";
const DASHBOARD_VIEWPORT_BELOW_HEADER_CLASS =
  "h-[calc(100vh-3.5rem)] max-h-[calc(100vh-3.5rem)]";

function sidebarNavActiveClass(isActive: boolean) {
  return isActive
    ? "bg-white/20 text-white border border-white/30"
    : "text-blue-100 hover:bg-white/10";
}

export default function DashboardShell(props: DashboardShellProps) {
  const {
    title,
    currentPeriod,
    sidebarItems,
    activeItemId,
    onChangeActive,
    children,
    profile,
    onSaveProfile,
    topSummary,
    dashboardType: dashboardTypeProp,
  } = props;

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [isNotificationPanelClosing, setIsNotificationPanelClosing] = useState(false);
  const [isContactDevsModalOpen, setIsContactDevsModalOpen] = useState(false);
  const [isNotificationDetailOpen, setIsNotificationDetailOpen] =
    useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const sidebarAsideRef = useRef<HTMLElement>(null);
  const sidebarNavEndRef = useRef<HTMLDivElement>(null);
  const managementTriggerRef = useRef<HTMLButtonElement>(null);
  const managementContentRef = useRef<HTMLDivElement>(null);
  const [managementMenuMaxH, setManagementMenuMaxH] = useState<number | undefined>(
    undefined
  );
  /** Hide bottom art when nav/dropdown content extends into the decoration zone. */
  const [hideSidebarBottomArt, setHideSidebarBottomArt] = useState(false);

  // Collapsible states for sidebar groups
  const [isManagementOpen, setIsManagementOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);

  /** Help floaters (Guide + Contact) start hidden; footer toggle shows them. */
  const [isHelpButtonsVisible, setIsHelpButtonsVisible] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isDeletingNotification, setIsDeletingNotification] = useState(false);
  const { user, logout, setIsRefreshing } = useUser();
  
  // Extract user role - could be in user.role (string) or user.roles[0].name (array)
  const userRole = useMemo(() => {
    if (!user) return null;
    if (user.roles && typeof user.roles === "string") {
      return user.roles;
    }
    if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
      return user.roles[0]?.name || user.roles[0]?.value || null;
    }
    if (user.roles && typeof user.roles === "object") {
      return (user.roles as any).name || (user.roles as any).value || null;
    }
    return null;
  }, [user]);
  
  // Welcome modal logic - shows every login
  const { shouldShowModal, markAsShown, showModal } = useWelcomeModal(userRole);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isClockVisible, setIsClockVisible] = useState(true);

  const notificationCount = user?.notification_counts ?? 0;

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const setupEcho = async () => {
      echo
        .private(`App.Models.User.${user?.id}`)
        .notification((notification: any) => {
          console.log("New notification received:", notification);
          setIsRefreshing(true);
        });
    };
    setupEcho();
  }, []);

  // Memoize dashboard type detection to avoid dependency issues
  const dashboardType = useMemo(() => {
    if (dashboardTypeProp) return dashboardTypeProp;
    const hasFeedback = sidebarItems.some((item) => item.id === "feedback");
    const hasEvaluationRecords = sidebarItems.some(
      (item) => item.id === "evaluation-records"
    );
    const hasDashboards = sidebarItems.some((item) => item.id === "dashboards");
    const hasUsers = sidebarItems.some((item) => item.id === "users");
    const hasEvaluatedReviews = sidebarItems.some(
      (item) => item.id === "evaluated-reviews"
    );

    // Detect admin dashboard (has unique items like 'dashboards', 'users', 'evaluated-reviews')
    if (hasDashboards || hasUsers || hasEvaluatedReviews) {
      return "admin";
    }

    if (!hasFeedback && !hasEvaluationRecords) {
      return "employee";
    } else if (hasFeedback) {
      return "evaluator";
    } else {
      return "hr";
    }
  }, [dashboardTypeProp, sidebarItems]);

  // Auto-show welcome modal every time user logs in
  useEffect(() => {
    console.log('[DashboardShell] Welcome modal check:', {
      shouldShowModal,
      dashboardType,
      userRole,
      willShow: shouldShowModal && dashboardType && dashboardType !== "admin" && userRole
    });
    
    // Only show for hr, employee, and evaluator dashboards (not admin)
    if (shouldShowModal && dashboardType && dashboardType !== "admin" && userRole) {
      console.log('[DashboardShell] Opening welcome modal');
      setIsGuideModalOpen(true);
    }
  }, [shouldShowModal, dashboardType, userRole]);

  // Handle welcome modal close - mark as shown for today
  const handleWelcomeModalClose = () => {
    setIsGuideModalOpen(false);
    markAsShown();
  };

  // Handle manual guide modal open (from help button)
  const handleManualGuideModalOpen = () => {
    setIsGuideModalOpen(true);
    showModal(); // This allows manual opening even if already shown today
  };

  // Memoize boolean flags to ensure stable references
  const isEmployeeDashboard = useMemo(
    () => dashboardType === "employee",
    [dashboardType]
  );
  const isEvaluatorDashboard = useMemo(
    () => dashboardType === "evaluator",
    [dashboardType]
  );
  const isAdminDashboard = useMemo(
    () => dashboardType === "admin",
    [dashboardType]
  );
  const isHRDashboard = useMemo(() => dashboardType === "hr", [dashboardType]);

  /** Stable key so effect dependency arrays never change length between renders. */
  const sidebarItemsKey = useMemo(
    () => sidebarItems.map((item) => item.id).join(","),
    [sidebarItems]
  );

  /** Hide bottom art while Management/Analytics menus are open (dropdown may overlap that zone). */
  const showSidebarBottomArt =
    !hideSidebarBottomArt && !isManagementOpen && !isAnalyticsOpen;

  const reserveSidebarBottomArt = showSidebarBottomArt;

  /**
   * If every Management item fits below the trigger, expand naturally (no inner scroll).
   * When open, use full sidebar height (bottom art hidden / not reserved).
   */
  const updateManagementMenuMaxH = useCallback(() => {
    if (!isManagementOpen || !managementTriggerRef.current) return;
    const contentEl = managementContentRef.current;
    if (!contentEl) return;

    const triggerRect = managementTriggerRef.current.getBoundingClientRect();
    const aside = sidebarAsideRef.current;

    let limitBottom = window.innerHeight;
    if (aside) {
      // Full sidebar to the bottom while Management is open (art hidden).
      limitBottom = aside.getBoundingClientRect().bottom - 8;
    }

    const available = Math.max(0, Math.floor(limitBottom - triggerRect.bottom - 4));
    if (available <= 0) return;

    const prevMax = contentEl.style.maxHeight;
    contentEl.style.maxHeight = "none";
    const contentH = contentEl.scrollHeight;
    contentEl.style.maxHeight = prevMax;

    if (contentH <= 0) return;

    const next =
      contentH <= available ? undefined : available;

    setManagementMenuMaxH((prev) => (prev === next ? prev : next));
  }, [isManagementOpen]);

  useEffect(() => {
    if (!isManagementOpen) {
      setManagementMenuMaxH((prev) => (prev === undefined ? prev : undefined));
      return;
    }
    updateManagementMenuMaxH();
    const contentEl = managementContentRef.current;
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(updateManagementMenuMaxH);
    });
    const aside = sidebarAsideRef.current;
    const nav = managementTriggerRef.current?.closest("nav");
    if (contentEl) ro.observe(contentEl);
    if (aside) ro.observe(aside);
    if (nav) ro.observe(nav);
    nav?.addEventListener("scroll", updateManagementMenuMaxH, { passive: true });
    window.addEventListener("resize", updateManagementMenuMaxH);
    const t = window.setTimeout(updateManagementMenuMaxH, 320);
    return () => {
      ro.disconnect();
      nav?.removeEventListener("scroll", updateManagementMenuMaxH);
      window.removeEventListener("resize", updateManagementMenuMaxH);
      window.clearTimeout(t);
    };
  }, [isManagementOpen, updateManagementMenuMaxH, sidebarItemsKey]);

  useEffect(() => {
    if (!isManagementOpen) return;
    requestAnimationFrame(updateManagementMenuMaxH);
    const t = window.setTimeout(updateManagementMenuMaxH, 0);
    return () => window.clearTimeout(t);
  }, [isManagementOpen, reserveSidebarBottomArt, updateManagementMenuMaxH]);

  // Auto-open collapsible groups when their items are active
  useEffect(() => {
    // For admin dashboard, management group includes subordinates, departments, branches,
    // positions, branch-heads, area-managers, and violation-summary (single collapsible).
    if (isAdminDashboard) {
      if (
        [
          "subordinates",
          "departments",
          "branches",
          "positions",
          "branch-heads",
          "area-managers",
          "violation-summary",
        ].includes(activeItemId) &&
        !isManagementOpen
      ) {
        setIsManagementOpen(true);
      }
      return;
    }

    if (isHRDashboard) {
      if (
        [
          "departments",
          "branches",
          "branch-heads",
          "area-managers",
          "subordinates",
          "positions",
          "violation-summary",
        ].includes(activeItemId) &&
        !isManagementOpen
      ) {
        setIsManagementOpen(true);
      }
      return;
    }

    if (["departments", "branches", "positions"].includes(activeItemId) && !isManagementOpen) {
      setIsManagementOpen(true);
    }

    // For employee and evaluator dashboards, only 'history' should open Analytics
    // For HR dashboard, 'reviews' and 'history' should open Analytics
    const analyticsItems =
      isEmployeeDashboard || isEvaluatorDashboard
        ? ["history"]
        : ["reviews", "history"];

    if (analyticsItems.includes(activeItemId) && !isAnalyticsOpen) {
      setIsAnalyticsOpen(true);
    }
  }, [
    activeItemId,
    isManagementOpen,
    isAnalyticsOpen,
    isEmployeeDashboard,
    isEvaluatorDashboard,
    isAdminDashboard,
    isHRDashboard,
  ]);

  /** Show bottom role art only when the last nav item sits above the decoration zone. */
  useEffect(() => {
    const aside = sidebarAsideRef.current;
    const navEnd = sidebarNavEndRef.current;
    if (!aside || !navEnd) return;

    const updateOverlap = () => {
      if (!isSidebarOpen) {
        setHideSidebarBottomArt((prev) => (prev ? false : prev));
        return;
      }
      const asideRect = aside.getBoundingClientRect();
      const endRect = navEnd.getBoundingClientRect();
      const decorationZoneTop = asideRect.bottom - SIDEBAR_BOTTOM_ART_ZONE_PX;
      const nextHide = endRect.bottom > decorationZoneTop;
      setHideSidebarBottomArt((prev) => (prev === nextHide ? prev : nextHide));
    };

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(updateOverlap);
    });
    ro.observe(aside);
    ro.observe(navEnd);
    window.addEventListener("resize", updateOverlap);
    updateOverlap();
    const t = window.setTimeout(updateOverlap, 320);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateOverlap);
      window.clearTimeout(t);
    };
  }, [
    isSidebarOpen,
    activeItemId,
    isManagementOpen,
    isAnalyticsOpen,
    sidebarItemsKey,
    dashboardType,
  ]);

  /** After submenu collapse animation, re-check whether bottom art should show again. */
  useEffect(() => {
    if (isManagementOpen || isAnalyticsOpen) return;

    const recheckBottomArt = () => {
      const aside = sidebarAsideRef.current;
      const navEnd = sidebarNavEndRef.current;
      if (!aside || !navEnd || !isSidebarOpen) {
        setHideSidebarBottomArt(false);
        return;
      }
      const asideRect = aside.getBoundingClientRect();
      const endRect = navEnd.getBoundingClientRect();
      const decorationZoneTop = asideRect.bottom - SIDEBAR_BOTTOM_ART_ZONE_PX;
      const nextHide = endRect.bottom > decorationZoneTop;
      setHideSidebarBottomArt((prev) => (prev === nextHide ? prev : nextHide));
    };

    requestAnimationFrame(recheckBottomArt);
    const t = window.setTimeout(recheckBottomArt, 520);
    return () => window.clearTimeout(t);
  }, [isManagementOpen, isAnalyticsOpen, isSidebarOpen]);

  const handleEditProfile = () => {
    setIsProfileModalOpen(true);
  };

  const handleSaveProfile = async (updatedProfile: UserProfile | null) => {
    try {
      // Call parent callback if provided
      if (!updatedProfile) {
        console.error("No profile to save");
        return;
      }

      if (onSaveProfile) {
        await onSaveProfile(updatedProfile);
      }

      // Refresh user data from server to get updated profile
      setIsRefreshing(true);

      setIsProfileModalOpen(false);
    } catch (error) {
      console.error("Error saving profile:", error);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (notification) {
      try {
        await apiService.markNotificationAsRead(notification.id);
      } catch (error: any) {
        toastMessages.generic.error(
          "isRead Failed : ",
          error?.response?.data?.message || error?.message || "Unknown error"
        );
      }
    }

    // Close the notification panel
    setIsNotificationPanelOpen(true);

    // If no actionUrl, show the notification details modal as fallback
    setSelectedNotification(notification);
    setIsNotificationDetailOpen(true);
  };

  const handleMarkAllAsRead = async () => {
    // Mark as read
    try {
      await apiService.markAllNotificationsAsRead();
      setIsRefreshing(true);
    } catch (error: any) {
      alert("test");
      toastMessages.generic.error(
        "Mark All asRead Failed : ",
        error?.response?.data?.message || error?.message || "Unknown error"
      );
    }

    // Close the notification panel
    setIsNotificationPanelOpen(true);
  };

  const handleDeleteNotification = async (
    notification: Notification,
    e: React.MouseEvent
  ) => {
    e.stopPropagation(); // Prevent triggering the notification click

    // Set deleting state to show skeleton on all notifications
    setIsDeletingNotification(true);

    try {
      // Wait 2 seconds to show skeleton animation on all notifications
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Actually delete the notification
      await apiService.deleteNotification(notification.id);
      setIsRefreshing(true);

      // Reset deleting state after a short delay to allow refresh to complete
      setTimeout(() => {
        setIsDeletingNotification(false);
      }, 300);
    } catch (error: any) {
      // Remove deleting state on error
      setIsDeletingNotification(false);
      toastMessages.generic.error(
        "Delete Failed : ",
        error?.response?.data?.message || error?.message || "Unknown error"
      );
    }
  };

  return (
    <div 
      className="flex flex-col min-h-screen relative"
      style={{
        backgroundImage: 'url(/smct.png)',
        backgroundSize: '64%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Faded overlay for better content readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/95 to-indigo-100/95 pointer-events-none"></div>
      
      {/* Blur overlay when guide modal is open */}
      {isGuideModalOpen && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-40 pointer-events-none transition-all duration-300"></div>
      )}
      
      {/* Content wrapper with relative positioning */}
      <div className={`relative z-10 flex flex-col min-h-screen transition-all duration-300 ${isGuideModalOpen ? 'blur-sm' : ''}`}>
      {/* Header - Fixed */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-white shadow-sm">
        <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <img
              src="/smct.png"
              alt="SMCT Group of Companies"
              className="h-9 w-auto shrink-0 sm:h-10"
            />
            <div className="min-w-0 flex flex-col leading-tight">
              <h1 className="truncate text-base font-bold text-gray-900 sm:text-lg">
                {title}
              </h1>
              <p className="truncate text-[11px] text-gray-600 sm:text-xs">
                Performance & Ratings Overview
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {/* Embedded Clock - Combined Display and Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  onClick={() => setIsClockVisible(!isClockVisible)}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 transition-all duration-200 sm:gap-2 sm:px-2.5 ${
                    isClockVisible
                      ? "bg-blue-600 shadow-md hover:bg-blue-700"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  <Clock
                    className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isClockVisible ? "text-white" : "text-gray-500"}`}
                  />
                  {isClockVisible && (
                    <div className="flex flex-col items-start leading-tight">
                      <div className="text-xs font-semibold text-white sm:text-sm">
                        {currentTime.toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit', 
                          second: '2-digit',
                          hour12: true 
                        })}
                      </div>
                      <div className="hidden text-[10px] text-blue-100 sm:block sm:text-xs">
                        {currentTime.toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isClockVisible ? "Hide Clock" : "Show Clock"}</p>
              </TooltipContent>
            </Tooltip>

            {/* Notification Bell */}
            <div className="relative" ref={notificationRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (isNotificationPanelOpen) {
                    // Start closing animation
                    setIsNotificationPanelClosing(true);
                    // Close after animation completes
                    setTimeout(() => {
                      setIsNotificationPanelOpen(false);
                      setIsNotificationPanelClosing(false);
                    }, 300);
                  } else {
                    setIsNotificationPanelOpen(true);
                    setIsNotificationPanelClosing(false);
                  }
                }}
                className="relative h-8 w-8 cursor-pointer p-1.5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-300 hover:text-blue-700 hover:shadow-md active:translate-y-0"
              >
                <Bell className="h-4 w-4" />
                {notificationCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs"
                  >
                    {notificationCount > 10 ? "10+" : notificationCount}
                  </Badge>
                )}
              </Button>

              {/* Notification Panel */}
              {(isNotificationPanelOpen || isNotificationPanelClosing) && (
                <div 
                  className="absolute right-0 top-11 w-80 rounded-lg border bg-white shadow-lg z-[60]"
                  style={{
                    animation: isNotificationPanelClosing 
                      ? 'slideUpFade 0.3s ease-out forwards'
                      : 'slideDownFade 0.3s ease-out',
                  }}
                >
                  <style jsx>{`
                    @keyframes slideDownFade {
                      from {
                        opacity: 0;
                        transform: translateY(-10px);
                      }
                      to {
                        opacity: 1;
                        transform: translateY(0);
                      }
                    }
                    @keyframes slideUpFade {
                      from {
                        opacity: 1;
                        transform: translateY(0);
                      }
                      to {
                        opacity: 0;
                        transform: translateY(-10px);
                      }
                    }
                  `}</style>
                  <div 
                    className="p-4 border-b bg-blue-600 rounded-t-lg relative overflow-hidden"
                    style={{
                      backgroundImage: 'url(/smct.png)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                    }}
                  >
                    {/* Fade overlay to ensure text readability */}
                    <div className="absolute inset-0 bg-blue-600/90"></div>
                    <div className="relative z-10 flex items-center justify-between">
                      <h3 className="font-semibold text-white">
                        Notifications
                      </h3>
                      <div className="flex items-center space-x-2">
                        {user?.notification_counts !== 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleMarkAllAsRead}
                            className="text-xs text-white hover:text-blue-100 hover:bg-blue-700/50 cursor-pointer"
                          >
                            Mark all read
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsNotificationPanelClosing(true);
                            setTimeout(() => {
                              setIsNotificationPanelOpen(false);
                              setIsNotificationPanelClosing(false);
                            }, 300);
                          }}
                          className="p-1 text-white hover:bg-blue-700/50 hover:text-white cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="h-[270px] overflow-y-auto">
                    {!user?.notifications || user?.notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 px-4">
                        <div className="mb-4">
                          <img
                            src="/alarm.gif"
                            alt="No notifications"
                            className="w-25 h-25 object-contain"
                            draggable="false"
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              return false;
                            }}
                            onDragStart={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              return false;
                            }}
                            onDrag={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              return false;
                            }}
                            onDragEnd={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              return false;
                            }}
                            onMouseDown={(e) => {
                              if (e.button === 0) {
                                e.preventDefault();
                              }
                            }}
                            style={{
                              imageRendering: "auto",
                              willChange: "auto",
                              transform: "translateZ(0)",
                              backfaceVisibility: "hidden",
                              WebkitBackfaceVisibility: "hidden",
                            } as React.CSSProperties}
                          />
                        </div>
                        <div className="text-center">
                          <p className="text-base font-medium text-gray-700 mb-1">
                            No notifications yet
                          </p>
                          <p className="text-sm text-gray-500">
                            Wait for any notifications to appear here
                          </p>
                        </div>
                      </div>
                    ) : (
                      user?.notifications.map((notification: any) => {
                        // Show skeleton animation on all notifications when any deletion is in progress
                        if (isDeletingNotification) {
                          return (
                            <div
                              key={notification.id}
                              className="p-4 border-b bg-gray-50"
                            >
                              <div className="flex items-start space-x-3">
                                <Skeleton className="h-4 w-4 rounded-full" />
                                <div className="flex-1 min-w-0 space-y-2">
                                  <Skeleton className="h-4 w-full" />
                                  <Skeleton className="h-3 w-2/3" />
                                </div>
                                <Skeleton className="h-6 w-6 rounded" />
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={notification.id}
                            className={`p-4 border-b hover:bg-gray-50 ${
                              notification.read_at === "" ||
                              notification.read_at === null
                                ? "bg-blue-50 border-l-4 border-l-blue-500"
                                : ""
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <span className="text-sm opacity-50">
                                {notification.read_at === "" ||
                                notification.read_at === null
                                  ? "✅"
                                  : ""}{" "}
                              </span>
                              <div
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() =>
                                  handleNotificationClick(notification)
                                }
                              >
                                <p className="text-sm text-gray-900">
                                  {notification.data.message.length > 50
                                    ? notification.data.message.slice(0, 50) +
                                      "  . . ."
                                    : notification.data.message}
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                  {new Date(
                                    notification.created_at
                                  ).toLocaleString()}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                {notification.read_at === "" ||
                                  (notification.read_at === null && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                  ))}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) =>
                                    handleDeleteNotification(notification, e)
                                  }
                                  className="p-1 h-6 w-6 text-gray-400 hover:text-red-500 hover:bg-red-50 cursor-pointer disabled:cursor-not-allowed"
                                  title="Delete notification"
                                  disabled={isDeletingNotification}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 [&_button]:h-7 [&_button]:px-2 [&_button]:text-[11px] [&_img]:h-7 [&_img]:w-7 [&_span]:text-xs">
              <ProfileCard
                profile={user}
                variant="header"
                showLogout={true}
                showSettings={false}
                onEditProfile={handleEditProfile}
                onLogout={handleLogout}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout with Sidebar */}
      <div className={cn("flex overflow-hidden", DASHBOARD_HEADER_OFFSET_CLASS)}>
        {/* Sidebar */}
        <div
          className={cn(
            "relative overflow-hidden bg-blue-600 transition-all duration-400 rounded-r-2xl",
            isSidebarOpen ? SIDEBAR_WIDTH_CLASS : "w-0"
          )}
        >
          <aside
            ref={sidebarAsideRef}
            className={cn(
              "relative flex flex-col overflow-hidden bg-blue-600 text-blue-50 rounded-r-2xl shadow-[4px_0_24px_-8px_rgba(30,64,175,0.45)]",
              DASHBOARD_VIEWPORT_BELOW_HEADER_CLASS,
              SIDEBAR_WIDTH_CLASS
            )}
          >
            <div
              className={cn(
                "relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden p-4 transition-opacity duration-400 sm:p-5 xl:p-6",
                reserveSidebarBottomArt && "mb-28 sm:mb-32 xl:mb-36",
                isSidebarOpen ? "opacity-100" : "opacity-0"
              )}
            >
              <Button
                variant="outline"
                size="lg"
                onClick={() => setIsSidebarOpen(false)}
                className="mb-4 w-1/3 shrink-0 bg-white/10 text-white hover:bg-white/20 border-white/30 cursor-pointer"
              >
                <div className="flex items-center">
                  <ChevronLeft className="w-10 h-10 mr-[-6px]" />
                  <ChevronLeft className="w-10 h-10" />
                </div>
              </Button>

              <h2 className={SIDEBAR_HEADING_CLASS}>Navigation</h2>
              <nav className={cn("space-y-2", SIDEBAR_NAV_SCROLL_CLASS)}>
                {(() => {
                  // Use the memoized dashboard type values

                  // Define which items should be visible (main items)
                  // For employee dashboard: overview, reviews
                  // For evaluator dashboard: overview, employees, feedback, reviews
                  // For HR dashboard: overview, evaluation-records, employees (management items go in collapsible group)
                  // For admin dashboard: all items except management group (subordinates,
                  // departments, branches, positions, branch-heads, area-managers,
                  // violation-summary)
                  const visibleItems = isAdminDashboard
                    ? sidebarItems
                        .map((item) => item.id)
                        .filter(
                          (id) =>
                            ![
                              "subordinates",
                              "departments",
                              "branches",
                              "positions",
                              "branch-heads",
                              "area-managers",
                              "violation-summary",
                            ].includes(id)
                        )
                    : isHRDashboard
                    ? sidebarItems
                        .map((item) => item.id)
                        .filter(
                          (id) =>
                            ![
                              "subordinates",
                              "departments",
                              "branches",
                              "branch-heads",
                              "positions",
                              "area-managers",
                              "violation-summary",
                            ].includes(id)
                        )
                    : isEmployeeDashboard
                    ? ["overview", "reviews", "my-violations", "history"]
                    : isEvaluatorDashboard
                    ? [
                        "overview",
                        "employees",
                        "feedback",
                        "reviews",
                        "my-violations",
                        "history",
                      ]
                    : ["overview", "evaluation-records", "employees"];

                  // Define collapsible groups
                  // For HR dashboard, management includes departments, branches, positions,
                  // branch-heads, area-managers, subordinates, violation-summary.
                  // For admin dashboard, management includes subordinates, org structure,
                  // and violation summary (no separate Leadership section).
                  const managementItems = isHRDashboard
                    ? [
                        "subordinates",
                        "departments",
                        "branches",
                        "branch-heads",
                        "positions",
                        "area-managers",
                        "violation-summary",
                      ]
                    : [
                        "subordinates",
                        "departments",
                        "branches",
                        "positions",
                        "branch-heads",
                        "area-managers",
                        "violation-summary",
                      ];
                  // Analytics items vary by dashboard type - exclude items that are already visible
                  const analyticsItems = isEmployeeDashboard
                    ? [] // No analytics items for employee dashboard - history is now visible
                    : isEvaluatorDashboard
                    ? [] // No analytics items for evaluator dashboard - history is now visible
                    : ["reviews", "history"]; // For HR, 'reviews' goes in Analytics

                  return sidebarItems.map((item) => {
                    const isVisible = visibleItems.includes(item.id);
                    const isManagementItem = managementItems.includes(item.id);
                    const isAnalyticsItem = analyticsItems.includes(item.id);

                    // For admin and HR dashboards, handle management items in collapsible group
                    if (
                      (isAdminDashboard || isHRDashboard) &&
                      isManagementItem &&
                      item.id === "departments"
                    ) {
                      return (
                        <Collapsible
                          key="management"
                          open={isManagementOpen}
                          onOpenChange={setIsManagementOpen}
                        >
                          <CollapsibleTrigger asChild>
                            <button
                              ref={managementTriggerRef}
                              type="button"
                              data-management-trigger
                              className={cn(
                                SIDEBAR_NAV_ITEM_BASE_CLASS,
                                SIDEBAR_NAV_TRIGGER_ROW_CLASS,
                                sidebarNavActiveClass(
                                  managementItems.includes(activeItemId)
                                )
                              )}
                            >
                              <div className={cn(SIDEBAR_NAV_ROW_CLASS, "w-auto flex-1 py-0 px-0")}>
                                <span className={SIDEBAR_NAV_ICON_CLASS}>⚙️</span>
                                <span className={SIDEBAR_NAV_LABEL_CLASS}>Management</span>
                              </div>
                              <ChevronDown
                                className={cn(
                                  SIDEBAR_CHEVRON_CLASS,
                                  "transition-transform duration-200 ease-out",
                                  isManagementOpen && "rotate-180"
                                )}
                              />
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className={MANAGEMENT_DROPDOWN_CONTENT_CLASS}>
                            <div
                              ref={managementContentRef}
                              className={MANAGEMENT_SCROLL_INNER_CLASS}
                              style={{
                                maxHeight:
                                  isManagementOpen && managementMenuMaxH != null
                                    ? managementMenuMaxH
                                    : undefined,
                              }}
                            >
                              {sidebarItems
                                .filter((i) => managementItems.includes(i.id))
                                .map((subItem) => (
                                  <button
                                    key={subItem.id}
                                    onClick={() => onChangeActive(subItem.id)}
                                    className={cn(
                                      SIDEBAR_NAV_ITEM_BASE_CLASS,
                                      SIDEBAR_SUBMENU_ITEM_CLASS,
                                      MANAGEMENT_NAV_ROW_SUB_CLASS,
                                      sidebarNavActiveClass(activeItemId === subItem.id)
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        SIDEBAR_NAV_ICON_CLASS,
                                        "mt-0.5"
                                      )}
                                    >
                                      {subItem.icon}
                                    </span>
                                    <span className={MANAGEMENT_NAV_SUB_LABEL_CLASS}>
                                      {subItem.label}
                                    </span>
                                  </button>
                                ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    }

                    // For admin dashboard, skip management items (already handled above)
                    if (isAdminDashboard && isManagementItem) {
                      return null;
                    }

                    // For admin dashboard, render other items as regular buttons
                    if (isAdminDashboard) {
                      return (
                        <button
                          key={item.id}
                          onClick={() => onChangeActive(item.id)}
                          className={cn(
                            SIDEBAR_NAV_ITEM_BASE_CLASS,
                            SIDEBAR_NAV_ROW_CLASS,
                            sidebarNavActiveClass(activeItemId === item.id)
                          )}
                        >
                          <span className={SIDEBAR_NAV_ICON_CLASS}>{item.icon}</span>
                          <span className={SIDEBAR_NAV_LABEL_CLASS}>{item.label}</span>
                        </button>
                      );
                    }

                    // Render visible items as regular buttons
                    if (isVisible) {
                      return (
                        <button
                          key={item.id}
                          onClick={() => onChangeActive(item.id)}
                          className={cn(
                            SIDEBAR_NAV_ITEM_BASE_CLASS,
                            SIDEBAR_NAV_ROW_CLASS,
                            sidebarNavActiveClass(activeItemId === item.id)
                          )}
                        >
                          <span className={SIDEBAR_NAV_ICON_CLASS}>{item.icon}</span>
                          <span className={SIDEBAR_NAV_LABEL_CLASS}>{item.label}</span>
                        </button>
                      );
                    }

                    // Render Management collapsible group
                    if (item.id === "departments") {
                      return (
                        <Collapsible
                          key="management"
                          open={isManagementOpen}
                          onOpenChange={setIsManagementOpen}
                        >
                          <CollapsibleTrigger asChild>
                            <button
                              ref={managementTriggerRef}
                              type="button"
                              data-management-trigger
                              className={cn(
                                SIDEBAR_NAV_ITEM_BASE_CLASS,
                                SIDEBAR_NAV_TRIGGER_ROW_CLASS,
                                sidebarNavActiveClass(
                                  managementItems.includes(activeItemId)
                                )
                              )}
                            >
                              <div className={cn(SIDEBAR_NAV_ROW_CLASS, "w-auto flex-1 py-0 px-0")}>
                                <span className={SIDEBAR_NAV_ICON_CLASS}>⚙️</span>
                                <span className={SIDEBAR_NAV_LABEL_CLASS}>Management</span>
                              </div>
                              <ChevronDown
                                className={cn(
                                  SIDEBAR_CHEVRON_CLASS,
                                  "transition-transform duration-200 ease-out",
                                  isManagementOpen && "rotate-180"
                                )}
                              />
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className={MANAGEMENT_DROPDOWN_CONTENT_CLASS}>
                            <div
                              ref={managementContentRef}
                              className={MANAGEMENT_SCROLL_INNER_CLASS}
                              style={{
                                maxHeight:
                                  isManagementOpen && managementMenuMaxH != null
                                    ? managementMenuMaxH
                                    : undefined,
                              }}
                            >
                              {sidebarItems
                                .filter((i) => managementItems.includes(i.id))
                                .map((subItem) => (
                                  <button
                                    key={subItem.id}
                                    onClick={() => onChangeActive(subItem.id)}
                                    className={cn(
                                      SIDEBAR_NAV_ITEM_BASE_CLASS,
                                      SIDEBAR_SUBMENU_ITEM_CLASS,
                                      MANAGEMENT_NAV_ROW_SUB_CLASS,
                                      sidebarNavActiveClass(activeItemId === subItem.id)
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        SIDEBAR_NAV_ICON_CLASS,
                                        "mt-0.5"
                                      )}
                                    >
                                      {subItem.icon}
                                    </span>
                                    <span className={MANAGEMENT_NAV_SUB_LABEL_CLASS}>
                                      {subItem.label}
                                    </span>
                                  </button>
                                ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    }

                    // Render Analytics collapsible group
                    // For employee and evaluator dashboards, skip Analytics (history is now visible)
                    // For HR dashboard, trigger on 'reviews'
                    const analyticsTriggerId =
                      isEmployeeDashboard || isEvaluatorDashboard
                        ? null
                        : "reviews";
                    if (analyticsTriggerId && item.id === analyticsTriggerId) {
                      return (
                        <Collapsible
                          key="analytics"
                          open={isAnalyticsOpen}
                          onOpenChange={setIsAnalyticsOpen}
                        >
                          <CollapsibleTrigger asChild>
                            <button
                              className={cn(
                                SIDEBAR_NAV_ITEM_BASE_CLASS,
                                SIDEBAR_NAV_TRIGGER_ROW_CLASS,
                                sidebarNavActiveClass(
                                  analyticsItems.includes(activeItemId)
                                )
                              )}
                            >
                              <div className={cn(SIDEBAR_NAV_ROW_CLASS, "w-auto flex-1 py-0 px-0")}>
                                <span className={SIDEBAR_NAV_ICON_CLASS}>📊</span>
                                <span className={SIDEBAR_NAV_LABEL_CLASS}>Analytics</span>
                              </div>
                              <ChevronDown
                                className={cn(
                                  SIDEBAR_CHEVRON_CLASS,
                                  "transition-transform duration-200 ease-out",
                                  isAnalyticsOpen && "rotate-180"
                                )}
                              />
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent
                            className={cn(
                              SIDEBAR_SUBMENU_COLLAPSE_CLASS,
                              "space-y-1 pl-3 sm:pl-4"
                            )}
                          >
                            {sidebarItems
                              .filter((i) => analyticsItems.includes(i.id))
                              .map((subItem) => (
                                <button
                                  key={subItem.id}
                                  onClick={() => onChangeActive(subItem.id)}
                                  className={cn(
                                    SIDEBAR_NAV_ITEM_BASE_CLASS,
                                    SIDEBAR_SUBMENU_ITEM_CLASS,
                                    SIDEBAR_NAV_ROW_SUB_CLASS,
                                    sidebarNavActiveClass(activeItemId === subItem.id)
                                  )}
                                >
                                  <span className={SIDEBAR_NAV_ICON_CLASS}>
                                    {subItem.icon}
                                  </span>
                                  <span className={SIDEBAR_NAV_SUB_LABEL_CLASS}>
                                    {subItem.label}
                                  </span>
                                </button>
                              ))}
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    }

                    // Skip other items (they're already handled in collapsible groups)
                    return null;
                  });
                })()}
                <div ref={sidebarNavEndRef} className="h-px w-full shrink-0" aria-hidden />
              </nav>
            </div>
            {/* Faded role art — hidden while Management/Analytics open or when nav fills the zone */}
            {showSidebarBottomArt && isEmployeeDashboard && (
              <div
                className={SIDEBAR_BOTTOM_ART_ABSOLUTE_CLASS}
                style={{
                  backgroundImage: "url(/emp.png)",
                  opacity: 0.25,
                }}
                aria-hidden
              />
            )}
            {showSidebarBottomArt && isEvaluatorDashboard && (
              <div
                className={SIDEBAR_BOTTOM_ART_ABSOLUTE_CLASS}
                style={{
                  backgroundImage: "url(/survey.png)",
                  opacity: 0.25,
                }}
                aria-hidden
              />
            )}
            {showSidebarBottomArt && isHRDashboard && (
              <div
                className={SIDEBAR_BOTTOM_ART_ABSOLUTE_CLASS}
                style={{
                  backgroundImage: "url(/human.png)",
                  opacity: 0.22,
                }}
                aria-hidden
              />
            )}
            {showSidebarBottomArt && isAdminDashboard && (
              <div
                className={SIDEBAR_BOTTOM_ART_ABSOLUTE_CLASS}
                style={{
                  backgroundImage: "url(/admin.png)",
                  opacity: 0.18,
                }}
                aria-hidden
              />
            )}
          </aside>
        </div>

        {!isSidebarOpen && (
          <div className="p-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSidebarOpen(true)}
              className="bg-blue-700 text-white hover:bg-blue-300  hover:text-blue-700 border-blue-700 cursor-pointer"
            >
              <div className="flex items-center">
                <ChevronRight className="w-10 h-10 mr-[-6px]" />
                <ChevronRight className="w-10 h-10" />
              </div>
            </Button>
          </div>
        )}
        <main
          className={cn(
            "flex-1 overflow-y-auto px-5 pb-20 pt-5",
            DASHBOARD_VIEWPORT_BELOW_HEADER_CLASS
          )}
        >
          {topSummary && activeItemId === "overview" && (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {topSummary}
            </div>
          )}
          {children}
        </main>
      </div>

      {/* Footer - Sticky */}
      <footer
        className={cn(
          "fixed bottom-0 z-40 bg-white border-t border-gray-200 shadow-sm transition-all duration-400 right-0",
          isSidebarOpen ? "left-56 xl:left-64" : "left-0"
        )}
      >
        <div className="px-6 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
            <div className="flex items-center space-x-2">
              <img
                src="/smct.png"
                alt="SMCT Group of Companies"
                className="h-8 w-auto"
              />
              <p className="text-sm text-gray-600">
                © {new Date().getFullYear()} SMCT Group of Companies. All rights reserved.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>Performance & Ratings System</span>
                <span className="hidden md:inline">•</span>
                <span className="hidden md:inline">Version {APP_VERSION}</span>
              </div>
              {/* Toggle Button for Help Buttons - In Footer */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => setIsHelpButtonsVisible(!isHelpButtonsVisible)}
                    className="h-9 w-9 rounded-full bg-blue-100 hover:bg-blue-400 shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 hover:rotate-6 active:translate-y-0 p-0 cursor-pointer"
                  >
                    <img
                      src="/question.png"
                      alt="Toggle Help"
                      className="h-8 w-8 object-contain"
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  sideOffset={10}
                  className="bg-blue-700 text-white border-red-500"
                >
                  <p className="font-medium">
                    {isHelpButtonsVisible ? "Hide Help Buttons" : "Show Help Buttons"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </footer>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={user}
        onSave={handleSaveProfile}
      />

      {/* Contact Developers Modal */}
      <ContactDevsModal
        isOpen={isContactDevsModalOpen}
        onCloseAction={() => setIsContactDevsModalOpen(false)}
      />

      {/* Notification Detail Modal */}
      <Dialog
        open={isNotificationDetailOpen}
        onOpenChangeAction={setIsNotificationDetailOpen}
      >
        <DialogContent
          className="max-w-2xl w-full mx-4 p-0 overflow-hidden"
          style={{
            animation: "modalPopup 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <style jsx>{`
            @keyframes modalPopup {
              0% {
                opacity: 0;
                transform: scale(0.95) translateY(-10px);
              }
              100% {
                opacity: 1;
                transform: scale(1) translateY(0);
              }
            }
          `}</style>
          
          {selectedNotification && (
            <>
              {/* Header with gradient background and faded image */}
              <div 
                className="relative px-2 py-5 overflow-hidden"
                style={{
                  backgroundImage: 'url(/smct.png)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }}
              >
                {/* Faded overlay for better text readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 to-blue-700/90 backdrop-blur-[1px]"></div>
                
                {/* Content with relative positioning */}
                <div className="relative z-10">
                  <DialogHeader className="pb-0">
                    <DialogTitle className="flex items-center gap-3 text-xl text-white drop-shadow-md">
                      <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm shadow-lg">
                        <Bell className="w-5 h-5 text-white" />
                      </div>
                      <span>Notification Details</span>
                    </DialogTitle>
                  </DialogHeader>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-6 space-y-6">
                {/* Message Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded-md">
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                      Message
                    </span>
                  </div>
                  <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 p-5 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {selectedNotification.data.message}
                    </p>
                  </div>
                </div>

                {/* Timestamp Section */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                      Received At
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {new Date(selectedNotification.created_at).toLocaleString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </span>
                  </div>
                </div>

                {/* Close Button */}
                <div className="pt-4 border-t border-gray-200 flex justify-end">
                  <Button
                    onClick={async () => {
                      setIsNotificationDetailOpen(false);
                      setIsRefreshing(true);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-8 py-2.5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 font-medium"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Floating Help Buttons - Toggleable (Fixed to viewport) */}
      {/* Dashboard Guide Button - Hidden in Admin Dashboard */}
      {!isAdminDashboard && (
        <Button
          variant="ghost"
          size="lg"
          onClick={isHelpButtonsVisible ? handleManualGuideModalOpen : undefined}
          disabled={!isHelpButtonsVisible}
          className={`fixed bottom-24 right-6 z-50 h-14 w-14 rounded-full bg-blue-100 hover:bg-blue-400 shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:rotate-6 active:translate-y-0 p-0 ${
            isHelpButtonsVisible
              ? "opacity-100 translate-y-0 scale-100 pointer-events-auto delay-0 cursor-pointer"
              : "opacity-0 translate-y-4 scale-0 pointer-events-none delay-0 cursor-default"
          }`}
          title="Dashboard Guide"
          tabIndex={isHelpButtonsVisible ? 0 : -1}
          aria-hidden={!isHelpButtonsVisible}
          style={{ 
            pointerEvents: isHelpButtonsVisible ? "auto" : "none",
            cursor: isHelpButtonsVisible ? "pointer" : "default"
          }}
        >
          <img
            src="/faq.png"
            alt="Help"
            className="h-10 w-10 object-contain transition-transform duration-200 hover:scale-105"
          />
        </Button>
      )}

      {/* Contact Developers Button */}
      <Button
        variant="ghost"
        size="lg"
        onClick={isHelpButtonsVisible ? () => setIsContactDevsModalOpen(true) : undefined}
        disabled={!isHelpButtonsVisible}
        className={`fixed bottom-40 right-6 z-50 h-14 w-14 rounded-full bg-blue-100 hover:bg-blue-400 shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:rotate-6 active:translate-y-0 p-0 ${
          isHelpButtonsVisible
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto delay-100 cursor-pointer"
            : "opacity-0 translate-y-4 scale-0 pointer-events-none delay-0 cursor-default"
        }`}
        title="Contact Developers"
        tabIndex={isHelpButtonsVisible ? 0 : -1}
        aria-hidden={!isHelpButtonsVisible}
        style={{ 
          pointerEvents: isHelpButtonsVisible ? "auto" : "none",
          cursor: isHelpButtonsVisible ? "pointer" : "default"
        }}
      >
        <img
          src="/code.png"
          alt="Contact Developers"
          className="h-10 w-10 object-contain transition-transform duration-200 hover:scale-105"
        />
      </Button>

      {/* Dashboard Guide Modal - Conditionally rendered based on dashboard type */}
      {isGuideModalOpen && dashboardType === "hr" && (
        <HRDashboardGuideModal
          isOpen={isGuideModalOpen}
          onCloseAction={handleWelcomeModalClose}
        />
      )}
      {isGuideModalOpen && dashboardType === "employee" && (
        <EmployeeDashboardGuideModal
          isOpen={isGuideModalOpen}
          onCloseAction={handleWelcomeModalClose}
        />
      )}
      {isGuideModalOpen && dashboardType === "evaluator" && (
        <EvaluatorDashboardGuideModal
          isOpen={isGuideModalOpen}
          onCloseAction={handleWelcomeModalClose}
        />
      )}
      </div>
    </div>
  );
}
