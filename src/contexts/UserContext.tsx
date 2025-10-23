'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile } from '@/components/ProfileCard';
import { toastMessages } from '@/lib/toastMessages';
import clientDataService from '@/lib/clientDataService';
import RealLoadingScreen from '@/components/RealLoadingScreen';

export interface AuthenticatedUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  position: string;
  department: string;
  branch?: string;
  hireDate: string;
  avatar?: string;
  bio?: string;
  signature?: string;
  isActive: boolean;
  lastLogin?: string;
  availableRoles?: string[]; // For users with multiple roles (e.g., HR + Employee)
  activeRole?: string; // Currently active role
}

interface UserContextType {
  user: AuthenticatedUser | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean | { suspended: true; data: any; requiresRoleSelection?: boolean }>;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshUserData: () => Promise<void>;
  switchRole: (role: string) => void; // New function for switching between roles
  setUserRole: (role: string) => void; // New function for setting role after selection
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogoutLoading, setShowLogoutLoading] = useState(false);

  // Check if user is already logged in on app start
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Check if we're in the browser environment
        if (typeof window === 'undefined') {
          // Server-side: just set loading to false
          setIsLoading(false);
          return;
        }

        // Check if user explicitly wants to stay logged in
        const keepLoggedInValue = localStorage.getItem('keepLoggedIn');
        const shouldRestoreSession = keepLoggedInValue === 'true';
        const storedUser = localStorage.getItem('authenticatedUser');
        
        
        // If we have a stored user, restore the session (regardless of keepLoggedIn flag)
        // This handles cases where keepLoggedIn might be corrupted or missing
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            
            // Convert to UserProfile format
            const userProfile: UserProfile = {
              id: parsedUser.id,
              name: parsedUser.name,
              email: parsedUser.email,
              roleOrPosition: parsedUser.position,
              department: parsedUser.department,
              avatar: parsedUser.avatar,
              bio: parsedUser.bio,
              signature: parsedUser.signature,
            };
            setProfile(userProfile);
            
            // Ensure keepLoggedIn is set to true for future sessions
            localStorage.setItem('keepLoggedIn', 'true');
          } catch (error) {
            console.error('Error parsing stored user:', error);
            // Clear corrupted data
            localStorage.removeItem('authenticatedUser');
            localStorage.removeItem('keepLoggedIn');
          }
        } else {
          // No stored user, clear any remaining data
          localStorage.removeItem('authenticatedUser');
          localStorage.removeItem('keepLoggedIn');
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('authenticatedUser');
          localStorage.removeItem('keepLoggedIn');
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (username: string, password: string): Promise<boolean | { suspended: true; data: any; requiresRoleSelection?: boolean }> => {
    try {
      setIsLoading(true);
      
      // Authenticate user using client data service
      const loginResult = await clientDataService.login(username, password);
      
      if (loginResult.success && loginResult.user) {
        const authenticatedUser = loginResult.user;
        
        // Ensure ID is a number
        const userWithNumberId: AuthenticatedUser = {
          ...authenticatedUser,
          id: typeof authenticatedUser.id === 'string' ? parseInt(authenticatedUser.id) : authenticatedUser.id,
          username: authenticatedUser.email, // Use email as username
          isActive: true,
          lastLogin: new Date().toISOString(),
          availableRoles: authenticatedUser.availableRoles, // Include available roles
          activeRole: authenticatedUser.role, // Set initial active role
        };
        
        // Check if user has multiple roles (requires role selection)
        const hasMultipleRoles = userWithNumberId.availableRoles && userWithNumberId.availableRoles.length > 1;
        
        setUser(userWithNumberId);
        
        // Convert to UserProfile format
        const userProfile: UserProfile = {
          id: userWithNumberId.id,
          name: userWithNumberId.name,
          email: userWithNumberId.email,
          roleOrPosition: userWithNumberId.role, // Use role instead of position
          department: userWithNumberId.department,
          avatar: userWithNumberId.avatar,
          bio: userWithNumberId.bio,
          signature: userWithNumberId.signature,
        };
        setProfile(userProfile);

        // Store in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('authenticatedUser', JSON.stringify(userWithNumberId));
          localStorage.setItem('keepLoggedIn', 'true');
        }
        
        // Return true with requiresRoleSelection flag if user has multiple roles
        if (hasMultipleRoles) {
          return { suspended: false, data: null, requiresRoleSelection: true } as any;
        }
        
        return true;
      } else if (loginResult.message === 'Account suspended' && loginResult.suspensionData) {
        // Account is suspended, return suspension data
        console.log('UserContext: Account suspended, returning suspension data:', loginResult.suspensionData);
        return { suspended: true, data: loginResult.suspensionData };
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Show logout toast
    toastMessages.generic.info('Logging out...', 'See you next time!');
    
    // Show logout loading screen
    setShowLogoutLoading(true);
    
    // Clear user data after a short delay
    setTimeout(() => {
      setUser(null);
      setProfile(null);
      
      // Clear storage only if in browser
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authenticatedUser');
        localStorage.removeItem('keepLoggedIn');
        sessionStorage.clear();
      }
    }, 200);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (profile) {
      const updatedProfile = { ...profile, ...updates };
      setProfile(updatedProfile);
      
      // Update user data as well
      if (user) {
        // Map UserProfile fields to AuthenticatedUser fields
        const userUpdates: Partial<AuthenticatedUser> = {
          name: updates.name,
          email: updates.email,
          position: updates.roleOrPosition || user.position,
          department: updates.department,
          branch: updates.branch,
          avatar: updates.avatar,
          bio: updates.bio,
          signature: updates.signature,
        };
        
        const updatedUser: AuthenticatedUser = { 
          ...user, 
          ...userUpdates,
          id: user.id // Ensure ID remains a number
        };
        setUser(updatedUser);
        
        if (typeof window !== 'undefined') {
          localStorage.setItem('authenticatedUser', JSON.stringify(updatedUser));
          
          // Use clientDataService to update all storage locations (accounts, employees, profiles)
          try {
            // Update via clientDataService which syncs signature across all storage
            // Convert UserProfile updates to compatible format (remove id and map roleOrPosition)
            const { id: _id, roleOrPosition: _role, ...profileUpdates } = updates;
            const mappedUpdates = {
              ...profileUpdates,
              position: updates.roleOrPosition || undefined
            };
            await clientDataService.updateProfile(user.id, mappedUpdates);
            await clientDataService.updateEmployee(user.id, mappedUpdates);
          } catch (error) {
            console.error('Error updating profile via clientDataService:', error);
            // Fallback to manual update if service fails
            const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
            const accountIndex = accounts.findIndex((acc: any) => acc.id === user.id || acc.employeeId === user.id);
            if (accountIndex !== -1) {
              accounts[accountIndex] = { ...accounts[accountIndex], ...userUpdates };
              localStorage.setItem('accounts', JSON.stringify(accounts));
            }
          }

          // Store profile updates in employeeProfiles for other users to see
          const employeeProfiles = JSON.parse(localStorage.getItem('employeeProfiles') || '{}');
          employeeProfiles[user.id] = {
            ...employeeProfiles[user.id],
            ...userUpdates,
            id: user.id,
            name: updatedUser.name,
            email: updatedUser.email,
            position: updatedUser.position,
            department: updatedUser.department,
            signature: updatedUser.signature
          };
          localStorage.setItem('employeeProfiles', JSON.stringify(employeeProfiles));
        }
      }
    }
  };

  const refreshUserData = async () => {
    if (user?.id) {
      try {
        const employeeData = await clientDataService.getEmployee(user.id);
        if (employeeData) {
          const updatedUser: AuthenticatedUser = {
            ...user,
            ...employeeData,
            id: user.id, // Ensure ID remains a number
            username: user.username, // Preserve username
            avatar: employeeData.avatar || undefined, // Convert null to undefined
            bio: employeeData.bio || undefined, // Convert null to undefined
            isActive: user.isActive, // Preserve isActive
            lastLogin: user.lastLogin, // Preserve lastLogin
          };
          
          setUser(updatedUser);
          
          const updatedProfile: UserProfile = {
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            roleOrPosition: updatedUser.position,
            department: updatedUser.department,
            avatar: updatedUser.avatar,
            bio: updatedUser.bio,
            signature: updatedUser.signature,
          };
          setProfile(updatedProfile);
          
          if (typeof window !== 'undefined') {
            localStorage.setItem('authenticatedUser', JSON.stringify(updatedUser));
          }
        }
      } catch (error) {
        console.error('Error refreshing user data:', error);
      }
    }
  };

  // Set user role after selection (used in role selection modal)
  const setUserRole = (role: string) => {
    if (user) {
      const updatedUser: AuthenticatedUser = {
        ...user,
        activeRole: role,
        role: role, // Also update the primary role field
      };
      setUser(updatedUser);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('authenticatedUser', JSON.stringify(updatedUser));
      }
    }
  };

  // Switch between available roles (for multi-role users)
  const switchRole = (newRole: string) => {
    if (user && user.availableRoles?.includes(newRole)) {
      const updatedUser: AuthenticatedUser = {
        ...user,
        activeRole: newRole,
        role: newRole, // Also update the primary role field
      };
      setUser(updatedUser);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('authenticatedUser', JSON.stringify(updatedUser));
      }
      
      // Show toast notification
      const roleName = newRole === 'hr' ? 'HR Manager' : 'Employee';
      toastMessages.generic.success('Role Switched', `You are now viewing as ${roleName}`);
    }
  };

  const value: UserContextType = {
    user,
    profile,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    updateProfile,
    refreshUserData,
    switchRole,
    setUserRole,
  };

  // Handle logout loading screen completion
  const handleLogoutComplete = () => {
    setShowLogoutLoading(false);
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  return (
    <UserContext.Provider value={value}>
      {children}
      
      {/* Logout Loading Screen */}
      {showLogoutLoading && (
        <RealLoadingScreen
          message="Logging out..."
          onComplete={handleLogoutComplete}
        />
      )}
    </UserContext.Provider>
  );
};
