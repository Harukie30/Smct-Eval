import { User as UserType } from "@/contexts/UserContext";

export type SupervisorDisplay = {
  name: string;
  email?: string;
  position?: string;
};

function extractSupervisorFromUnknown(raw: unknown): SupervisorDisplay | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "string") {
    const t = raw.trim();
    return t ? { name: t } : null;
  }
  if (typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const fullName =
    String(o.full_name ?? "").trim() ||
    [o.fname, o.lname].filter(Boolean).map(String).join(" ").trim() ||
    String(o.name ?? "").trim();
  if (!fullName) return null;
  const pos =
    String(
      (o.positions as { label?: string } | undefined)?.label ??
        (o.positions as { name?: string } | undefined)?.name ??
        o.position ??
        ""
    ).trim() || undefined;
  const email = String(o.email ?? "").trim() || undefined;
  return { name: fullName, email, position: pos };
}

function pickSupervisorCandidate(raw: unknown): SupervisorDisplay | null {
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const info = extractSupervisorFromUnknown(item);
      if (info) return info;
    }
    return null;
  }
  return extractSupervisorFromUnknown(raw);
}

function getRecordRoot(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const root = raw as Record<string, unknown>;
  if (root.data && typeof root.data === "object" && !Array.isArray(root.data)) {
    return root.data as Record<string, unknown>;
  }
  return root;
}

function coerceUnknownArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getApproverSequence(record: Record<string, unknown>): number | null {
  const pivot =
    record.pivot && typeof record.pivot === "object"
      ? (record.pivot as Record<string, unknown>)
      : null;
  const seq = pivot?.sequence ?? record.sequence;
  if (seq == null || seq === "") return null;
  const n = Number(seq);
  return Number.isFinite(n) ? n : null;
}

function getApproverBySequenceFromArray(
  raw: unknown,
  sequence: 1 | 2
): SupervisorDisplay | null {
  const root = getRecordRoot(raw);
  if (!root) return null;

  const arrays = [
    root.assigned_approver,
    root.assigned_approvers,
    root.assigned_as_approvers,
    root.assignedApprover,
    root.assignedApprovers,
    root.assignedAsApprovers,
    root.assigned_evaluator,
    root.assigned_evaluators,
    root.assignedEvaluator,
    root.assignedEvaluators,
    root.approvers,
  ];

  for (const arr of arrays) {
    for (const item of coerceUnknownArray(arr)) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      const nestedInfo = getApproverBySequenceFromArray(record, sequence);
      if (nestedInfo) return nestedInfo;

      if (getApproverSequence(record) !== sequence) continue;
      const info = extractSupervisorFromUnknown(record);
      if (info) return info;
    }
  }
  return null;
}

function getApproverFromFlatField(
  raw: unknown,
  sequence: 1 | 2
): SupervisorDisplay | null {
  const root = getRecordRoot(raw);
  if (!root) return null;

  const keys =
    sequence === 1
      ? ["approver_1", "approver1", "approver_1_user"]
      : ["approver_2", "approver2", "approver_2_user"];

  for (const k of keys) {
    const info = extractSupervisorFromUnknown(root[k]);
    if (info) return info;
  }
  return null;
}

function pickAssignedEvaluator(raw: unknown): SupervisorDisplay | null {
  const root = getRecordRoot(raw);
  if (!root) return null;

  const keys = [
    "assigned_evaluator",
    "assigned_evaluators",
    "assignedEvaluator",
    "assignedEvaluators",
    "evaluator",
  ];

  for (const k of keys) {
    const info = pickSupervisorCandidate(root[k]);
    if (info) return info;
  }
  return null;
}

/** Approver sequence 2 -> sequence 1 -> assigned evaluator. */
export function pickSupervisorWithApproverPriority(
  raw: unknown
): SupervisorDisplay | null {
  const root = getRecordRoot(raw);
  if (!root) return null;

  const sources: Record<string, unknown>[] = [root];
  for (const k of [
    "assigned_evaluator",
    "assigned_evaluators",
    "assignedEvaluator",
    "assignedEvaluators",
    "evaluator",
  ]) {
    const nested = root[k];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      sources.push(nested as Record<string, unknown>);
    }
  }

  for (const source of sources) {
    const seq2 =
      getApproverBySequenceFromArray(source, 2) ??
      getApproverFromFlatField(source, 2);
    if (seq2) return seq2;
  }

  for (const source of sources) {
    const seq1 =
      getApproverBySequenceFromArray(source, 1) ??
      getApproverFromFlatField(source, 1);
    if (seq1) return seq1;
  }

  return pickAssignedEvaluator(root);
}

export function pickSupervisorFromEmployee(
  emp: UserType | null
): SupervisorDisplay | null {
  if (!emp) return null;
  return pickSupervisorWithApproverPriority(emp);
}

export function getEvaluatorDisplayName(evaluator: unknown): string {
  return extractSupervisorFromUnknown(evaluator)?.name ?? "";
}
