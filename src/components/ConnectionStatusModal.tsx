"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { Loader2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ConnectionUiStatus } from "@/contexts/ConnectionContext";
import { CONNECTION_STATUS_GIFS } from "@/lib/connectionStatusAssets";

type ConnectionStatusModalProps = {
  open: boolean;
  status: ConnectionUiStatus;
  onRetry: () => void;
};

function ConnectionStatusGif({
  status,
  open,
}: {
  status: Exclude<ConnectionUiStatus, "connected">;
  open: boolean;
}) {
  const asset = CONNECTION_STATUS_GIFS[status];
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loadKey, setLoadKey] = useState(0);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
    setLoadKey((key) => key + 1);
  }, [status, open, asset.src]);

  useEffect(() => {
    if (!open) return;

    const retryLoad = () => {
      setLoaded(false);
      setFailed(false);
      setLoadKey((key) => key + 1);
    };

    window.addEventListener("online", retryLoad);
    return () => window.removeEventListener("online", retryLoad);
  }, [open]);

  return (
    <div className="relative mb-4 flex min-h-[11rem] flex-col items-center justify-center">
      {!loaded && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2"
          aria-hidden={loaded}
        >
          {failed ? (
            <WifiOff className="h-10 w-10 text-gray-400" />
          ) : (
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
          )}
        </div>
      )}
      <img
        key={`${status}-${loadKey}`}
        src={asset.src}
        alt={asset.alt}
        className={cn(
          "max-h-48 w-auto max-w-[min(100%,16rem)] object-contain transition-opacity duration-200",
          loaded ? "opacity-100" : "opacity-0"
        )}
        draggable={false}
        loading="eager"
        decoding="async"
        onLoad={() => {
          setLoaded(true);
          setFailed(false);
        }}
        onError={() => {
          setFailed(true);
          setLoaded(false);
        }}
      />
      {failed && !loaded && (
        <p className="relative z-10 mt-2 max-w-[14rem] text-xs text-gray-500">
          {typeof navigator !== "undefined" && !navigator.onLine
            ? "Stay on this page — your GIF will show from cache after you were logged in online."
            : "Loading illustration…"}
        </p>
      )}
    </div>
  );
}

export default function ConnectionStatusModal({
  open,
  status,
  onRetry,
}: ConnectionStatusModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!mounted || !open || typeof document === "undefined" || status === "connected") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-live="assertive"
      aria-labelledby="connection-status-title"
      aria-describedby="connection-status-description"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden
      />

      <div className="relative w-full max-w-sm rounded-xl bg-white px-6 py-8 text-center shadow-2xl">
        <ConnectionStatusGif status={status} open={open} />

        {status === "reconnecting" && (
          <>
            <h2
              id="connection-status-title"
              className="text-xl font-bold text-blue-700"
            >
              Reconnecting...
            </h2>
            <p
              id="connection-status-description"
              className="mt-2 text-sm text-gray-600"
            >
              Connection lost. Trying to reach the server — your work on this
              page is still here.
            </p>
          </>
        )}

        {status === "offline" && (
          <>
            <h2
              id="connection-status-title"
              className="text-xl font-bold text-red-700"
            >
              No Connection
            </h2>
            <p
              id="connection-status-description"
              className="mt-2 text-sm text-gray-600"
            >
              We could not reach the server. Check your internet connection,
              then try again. You can continue where you left off once
              connected.
            </p>
            <Button
              type="button"
              onClick={onRetry}
              className="mt-6 cursor-pointer rounded-lg bg-blue-600 px-8 py-2 font-medium text-white hover:bg-blue-700"
            >
              Try Again
            </Button>
          </>
        )}

        {status === "restored" && (
          <>
            <h2
              id="connection-status-title"
              className="text-xl font-bold text-gray-900"
            >
              Connected
            </h2>
            <p
              id="connection-status-description"
              className="mt-2 text-sm text-gray-600"
            >
              You are back online. Continuing where you left off.
            </p>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
