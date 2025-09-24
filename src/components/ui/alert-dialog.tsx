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
  customLoadingGif
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

  return (
    <Dialog open={open} onOpenChangeAction={onOpenChangeAction}>
      <DialogContent className="max-w-md animate-in fade-in-0 zoom-in-95 duration-300 ease-out">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {showSuccessAnimation ? (
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
            ) : (
              <span className="text-2xl">{styles.icon}</span>
            )}
            {title}
          </DialogTitle>
          <DialogDescription className="text-base">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2">
          {showCancel && !isLoading && !showSuccessAnimation && (
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1 transition-all text-white hover:text-white bg-blue-500 duration-200 hover:bg-blue-600 ease-out hover:scale-105 active:scale-95"
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
      </DialogContent>
    </Dialog>
  )
}
