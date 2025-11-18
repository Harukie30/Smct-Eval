import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, User, Settings } from 'lucide-react';

export type UserProfile = {
  id?: string | number;
  name: string;
  roleOrPosition?: string;
  email?: string;
  avatar?: string;
  department?: string;
  branch?: string;
  bio?: string;
  signature?: string;
};

interface ProfileCardProps {
  profile: UserProfile;
  variant?: 'sidebar' | 'header' | 'compact';
  showLogout?: boolean;
  showSettings?: boolean;
  onLogout?: () => void;
  onSettings?: () => void;
  onEditProfile?: () => void;
  className?: string;
}

export default function ProfileCard({
  profile,
  variant = 'sidebar',
  showLogout = true,
  showSettings = false,
  onLogout,
  onSettings,
  onEditProfile,
  className = '',
}: ProfileCardProps) {
  const getInitials = (name: string) => {
    try {
      const initials = name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join('') || 'U';
      return initials.toUpperCase();
    } catch {
      return 'U';
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      // Default logout behavior
      localStorage.removeItem('user');
      sessionStorage.clear();
      window.location.href = '/';
    }
  };

  const handleSettings = () => {
    if (onSettings) {
      onSettings();
    }
  };

  if (variant === 'header') {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
          {profile.avatar ? (
            <img src={profile.avatar} alt={profile.name} className="h-8 w-8 rounded-full" />
          ) : (
            getInitials(profile.name)
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900">{profile.name}</span>
          {profile.roleOrPosition && (
            <span className="text-xs text-gray-500">{profile.roleOrPosition}</span>
          )}
        </div>
        {onEditProfile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEditProfile}
            className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
            title="Edit Profile"
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
        {showSettings && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSettings}
            className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
        {showLogout && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="h-8 px-3 text-white hover:bg-red-600 hover:text-white bg-red-500 text-xs"
          >
            <LogOut className="h-3 w-3 mr-1" />
            Logout
          </Button>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-3 p-3 rounded-lg bg-gray-50 border border-gray-200 ${className}`}>
        <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
          {profile.avatar ? (
            <img src={profile.avatar} alt={profile.name} className="h-10 w-10 rounded-full" />
          ) : (
            getInitials(profile.name)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{profile.name}</p>
          {profile.roleOrPosition && (
            <p className="text-xs text-gray-500 truncate">{profile.roleOrPosition}</p>
          )}
          {profile.department && (
            <p className="text-xs text-gray-400 truncate">{profile.department}</p>
          )}
          {profile.branch && (
            <p className="text-xs text-gray-400 truncate">{profile.branch}</p>
          )}
        </div>
        <div className="flex space-x-1">
          {showSettings && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSettings}
              className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
          {showLogout && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Default sidebar variant
  return (
    <div className={`p-4 rounded-lg bg-white/10 border border-white/20 ${className}`}>
      <div className="flex items-center">
        <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold mr-3">
          {profile.avatar ? (
            <img src={profile.avatar} alt={profile.name} className="h-10 w-10 rounded-full" />
          ) : (
            getInitials(profile.name)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-white font-semibold truncate">{profile.name}</p>
          {profile.roleOrPosition && (
            <p className="text-blue-100 text-xs truncate">{profile.roleOrPosition}</p>
          )}
          {profile.department && (
            <p className="text-blue-100 text-xs truncate">{profile.department}</p>
          )}
          {profile.branch && (
            <p className="text-blue-100 text-xs truncate">{profile.branch}</p>
          )}
        </div>
      </div>
      
      <div className="mt-3 flex space-x-2">
        {showSettings && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSettings}
            className="flex-1 bg-white/10 text-white hover:bg-white/20 border-white/30 text-xs"
          >
            <Settings className="w-3 h-3 mr-1" />
            Settings
          </Button>
        )}
        {showLogout && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="flex-1 bg-red-500/20 text-red-200 hover:bg-red-500/30 border-red-400/30 text-xs"
          >
            <LogOut className="w-3 h-3 mr-1" />
            Logout
          </Button>
        )}
      </div>
    </div>
  );
}