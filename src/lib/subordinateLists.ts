/**
 * Normalizes `/getSubordinate` payloads from Laravel (alternate keys, nesting, paginators)
 * so HR branch/department modals match list card counts when possible.
 */

function getUserId(user: unknown): string | null {
  if (!user || typeof user !== "object") return null;
  const id = (user as { id?: unknown }).id;
  if (id === undefined || id === null || String(id).trim() === "") return null;
  return String(id);
}

function mergeUniqueById(primary: unknown[], extra: unknown[]): unknown[] {
  const seen = new Set<string>();
  const out: unknown[] = [];
  for (const u of primary) {
    const id = getUserId(u);
    if (id) seen.add(id);
    out.push(u);
  }
  for (const u of extra) {
    const id = getUserId(u);
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(u);
  }
  return out;
}

/** Array, paginator `{ data: [] }`, or a single user object. */
function coerceUserList(value: unknown): unknown[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data;
    if (
      "id" in o &&
      ("email" in o || "fname" in o || "lname" in o || "roles" in o)
    ) {
      return [value];
    }
  }
  return [];
}

function roleNamesLower(user: unknown): string[] {
  if (!user || typeof user !== "object") return [];
  const roles = (user as { roles?: unknown }).roles;
  if (!Array.isArray(roles)) return [];
  return roles
    .map((r) =>
      typeof r === "object" && r !== null && "name" in r
        ? String((r as { name?: unknown }).name ?? "").toLowerCase().trim()
        : ""
    )
    .filter(Boolean);
}

export function userIsAdmin(user: unknown): boolean {
  return roleNamesLower(user).some(
    (n) => n === "admin" || n === "super admin" || n === "superadmin"
  );
}

/** Evaluator-style roles (department “Evaluators” column). */
export function userIsLikelyEvaluator(user: unknown): boolean {
  return roleNamesLower(user).some(
    (n) => n === "evaluator" || n.includes("evaluator")
  );
}

export function splitUsersByEvaluatorRole(users: unknown[]): {
  employees: unknown[];
  evaluators: unknown[];
} {
  const employees: unknown[] = [];
  const evaluators: unknown[] = [];
  for (const u of users) {
    if (userIsAdmin(u)) continue;
    if (userIsLikelyEvaluator(u)) evaluators.push(u);
    else employees.push(u);
  }
  return { employees, evaluators };
}

function collectFromKeys(
  container: Record<string, unknown>,
  keys: string[]
): unknown[] {
  const out: unknown[] = [];
  for (const k of keys) {
    out.push(...coerceUserList(container[k]));
  }
  return mergeUniqueById([], out);
}

function tryCombinedUserArray(root: Record<string, unknown>): unknown[] {
  const candidates = [
    coerceUserList(root.data),
    coerceUserList(root.users),
    coerceUserList(root.items),
    coerceUserList(root.records),
  ];
  const nested = root.data;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const d = nested as Record<string, unknown>;
    candidates.push(
      coerceUserList(d.data),
      coerceUserList(d.users),
      coerceUserList(d.items)
    );
  }
  let best: unknown[] = [];
  for (const c of candidates) {
    if (c.length > best.length) best = c;
  }
  return best;
}

export function parseSubordinateEmployeesAndEvaluators(raw: unknown): {
  employees: unknown[];
  evaluators: unknown[];
} {
  if (raw == null || typeof raw !== "object") {
    return { employees: [], evaluators: [] };
  }

  const root = raw as Record<string, unknown>;

  const nested =
    root.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : null;

  const employeeKeys = ["employees", "employee", "staff", "employee_list"];
  const evaluatorKeys = ["evaluators", "evaluator", "managers", "manager"];

  let employees = collectFromKeys(root, employeeKeys);
  let evaluators = collectFromKeys(root, evaluatorKeys);

  if (nested) {
    employees = mergeUniqueById(
      employees,
      collectFromKeys(nested, employeeKeys)
    );
    evaluators = mergeUniqueById(
      evaluators,
      collectFromKeys(nested, evaluatorKeys)
    );
  }

  const combined = tryCombinedUserArray(root);
  if (
    combined.length &&
    (employees.length === 0 || evaluators.length === 0)
  ) {
    const split = splitUsersByEvaluatorRole(combined);
    employees = mergeUniqueById(employees, split.employees);
    evaluators = mergeUniqueById(evaluators, split.evaluators);
  }

  return { employees, evaluators };
}
