type ConnectionLostListener = () => void;

const connectionLostListeners = new Set<ConnectionLostListener>();

/** Fired when an API request fails due to network / server unreachable (not HTTP 4xx/5xx). */
export function emitConnectionLost() {
  connectionLostListeners.forEach((listener) => listener());
}

export function subscribeConnectionLost(listener: ConnectionLostListener) {
  connectionLostListeners.add(listener);
  return () => {
    connectionLostListeners.delete(listener);
  };
}

export function isNetworkFailure(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as {
    response?: unknown;
    code?: string;
    message?: string;
  };
  if (err.response) return false;
  return (
    err.code === "ERR_NETWORK" ||
    err.code === "ECONNABORTED" ||
    err.message === "Network Error"
  );
}
