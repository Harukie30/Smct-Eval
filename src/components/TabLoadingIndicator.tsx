// src/components/TabLoadingIndicator.tsx
// Subtle loading indicator for tab content

'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Skeleton, SkeletonText, SkeletonTable, SkeletonOverlay } from '@/components/ui/skeleton';

interface TabLoadingIndicatorProps {
  isLoading: boolean;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  position?: 'top' | 'center' | 'bottom';
  showOverlay?: boolean;
}

export default function TabLoadingIndicator({
  isLoading,
  message = "Loading...",
  size = 'md',
  position = 'top',
  showOverlay = false
}: TabLoadingIndicatorProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isLoading) {
      // Small delay to prevent flickering for fast operations
      const timer = setTimeout(() => setShow(true), 100);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [isLoading]);

  if (!show) return null;

  const positionClasses = {
    top: 'top-4',
    center: 'top-1/2 transform -translate-y-1/2',
    bottom: 'bottom-4'
  };

  return (
    <div className={`absolute left-1/2 transform -translate-x-1/2 ${positionClasses[position]} z-10`}>
      {showOverlay ? (
        <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg border border-gray-200">
          <div className="flex items-center space-x-3 mb-3">
            <Skeleton className="w-6 h-6 rounded-full" />
            <span className="text-sm font-medium text-gray-700">{message}</span>
          </div>
          <SkeletonText lines={3} />
        </div>
      ) : (
        <div className="flex items-center space-x-2">
          <Skeleton className="w-6 h-6 rounded-full" />
          <span className="text-sm text-gray-600">{message}</span>
        </div>
      )}
    </div>
  );
}

// Skeleton loading component for tab content
export function TabSkeletonLoader({ 
  lines = 3, 
  showAvatar = false 
}: { 
  lines?: number; 
  showAvatar?: boolean; 
}) {
  return (
    <div className="space-y-3">
      {showAvatar && (
        <div className="flex items-center space-x-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      )}
      
      <SkeletonText lines={lines} />
    </div>
  );
}

// Table skeleton loader for data tables
export function TableSkeletonLoader({ 
  rows = 5, 
  columns = 4,
  showHeader = true 
}: { 
  rows?: number; 
  columns?: number;
  showHeader?: boolean;
}) {
  return <SkeletonTable rows={rows} columns={columns} showHeader={showHeader} />;
}

// Performance table skeleton with specific columns
export function PerformanceTableSkeleton() {
  return <SkeletonTable rows={5} columns={6} showHeader={true} />;
}

// Inline loading state for specific sections
export function InlineLoadingState({ 
  isLoading, 
  children, 
  fallback 
}: { 
  isLoading: boolean; 
  children: React.ReactNode; 
  fallback?: React.ReactNode; 
}) {
  if (isLoading) {
    return (
      <div className="relative">
        <TabLoadingIndicator isLoading={true} position="center" showOverlay={true} />
        {fallback || <TabSkeletonLoader />}
      </div>
    );
  }

  return <>{children}</>;
}
