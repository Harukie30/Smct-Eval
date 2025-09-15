'use client';

import React, { useState, useEffect } from 'react';

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
      <div className={`fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 z-50 flex items-center justify-center ${className}`}>
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 border border-gray-100">
          {/* Logo/Brand Section */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-3 flex items-center justify-center">
              <img
                src="/smct.png"
                alt="SMCT Group of Companies"
                className="w-full h-full object-contain animate-pulse"
              />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Pro-Eval</h2>
            <p className="text-sm text-gray-600">Employee Performance Evaluation</p>
          </div>

          {/* Loading Spinner */}
          <div className="flex justify-center mb-4">
            {spinner}
          </div>

          {/* Loading Message */}
          <div className="text-center mb-4">
            <p className={`font-medium text-gray-700 ${textSizeClasses[size]}`}>{message}</p>
          </div>

          {/* Progress Bar */}
          {showProgress && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Loading</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Loading Dots Animation */}
          <div className="flex justify-center space-x-1">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  if (type === 'page') {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
        <div className="text-center">
          {spinner}
          {message && (
            <p className={`text-gray-600 font-medium mt-3 ${textSizeClasses[size]}`}>
              {message}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Inline type
  return (
    <div className={`flex items-center justify-center space-x-2 ${className}`}>
      {spinner}
      {message && (
        <p className={`text-gray-600 ${textSizeClasses[size]}`}>
          {message}
        </p>
      )}
    </div>
  );
};

export default UnifiedLoader;
