import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-gray-300 animate-pulse rounded-md", className)}
      {...props}
    />
  )
}

// Enhanced skeleton variants for different use cases
export function SkeletonText({ 
  lines = 1, 
  className = "" 
}: { 
  lines?: number; 
  className?: string; 
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  )
}

export function SkeletonAvatar({ 
  size = "md", 
  className = "" 
}: { 
  size?: "sm" | "md" | "lg" | "xl"; 
  className?: string; 
}) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10", 
    lg: "w-12 h-12",
    xl: "w-16 h-16"
  }
  
  return (
    <Skeleton 
      className={cn("rounded-full", sizeClasses[size], className)} 
    />
  )
}

export function SkeletonCard({ 
  showAvatar = false, 
  lines = 3,
  className = "" 
}: { 
  showAvatar?: boolean; 
  lines?: number; 
  className?: string; 
}) {
  return (
    <div className={cn("p-4 border rounded-lg", className)}>
      <div className="flex items-start space-x-3">
        {showAvatar && <SkeletonAvatar size="md" />}
        <div className="flex-1 space-y-2">
          <SkeletonText lines={lines} />
        </div>
      </div>
    </div>
  )
}

export function SkeletonTable({ 
  rows = 5, 
  columns = 4,
  showHeader = true,
  className = "" 
}: { 
  rows?: number; 
  columns?: number; 
  showHeader?: boolean;
  className?: string; 
}) {
  return (
    <div className={cn("w-full", className)}>
      {showHeader && (
        <div className="flex space-x-4 py-3 border-b">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={`header-${i}`} className="h-4 flex-1" />
          ))}
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="flex space-x-4 py-2">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonButton({ 
  size = "md",
  className = "" 
}: { 
  size?: "sm" | "md" | "lg"; 
  className?: string; 
}) {
  const sizeClasses = {
    sm: "h-8 w-16",
    md: "h-10 w-20", 
    lg: "h-12 w-24"
  }
  
  return (
    <Skeleton 
      className={cn("rounded-md", sizeClasses[size], className)} 
    />
  )
}

export function SkeletonBadge({ 
  className = "" 
}: { 
  className?: string; 
}) {
  return (
    <Skeleton 
      className={cn("h-6 w-16 rounded-full", className)} 
    />
  )
}

// Loading overlay with skeleton
export function SkeletonOverlay({ 
  message = "Loading...",
  showSkeleton = true,
  className = "" 
}: { 
  message?: string; 
  showSkeleton?: boolean;
  className?: string; 
}) {
  return (
    <div className={cn(
      "fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center",
      className
    )}>
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4">
            <img
              src="/smct.png"
              alt="SMCT Group of Companies"
              className="w-full h-full object-contain"
            />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{message}</h3>
          {showSkeleton && (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export { Skeleton }
