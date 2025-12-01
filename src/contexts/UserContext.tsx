"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

import RealLoadingScreen from "@/components/RealLoadingScreen";
import { toastMessages } from "@/lib/toastMessages";
import { apiService } from "@/lib/apiService";

export interface AuthenticatedUser {
  id: number;
  username: string;
  fname: string;
  lname: string;
  email: string;
  roles: any;
  position: string;
  department: string;
  branch?: string;
  hireDate: string;
  avatar?: string;
  bio?: string;
  signature?: string;
  isActive: boolean;
}

interface UserContextType {
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within UserProvider");
  return context;
};

export const useAuth = useUser;

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogoutLoading, setShowLogoutLoading] = useState(false);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const stored = localStorage.getItem("authUser");

        // First, restore user from localStorage immediately
        if (stored) {
          try {
            const parsedUser = JSON.parse(stored);
            setUser(parsedUser);
          } catch (e) {
            console.error("Failed to parse stored user:", e);
            localStorage.removeItem("authUser");
          }
        }

        // Then verify with backend (this will update user if successful, or keep existing if network error)
        await refreshUser();
      } catch (error) {
        // If refreshUser throws an error, we still want to keep the stored user
        console.error("Error during session restoration:", error);
        // The user should already be set from localStorage above
        // refreshUser() handles clearing session only on 401/403 errors
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  // ⬇ Fetch authenticated user from Sanctum
  const refreshUser = async () => {
    try {
      const res = await apiService.authUser();
      setUser(res);
      localStorage.setItem("authUser", JSON.stringify(res.data));
    } catch (error: any) {
      // Only clear session if it's an authentication error (401 Unauthorized)
      // For other errors (network issues, 500 errors, etc.), keep the user logged in
      const status = error?.status || error?.response?.status;
      
      if (status === 401 || status === 403) {
        // Authentication failed - clear session
        setUser(null);
        localStorage.removeItem("authUser");
      } else {
        // Network error or server error - keep user logged in with stored session
        // Don't clear the session, just log the error
        console.warn("Failed to refresh user from backend, keeping stored session:", error);
        // Ensure user is set from localStorage if it exists
        // Use functional update to avoid stale closure issues
        const stored = localStorage.getItem("authUser");
        if (stored) {
          try {
            const parsedUser = JSON.parse(stored);
            // Only update if user is not already set or if stored user is different
            setUser((prevUser) => prevUser || parsedUser);
          } catch (e) {
            console.error("Failed to parse stored user:", e);
          }
        }
      }
    }
  };

  // ⬇ Login using Sanctum
  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);

      const res = await apiService.login(username, password);
      await refreshUser();
      return res;
    } catch (err: any) {
      toastMessages.generic.error("Login failed", "Invalid credentials");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // ⬇ Logout using Sanctum
  const logout = async () => {
    toastMessages.generic.info("Logging out...", "See you soon!");
    setShowLogoutLoading(true);

    try {
      await apiService.logout();
    } catch (e) {
      console.error("Logout failed:", e);
    }

    setTimeout(() => {
      setUser(null);
      localStorage.removeItem("authUser");
      setShowLogoutLoading(false);

      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    }, 300);
  };

  const value: UserContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshUser,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
      {showLogoutLoading && (
        <RealLoadingScreen
          message="Logging out..."
          onComplete={() => setShowLogoutLoading(false)}
        />
      )}
    </UserContext.Provider>
  );
};
