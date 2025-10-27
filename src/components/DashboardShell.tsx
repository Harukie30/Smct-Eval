"use client";

import React, { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Bell, X, Trash2, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ProfileCard, { UserProfile } from "./ProfileCard";
import ProfileModal from "./ProfileModal";
import ContactDevsModal from "./ContactDevsModal";
import { useUser } from '@/contexts/UserContext';
import { useNotifications } from '@/hooks/useNotifications';
import { Notification } from '@/lib/clientDataService';
import clientDataService from '@/lib/clientDataService';
import { useRouter } from 'next/navigation';

export type SidebarItem = {
  id: string;
  label: string;
  icon: string;
};

type DashboardShellProps = {
  title: string;
  currentPeriod?: string;
  sidebarItems: SidebarItem[];
  activeItemId: string;
  onChangeActive: (id: string) => void;
  topSummary: React.ReactNode;
  children: React.ReactNode;
  profile?: UserProfile | null;
  onSaveProfile?: (updatedProfile: UserProfile) => void;
};

export default function DashboardShell(props: DashboardShellProps) {
  const {
    title,
    currentPeriod,
    sidebarItems,
    activeItemId,
    onChangeActive,
    topSummary,
    children,
    profile,
    onSaveProfile,
  } = props;

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [isContactDevsModalOpen, setIsContactDevsModalOpen] = useState(false);
  const [isNotificationDetailOpen, setIsNotificationDetailOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const { profile: userProfile, updateProfile, logout } = useUser();
  const router = useRouter();
  
  // Get user role for notifications
  const userRole = userProfile?.roleOrPosition || 'employee';
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(userRole);

  // Close notification panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationPanelOpen(false);
      }
    };

    if (isNotificationPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationPanelOpen]);

  const handleEditProfile = () => {
    setIsProfileModalOpen(true);
  };

  const handleSaveProfile = async (updatedProfile: UserProfile) => {
    try {
      // Update in context
      updateProfile(updatedProfile);

      // Call parent callback if provided
      if (onSaveProfile) {
        await onSaveProfile(updatedProfile);
      }
      setIsProfileModalOpen(false);
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const handleLogout = () => {
    logout();
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

  const handleDeleteNotification = async (notificationId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the notification click
    try {
      // Use clientDataService to delete notification properly
      await clientDataService.deleteNotification(notificationId);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b rounded-t-lg">
        <div className="flex justify-between items-center px-6 py-4">
          <div className="flex items-center space-x-3">
            <img src="/smct.png" alt="SMCT Group of Companies" className="h-12 w-auto" />
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-gray-900">{title}</h1>
              <p className="text-sm text-gray-600">Performance & Ratings Overview</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {currentPeriod ? (
              <Badge variant="outline" className="text-sm">
                {currentPeriod}
              </Badge>
            ) : null}

            {/* Contact Developers Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsContactDevsModalOpen(true)}
              className="relative p-2 hover:bg-gray-100"
              title="Contact Developers"
            >
              <MessageCircle className="h-5 w-5 text-blue-600" />
            </Button>

            {/* Notification Bell */}
            <div className="relative" ref={notificationRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsNotificationPanelOpen(!isNotificationPanelOpen)}
                className="relative p-2 hover:bg-gray-100"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Button>

              {/* Notification Panel */}
              {isNotificationPanelOpen && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-lg border z-50">
                  <div className="p-4 border-b">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Notifications</h3>
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
                            !notification.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <span className="text-lg">
                              {getNotificationIcon(notification.type)}
                            </span>
                            <div 
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => handleNotificationClick(notification)}
                            >
                              <p className="text-sm text-gray-900">{notification.message}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(notification.timestamp).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleDeleteNotification(notification.id, e)}
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

            {userProfile && (
              <ProfileCard
                profile={userProfile}
                variant="header"
                showLogout={true}
                showSettings={false}
                onEditProfile={handleEditProfile}
                onLogout={handleLogout}
              />
            )}
          </div>
        </div>
      </header>

      {/* Main Layout with Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`relative overflow-hidden transition-all duration-400 ${isSidebarOpen ? 'w-64' : 'w-0'}`}>
          <aside className="bg-blue-600 text-blue-50 min-h-screen w-64 rounded-bl-lg">
            <div className={`p-6 transition-opacity duration-400 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
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
                {sidebarItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onChangeActive(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 ${activeItemId === item.id
                        ? 'bg-white/20 text-white border border-white/30'
                        : 'text-blue-100 hover:bg-white/10'
                      }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </nav>


            </div>
          </aside>
        </div>

        {!isSidebarOpen && (
          <div className="p-4">
            <Button variant="outline" size="sm" onClick={() => setIsSidebarOpen(true)}>
              <div className="flex items-center">
                <ChevronRight className="w-10 h-10 mr-[-6px]" />
                <ChevronRight className="w-10 h-10" />
              </div>

            </Button>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-8 flex flex-col overflow-hidden rounded-br-lg">
          {/* Top Summary - Only show on overview tab */}
          {activeItemId === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 flex-none">
              {topSummary}
            </div>
          )}
          {/* Children Content */}
          <div className={`space-y-6 flex-1 overflow-hidden ${activeItemId === 'overview' ? '' : 'pt-0'}`}>
            {children}
          </div>
        </main>
      </div>

      {/* Profile Modal */}
      {userProfile && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          profile={userProfile}
          onSave={handleSaveProfile}
        />
      )}

      {/* Contact Developers Modal */}
      <ContactDevsModal
        isOpen={isContactDevsModalOpen}
        onCloseAction={() => setIsContactDevsModalOpen(false)}
      />

      {/* Notification Detail Modal */}
      <Dialog open={isNotificationDetailOpen} onOpenChangeAction={setIsNotificationDetailOpen}>
        <DialogContent 
          className="max-w-lg w-full mx-4 p-6"
          style={{
            animation: 'modalPopup 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
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
              <span className="text-3xl">{selectedNotification && getNotificationIcon(selectedNotification.type)}</span>
              Notification Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedNotification && (
            <div className="space-y-6 py-4">
              {/* Notification Type Badge */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-700 w-24">Type:</span>
                <Badge 
                  className={`px-3 py-1 text-sm font-medium ${
                    selectedNotification.type === 'success' ? 'bg-green-100 text-green-800' :
                    selectedNotification.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                    selectedNotification.type === 'error' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}
                >
                  {selectedNotification.type.toUpperCase()}
                </Badge>
              </div>

              {/* Location/Destination (Where notification points to) */}
              {selectedNotification.actionUrl && (
                <div className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700 block">📍 Navigate To:</span>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {selectedNotification.actionUrl.includes('reviews') ? '📝' :
                         selectedNotification.actionUrl.includes('history') && selectedNotification.actionUrl.includes('account') ? '📋' :
                         selectedNotification.actionUrl.includes('history') ? '📈' :
                         selectedNotification.actionUrl.includes('overview') ? '📊' :
                         '🔗'}
                      </span>
                      <div>
                        <div className="text-blue-900 text-sm font-bold">
                          {(() => {
                            const url = selectedNotification.actionUrl;
                            // Match employee dashboard sidebar tabs
                            if (url.includes('tab=overview') || url.includes('overview')) return 'Overview';
                            if (url.includes('tab=reviews') || url.includes('reviews')) return 'Performance Reviews';
                            if (url.includes('tab=account-history') || url.includes('account-history')) return 'Account History';
                            if (url.includes('tab=history') || url.includes('history')) return 'Evaluation History';
                            // Fallback
                            return 'Dashboard';
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
                <span className="text-sm font-semibold text-gray-700 block">Message:</span>
                <p className="text-base text-gray-900 bg-gray-50 p-4 rounded-lg border border-gray-200 leading-relaxed">
                  {selectedNotification.message}
                </p>
              </div>

              {/* Timestamp */}
              <div className="flex items-center gap-3 text-sm">
                <span className="font-semibold text-gray-700 w-24">Received:</span>
                <span className="text-gray-600">{new Date(selectedNotification.timestamp).toLocaleString()}</span>
              </div>

              {/* Status */}
              <div className="flex items-center gap-3 text-sm">
                <span className="font-semibold text-gray-700 w-24">Status:</span>
                {selectedNotification.isRead ? (
                  <Badge className="bg-gray-100 text-gray-800 px-3 py-1">Read</Badge>
                ) : (
                  <Badge className="bg-blue-100 text-blue-800 px-3 py-1">Unread</Badge>
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
    </div>
  );
}


