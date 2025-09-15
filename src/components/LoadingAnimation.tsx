'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingAnimationProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse' | 'wave';
  color?: 'blue' | 'green' | 'purple' | 'red' | 'yellow' | 'gray';
  customGif?: string;
  className?: string;
  showText?: boolean;
  text?: string;
}

export default function LoadingAnimation({
  size = 'md',
  variant = 'spinner',
  color = 'blue',
  customGif,
  className,
  showText = false,
  text = 'Loading...'
}: LoadingAnimationProps) {
  // Size configurations
  const sizeConfig = {
    sm: { container: 'w-4 h-4', text: 'text-xs' },
    md: { container: 'w-6 h-6', text: 'text-sm' },
    lg: { container: 'w-8 h-8', text: 'text-base' },
    xl: { container: 'w-12 h-12', text: 'text-lg' }
  };

  // Color configurations
  const colorConfig = {
    blue: 'border-blue-500',
    green: 'border-green-500',
    purple: 'border-purple-500',
    red: 'border-red-500',
    yellow: 'border-yellow-500',
    gray: 'border-gray-500'
  };

  const currentSize = sizeConfig[size];
  const currentColor = colorConfig[color];

  // Custom GIF variant
  if (customGif) {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <img 
          src={customGif} 
          alt="Loading animation" 
          className={cn('object-contain', currentSize.container)}
        />
        {showText && (
          <span className={cn('ml-2 font-medium text-gray-600', currentSize.text)}>
            {text}
          </span>
        )}
      </div>
    );
  }

  // Spinner variant
  if (variant === 'spinner') {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <div className={cn(
          'animate-spin rounded-full border-b-2',
          currentSize.container,
          currentColor
        )} />
        {showText && (
          <span className={cn('ml-2 font-medium text-gray-600', currentSize.text)}>
            {text}
          </span>
        )}
      </div>
    );
  }

  // Dots variant
  if (variant === 'dots') {
    return (
      <div className={cn('flex items-center justify-center space-x-1', className)}>
        <div className={cn('flex space-x-1', currentSize.container)}>
          <div className={cn('w-2 h-2 rounded-full animate-bounce', currentColor.replace('border-', 'bg-'))} style={{ animationDelay: '0ms' }} />
          <div className={cn('w-2 h-2 rounded-full animate-bounce', currentColor.replace('border-', 'bg-'))} style={{ animationDelay: '150ms' }} />
          <div className={cn('w-2 h-2 rounded-full animate-bounce', currentColor.replace('border-', 'bg-'))} style={{ animationDelay: '300ms' }} />
        </div>
        {showText && (
          <span className={cn('ml-2 font-medium text-gray-600', currentSize.text)}>
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
          'rounded-full animate-pulse',
          currentSize.container,
          currentColor.replace('border-', 'bg-')
        )} />
        {showText && (
          <span className={cn('ml-2 font-medium text-gray-600', currentSize.text)}>
            {text}
          </span>
        )}
      </div>
    );
  }

  // Wave variant
  if (variant === 'wave') {
    return (
      <div className={cn('flex items-center justify-center space-x-1', className)}>
        <div className={cn('flex space-x-1', currentSize.container)}>
          <div className={cn('w-1 h-4 rounded-full animate-pulse', currentColor.replace('border-', 'bg-'))} style={{ animationDelay: '0ms' }} />
          <div className={cn('w-1 h-4 rounded-full animate-pulse', currentColor.replace('border-', 'bg-'))} style={{ animationDelay: '150ms' }} />
          <div className={cn('w-1 h-4 rounded-full animate-pulse', currentColor.replace('border-', 'bg-'))} style={{ animationDelay: '300ms' }} />
          <div className={cn('w-1 h-4 rounded-full animate-pulse', currentColor.replace('border-', 'bg-'))} style={{ animationDelay: '450ms' }} />
        </div>
        {showText && (
          <span className={cn('ml-2 font-medium text-gray-600', currentSize.text)}>
            {text}
          </span>
        )}
      </div>
    );
  }

  return null;
}
