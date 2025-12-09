"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Bell,
  X,
  Trash2,
  MessageCircle,
  ChevronDown,
  HelpCircle,
  ChevronUp,
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
import ProfileCard, { UserProfile } from "./ProfileCard";
import ProfileModal from "./ProfileModal";
import ContactDevsModal from "./ContactDevsModal";
import { HRDashboardGuideModal } from "./HRDashboardGuideModal";
import { EmployeeDashboardGuideModal } from "./EmployeeDashboardGuideModal";
import { EvaluatorDashboardGuideModal } from "./EvaluatorDashboardGuideModal";
import { useUser } from "@/contexts/UserContext";
import { useNotifications } from "@/hooks/useNotifications";
import { Notification } from "@/lib/types";
import { apiService } from "@/lib/apiService";
import { useRouter } from "next/navigation";

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
};

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
  } = props;

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [isContactDevsModalOpen, setIsContactDevsModalOpen] = useState(false);
  const [isNotificationDetailOpen, setIsNotificationDetailOpen] =
    useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Collapsible states for sidebar groups
  const [isManagementOpen, setIsManagementOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isLeadershipOpen, setIsLeadershipOpen] = useState(false);
  
  // Toggle state for help buttons (Contact Devs & Dashboard Guide)
  const [isHelpButtonsVisible, setIsHelpButtonsVisible] = useState(true);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  const { user, logout, refreshUser } = useUser();
  const router = useRouter();

  // Get user role for notifications - extract from roles array
  const userRole = useMemo(() => {
    if (!user?.roles) return "employee";
    // Handle roles as array or object
    if (Array.isArray(user.roles)) {
      return user.roles[0]?.name || user.roles[0] || "employee";
    }
    return user.roles?.name || "employee";
  }, [user]);

  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications(userRole);

  // Update profile function
  const updateProfile = async (updatedProfile: UserProfile) => {
    // Update user data - this will be handled by the parent component's onSaveProfile
    // For now, we'll refresh the user data from the server
    await refreshUser();
  };

  // Memoize dashboard type detection to avoid dependency issues
  const dashboardType = useMemo(() => {
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
  }, [sidebarItems]);

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

  // Auto-open collapsible groups when their items are active
  useEffect(() => {
    // For admin dashboard, handle management group (departments, branches) and leadership group (branch-heads, area-managers)
    if (isAdminDashboard) {
      if (
        ["departments", "branches"].includes(activeItemId) &&
        !isManagementOpen
      ) {
        setIsManagementOpen(true);
      }
      if (
        ["branch-heads", "area-managers"].includes(activeItemId) &&
        !isLeadershipOpen
      ) {
        setIsLeadershipOpen(true);
      }
      return;
    }

    if (isHRDashboard) {
      if (
        ["departments", "branches", "branch-heads", "area-managers"].includes(
          activeItemId
        ) &&
        !isManagementOpen
      ) {
        setIsManagementOpen(true);
      }
      return;
    }

    if (
      ["departments", "branches"].includes(activeItemId) &&
      !isManagementOpen
    ) {
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
    isLeadershipOpen,
    isEmployeeDashboard,
    isEvaluatorDashboard,
    isAdminDashboard,
  ]);

  // Close notification panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setIsNotificationPanelOpen(false);
      }
    };

    if (isNotificationPanelOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isNotificationPanelOpen]);

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
      await refreshUser();

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
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    // Close the notification panel
    setIsNotificationPanelOpen(false);

    // Navigate to the action URL if it exists
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    } else {
      // If no actionUrl, show the notification details modal as fallback
      setSelectedNotification(notification);
      setIsNotificationDetailOpen(true);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleDeleteNotification = async (
    notificationId: number,
    e: React.MouseEvent
  ) => {
    e.stopPropagation(); // Prevent triggering the notification click
    try {
      // Use clientDataService to delete notification properly
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return "✅";
      case "warning":
        return "⚠️";
      case "error":
        return "❌";
      default:
        return "ℹ️";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "success":
        return "text-green-600 bg-green-50";
      case "warning":
        return "text-yellow-600 bg-yellow-50";
      case "error":
        return "text-red-600 bg-red-50";
      default:
        return "text-blue-600 bg-blue-50";
    }
  };

  return (
    <div className="flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b rounded-t-lg">
        <div className="flex justify-between items-center px-6 py-4">
          <div className="flex items-center space-x-3">
            <img
              src="/smct.png"
              alt="SMCT Group of Companies"
              className="h-12 w-auto"
            />
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-gray-900">{title}</h1>
              <p className="text-sm text-gray-600">
                Performance & Ratings Overview
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {currentPeriod ? (
              <Badge variant="outline" className="text-sm">
                {currentPeriod}
              </Badge>
            ) : null}

            {/* Notification Bell */}
            <div className="relative" ref={notificationRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setIsNotificationPanelOpen(!isNotificationPanelOpen)
                }
                className="relative p-2 hover:bg-gray-100"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs"
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Badge>
                )}
              </Button>

              {/* Notification Panel */}
              {isNotificationPanelOpen && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-lg border z-50">
                  <div className="p-4 border-b">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">
                        Notifications
                      </h3>
                      <div className="flex items-center space-x-2">
                        {unreadCount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleMarkAllAsRead}
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            Mark all read
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsNotificationPanelOpen(false)}
                          className="p-1"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="h-[270px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        No notifications
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 border-b hover:bg-gray-50 ${
                            !notification.isRead
                              ? "bg-blue-50 border-l-4 border-l-blue-500"
                              : ""
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <span className="text-lg">
                              {getNotificationIcon(notification.type)}
                            </span>
                            <div
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() =>
                                handleNotificationClick(notification)
                              }
                            >
                              <p className="text-sm text-gray-900">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(
                                  notification.timestamp
                                ).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) =>
                                  handleDeleteNotification(notification.id, e)
                                }
                                className="p-1 h-6 w-6 text-gray-400 hover:text-red-500 hover:bg-red-50"
                                title="Delete notification"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

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
      </header>

      {/* Main Layout with Sidebar */}
      <div className="flex overflow-hidden">
        {/* Sidebar */}
        <div
          className={`relative overflow-hidden bg-blue-600 transition-all duration-400 ${
            isSidebarOpen ? "w-64" : "w-0"
          }`}
        >
          <aside className="bg-blue-600 text-blue-50 min-h-screen w-64 rounded-bl-lg">
            <div
              className={`p-6 transition-opacity duration-400 ${
                isSidebarOpen ? "opacity-100" : "opacity-0"
              }`}
            >
              <Button
                variant="outline"
                size="lg"
                onClick={() => setIsSidebarOpen(false)}
                className="w-1/3 mb-4 bg-white/10 text-white hover:bg-white/20 border-white/30"
              >
                <div className="flex items-center">
                  <ChevronLeft className="w-10 h-10 mr-[-6px]" />
                  <ChevronLeft className="w-10 h-10" />
                </div>
              </Button>

              <h2 className="text-lg font-bold text-white mb-6">Navigation</h2>
              <nav className="space-y-2">
                {(() => {
                  // Use the memoized dashboard type values

                  // Define which items should be visible (main items)
                  // For employee dashboard: overview, reviews
                  // For evaluator dashboard: overview, employees, feedback, reviews
                  // For HR dashboard: overview, evaluation-records, employees (management items go in collapsible group)
                  // For admin dashboard: all items except departments, branches, branch-heads, and area-managers (they go in collapsible groups)
                  const visibleItems = isAdminDashboard
                    ? sidebarItems
                        .map((item) => item.id)
                        .filter(
                          (id) =>
                            ![
                              "departments",
                              "branches",
                              "branch-heads",
                              "area-managers",
                            ].includes(id)
                        )
                    : isHRDashboard
                    ? sidebarItems
                        .map((item) => item.id)
                        .filter(
                          (id) =>
                            ![
                              "departments",
                              "branches",
                              "branch-heads",
                              "area-managers",
                            ].includes(id)
                        )
                    : isEmployeeDashboard
                    ? ["overview", "reviews", "history"]
                    : isEvaluatorDashboard
                    ? [
                        "overview",
                        "employees",
                        "feedback",
                        "reviews",
                        "history",
                      ]
                    : ["overview", "evaluation-records", "employees"];

                  // Define collapsible groups
                  // For HR dashboard, management includes departments, branches, branch-heads, and area-managers
                  // For admin dashboard, management includes departments and branches, leadership includes branch-heads and area-managers
                  const managementItems = isHRDashboard
                    ? [
                        "departments",
                        "branches",
                        "branch-heads",
                        "area-managers",
                      ]
                    : ["departments", "branches"];
                  const leadershipItems = ["branch-heads", "area-managers"];
                  // Analytics items vary by dashboard type - exclude items that are already visible
                  const analyticsItems = isEmployeeDashboard
                    ? [] // No analytics items for employee dashboard - history is now visible
                    : isEvaluatorDashboard
                    ? [] // No analytics items for evaluator dashboard - history is now visible
                    : ["reviews", "history"]; // For HR, 'reviews' goes in Analytics

                  return sidebarItems.map((item) => {
                    const isVisible = visibleItems.includes(item.id);
                    const isManagementItem = managementItems.includes(item.id);
                    const isLeadershipItem = leadershipItems.includes(item.id);
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
                              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 ${
                                managementItems.includes(activeItemId)
                                  ? "bg-white/20 text-white border border-white/30"
                                  : "text-blue-100 hover:bg-white/10"
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <span className="text-lg">⚙️</span>
                                <span className="font-medium">Management</span>
                              </div>
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${
                                  isManagementOpen ? "transform rotate-180" : ""
                                }`}
                              />
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pl-4 mt-2 space-y-1">
                            {sidebarItems
                              .filter((i) => managementItems.includes(i.id))
                              .map((subItem) => (
                                <button
                                  key={subItem.id}
                                  onClick={() => onChangeActive(subItem.id)}
                                  className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 ${
                                    activeItemId === subItem.id
                                      ? "bg-white/20 text-white border border-white/30"
                                      : "text-blue-100 hover:bg-white/10"
                                  }`}
                                >
                                  <span className="text-lg">
                                    {subItem.icon}
                                  </span>
                                  <span className="font-medium text-sm">
                                    {subItem.label}
                                  </span>
                                </button>
                              ))}
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    }

                    // For admin dashboard only, handle leadership items in collapsible group (HR uses management group)
                    if (
                      isAdminDashboard &&
                      isLeadershipItem &&
                      item.id === "branch-heads"
                    ) {
                      return (
                        <Collapsible
                          key="leadership"
                          open={isLeadershipOpen}
                          onOpenChange={setIsLeadershipOpen}
                        >
                          <CollapsibleTrigger asChild>
                            <button
                              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 ${
                                leadershipItems.includes(activeItemId)
                                  ? "bg-white/20 text-white border border-white/30"
                                  : "text-blue-100 hover:bg-white/10"
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <span className="text-lg">👥</span>
                                <span className="font-medium">Leadership</span>
                              </div>
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${
                                  isLeadershipOpen ? "transform rotate-180" : ""
                                }`}
                              />
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pl-4 mt-2 space-y-1">
                            {sidebarItems
                              .filter((i) => leadershipItems.includes(i.id))
                              .map((subItem) => (
                                <button
                                  key={subItem.id}
                                  onClick={() => onChangeActive(subItem.id)}
                                  className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 ${
                                    activeItemId === subItem.id
                                      ? "bg-white/20 text-white border border-white/30"
                                      : "text-blue-100 hover:bg-white/10"
                                  }`}
                                >
                                  <span className="text-lg">
                                    {subItem.icon}
                                  </span>
                                  <span className="font-medium text-sm">
                                    {subItem.label}
                                  </span>
                                </button>
                              ))}
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    }

                    // For admin dashboard, skip management and leadership items (already handled above)
                    if (
                      isAdminDashboard &&
                      (isManagementItem || isLeadershipItem)
                    ) {
                      return null;
                    }

                    // For admin dashboard, render other items as regular buttons
                    if (isAdminDashboard) {
                      return (
                        <button
                          key={item.id}
                          onClick={() => onChangeActive(item.id)}
                          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 ${
                            activeItemId === item.id
                              ? "bg-white/20 text-white border border-white/30"
                              : "text-blue-100 hover:bg-white/10"
                          }`}
                        >
                          <span className="text-lg">{item.icon}</span>
                          <span className="font-medium">{item.label}</span>
                        </button>
                      );
                    }

                    // Render visible items as regular buttons
                    if (isVisible) {
                      return (
                        <button
                          key={item.id}
                          onClick={() => onChangeActive(item.id)}
                          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 ${
                            activeItemId === item.id
                              ? "bg-white/20 text-white border border-white/30"
                              : "text-blue-100 hover:bg-white/10"
                          }`}
                        >
                          <span className="text-lg">{item.icon}</span>
                          <span className="font-medium">{item.label}</span>
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
                              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 ${
                                managementItems.includes(activeItemId)
                                  ? "bg-white/20 text-white border border-white/30"
                                  : "text-blue-100 hover:bg-white/10"
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <span className="text-lg">⚙️</span>
                                <span className="font-medium">Management</span>
                              </div>
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${
                                  isManagementOpen ? "transform rotate-180" : ""
                                }`}
                              />
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pl-4 mt-2 space-y-1">
                            {sidebarItems
                              .filter((i) => managementItems.includes(i.id))
                              .map((subItem) => (
                                <button
                                  key={subItem.id}
                                  onClick={() => onChangeActive(subItem.id)}
                                  className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 ${
                                    activeItemId === subItem.id
                                      ? "bg-white/20 text-white border border-white/30"
                                      : "text-blue-100 hover:bg-white/10"
                                  }`}
                                >
                                  <span className="text-lg">
                                    {subItem.icon}
                                  </span>
                                  <span className="font-medium text-sm">
                                    {subItem.label}
                                  </span>
                                </button>
                              ))}
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
                              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 ${
                                analyticsItems.includes(activeItemId)
                                  ? "bg-white/20 text-white border border-white/30"
                                  : "text-blue-100 hover:bg-white/10"
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <span className="text-lg">📊</span>
                                <span className="font-medium">Analytics</span>
                              </div>
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${
                                  isAnalyticsOpen ? "transform rotate-180" : ""
                                }`}
                              />
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pl-4 mt-2 space-y-1">
                            {sidebarItems
                              .filter((i) => analyticsItems.includes(i.id))
                              .map((subItem) => (
                                <button
                                  key={subItem.id}
                                  onClick={() => onChangeActive(subItem.id)}
                                  className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 ${
                                    activeItemId === subItem.id
                                      ? "bg-white/20 text-white border border-white/30"
                                      : "text-blue-100 hover:bg-white/10"
                                  }`}
                                >
                                  <span className="text-lg">
                                    {subItem.icon}
                                  </span>
                                  <span className="font-medium text-sm">
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
              </nav>
            </div>
          </aside>
        </div>

        {!isSidebarOpen && (
          <div className="p-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSidebarOpen(true)}
              className="bg-blue-700 text-white hover:bg-blue-300  hover:text-blue-700 border-blue-700"
            >
              <div className="flex items-center">
                <ChevronRight className="w-10 h-10 mr-[-6px]" />
                <ChevronRight className="w-10 h-10" />
              </div>
            </Button>
          </div>
        )}
        <main className="flex-1 pt-5 px-5">
          {topSummary && (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {topSummary}
            </div>
          )}
          {children}
        </main>
      </div>

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
          className="max-w-lg w-full mx-4 p-6"
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
          <DialogHeader className="pb-4 border-b mb-2">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <span className="text-3xl">
                {selectedNotification &&
                  getNotificationIcon(selectedNotification.type)}
              </span>
              Notification Details
            </DialogTitle>
          </DialogHeader>

          {selectedNotification && (
            <div className="space-y-6 py-4">
              {/* Notification Type Badge */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-700 w-24">
                  Type:
                </span>
                <Badge
                  className={`px-3 py-1 text-sm font-medium ${
                    selectedNotification.type === "success"
                      ? "bg-green-100 text-green-800"
                      : selectedNotification.type === "warning"
                      ? "bg-yellow-100 text-yellow-800"
                      : selectedNotification.type === "error"
                      ? "bg-red-100 text-red-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {selectedNotification.type.toUpperCase()}
                </Badge>
              </div>

              {/* Location/Destination (Where notification points to) */}
              {selectedNotification.actionUrl && (
                <div className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700 block">
                    📍 Navigate To:
                  </span>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {selectedNotification.actionUrl.includes("reviews")
                          ? "📝"
                          : selectedNotification.actionUrl.includes(
                              "history"
                            ) &&
                            selectedNotification.actionUrl.includes("account")
                          ? "📋"
                          : selectedNotification.actionUrl.includes("history")
                          ? "📈"
                          : selectedNotification.actionUrl.includes("overview")
                          ? "📊"
                          : "🔗"}
                      </span>
                      <div>
                        <div className="text-blue-900 text-sm font-bold">
                          {(() => {
                            const url = selectedNotification.actionUrl;
                            // Match employee dashboard sidebar tabs
                            if (
                              url.includes("tab=overview") ||
                              url.includes("overview")
                            )
                              return "Overview";
                            if (
                              url.includes("tab=reviews") ||
                              url.includes("reviews")
                            )
                              return "Performance Reviews";
                            if (
                              url.includes("tab=history") ||
                              url.includes("history")
                            )
                              return "Evaluation History";
                            // Fallback
                            return "Dashboard";
                          })()}
                        </div>
                        <div className="text-blue-600 text-xs mt-1">
                          Click notification to go there
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Message */}
              <div className="space-y-2">
                <span className="text-sm font-semibold text-gray-700 block">
                  Message:
                </span>
                <p className="text-base text-gray-900 bg-gray-50 p-4 rounded-lg border border-gray-200 leading-relaxed">
                  {selectedNotification.message}
                </p>
              </div>

              {/* Timestamp */}
              <div className="flex items-center gap-3 text-sm">
                <span className="font-semibold text-gray-700 w-24">
                  Received:
                </span>
                <span className="text-gray-600">
                  {new Date(selectedNotification.timestamp).toLocaleString()}
                </span>
              </div>

              {/* Status */}
              <div className="flex items-center gap-3 text-sm">
                <span className="font-semibold text-gray-700 w-24">
                  Status:
                </span>
                {selectedNotification.isRead ? (
                  <Badge className="bg-gray-100 text-gray-800 px-3 py-1">
                    Read
                  </Badge>
                ) : (
                  <Badge className="bg-blue-100 text-blue-800 px-3 py-1">
                    Unread
                  </Badge>
                )}
              </div>

              {/* Close Button */}
              <div className="pt-6 border-t flex justify-end">
                <Button
                  onClick={() => setIsNotificationDetailOpen(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Toggle Button for Help Buttons - Fixed Bottom Right (Always visible) */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="lg"
            onClick={() => setIsHelpButtonsVisible(!isHelpButtonsVisible)}
            className="fixed bottom-6 right-6 z-50 p-3 hover:bg-blue-700 bg-blue-600 border rounded-full shadow-lg transition-all hover:scale-110"
          >
            {isHelpButtonsVisible ? (
              <ChevronDown className="h-5 w-5 text-white" />
            ) : (
              <ChevronUp className="h-5 w-5 text-white" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent 
          side="left" 
          sideOffset={10}
          className="bg-blue-600 text-white border-blue-500"
        >
          <p className="font-medium">
            {isHelpButtonsVisible ? "Hide Help Buttons" : "Show Help Buttons"}
          </p>
        </TooltipContent>
      </Tooltip>

      {/* Floating Help Buttons - Toggleable (Fixed to viewport) */}
      {isHelpButtonsVisible && (
        <>
          {/* Dashboard Guide Button */}
          <Button
            variant="ghost"
            size="lg"
            onClick={() => setIsGuideModalOpen(true)}
            className="fixed bottom-32 right-6 z-50 h-14 w-14 rounded-full bg-blue-100 hover:bg-blue-400 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 hover:rotate-12 active:scale-95 p-0"
            title="Dashboard Guide"
          >
            <img 
              src="/faq.png" 
              alt="Help" 
              className="h-10 w-10 object-contain transition-transform duration-300 hover:scale-110"
            />
          </Button>

          {/* Contact Developers Button */}
          <Button
            variant="ghost"
            size="lg"
            onClick={() => setIsContactDevsModalOpen(true)}
            className="fixed bottom-48 right-6 z-50 p-4 hover:bg-blue-700 bg-blue-500 border rounded-full shadow-lg transition-all hover:scale-110"
            title="Contact Developers"
          >
            <MessageCircle className="h-6 w-6 text-white" />
          </Button>
        </>
      )}

      {/* Dashboard Guide Modal - Conditionally rendered based on dashboard type */}
      {isGuideModalOpen && dashboardType === "hr" && (
        <HRDashboardGuideModal
          isOpen={isGuideModalOpen}
          onCloseAction={() => setIsGuideModalOpen(false)}
        />
      )}
      {isGuideModalOpen && dashboardType === "employee" && (
        <EmployeeDashboardGuideModal
          isOpen={isGuideModalOpen}
          onCloseAction={() => setIsGuideModalOpen(false)}
        />
      )}
      {isGuideModalOpen && dashboardType === "evaluator" && (
        <EvaluatorDashboardGuideModal
          isOpen={isGuideModalOpen}
          onCloseAction={() => setIsGuideModalOpen(false)}
        />
      )}
    </div>
  );
}
