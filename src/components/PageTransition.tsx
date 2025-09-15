'use client';

import { ReactNode, useEffect, useState } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export default function PageTransition({ children, className = '' }: PageTransitionProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div
      className={`transition-all duration-500 ease-out ${
        isVisible 
          ? 'opacity-100 translate-x-0 scale-100' 
          : 'opacity-0 -translate-x-5 scale-95'
      } ${className}`}
    >
      {children}
    </div>
  );
}
