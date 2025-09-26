"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <>
      <style jsx>{`
        @keyframes slideInFromRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--success-bg": "hsl(142 76% 36%)",
          "--success-text": "hsl(355 7% 97%)",
          "--success-border": "hsl(142 76% 36%)",
          "--error-bg": "hsl(0 84% 60%)",
          "--error-text": "hsl(355 7% 97%)",
          "--error-border": "hsl(0 84% 60%)",
          "--warning-bg": "hsl(38 92% 50%)",
          "--warning-text": "hsl(355 7% 97%)",
          "--warning-border": "hsl(38 92% 50%)",
          "--info-bg": "hsl(221 83% 53%)",
          "--info-text": "hsl(355 7% 97%)",
          "--info-border": "hsl(221 83% 53%)",
        } as React.CSSProperties
      }
      closeButton={true}
      position="top-right"
      richColors={true}
      expand={true}
      toastOptions={{
        style: {
          borderRadius: '0.75rem',
          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
          padding: '1rem',
          fontSize: '0.875rem',
          fontWeight: '500',
          animation: 'slideInFromRight 0.3s ease-out',
        },
        className: 'group/toast',
      }}
      {...props}
    />
    </>
  )
}

export { Toaster }
