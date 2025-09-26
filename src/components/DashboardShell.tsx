"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, } from "lucide-react";
import ProfileCard, { UserProfile } from "./ProfileCard";
import ProfileModal from "./ProfileModal";
import { useUser } from '@/contexts/UserContext';

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

  const { profile: userProfile, updateProfile, logout } = useUser();

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
    </div>
  );
}


