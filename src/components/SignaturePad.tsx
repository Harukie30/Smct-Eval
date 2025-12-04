"use client";

import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { dataURLtoFile } from "@/utils/data-url-to-file";
import Image from "next/image";
import { CONFIG } from "@/../config/config";

interface SignaturePadProps {
  value: string;
  onChangeAction: (signature: File | any) => void;
  className?: string;
  required?: boolean;
  hasError?: boolean;
}

export default function SignaturePad({
  value,
  onChangeAction,
  className = "",
  required = false,
  hasError = false,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>("");

  // Helper function to get coordinates
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  // Helper function to normalize signature URL
  const normalizeSignatureUrl = (signature: string): string => {
    if (!signature || typeof signature !== 'string') return '';
    
    // If it's already a data URL, return as is
    if (signature.startsWith('data:image')) {
      return signature;
    }
    
    // If it's already an absolute URL, return as is
    if (signature.startsWith('http://') || signature.startsWith('https://')) {
      return signature;
    }
    
    // If it's a file path from backend (like "user-signatures/...")
    // Convert to full API URL or add leading slash for public assets
    if (signature.startsWith('/')) {
      // Already has leading slash - treat as public asset
      return signature;
    } else {
      // File path from backend - construct full URL
      // If it's in a storage path, use API URL with storage prefix
      if (signature.includes('/') && !signature.startsWith('/')) {
        // Backend storage path - construct URL using API base URL
        // Try different URL patterns based on Laravel storage structure
        const apiUrl = CONFIG.API_URL || 'http://localhost:8000';
        
        // Option 1: Try /storage/ route (Laravel public storage symlink)
        // Option 2: Try via API endpoint if storage requires auth
        // For now, try the storage route first
        const baseUrl = apiUrl.replace(/\/api$/, '');
        
        // Laravel storage files can be accessed via:
        // - /storage/{path} (if public symlink exists)
        // - /api/storage/{path} (if protected endpoint exists)
        // Try public storage first
        return `${baseUrl}/storage/${signature}`;
      } else {
        // Simple filename - treat as public asset with leading slash
        return `/${signature}`;
      }
    }
  };

  // Load existing signature when value changes
  useEffect(() => {
    if (value && typeof value === 'string' && value.length > 0) {
      setHasSignature(true);
      setPreviewImage(normalizeSignatureUrl(value));
    } else {
      setHasSignature(false);
      setPreviewImage("");
    }
  }, [value]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to match display size exactly
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Set drawing styles
    ctx.strokeStyle = "#1f2937"; // Dark gray
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setHasSignature(true);

    // Convert canvas to data URL and call onChange
    const canvas = canvasRef.current;
    if (canvas) {
      const dataURL = canvas.toDataURL("image/png");
      setPreviewImage(dataURL);
      // Store as base64 string (can be saved to localStorage/JSON)
      // If backend needs File, convert using: dataURLtoFile(dataURL, "signature.png")
      onChangeAction(dataURL);
    }
  };

  const clearSignature = () => {
    onChangeAction(null);
    setHasSignature(false);
    
    // Small delay to ensure canvas is rendered before resetting
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Reset canvas dimensions to match current display size
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;

      // Re-apply drawing styles after resizing
      ctx.strokeStyle = "#1f2937";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, 0);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div
        className={`border-2 border-dashed rounded-lg p-4 bg-gray-50 ${
          hasError ? "border-red-300 bg-red-50" : "border-gray-300"
        }`}
      >
        {hasSignature ? (
          // Use regular img tag for all cases to handle authentication cookies properly
          // For storage URLs, we need to send credentials (cookies) for authentication
          <img
            src={previewImage}
            alt="Signature"
            className="w-full h-32 object-contain"
            crossOrigin="use-credentials"
            onError={(e) => {
              console.error('Failed to load signature image:', previewImage);
              // Try to load via API proxy if direct storage access fails
              if (previewImage.includes('/storage/') && !previewImage.startsWith('data:image')) {
                console.log('Storage URL failed, signature may need to be loaded differently');
              }
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <canvas
            ref={canvasRef}
            className={`w-full h-32 cursor-crosshair bg-white rounded border ${
              hasError ? "border-red-300" : "border-gray-200"
            }`}
            style={{ display: 'block' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        )}
        <p
          className={`text-sm mt-2 text-center ${
            hasError
              ? "text-red-600"
              : hasSignature
              ? "text-green-600"
              : "text-gray-500"
          }`}
        >
          {hasError
            ? "⚠️ Signature is required"
            : hasSignature
            ? "Signature captured ✓"
            : required
            ? "Please draw your signature above *"
            : "Draw your signature above"}
        </p>
      </div>

      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearSignature}
          disabled={!hasSignature}
          className="text-red-600 border-red-300 hover:bg-red-50"
        >
          Clear Signature
        </Button>

        {hasSignature && (
          <div className="text-sm text-green-600 flex items-center">
            <svg
              className="w-4 h-4 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Signature Ready
          </div>
        )}
      </div>
    </div>
  );
}
