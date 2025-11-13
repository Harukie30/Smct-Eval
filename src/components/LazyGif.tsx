'use client';

import { useLazyImage } from '@/hooks/useLazyImage';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyGifProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  /**
   * Whether the GIF should be loaded (e.g., when modal is open)
   */
  shouldLoad?: boolean;
  /**
   * Delay before loading (ms) - useful for animations
   */
  delay?: number;
}

/**
 * LazyGif - Component that lazy loads GIFs only when needed
 * Shows a skeleton loader while the GIF is loading
 */
export function LazyGif({
  src,
  alt,
  className = 'w-full h-auto',
  containerClassName = '',
  shouldLoad = true,
  delay = 100,
}: LazyGifProps) {
  const { isLoaded, hasError } = useLazyImage(src, { shouldLoad, delay });

  if (hasError) {
    return null; // Don't show anything if image fails to load
  }

  return (
    <div className={`relative ${containerClassName}`}>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <Skeleton className="w-full h-48" />
        </div>
      )}
      {isLoaded && (
        <img
          src={src}
          alt={alt}
          className={className}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
    </div>
  );
}

