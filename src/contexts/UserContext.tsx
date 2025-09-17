'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile } from '@/components/ProfileCard';
import { toastMessages } from '@/lib/toastMessages';
import clientDataService from '@/lib/clientDataService';

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
  isActive: boolean;
  lastLogin?: string;
}

interface UserContextType {
  user: AuthenticatedUser | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean | { suspended: true; data: any }>;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  refreshUserData: () => Promise<void>;
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

  const login = async (username: string, password: string): Promise<boolean | { suspended: true; data: any }> => {
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
        };
        
        setUser(userWithNumberId);
        
        // Convert to UserProfile format
        const userProfile: UserProfile = {
          id: userWithNumberId.id,
          name: userWithNumberId.name,
          email: userWithNumberId.email,
          roleOrPosition: userWithNumberId.position,
          department: userWithNumberId.department,
          avatar: userWithNumberId.avatar,
          bio: userWithNumberId.bio,
        };
        setProfile(userProfile);

        // Store in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('authenticatedUser', JSON.stringify(userWithNumberId));
          localStorage.setItem('keepLoggedIn', 'true');
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
    
    // Show loading state
    setIsLoading(true);
    
    // Clear user data
    setUser(null);
    setProfile(null);
    
    // Clear storage only if in browser
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authenticatedUser');
      localStorage.removeItem('keepLoggedIn');
      sessionStorage.clear();
    }
    
    // Add a small delay to show loading screen, then redirect
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }, 1500);
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    if (profile) {
      const updatedProfile = { ...profile, ...updates };
      setProfile(updatedProfile);
      
      // Update user data as well
      if (user) {
        const updatedUser: AuthenticatedUser = { 
          ...user, 
          ...updates,
          id: user.id // Ensure ID remains a number
        };
        setUser(updatedUser);
        if (typeof window !== 'undefined') {
          localStorage.setItem('authenticatedUser', JSON.stringify(updatedUser));
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

  const value: UserContextType = {
    user,
    profile,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    updateProfile,
    refreshUserData,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
