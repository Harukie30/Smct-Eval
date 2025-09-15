'use client';

import { useEffect } from 'react';
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

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(fallbackPath);
    }
  }, [isAuthenticated, isLoading, router, fallbackPath]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
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
