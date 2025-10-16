'use client';

import React, { useState, useEffect } from 'react';
import { SkeletonOverlay, SkeletonText, Skeleton } from '@/components/ui/skeleton';

interface UnifiedLoaderProps {
  type?: 'fullscreen' | 'inline' | 'page';
  message?: string;
  duration?: number; // in milliseconds (only for fullscreen type)
  showProgress?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onComplete?: () => void;
}

const UnifiedLoader: React.FC<UnifiedLoaderProps> = ({
  type = 'fullscreen',
  message = 'Loading...',
  duration = 1200,
  showProgress = true,
  size = 'md',
  className = '',
  onComplete
}) => {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  useEffect(() => {
    if (type === 'fullscreen' && duration > 0) {
      // Simulate realistic loading progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          // Random increment for realistic feel (5-15%)
          return Math.min(prev + Math.random() * 10 + 5, 100);
        });
      }, 100);

      // Hide loading screen after specified duration
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, duration);

      return () => {
        clearInterval(progressInterval);
        clearTimeout(hideTimer);
      };
    }
  }, [duration, onComplete, type]);

  // Don't render if fullscreen loading is complete
  if (type === 'fullscreen' && !isVisible) {
    return null;
  }

  const spinner = (
    <div className={`animate-spin ${sizeClasses[size]}`}>
      <svg
        className="w-full h-full text-blue-600"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );

  if (type === 'fullscreen') {
    return (
      <SkeletonOverlay 
        message={message}
        showSkeleton={true}
        className={className}
      />
    );
  }

  if (type === 'page') {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
        <div className="text-center space-y-4">
          <Skeleton className="w-12 h-12 rounded-full mx-auto" />
          {message && (
            <p className={`text-gray-600 font-medium ${textSizeClasses[size]}`}>
              {message}
            </p>
          )}
          <SkeletonText lines={3} />
        </div>
      </div>
    );
  }

  // Inline type
  return (
    <div className={`flex items-center justify-center space-x-2 ${className}`}>
      <Skeleton className="w-6 h-6 rounded-full" />
      {message && (
        <p className={`text-gray-600 ${textSizeClasses[size]}`}>
          {message}
        </p>
      )}
    </div>
  );
};

export default UnifiedLoader;
