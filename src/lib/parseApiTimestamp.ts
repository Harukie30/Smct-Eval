/**
 * Parse API date/time values (ISO, Laravel `Y-m-d H:i:s`, unix seconds/ms).
 */
export function parseApiTimestampMs(raw: unknown): number | null {
  if (raw == null || raw === "") return null;

  if (typeof raw === "number" && Number.isFinite(raw)) {
    if (raw > 0 && raw < 1e12) return raw * 1000;
    return raw;
  }

  if (raw instanceof Date) {
    const t = raw.getTime();
    return Number.isNaN(t) ? null : t;
  }

  let s = String(raw).trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) {
    s = s.replace(" ", "T");
  }

  if (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s) &&
    !s.endsWith("Z") &&
    !/[+-]\d{2}:?\d{2}$/.test(s)
  ) {
    s = `${s}Z`;
  }

  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

export function pickApiTimestamp(
  record: Record<string, unknown> | null | undefined,
  keys: readonly string[]
): string | null {
  if (!record) return null;
  for (const key of keys) {
    const raw = record[key];
    if (raw == null || raw === "") continue;
    const ms = parseApiTimestampMs(raw);
    if (ms != null) return String(raw).trim();
  }
  return null;
}
