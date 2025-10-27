'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiService from '@/lib/apiService';

interface User {
  id: number;
  name: string;
  email: string;
  role?: string;
  [key: string]: any;
}

interface UserContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchUser = async () => {
    try {
      const fetchedUser = await apiService.getUser();
      if (fetchedUser) {
        setUser(fetchedUser);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(fetchedUser));
      } else {
        throw new Error('Not authenticated');
      }
    } catch {
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      setUser(JSON.parse(stored));
      setIsAuthenticated(true);
      setIsLoading(false);
    } else {
      fetchUser();
    }
  }, []);

 const login = async (username: string, password: string, rememberMe: boolean) => {
  try {
    setIsLoading(true);
    await apiService.login(username, password, rememberMe);
    await fetchUser(); // get fresh user data

    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const dashboards: Record<string, string> = {
      admin: '/admin',
      hr: '/hr-dashboard',
      'hr-manager': '/hr-dashboard',
      evaluator: '/evaluator',
      employee: '/employee-dashboard',
      manager: '/evaluator',
    };

    const redirectPath = dashboards[storedUser.role] || '/employee-dashboard';
    router.push(redirectPath);
  } catch (err) {
    console.error('Login failed:', err);
    throw err;
  } finally {
    setIsLoading(false);
  }
};


  const logout = async () => {
    await apiService.logout();
    localStorage.clear();
    setUser(null);
    setIsAuthenticated(false);
    router.push('/login');
  };

  return (
    <UserContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within a UserProvider');
  return ctx;
};
export default UserContext;