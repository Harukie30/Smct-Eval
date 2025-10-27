'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  fallbackPath?: string;
}

export default function ProtectedRoute({ 
  children, 
  requiredRole, 
  fallbackPath = '/' 
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useUser();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Give auth state time to stabilize before checking
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCheckingAuth(false);
    }, 500); // 500ms grace period for auth state to settle

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Only redirect if:
    // 1. Not in loading state
    // 2. Grace period has passed
    // 3. User is not authenticated
    // 4. No user in localStorage (double-check)
    if (!isLoading && !isCheckingAuth && !isAuthenticated) {
      // Double-check localStorage before redirecting
      const storedUser = typeof window !== 'undefined' 
        ? localStorage.getItem('authenticatedUser') 
        : null;
      
      if (!storedUser) {
        console.log('🔒 ProtectedRoute: Not authenticated, redirecting to', fallbackPath);
        router.push(fallbackPath);
      } else {
        console.log('⚠️ ProtectedRoute: Context says not auth, but localStorage has user. Waiting...');
        // User exists in localStorage but context hasn't loaded yet
        // Don't redirect - give it more time
      }
    }
  }, [isAuthenticated, isLoading, isCheckingAuth, router, fallbackPath]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && requiredRole) {
      // Check if user role matches required role(s)
      const hasRequiredRole = Array.isArray(requiredRole) 
        ? requiredRole.includes(user?.role || '')
        : user?.role === requiredRole;
      
      if (!hasRequiredRole) {
        // Redirect to appropriate dashboard based on user role
        const roleDashboards: Record<string, string> = {
          'admin': '/admin',
          'hr': '/hr-dashboard',
          'evaluator': '/evaluator',
          'employee': '/employee-dashboard',
          'manager': '/evaluator'
        };
        
        const dashboardPath = roleDashboards[user?.role || ''] || '/dashboard';
        router.push(dashboardPath);
      }
    }
  }, [isAuthenticated, isLoading, user?.role, requiredRole, router]);

  // Show loading screen during:
  // 1. UserContext is loading user data
  // 2. Grace period is active (checking auth)
  if (isLoading || isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isLoading ? 'Loading...' : 'Verifying authentication...'}
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Double-check localStorage before blocking render
    const storedUser = typeof window !== 'undefined' 
      ? localStorage.getItem('authenticatedUser') 
      : null;
    
    if (storedUser) {
      // User exists in localStorage but context hasn't synced yet
      // Show loading instead of redirecting
      console.log('⏳ ProtectedRoute: Context not synced yet, showing loading...');
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Syncing authentication...</p>
          </div>
        </div>
      );
    }
    
    console.log('🔒 ProtectedRoute: Rendering null, will redirect');
    return null; // Will redirect in useEffect
  }

  if (requiredRole) {
    const hasRequiredRole = Array.isArray(requiredRole) 
      ? requiredRole.includes(user?.role || '')
      : user?.role === requiredRole;
    
    if (!hasRequiredRole) {
      return null; // Will redirect in useEffect
    }
  }

  return <>{children}</>;
}
