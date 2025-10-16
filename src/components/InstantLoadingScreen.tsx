'use client';

import React, { useState, useEffect } from 'react';

interface InstantLoadingScreenProps {
  message?: string;
  onComplete?: () => void;
  className?: string;
}

const InstantLoadingScreen: React.FC<InstantLoadingScreenProps> = ({
  message = 'Authenticating...',
  onComplete,
  className = ''
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const steps = [
    'Validating credentials...',
    'Creating secure session...',
    'Loading user permissions...',
    'Finalizing authentication...'
  ];

  useEffect(() => {
    // Start immediately with no delays
    let stepIndex = 0;
    let progressValue = 0;
    
    const interval = setInterval(() => {
      // Update step every 1000ms
      if (stepIndex < steps.length) {
        setCurrentStep(stepIndex);
        stepIndex++;
      }
      
      // Update progress smoothly
      progressValue += 1;
      setProgress(Math.min(progressValue, 100));
      
      // Complete after 4 seconds
      if (progressValue >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          onComplete?.();
        }, 300);
      }
    }, 40); // 40ms intervals for smooth progress

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 z-50 flex items-center justify-center min-h-screen ${className}`}
      style={{ 
        willChange: 'transform',
        backfaceVisibility: 'hidden',
        transform: 'translateZ(0)',
        animation: 'none' // Disable any CSS animations
      }}
    >
      {/* Simple background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100"></div>

      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-12 max-w-md w-full mx-4 border border-gray-100 relative z-10">
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

        {/* Current Step Display */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {steps[currentStep] || 'Processing...'}
          </h3>
          <div className="flex justify-center space-x-1 mb-4">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  index <= currentStep ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Authentication Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 relative overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Security Indicator */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Secure Connection</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstantLoadingScreen;
