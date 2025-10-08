'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ConfirmModalProps {
  isOpen: boolean;
  onCloseAction: () => void;
  onConfirmAction: () => void;
  onCancelAction?: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  isLoading?: boolean;
  showSuccessAnimation?: boolean;
  variant?: 'default' | 'destructive' | 'warning' | 'success';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function ConfirmModal({
  isOpen,
  onCloseAction,
  onConfirmAction,
  onCancelAction,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  showCancel = true,
  isLoading = false,
  showSuccessAnimation = false,
  variant = 'default',
  size = 'md',
  className
}: ConfirmModalProps) {
  const handleConfirm = () => {
    onConfirmAction();
    if (!showSuccessAnimation) {
      onCloseAction();
    }
  };

  const handleCancel = () => {
    onCancelAction?.();
    onCloseAction();
  };

  // Variant styles
  const variantStyles = {
    default: {
      icon: '⚠️',
      confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white',
      titleColor: 'text-gray-900',
      descriptionColor: 'text-gray-600'
    },
    destructive: {
      icon: '🗑️',
      confirmButton: 'bg-red-600 hover:bg-red-700 text-white',
      titleColor: 'text-red-900',
      descriptionColor: 'text-red-600'
    },
    warning: {
      icon: '⚠️',
      confirmButton: 'bg-yellow-600 hover:bg-yellow-700 text-white',
      titleColor: 'text-yellow-900',
      descriptionColor: 'text-yellow-600'
    },
    success: {
      icon: '✅',
      confirmButton: 'bg-green-600 hover:bg-green-700 text-white',
      titleColor: 'text-green-900',
      descriptionColor: 'text-green-600'
    }
  };

  // Size configurations
  const sizeConfig = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg'
  };

  const styles = variantStyles[variant];
  const currentSize = sizeConfig[size];

  return (
    <Dialog open={isOpen} onOpenChangeAction={onCloseAction}>
      <DialogContent className={cn(
        currentSize,
        'animate-popup',
        className
      )}>
        <DialogHeader>
          <DialogTitle className={cn('flex items-center gap-2', styles.titleColor)}>
            {showSuccessAnimation ? (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                  <svg 
                    className="w-4 h-4 text-white animate-checkmark" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    style={{
                      strokeDasharray: '20',
                      strokeDashoffset: '20',
                      animation: 'drawCheckmark 0.6s ease-in-out forwards'
                    }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>Success!</span>
              </div>
            ) : (
              <>
                <span className="text-2xl">{styles.icon}</span>
                {title}
              </>
            )}
          </DialogTitle>
          {description && (
            <DialogDescription className={styles.descriptionColor}>
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        
        <DialogFooter className="flex gap-2">
          {showCancel && !isLoading && !showSuccessAnimation && (
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
            >
              {cancelText}
            </Button>
          )}
          <Button
            onClick={handleConfirm}
            disabled={isLoading || showSuccessAnimation}
            className={cn(
              "flex-1 transition-all duration-200 ease-out hover:scale-105 active:scale-95",
              styles.confirmButton,
              (isLoading || showSuccessAnimation) && "opacity-75 cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Loading...</span>
              </div>
            ) : showSuccessAnimation ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                  <svg 
                    className="w-3 h-3 text-green-600" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>Success!</span>
              </div>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes drawCheckmark {
    to {
      stroke-dashoffset: 0;
    }
  }
  
  .animate-checkmark {
    animation: drawCheckmark 0.6s ease-in-out forwards;
  }
`;
document.head.appendChild(style);
