"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import {
  isNetworkFailure,
  subscribeConnectionLost,
} from "@/lib/connectionEvents";
import ConnectionStatusModal from "@/components/ConnectionStatusModal";
import { useAuth } from "@/contexts/UserContext";
import { preloadConnectionGifs } from "@/lib/connectionStatusAssets";

export type ConnectionUiStatus =
  | "connected"
  | "reconnecting"
  | "offline"
  | "restored";

type ConnectionContextValue = {
  status: ConnectionUiStatus;
  retry: () => void;
};

const ConnectionContext = createContext<ConnectionContextValue | undefined>(
  undefined
);

const RETRY_DELAY_MS = 3_000;
const MAX_RETRIES = 8;
const RESTORED_DISPLAY_MS = 1_800;
const PING_TIMEOUT_MS = 8_000;

/** Verify server reachability only during reconnect retries (not on a timer). */
async function pingServer(): Promise<boolean> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return false;
  }
  try {
    await api.get("/profile", { timeout: PING_TIMEOUT_MS });
    return true;
  } catch (error) {
    if (isNetworkFailure(error)) return false;
    // HTTP 401/403/500 still means the server responded.
    return true;
  }
}

export function useConnection() {
  const ctx = useContext(ConnectionContext);
  if (!ctx) {
    throw new Error("useConnection must be used within ConnectionProvider");
  }
  return ctx;
}

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [status, setStatus] = useState<ConnectionUiStatus>("connected");
  const statusRef = useRef<ConnectionUiStatus>("connected");
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttemptRef = useRef(0);
  const pingInFlightRef = useRef(false);

  const setStatusSafe = useCallback((next: ConnectionUiStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const clearRestoredTimer = useCallback(() => {
    if (restoredTimerRef.current) {
      clearTimeout(restoredTimerRef.current);
      restoredTimerRef.current = null;
    }
  }, []);

  const markRestored = useCallback(() => {
    clearRetryTimer();
    retryAttemptRef.current = 0;
    setStatusSafe("restored");
    clearRestoredTimer();
    restoredTimerRef.current = setTimeout(() => {
      setStatusSafe("connected");
    }, RESTORED_DISPLAY_MS);
  }, [clearRestoredTimer, clearRetryTimer, setStatusSafe]);

  const scheduleRetry = useCallback(
    function scheduleRetryFn() {
      clearRetryTimer();
      retryTimerRef.current = setTimeout(async () => {
        if (!isAuthenticated || statusRef.current === "connected") return;

        const ok = await pingServer();
        if (ok) {
          markRestored();
          return;
        }

        retryAttemptRef.current += 1;
        if (retryAttemptRef.current >= MAX_RETRIES) {
          setStatusSafe("offline");
          return;
        }

        scheduleRetryFn();
      }, RETRY_DELAY_MS);
    },
    [clearRetryTimer, isAuthenticated, markRestored, setStatusSafe]
  );

  const beginReconnecting = useCallback(() => {
    if (!isAuthenticated || isLoading) return;
    if (
      statusRef.current === "reconnecting" ||
      statusRef.current === "offline"
    ) {
      return;
    }

    clearRestoredTimer();
    retryAttemptRef.current = 0;
    setStatusSafe("reconnecting");
    scheduleRetry();
  }, [
    clearRestoredTimer,
    isAuthenticated,
    isLoading,
    scheduleRetry,
    setStatusSafe,
  ]);

  const retry = useCallback(async () => {
    if (!isAuthenticated) return;
    if (pingInFlightRef.current) return;

    pingInFlightRef.current = true;
    clearRetryTimer();
    setStatusSafe("reconnecting");
    retryAttemptRef.current = 0;

    try {
      const ok = await pingServer();
      if (ok) {
        markRestored();
      } else {
        setStatusSafe("offline");
        scheduleRetry();
      }
    } finally {
      pingInFlightRef.current = false;
    }
  }, [
    clearRetryTimer,
    isAuthenticated,
    markRestored,
    scheduleRetry,
    setStatusSafe,
  ]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearRetryTimer();
      clearRestoredTimer();
      retryAttemptRef.current = 0;
      setStatusSafe("connected");
      return;
    }

    const onBrowserOffline = () => beginReconnecting();
    const onBrowserOnline = () => {
      void retry();
    };

    window.addEventListener("offline", onBrowserOffline);
    window.addEventListener("online", onBrowserOnline);

    return () => {
      window.removeEventListener("offline", onBrowserOffline);
      window.removeEventListener("online", onBrowserOnline);
    };
  }, [
    beginReconnecting,
    clearRestoredTimer,
    clearRetryTimer,
    isAuthenticated,
    retry,
    setStatusSafe,
  ]);

  useEffect(() => {
    if (!isAuthenticated) return;
    return preloadConnectionGifs();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    const unsubscribe = subscribeConnectionLost(() => {
      beginReconnecting();
    });

    return unsubscribe;
  }, [beginReconnecting, isAuthenticated, isLoading]);

  useEffect(() => {
    return () => {
      clearRetryTimer();
      clearRestoredTimer();
    };
  }, [clearRestoredTimer, clearRetryTimer]);

  const showModal =
    isAuthenticated &&
    !isLoading &&
    status !== "connected";

  const value: ConnectionContextValue = {
    status,
    retry,
  };

  return (
    <ConnectionContext.Provider value={value}>
      {children}
      <ConnectionStatusModal
        open={showModal}
        status={status}
        onRetry={() => void retry()}
      />
    </ConnectionContext.Provider>
  );
}
