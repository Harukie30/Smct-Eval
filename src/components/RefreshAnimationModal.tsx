'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface RefreshAnimationModalProps {
  isOpen: boolean;
  message?: string;
  gifPath?: string;
  onComplete?: () => void;
  duration?: number;
}

export default function RefreshAnimationModal({
  isOpen,
  message = "Refreshing data...",
  gifPath = "/search-file.gif", // Default path, can be customized
  onComplete,
  duration = 2000 // Default 2 seconds
}: RefreshAnimationModalProps) {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowModal(true);
      
      // Auto-close after duration
      const timer = setTimeout(() => {
        setShowModal(false);
        if (onComplete) {
          // Small delay to allow modal close animation
          setTimeout(onComplete, 300);
        }
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setShowModal(false);
    }
  }, [isOpen, duration, onComplete]);

  if (!showModal) return null;

  return (
    <Dialog open={showModal} onOpenChangeAction={() => {}}>
      <DialogContent className="sm:max-w-md bg-transparent border-none shadow-none">
        <div className="flex flex-col items-center justify-center p-8 bg-white/100 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200 min-w-[300px]">
          {/* Custom GIF Animation */}
          <div className="mb-6 flex items-center justify-center">
            <img
              src={gifPath}
              alt="Refreshing..."
              className="w-20 h-20 object-contain"
              onError={(e) => {
                // Fallback to a magnifying glass animation if GIF fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = document.createElement('div');
                fallback.className = 'w-20 h-20 flex items-center justify-center relative';
                fallback.innerHTML = `
                  <div class="relative w-16 h-16 flex items-center justify-center">
                    <!-- File/Document -->
                    <div class="relative">
                      <!-- Main File Body -->
                      <div class="w-10 h-12 bg-blue-500 rounded-sm animate-pulse"></div>
                      <!-- File Corner Fold -->
                      <div class="absolute top-0 right-0 w-3 h-3 bg-blue-600 transform rotate-45 origin-bottom-left animate-pulse" style="animation-delay: 100ms"></div>
                      <!-- File Lines -->
                      <div class="absolute top-2 left-1 w-6 h-0.5 bg-blue-200 animate-pulse" style="animation-delay: 200ms"></div>
                      <div class="absolute top-3.5 left-1 w-5 h-0.5 bg-blue-200 animate-pulse" style="animation-delay: 300ms"></div>
                      <div class="absolute top-5 left-1 w-4 h-0.5 bg-blue-200 animate-pulse" style="animation-delay: 400ms"></div>
                      <!-- Refresh Arrow -->
                      <div class="absolute -top-1 -right-1 w-4 h-4 border-2 border-blue-500 rounded-full animate-spin" style="animation-delay: 500ms"></div>
                    </div>
                  </div>
                `;
                target.parentNode?.appendChild(fallback);
              }}
            />
          </div>

          {/* Loading Message */}
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              {message}
            </h3>
            <div className="flex items-center justify-center space-x-2">
              <div className="flex items-center space-x-2">
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-ping" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-ping" style={{ animationDelay: '200ms' }}></div>
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-ping" style={{ animationDelay: '400ms' }}></div>
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-ping" style={{ animationDelay: '600ms' }}></div>
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-ping" style={{ animationDelay: '800ms' }}></div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full">
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 rounded-full animate-pulse"
                style={{
                  background: 'linear-gradient(90deg, #60a5fa, #3b82f6, #2563eb, #1d4ed8)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 2s ease-in-out infinite'
                }}
              />
            </div>
          </div>
        </div>

        {/* Custom CSS for shimmer animation */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes shimmer {
              0% { background-position: -200% 0; }
              100% { background-position: 200% 0; }
            }
          `
        }} />
      </DialogContent>
    </Dialog>
  );
}
