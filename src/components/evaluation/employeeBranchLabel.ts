import type { User } from "@/contexts/UserContext";

/** Matches apiService.getBranches(): { label, value } */
export type BranchOption = { label: string; value: string | number };

function findBranchLabel(
  id: unknown,
  branchOptions?: BranchOption[] | null
): string | null {
  if (branchOptions == null || branchOptions.length === 0) return null;
  const idStr = String(id).trim();
  const found = branchOptions.find((b) => String(b.value) === idStr);
  const label = found?.label?.trim();
  return label ? label : null;
}

/**
 * Human-readable branch for welcome / summary UIs.
 * Supports nested branches, branch_id-only payloads, and optional branch list
 * to turn numeric IDs into labels (e.g. "Makati / MK").
 */
export function getEmployeeBranchLabel(
  employee: User | null | undefined,
  branchOptions?: BranchOption[] | null
): string {
  if (!employee) return "N/A";

  const anyEmp = employee as Record<string, unknown>;

  if (employee.branches) {
    const b = Array.isArray(employee.branches)
      ? employee.branches[0]
      : (employee.branches as Record<string, unknown>);
    if (b && typeof b === "object") {
      const rec = b as Record<string, unknown>;
      const name = String(
        rec.branch_name || rec.name || ""
      ).trim();
      const code = String(
        rec.branch_code || rec.code || ""
      ).trim();

      if (name && code) return `${name} (${code})`;
      if (name) return name;
      if (code) return code;

      const nestedId = rec.id ?? rec.branch_id;
      if (nestedId !== undefined && nestedId !== null && String(nestedId).trim() !== "") {
        const fromList = findBranchLabel(nestedId, branchOptions);
        if (fromList) return fromList;
        return String(nestedId);
      }
    }
  }

  const branchId = anyEmp.branch_id ?? anyEmp.branchId;
  if (branchId !== undefined && branchId !== null && String(branchId).trim() !== "") {
    const fromList = findBranchLabel(branchId, branchOptions);
    if (fromList) return fromList;
    return String(branchId);
  }

  const branch = anyEmp.branch;
  if (branch !== undefined && branch !== null && String(branch).trim() !== "") {
    const s = String(branch).trim();
    if (/^\d+$/.test(s)) {
      const fromList = findBranchLabel(s, branchOptions);
      if (fromList) return fromList;
    }
    return s;
  }

  const branchName = anyEmp.branch_name;
  if (branchName !== undefined && branchName !== null && String(branchName).trim() !== "") {
    return String(branchName);
  }

  return "N/A";
}

/**
 * True when branch text depends on getBranches() (ID-only payload).
 * In that case we should not show raw IDs while the list is still loading.
 */
export function employeeBranchNeedsLookup(
  employee: User | null | undefined
): boolean {
  if (!employee) return false;

  const anyEmp = employee as Record<string, unknown>;

  if (anyEmp.branch_name != null && String(anyEmp.branch_name).trim() !== "") {
    return false;
  }

  if (employee.branches) {
    const b = Array.isArray(employee.branches)
      ? employee.branches[0]
      : (employee.branches as Record<string, unknown>);
    if (b && typeof b === "object") {
      const rec = b as Record<string, unknown>;
      const name = String(rec.branch_name || rec.name || "").trim();
      const code = String(rec.branch_code || rec.code || "").trim();
      if (name || code) return false;
      const nestedId = rec.id ?? rec.branch_id;
      if (nestedId != null && String(nestedId).trim() !== "") {
        return true;
      }
    }
  }

  const branchId = anyEmp.branch_id ?? anyEmp.branchId;
  if (branchId != null && String(branchId).trim() !== "") {
    return true;
  }

  const branch = anyEmp.branch;
  if (branch != null && String(branch).trim() !== "") {
    if (/^\d+$/.test(String(branch).trim())) {
      return true;
    }
  }

  return false;
}

/** Branch line for welcome modals: avoids flashing raw branch_id before options load */
export function getEmployeeBranchWelcomeDisplay(
  employee: User | null | undefined,
  branchOptions: BranchOption[] | undefined | null,
  branchListLoading: boolean
): string {
  if (!employee) return "N/A";
  if (branchListLoading && employeeBranchNeedsLookup(employee)) {
    return "Loading\u2026";
  }
  return getEmployeeBranchLabel(employee, branchOptions);
}
