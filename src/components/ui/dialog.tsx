"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

type DialogContextValue = {
  open: boolean
  onOpenChangeAction: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

type DialogProps = {
  open: boolean
  onOpenChangeAction: (open: boolean) => void
  children: React.ReactNode
}

export function Dialog({ open, onOpenChangeAction, children }: DialogProps) {
  return (
    <DialogContext.Provider value={{ open, onOpenChangeAction }}>
      {children}
    </DialogContext.Provider>
  )
}

type DialogContentProps = React.HTMLAttributes<HTMLDivElement> & {
  className?: string
}

export function DialogContent({ className, children, ...props }: DialogContentProps) {
  const ctx = React.useContext(DialogContext)
  if (!ctx) return null
  if (!ctx.open) return null

  if (typeof document === "undefined") return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50"
    >
      <div
        aria-hidden
        className="fixed inset-0 bg-black/60"
        onClick={() => ctx.onOpenChangeAction(false)}
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          className={cn(
            "relative w-full max-w-2xl rounded-lg bg-white shadow-lg outline-none",
            "animate-in fade-in-0 zoom-in-95",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("border-b px-6 py-4", className)} {...props} />
  )
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("text-lg font-semibold", className)} {...props} />
  )
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-gray-600", className)} {...props} />
  )
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("border-t px-6 py-4 flex justify-end gap-2", className)} {...props} />
  )
}


