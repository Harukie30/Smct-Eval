'use client';

import React, { useState, useEffect } from 'react';

interface FakeLoadingScreenProps {
  message?: string;
  duration?: number; // in milliseconds
  onComplete?: () => void;
  showProgress?: boolean;
  className?: string;
}

const FakeLoadingScreen: React.FC<FakeLoadingScreenProps> = ({
  message = 'Loading your dashboard...',
  duration = 3000, // 3 seconds default
  onComplete,
  showProgress = true,
  className = ''
}) => {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Simulate realistic loading progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        // Random increment for realistic feel (5-20%)
        return Math.min(prev + Math.random() * 15 + 5, 100);
      });
    }, 150);


    // Hide loading screen after specified duration
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, duration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(hideTimer);
    };
  }, [duration, onComplete]);

  // Don't render if loading is complete
  if (!isVisible) {
    return null;
  }

  return (
    <div className={`fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 z-50 flex items-center justify-center min-h-screen ${className}`}>
      {/* Abstract Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating Circles */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-blue-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-32 w-24 h-24 bg-indigo-200 rounded-full opacity-30 animate-bounce" style={{ animationDuration: '3s' }}></div>
        <div className="absolute bottom-32 left-40 w-40 h-40 bg-purple-200 rounded-full opacity-15 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 right-20 w-28 h-28 bg-cyan-200 rounded-full opacity-25 animate-bounce" style={{ animationDuration: '4s', animationDelay: '2s' }}></div>

        {/* Geometric Shapes */}
        <div className="absolute top-32 right-20 w-16 h-16 bg-blue-300 transform rotate-45 opacity-20 animate-spin" style={{ animationDuration: '8s' }}></div>
        <div className="absolute bottom-40 left-20 w-20 h-20 bg-indigo-300 transform rotate-12 opacity-25 animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute top-60 left-1/2 w-12 h-12 bg-purple-300 transform rotate-45 opacity-30 animate-bounce" style={{ animationDuration: '5s' }}></div>

        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-full opacity-10 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gradient-to-r from-purple-200 to-pink-200 rounded-full opacity-15 blur-2xl animate-bounce" style={{ animationDuration: '6s' }}></div>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-12 max-w-md w-full mx-4 border border-gray-100 relative z-10">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
            <img
              src="/smct.png"
              alt="SMCT Group of Companies"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Progress Bar */}
        {showProgress && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Loading Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 relative">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
              <img
                src="/racing.png"
                alt="progress-icon"
                className="absolute top-1/2 -translate-y-1/2 w-5 h-5 transition-all duration-300 ease-out"
                style={{ left: `calc(${progress}% - 10px)` }}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default FakeLoadingScreen;
