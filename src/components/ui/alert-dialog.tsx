"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./dialog"
import { Button } from "./button"
import { cn } from "@/lib/utils"
import SuccessAnimation from "@/components/SuccessAnimation"
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
  successAnimation?: {
    variant?: 'checkmark' | 'circle' | 'pulse' | 'bounce'
    color?: 'green' | 'blue' | 'purple' | 'red' | 'yellow'
    size?: 'sm' | 'md' | 'lg' | 'xl'
    customGif?: string
  }
  // Legacy support
  customLoadingGif?: string
  customSuccessGif?: string
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
  successAnimation,
  customLoadingGif,
  customSuccessGif
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

  const getSuccessProps = () => ({
    variant: successAnimation?.variant || 'checkmark',
    color: successAnimation?.color || 'green',
    size: successAnimation?.size || 'md',
    customGif: successAnimation?.customGif || customSuccessGif
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
              <SuccessAnimation {...getSuccessProps()} />
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
                <SuccessAnimation {...getSuccessProps()} />
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
