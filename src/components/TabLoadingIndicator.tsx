// src/components/TabLoadingIndicator.tsx
// Subtle loading indicator for tab content

'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

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

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  };

  const positionClasses = {
    top: 'top-4',
    center: 'top-1/2 transform -translate-y-1/2',
    bottom: 'bottom-4'
  };

  return (
    <div className={`absolute left-1/2 transform -translate-x-1/2 ${positionClasses[position]} z-10`}>
      {showOverlay ? (
        <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg border border-gray-200 flex items-center space-x-3">
          <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
          <span className="text-sm font-medium text-gray-700">{message}</span>
        </div>
      ) : (
        <div className="flex items-center space-x-2">
          <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
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
    <div className="space-y-3 animate-pulse">
      {showAvatar && (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-3 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
      )}
      
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      ))}
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
  return (
    <div className="animate-pulse">
      {showHeader && (
        <div className="grid grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded"></div>
          ))}
        </div>
      )}
      
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-4 gap-4 p-4 border border-gray-200 rounded-lg">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Performance table skeleton with specific columns
export function PerformanceTableSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Table Header */}
      <div className="grid grid-cols-6 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded"></div>
      </div>
      
      {/* Table Rows */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="grid grid-cols-6 gap-4 p-4 border border-gray-200 rounded-lg">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
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
