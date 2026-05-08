/**
 * Normalizes `/getSubordinate` payloads from Laravel (alternate keys, nesting, paginators)
 * so HR branch/department modals match list card counts when possible.
 */

function getUserId(user: unknown): string | null {
  if (!user || typeof user !== "object") return null;
  const o = user as Record<string, unknown>;
  const id = o.id ?? o.user_id ?? o.userId;
  if (id === undefined || id === null || String(id).trim() === "") return null;
  return String(id);
}

/**
 * Rows without `id` were previously dropped entirely when merging (e.g. only `user_id`
 * present), which hid most branch/department employees in modals.
 */
function getDedupeKey(user: unknown): string {
  const idPart = getUserId(user);
  if (idPart) return `id:${idPart}`;
  if (!user || typeof user !== "object") return `opaque:${Object.prototype.toString.call(user)}`;

  const o = user as Record<string, unknown>;
  const email = String(o.email ?? "").trim().toLowerCase();
  if (email) return `email:${email}`;
  const fn = String(o.fname ?? "").trim().toLowerCase();
  const ln = String(o.lname ?? "").trim().toLowerCase();
  const empId = String(
    o.employee_id ?? o.employeeId ?? o.registration_id ?? ""
  ).trim();
  return `name:${fn}|${ln}|${empId}`;
}

function mergeUniqueUsers(primary: unknown[], extra: unknown[]): unknown[] {
  const seen = new Set<string>();
  const out: unknown[] = [];

  const append = (u: unknown) => {
    const key = getDedupeKey(u);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(u);
  };

  for (const u of primary) append(u);
  for (const u of extra) append(u);
  return out;
}

/** Array, paginator `{ data: [] }`, or a single user object. */
function coerceUserList(value: unknown): unknown[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data;
    const hasPk =
      "id" in o || "user_id" in o || "userId" in o || "registration_id" in o;
    if (
      hasPk &&
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

function positionLabelLower(user: unknown): string {
  if (!user || typeof user !== "object") return "";
  const u = user as Record<string, unknown>;
  const pos = u.positions;
  if (typeof pos === "string") return pos.toLowerCase().trim();
  if (pos && typeof pos === "object") {
    const p = pos as Record<string, unknown>;
    return String(p.label ?? p.name ?? "").toLowerCase().trim();
  }
  return String(u.position ?? "").toLowerCase().trim();
}

export function userIsAdmin(user: unknown): boolean {
  return roleNamesLower(user).some(
    (n) => n === "admin" || n === "super admin" || n === "superadmin"
  );
}

/** Role name suggests evaluator account (Spatie / Laravel). */
export function userIsLikelyEvaluator(user: unknown): boolean {
  return roleNamesLower(user).some(
    (n) => n === "evaluator" || n.includes("evaluator")
  );
}

/**
 * Branch/department “Managers · Evaluators” column when we only have a flat user list
 * (same bucket the green card / modal use for `managers_count` + evaluators).
 */
function userBelongsManagersOrEvaluatorsModal(user: unknown): boolean {
  if (userIsAdmin(user)) return false;
  if (userIsLikelyEvaluator(user)) return true;

  const roles = roleNamesLower(user);
  for (const n of roles) {
    if (n === "branch head" || n.includes("branch head")) return true;
    if (n.includes("area manager")) return true;
    if (n.includes("branch") && n.includes("supervisor")) return true;
    if (n.includes("branch") && n.includes("manager")) return true;
  }

  const pl = positionLabelLower(user);
  if (!pl) return false;
  return (
    pl.includes("area manager") ||
    pl.includes("branch manager") ||
    pl.includes("branch supervisor") ||
    pl.includes("branch head")
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
    if (userBelongsManagersOrEvaluatorsModal(u)) evaluators.push(u);
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
  return mergeUniqueUsers([], out);
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

  const employeeKeys = [
    "employees",
    "employee",
    "staff",
    "employee_list",
    "branch_employees",
    "branchEmployees",
  ];
  const evaluatorKeys = [
    "evaluators",
    "evaluator",
    "managers",
    "manager",
    "branch_managers",
    "branchManagers",
    "branch_heads",
    "branchHeads",
    "supervisors",
  ];

  let employees = collectFromKeys(root, employeeKeys);
  let evaluators = collectFromKeys(root, evaluatorKeys);

  if (nested) {
    employees = mergeUniqueUsers(
      employees,
      collectFromKeys(nested, employeeKeys)
    );
    evaluators = mergeUniqueUsers(
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
    employees = mergeUniqueUsers(employees, split.employees);
    evaluators = mergeUniqueUsers(evaluators, split.evaluators);
  }

  return { employees, evaluators };
}
