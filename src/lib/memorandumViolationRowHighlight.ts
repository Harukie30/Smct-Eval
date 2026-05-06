import { parseISO } from "date-fns";

/** Yellow tint while activity is very recent. */
export const ROW_HIGHLIGHT_YELLOW_MS = 2 * 60 * 1000;
/** Stop highlighting after this age from activity time. */
export const ROW_HIGHLIGHT_TOTAL_MS = 60 * 60 * 1000;

export type ViolationHighlightFingerprintRow = {
  id: string | number;
  title: string;
  violation_date: string;
  summary?: string | null;
  document_url?: string | null;
  document_path?: string | null;
  document_name?: string | null;
  fileName?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

export function stableViolationRowFingerprint(
  row: ViolationHighlightFingerprintRow
): string {
  const docLabel =
    (row.document_name?.trim() || row.fileName?.trim() || "") ?? "";
  return JSON.stringify({
    id: row.id,
    title: row.title,
    summary: row.summary ?? "",
    violation_date: row.violation_date,
    document_url: row.document_url ?? "",
    document_path: row.document_path ?? "",
    document_label: docLabel,
    updated_at: row.updated_at ?? "",
    created_at: row.created_at ?? "",
  });
}

export function parseServerActivityTimeMs(
  row: ViolationHighlightFingerprintRow
): number | null {
  const raw = row.updated_at?.trim() || row.created_at?.trim();
  if (!raw) return null;
  try {
    const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
    let d = parseISO(normalized);
    if (Number.isNaN(d.getTime())) {
      d = new Date(raw);
    }
    if (Number.isNaN(d.getTime())) return null;
    return d.getTime();
  } catch {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }
}

export function effectiveViolationActivityTimeMs(
  row: ViolationHighlightFingerprintRow,
  clientActivityAt: Map<string, number>
): number | null {
  const server = parseServerActivityTimeMs(row);
  const client = clientActivityAt.get(String(row.id));
  const candidates = [server, client].filter(
    (x): x is number => x != null && !Number.isNaN(x)
  );
  if (candidates.length === 0) return null;
  return Math.max(...candidates);
}

export function violationRowHighlightVariant(
  activityMs: number | null,
  now: number
): "yellow" | "blue" | null {
  if (activityMs == null) return null;
  const age = now - activityMs;
  if (age < 0 || age >= ROW_HIGHLIGHT_TOTAL_MS) return null;
  if (age < ROW_HIGHLIGHT_YELLOW_MS) return "yellow";
  return "blue";
}
