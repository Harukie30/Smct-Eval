"use client";

import { useSyncExternalStore } from "react";
import { MOBILE_VIEWPORT_MEDIA_QUERY } from "@/lib/viewport";

function subscribeMobileViewport(onStoreChange: () => void) {
  const mq = window.matchMedia(MOBILE_VIEWPORT_MEDIA_QUERY);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getMobileViewportSnapshot() {
  return window.matchMedia(MOBILE_VIEWPORT_MEDIA_QUERY).matches;
}

function getMobileViewportServerSnapshot() {
  return false;
}

/** True when viewport is tablet width or smaller (≤1023px). */
export function useMobileViewport() {
  return useSyncExternalStore(
    subscribeMobileViewport,
    getMobileViewportSnapshot,
    getMobileViewportServerSnapshot
  );
}
