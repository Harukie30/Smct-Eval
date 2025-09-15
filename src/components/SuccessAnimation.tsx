'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SuccessAnimationProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'checkmark' | 'circle' | 'pulse' | 'bounce';
  color?: 'green' | 'blue' | 'purple' | 'red' | 'yellow';
  customGif?: string;
  className?: string;
  showText?: boolean;
  text?: string;
}

export default function SuccessAnimation({
  size = 'md',
  variant = 'checkmark',
  color = 'green',
  customGif,
  className,
  showText = false,
  text = 'Success!'
}: SuccessAnimationProps) {
  // Size configurations
  const sizeConfig = {
    sm: { container: 'w-4 h-4', icon: 'w-3 h-3', text: 'text-xs' },
    md: { container: 'w-6 h-6', icon: 'w-4 h-4', text: 'text-sm' },
    lg: { container: 'w-8 h-8', icon: 'w-6 h-6', text: 'text-base' },
    xl: { container: 'w-12 h-12', icon: 'w-8 h-8', text: 'text-lg' }
  };

  // Color configurations
  const colorConfig = {
    green: 'bg-green-500 text-white',
    blue: 'bg-blue-500 text-white',
    purple: 'bg-purple-500 text-white',
    red: 'bg-red-500 text-white',
    yellow: 'bg-yellow-500 text-white'
  };

  const currentSize = sizeConfig[size];
  const currentColor = colorConfig[color];

  // Custom GIF variant
  if (customGif) {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <img 
          src={customGif} 
          alt="Success animation" 
          className={cn('object-contain', currentSize.container)}
        />
        {showText && (
          <span className={cn('ml-2 font-medium', currentSize.text, currentColor)}>
            {text}
          </span>
        )}
      </div>
    );
  }

  // Checkmark variant
  if (variant === 'checkmark') {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <div className={cn(
          'rounded-full flex items-center justify-center animate-checkmark-pulse',
          currentSize.container,
          currentColor
        )}>
          <svg 
            className={cn('animate-checkmark', currentSize.icon)} 
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
        {showText && (
          <span className={cn('ml-2 font-medium', currentSize.text, currentColor)}>
            {text}
          </span>
        )}
      </div>
    );
  }

  // Circle variant
  if (variant === 'circle') {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <div className={cn(
          'rounded-full flex items-center justify-center animate-pulse',
          currentSize.container,
          currentColor
        )}>
          <div className={cn(
            'rounded-full bg-white/20',
            currentSize.icon
          )} />
        </div>
        {showText && (
          <span className={cn('ml-2 font-medium', currentSize.text, currentColor)}>
            {text}
          </span>
        )}
      </div>
    );
  }

  // Pulse variant
  if (variant === 'pulse') {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <div className={cn(
          'rounded-full animate-ping',
          currentSize.container,
          currentColor
        )} />
        {showText && (
          <span className={cn('ml-2 font-medium', currentSize.text, currentColor)}>
            {text}
          </span>
        )}
      </div>
    );
  }

  // Bounce variant
  if (variant === 'bounce') {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <div className={cn(
          'rounded-full animate-bounce',
          currentSize.container,
          currentColor
        )}>
          <div className={cn(
            'rounded-full bg-white/20',
            currentSize.icon
          )} />
        </div>
        {showText && (
          <span className={cn('ml-2 font-medium', currentSize.text, currentColor)}>
            {text}
          </span>
        )}
      </div>
    );
  }

  return null;
}
