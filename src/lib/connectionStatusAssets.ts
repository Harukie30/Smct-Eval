import type { ConnectionUiStatus } from "@/contexts/ConnectionContext";

/** Your GIFs in /public — keep each under ~800KB when possible for fast offline display */
export const CONNECTION_GIF_URLS = [
  "/reconnecting.gif",
  "/no-connection.gif",
  "/networking.gif",
] as const;

export const CONNECTION_STATUS_GIFS: Record<
  Exclude<ConnectionUiStatus, "connected">,
  { src: (typeof CONNECTION_GIF_URLS)[number]; alt: string }
> = {
  reconnecting: {
    src: "/reconnecting.gif",
    alt: "Reconnecting",
  },
  offline: {
    src: "/no-connection.gif",
    alt: "No connection",
  },
  restored: {
    src: "/networking.gif",
    alt: "Connected",
  },
};

/**
 * Cache all connection GIFs while the user is online so they still show
 * during reconnecting/offline modals (browser cannot fetch new files when offline).
 */
export function preloadConnectionGifs(): () => void {
  if (typeof document === "undefined") {
    return () => {};
  }

  const links: HTMLLinkElement[] = [];

  CONNECTION_GIF_URLS.forEach((href) => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = href;
    document.head.appendChild(link);
    links.push(link);

    const img = new Image();
    img.src = href;
  });

  return () => {
    links.forEach((link) => {
      link.remove();
    });
  };
}
