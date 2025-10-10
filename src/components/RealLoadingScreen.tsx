'use client';

import React, { useState, useEffect } from 'react';

interface RealLoadingScreenProps {
  message?: string;
  onComplete?: () => void;
  className?: string;
}

const RealLoadingScreen: React.FC<RealLoadingScreenProps> = ({
  message = 'Authenticating...',
  onComplete,
  className = ''
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const steps = [
    { text: 'Validating credentials...', duration: 1200 },
    { text: 'Creating secure session...', duration: 1000 },
    { text: 'Loading user permissions...', duration: 800 },
    { text: 'Finalizing authentication...', duration: 600 }
  ];

  useEffect(() => {
    // Start immediately - no delays, no requestAnimationFrame
    let currentStepIndex = 0;
    let progressInterval: NodeJS.Timeout;

    const startStep = (stepIndex: number) => {
      if (stepIndex >= steps.length) {
        // All steps complete
        setTimeout(() => {
          onComplete?.();
        }, 500);
        return;
      }

      setCurrentStep(stepIndex);
      
      // Calculate target progress for this step
      const targetProgress = ((stepIndex + 1) / steps.length) * 100;
      const stepDuration = steps[stepIndex].duration;
      const incrementAmount = targetProgress / (stepDuration / 50); // 50ms intervals
      
      let currentProgress = (stepIndex / steps.length) * 100;
      
      progressInterval = setInterval(() => {
        currentProgress += incrementAmount;
        setProgress(Math.min(currentProgress, targetProgress));
        
        if (currentProgress >= targetProgress) {
          clearInterval(progressInterval);
          currentStepIndex++;
          setTimeout(() => startStep(currentStepIndex), 200); // Pause between steps
        }
      }, 50);
    };

    // Start immediately - no delays
    startStep(0);

    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 z-50 flex items-center justify-center min-h-screen ${className}`}
      style={{ 
        willChange: 'transform',
        backfaceVisibility: 'hidden',
        transform: 'translateZ(0)'
      }}
    >
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

        {/* Current Step Display */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {steps[currentStep]?.text || 'Processing...'}
          </h3>
          <div className="flex justify-center space-x-1 mb-4">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
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
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
            </div>
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

export default RealLoadingScreen;
