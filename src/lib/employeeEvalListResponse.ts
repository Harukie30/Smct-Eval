export type EmployeeEvalListPage = {
  data: unknown[];
  total: number;
  last_page: number;
  per_page: number;
  years?: unknown[];
};

function readPaginatedBlock(
  value: unknown
): { data: unknown[]; total: number; last_page: number; per_page: number } | null {
  if (Array.isArray(value)) {
    return {
      data: value,
      total: value.length,
      last_page: 1,
      per_page: value.length || 10,
    };
  }
  if (!value || typeof value !== "object") {
    return null;
  }

  const block = value as Record<string, unknown>;
  const data = Array.isArray(block.data)
    ? block.data
    : Array.isArray(block.items)
      ? block.items
      : [];

  return {
    data,
    total: Number(block.total ?? data.length) || 0,
    last_page: Number(block.last_page ?? block.lastPage ?? 1) || 1,
    per_page: Number(block.per_page ?? block.perPage ?? 10) || 10,
  };
}

/**
 * Normalizes GET /getMyEvalAuthEmployee payloads into the shape the UI expects.
 */
export function normalizeMyEvalAsEmployeeResponse(
  payload: unknown
): EmployeeEvalListPage & { myEval_as_Employee: EmployeeEvalListPage } {
  const empty: EmployeeEvalListPage = {
    data: [],
    total: 0,
    last_page: 1,
    per_page: 10,
    years: [],
  };

  if (!payload || typeof payload !== "object") {
    return { ...empty, myEval_as_Employee: empty };
  }

  const root = payload as Record<string, unknown>;
  const years = Array.isArray(root.years) ? root.years : [];

  const candidates = [
    root.myEval_as_Employee,
    root.my_eval_as_employee,
    root.my_eval_as_Employee,
    root.evaluations,
    root.data,
    root,
  ];

  for (const candidate of candidates) {
    const parsed = readPaginatedBlock(candidate);
    if (!parsed) continue;

    const page: EmployeeEvalListPage = {
      ...parsed,
      years,
    };

    return {
      ...page,
      myEval_as_Employee: page,
    };
  }

  const fallback = { ...empty, years };
  return { ...fallback, myEval_as_Employee: fallback };
}
