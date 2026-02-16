"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./dialog"
import { Button } from "./button"
import { cn } from "@/lib/utils"
import LoadingAnimation from "@/components/LoadingAnimation"

// Add CSS animations
const styles = `
  @keyframes drawCheckmark {
    0% {
      stroke-dashoffset: 20;
    }
    100% {
      stroke-dashoffset: 0;
    }
  }
  
  @keyframes checkmarkPulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
    100% {
      transform: scale(1);
    }
  }
  
  .animate-checkmark {
    animation: drawCheckmark 0.6s ease-in-out forwards;
  }
  
  .animate-checkmark-pulse {
    animation: checkmarkPulse 0.3s ease-in-out;
  }
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style")
  styleSheet.type = "text/css"
  styleSheet.innerText = styles
  if (!document.head.querySelector('style[data-alert-dialog-animations]')) {
    styleSheet.setAttribute('data-alert-dialog-animations', 'true')
    document.head.appendChild(styleSheet)
  }
}

interface AlertDialogProps {
  open: boolean
  onOpenChangeAction: (open: boolean) => void
  title: string
  description: string
  type?: "success" | "error" | "warning" | "info"
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  onCancel?: () => void
  showCancel?: boolean
  isLoading?: boolean
  showSuccessAnimation?: boolean
  // Animation customization
  loadingAnimation?: {
    variant?: 'spinner' | 'dots' | 'pulse' | 'wave'
    color?: 'blue' | 'green' | 'purple' | 'red' | 'yellow' | 'gray'
    size?: 'sm' | 'md' | 'lg' | 'xl'
    customGif?: string
  }
  // Legacy support
  customLoadingGif?: string
  // Background image for dialog
  backgroundImage?: string
  // Dialog size
  size?: "sm" | "md" | "lg" | "xl" | "2xl"
  // Background logo size
  logoSize?: "cover" | "contain" | "auto" | number
  // Background logo opacity (0-1)
  logoOpacity?: number
}

export function AlertDialog({
  open,
  onOpenChangeAction,
  title,
  description,
  type = "info",
  confirmText = "OK",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  showCancel = false,
  isLoading = false,
  showSuccessAnimation = false,
  loadingAnimation,
  customLoadingGif,
  backgroundImage,
  size = "md",
  logoSize = "cover",
  logoOpacity = 1
}: AlertDialogProps) {
  const handleConfirm = () => {
    onConfirm?.()
    // Don't close immediately if showing success animation
    if (!showSuccessAnimation) {
      onOpenChangeAction(false)
    }
  }

  const handleCancel = () => {
    onCancel?.()
    onOpenChangeAction(false)
  }

  // Get animation props with fallbacks
  const getLoadingProps = () => ({
    variant: loadingAnimation?.variant || 'spinner',
    color: loadingAnimation?.color || 'blue',
    size: loadingAnimation?.size || 'md',
    customGif: loadingAnimation?.customGif || customLoadingGif
  });

  const getTypeStyles = () => {
    switch (type) {
      case "success":
        return {
          icon: "✅",
          confirmButton: "bg-green-600 hover:bg-green-700 text-white"
        }
      case "error":
        return {
          icon: "🛑",
          confirmButton: "bg-red-600 hover:bg-red-700 text-white"
        }
      case "warning":
        return {
          icon: "⚠️",
          confirmButton: "bg-yellow-600 hover:bg-yellow-700 text-white"
        }
      default:
        return {
          icon: "ℹ️",
          confirmButton: "bg-blue-600 hover:bg-blue-700 text-white"
        }
    }
  }

  const styles = getTypeStyles()

  // Get gradient color based on type
  const getGradientColor = () => {
    switch (type) {
      case "success":
        return "from-green-600 to-green-800"
      case "error":
        return "from-red-600 to-red-800"
      case "warning":
        return "from-yellow-600 to-yellow-800"
      default:
        return "from-blue-600 to-blue-800"
    }
  }

  // Get size class based on size prop
  const getSizeClass = () => {
    switch (size) {
      case "sm":
        return "max-w-sm"
      case "md":
        return "max-w-md"
      case "lg":
        return "max-w-lg"
      case "xl":
        return "max-w-xl"
      case "2xl":
        return "max-w-2xl"
      default:
        return "max-w-md"
    }
  }

  return (
    <Dialog open={open} onOpenChangeAction={onOpenChangeAction}>
      <DialogContent 
        className={cn(
          getSizeClass(),
          "animate-in fade-in-0 zoom-in-95 duration-300 ease-out",
          backgroundImage && "p-0 overflow-hidden border-0 shadow-2xl relative"
        )}
      >
        {backgroundImage ? (
          <>
            {/* Background Logo Layer */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: typeof logoSize === 'number' ? `${logoSize}%` : logoSize,
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                opacity: logoOpacity,
                zIndex: 0,
              }}
            ></div>
            {/* Header Section with Gradient */}
            <div className="relative px-8 pt-7 pb-5 z-10">
              <div className={`absolute inset-0 bg-gradient-to-br ${getGradientColor()} opacity-95`}></div>
              <div className="absolute inset-0 bg-black/5"></div>
              <DialogHeader className="relative z-10 pb-3">
                <DialogTitle className="flex items-center gap-4 text-2xl font-extrabold text-white drop-shadow-xl tracking-tight">
                  {showSuccessAnimation ? (
                    <div className="p-3 bg-white/25 backdrop-blur-md rounded-xl shadow-xl border-2 border-white/40 ring-2 ring-white/20">
                      <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center animate-pulse shadow-lg">
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
                    </div>
                  ) : (
                    <div className="p-3 bg-white/25 backdrop-blur-md rounded-xl shadow-xl border-2 border-white/40 ring-2 ring-white/20">
                      <span className="text-2xl drop-shadow-md">{styles.icon}</span>
                    </div>
                  )}
                  <span className="drop-shadow-md">{title}</span>
                </DialogTitle>
              </DialogHeader>
            </div>

            {/* Content Section */}
            <div className="bg-white/98 backdrop-blur-sm px-8 pb-7 pt-7 relative z-10">
              <div className="space-y-5">
                <div className={`flex items-start gap-4 p-6 bg-gradient-to-br ${type === 'warning' ? 'from-yellow-50 via-yellow-50/80 to-orange-50 border-yellow-300' : type === 'error' ? 'from-red-50 via-red-50/80 to-pink-50 border-red-300' : type === 'success' ? 'from-green-50 via-green-50/80 to-emerald-50 border-green-300' : 'from-blue-50 via-blue-50/80 to-indigo-50 border-blue-300'} rounded-2xl border-2 shadow-lg backdrop-blur-sm`}>
                  <div className={`p-3 ${type === 'warning' ? 'bg-yellow-200/80' : type === 'error' ? 'bg-red-200/80' : type === 'success' ? 'bg-green-200/80' : 'bg-blue-200/80'} rounded-xl flex-shrink-0 shadow-md ring-1 ring-white/50`}>
                    <span className="text-2xl drop-shadow-sm">{styles.icon}</span>
                  </div>
                  <div className="flex-1 pt-1">
                    <DialogDescription className="text-base text-gray-800 leading-relaxed font-semibold tracking-wide">
                      {description}
                    </DialogDescription>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <DialogFooter className={`bg-gradient-to-b from-gray-50 via-gray-50/95 to-gray-100 px-8 py-5 border-t-2 border-gray-300/50 flex gap-4 shadow-inner relative z-10`}>
              {showCancel && !isLoading && !showSuccessAnimation && (
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1 transition-all text-white hover:text-white bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 duration-300 ease-out hover:scale-105 active:scale-95 font-bold shadow-lg hover:shadow-xl cursor-pointer border-0 rounded-xl py-2.5 tracking-wide"
                >
                  {cancelText}
                </Button>
              )}
              <Button
                onClick={handleConfirm}
                disabled={isLoading || showSuccessAnimation}
                className={cn(
                  "flex-1 transition-all duration-300 ease-out hover:scale-105 active:scale-95 font-bold shadow-lg hover:shadow-xl cursor-pointer border-0 rounded-xl py-2.5 tracking-wide",
                  type === 'warning' ? 'bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white ring-2 ring-yellow-400/30' :
                  type === 'error' ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white ring-2 ring-red-400/30' :
                  type === 'success' ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white ring-2 ring-green-400/30' :
                  'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white ring-2 ring-blue-400/30',
                  (isLoading || showSuccessAnimation) && "opacity-75 cursor-not-allowed"
                )}
              >
                {isLoading ? (
                  <LoadingAnimation {...getLoadingProps()} />
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
          </>
        ) : (
          <>
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle className="flex items-center gap-3 text-2xl font-extrabold tracking-tight">
                {showSuccessAnimation ? (
                  <div className="p-2.5 bg-green-100 rounded-xl shadow-md border-2 border-green-200">
                    <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center animate-pulse shadow-lg">
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
                  </div>
                ) : (
                  <div className={`p-2.5 ${type === 'warning' ? 'bg-yellow-100' : type === 'error' ? 'bg-red-100' : type === 'success' ? 'bg-green-100' : 'bg-blue-100'} rounded-xl shadow-md border-2 ${type === 'warning' ? 'border-yellow-200' : type === 'error' ? 'border-red-200' : type === 'success' ? 'border-green-200' : 'border-blue-200'}`}>
                    <span className="text-2xl">{styles.icon}</span>
                  </div>
                )}
                {title}
              </DialogTitle>
              <DialogDescription className="text-base text-gray-700 leading-relaxed font-medium mt-3 px-1">
                {description}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-3 px-6 pb-6">
              {showCancel && !isLoading && !showSuccessAnimation && (
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1 transition-all text-white hover:text-white bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 duration-300 ease-out hover:scale-105 active:scale-95 font-bold shadow-lg hover:shadow-xl cursor-pointer border-0 rounded-xl py-2.5 tracking-wide"
                >
                  {cancelText}
                </Button>
              )}
              <Button
                onClick={handleConfirm}
                disabled={isLoading || showSuccessAnimation}
                className={cn(
                  "flex-1 transition-all duration-300 ease-out hover:scale-105 active:scale-95 font-bold shadow-lg hover:shadow-xl cursor-pointer border-0 rounded-xl py-2.5 tracking-wide",
                  styles.confirmButton,
                  (isLoading || showSuccessAnimation) && "opacity-75 cursor-not-allowed"
                )}
              >
                {isLoading ? (
                  <LoadingAnimation {...getLoadingProps()} />
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
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
