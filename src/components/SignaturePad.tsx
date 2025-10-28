"use client";

import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { dataURLtoFile } from "@/utils/data-url-to-file";
import Image from "next/image";

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
  const [previewImage, setPreviewImage] = useState<string>(value ?? "");

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

  // Load existing signature when value changes

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
    setPreviewImage("");
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

  console.log(previewImage)

  return (
    <div className={`space-y-3 ${className}`}>
      <div
        className={`border-2 border-dashed rounded-lg p-4 bg-gray-50 ${
          hasError ? "border-red-300 bg-red-50" : "border-gray-300"
        }`}
      >
        {previewImage ? (
          <Image
            src={previewImage}
            alt="Signature"
            width={700}
            height={700}
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
          disabled={!previewImage}
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
