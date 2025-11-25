'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile } from '@/components/ProfileCard';
import { toastMessages } from '@/lib/toastMessages';
// Use localStorage version with accounts.json (until backend is ready)
import clientDataService from '@/lib/clientDataService';
// import clientDataService from '@/lib/clientDataService.api'; // Switch to this when backend is ready
import { apiService } from '@/lib/apiService';
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
  roleSelectionPending?: boolean; // True when user needs to select from multiple roles
}

interface UserContextType {
  user: AuthenticatedUser | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean | { requiresRoleSelection?: boolean; pending?: boolean; pendingData?: any }>;
  logout: () => Promise<void>;
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

// Export alias for backward compatibility
export const useAuth = useUser;

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogoutLoading, setShowLogoutLoading] = useState(false);

  // Helper function to split name into fname and lname
  const splitName = (name: string): { fname: string; lname: string } => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return { fname: '', lname: '' };
    if (parts.length === 1) return { fname: parts[0], lname: '' };
    return {
      fname: parts[0],
      lname: parts.slice(1).join(' ')
    };
  };

  // Helper function to convert AuthenticatedUser to UserProfile
  const convertToUserProfile = (userData: AuthenticatedUser, employeeId?: number): UserProfile => {
    const { fname, lname } = splitName(userData.name);
    return {
      id: userData.id,
      fname,
      lname,
      username: userData.username || userData.email,
      roles: userData.role ? [{ id: 0, name: userData.role }] : [],
      email: userData.email,
      avatar: userData.avatar,
      departments: userData.department ? { value: 0, department_name: userData.department } : undefined,
      branches: userData.branch ? { value: 0, branch_name: userData.branch } : { value: 0, branch_name: '' },
      positions: userData.position ? { value: 0, label: userData.position } : { value: 0, label: '' },
      bio: userData.bio,
      signature: userData.signature,
      employeeId,
    };
  };

  // Helper function to save user data without large binary fields (avatar, signature)
  const saveUserToLocalStorage = (userData: AuthenticatedUser) => {
    if (typeof window !== 'undefined') {
      try {
        // Create a lightweight copy without large binary data
        const { avatar, signature, ...essentialData } = userData;
        localStorage.setItem('authenticatedUser', JSON.stringify(essentialData));
      } catch (error) {
        console.error('Failed to save user to localStorage:', error);
        // Fallback: try to save without any optional fields
        try {
          const minimalData = {
            id: userData.id,
            username: userData.username,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            position: userData.position,
            department: userData.department,
            hireDate: userData.hireDate,
            isActive: userData.isActive,
          };
          localStorage.setItem('authenticatedUser', JSON.stringify(minimalData));
        } catch (fallbackError) {
          console.error('Failed to save minimal user data:', fallbackError);
        }
      }
    }
  };

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
            
            // Fetch full user data including avatar and signature from data source
            try {
              const fullUserData = await clientDataService.getUserById(parsedUser.id);
              
              // Get account data to access employeeId
              const accounts = await clientDataService.getAccounts();
              const account = accounts.find((acc: any) => acc.id === parsedUser.id);
              const employeeId = account?.employeeId;
              
              if (fullUserData) {
                // Merge stored data with fresh avatar/signature from data source
                const completeUser = {
                  ...parsedUser,
                  avatar: fullUserData.avatar,
                  signature: fullUserData.signature,
                  bio: fullUserData.bio,
                };
                setUser(completeUser);
                
                // Convert to UserProfile format
                const userProfile = convertToUserProfile(completeUser, employeeId);
                setProfile(userProfile);
              } else {
                // Fallback if user not found
                setUser(parsedUser);
                const userProfile = convertToUserProfile(parsedUser, employeeId);
                setProfile(userProfile);
              }
            } catch (fetchError) {
              console.error('Error fetching full user data:', fetchError);
              // Use stored data as fallback
              // Get account data to access employeeId
              try {
                const accounts = await clientDataService.getAccounts();
                const account = accounts.find((acc: any) => acc.id === parsedUser.id);
                const employeeId = account?.employeeId;
                
                setUser(parsedUser);
                const userProfile = convertToUserProfile(parsedUser, employeeId);
                setProfile(userProfile);
              } catch (accountError) {
                console.error('Error fetching account data:', accountError);
                setUser(parsedUser);
                const userProfile = convertToUserProfile(parsedUser);
                setProfile(userProfile);
              }
            }
            
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

  const login = async (username: string, password: string): Promise<boolean | { requiresRoleSelection?: boolean; pending?: boolean; pendingData?: any }> => {
    try {
      setIsLoading(true);
      
      // Authenticate user using client data service
      const loginResult = await clientDataService.login(username, password);
      
      if (loginResult.success && loginResult.user) {
        const authenticatedUser = loginResult.user;
        
        // Check if user has multiple roles (requires role selection)
        const hasMultipleRoles = authenticatedUser.availableRoles && authenticatedUser.availableRoles.length > 1;
        
        // Get account data to access employeeId
        let employeeId: number | undefined;
        try {
          const accounts = await clientDataService.getAccounts();
          const account = accounts.find((acc: any) => acc.id === authenticatedUser.id || acc.email === authenticatedUser.email);
          employeeId = account?.employeeId;
        } catch (error) {
          console.error('Error fetching account data for employeeId:', error);
        }
        
        // Ensure ID is a number and all required fields are present
        const userWithNumberId: AuthenticatedUser = {
          id: typeof authenticatedUser.id === 'string' ? parseInt(authenticatedUser.id) : authenticatedUser.id,
          username: authenticatedUser.username || authenticatedUser.email || '',
          name: authenticatedUser.name || '',
          email: authenticatedUser.email || '',
          role: authenticatedUser.role || '',
          position: authenticatedUser.position || '',
          department: authenticatedUser.department || '',
          branch: authenticatedUser.branch,
          hireDate: authenticatedUser.hireDate || new Date().toISOString(),
          avatar: authenticatedUser.avatar,
          bio: authenticatedUser.bio,
          signature: authenticatedUser.signature,
          isActive: authenticatedUser.isActive ?? true,
          lastLogin: new Date().toISOString(),
          availableRoles: authenticatedUser.availableRoles || [authenticatedUser.role || ''],
          activeRole: authenticatedUser.role, // Set initial active role
          roleSelectionPending: hasMultipleRoles, // Flag to indicate role selection is needed
        };
        
        setUser(userWithNumberId);
        
        // Convert to UserProfile format
        const userProfile = convertToUserProfile(userWithNumberId, employeeId);
        setProfile(userProfile);

        // Store in localStorage (without large binary data)
        saveUserToLocalStorage(userWithNumberId);
        if (typeof window !== 'undefined') {
          localStorage.setItem('keepLoggedIn', 'true');
        }
        
        // Return true with requiresRoleSelection flag if user has multiple roles
        if (hasMultipleRoles) {
          return { requiresRoleSelection: true };
        }
        
        return true;
      } else if (loginResult.message === 'Account pending approval' && loginResult.pendingData) {
        // Account is pending approval, return pending data
        console.log('UserContext: Account pending approval, returning pending data:', loginResult.pendingData);
        return { pending: true, pendingData: loginResult.pendingData };
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    // Show logout toast
    toastMessages.generic.info('Logging out...', 'See you next time!');
    
    // Show logout loading screen
    setShowLogoutLoading(true);
    
    try {
      // ✅ Notify backend of logout (if logout endpoint exists)
      // For Laravel Sanctum, logout is typically handled by clearing cookies
      // The backend will clear the session cookie automatically
      console.log('🔄 Logging out...');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Continue with local logout even if backend call fails
      // This ensures user can still log out from frontend
    }
    
    // Clear user data after a short delay
    setTimeout(() => {
      setUser(null);
      setProfile(null);
      
      // Clear storage only if in browser
      // Note: Laravel Sanctum cookies are cleared by the backend
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authenticatedUser');
        localStorage.removeItem('keepLoggedIn');
        sessionStorage.clear();
        console.log('✅ Local storage cleared (cookies cleared by backend)');
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
        // Only include fields that are actually provided in updates to avoid overwriting with undefined
        const userUpdates: Partial<AuthenticatedUser> = {};
        if (updates.fname !== undefined || updates.lname !== undefined) {
          const fname = updates.fname ?? profile?.fname ?? '';
          const lname = updates.lname ?? profile?.lname ?? '';
          userUpdates.name = `${fname} ${lname}`.trim();
        }
        if (updates.email !== undefined) userUpdates.email = updates.email;
        if (updates.positions !== undefined) userUpdates.position = updates.positions.label;
        if (updates.departments !== undefined) userUpdates.department = updates.departments.department_name;
        if (updates.branches !== undefined) userUpdates.branch = updates.branches.branch_name;
        if (updates.avatar !== undefined) userUpdates.avatar = updates.avatar;
        if (updates.bio !== undefined) userUpdates.bio = updates.bio;
        if (updates.signature !== undefined) userUpdates.signature = updates.signature;
        
        const updatedUser: AuthenticatedUser = { 
          ...user, 
          ...userUpdates,
          id: user.id // Ensure ID remains a number
        };
        setUser(updatedUser);
        
        // Store updated user without large binary data
        saveUserToLocalStorage(updatedUser);
        
        if (typeof window !== 'undefined') {
          // Use clientDataService to update all storage locations (accounts, employees, profiles)
          try {
            // Update via clientDataService which syncs signature across all storage
            // Convert UserProfile updates to compatible format for clientDataService
            const mappedUpdates: any = {};
            if (updates.fname !== undefined || updates.lname !== undefined) {
              const fname = updates.fname ?? profile?.fname ?? '';
              const lname = updates.lname ?? profile?.lname ?? '';
              mappedUpdates.name = `${fname} ${lname}`.trim();
            }
            if (updates.email !== undefined) mappedUpdates.email = updates.email;
            if (updates.positions !== undefined) mappedUpdates.position = updates.positions.label;
            if (updates.departments !== undefined) mappedUpdates.department = updates.departments.department_name;
            if (updates.branches !== undefined) mappedUpdates.branch = updates.branches.branch_name;
            if (updates.avatar !== undefined) mappedUpdates.avatar = updates.avatar;
            if (updates.bio !== undefined) mappedUpdates.bio = updates.bio;
            if (updates.signature !== undefined) mappedUpdates.signature = updates.signature;
            
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
          
          const updatedProfile = convertToUserProfile(updatedUser);
          setProfile(updatedProfile);
          
          // Store updated user without large binary data
          saveUserToLocalStorage(updatedUser);
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
        roleSelectionPending: false, // Clear the pending flag
      };
      setUser(updatedUser);
      
      // Store updated user without large binary data
      saveUserToLocalStorage(updatedUser);
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
      
      // Store updated user without large binary data
      saveUserToLocalStorage(updatedUser);
      
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
