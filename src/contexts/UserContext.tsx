"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { toastMessages } from "@/lib/toastMessages";
import clientDataService from "@/lib/clientDataService"; // still used for fetching profile updates
import RealLoadingScreen from "@/components/RealLoadingScreen";
import { CONFIG } from "../../config/config";
export interface AuthenticatedUser {
   id?: string | number;
  fname: string;
  lname: string;
  roles: { id: number; name: string }[];
  email: string;
  avatar?: string;
  departments?: { value: number | string; label: string };
  branches: { value: number | string; branch_name: string };
  positions: { value: number | string; label: string }  ;
  bio?: string;
  signature?: string;
}

interface UserContextType {
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    username: string,
    password: string
  ) => Promise<AuthenticatedUser | null>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  switchRole: (role: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogoutLoading, setShowLogoutLoading] = useState(false);
  const router = useRouter();

  // Fetch current user from Laravel using Sanctum cookies
  const fetchUser = async () => {
    try {
      const res = await fetch(`${CONFIG.API_URL}/profile`, {
        credentials: "include", 
      });

      if (!res.ok) throw new Error("Not authenticated");
      const data = await res.json();

      setUser(data);
    } catch (err) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser(); 
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      await fetch(`http://localhost:8000/sanctum/csrf-cookie`, {
        credentials: "include",
      });

      const res = await fetch(`${CONFIG.API_URL}/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ username, password }),
      });
      await fetchUser();

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Invalid credentials");
      }

      return user;
    } catch (error) {
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setShowLogoutLoading(true);
    try {
      await fetch(`${CONFIG.API_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });
      toastMessages.generic.info("Logging out...", "See you next time!");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setUser(null);
      setShowLogoutLoading(false);
      router.push("/");
    }
  };

  // 🔄 Refresh user data manually
  const refreshUserData = async () => {
    await fetchUser();
  };

  // 🔁 Switch active role
  const switchRole = (role: string) => {
    if (user && user.roles) {
      const updated = { ...user, role, activeRole: role };
      setUser(updated);
      toastMessages.generic.success(
        "Role Switched",
        `You are now viewing as ${role}`
      );
    }
  };

  const value: UserContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshUserData,
    switchRole,
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

export const useAuth = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useAuth must be used within a UserProvider");
  return context;
};
