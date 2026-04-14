/**
 * Stable alphabetical order for employee/user rows: last name, then first name, then email.
 *
 * **Paginated API responses:** Do not use this to “fix” table order page-by-page. Sorting only
 * the current page alphabetically while the server paginates in another order (e.g. by `id`)
 * makes later pages show names that alphabetically belong on earlier pages — looks like
 * duplicates or scrambled order. For paginated lists, pass `sort`/`direction` (or equivalent) on
 * the request so the backend applies one global order, then display rows as returned.
 *
 * **Full in-memory lists** (no paging, or one bulk fetch): safe to sort with this helper.
 */
export type UserLike = {
  fname?: string | null;
  lname?: string | null;
  email?: string | null;
};

export type UserWithId = UserLike & { id?: string | number | null };

/** Drop duplicate rows for the same `id` (keeps first occurrence). */
export function dedupeUsersById<T extends UserWithId>(users: T[]): T[] {
  if (!Array.isArray(users) || users.length <= 1) {
    return Array.isArray(users) ? users.slice() : [];
  }
  const seen = new Set<string>();
  const out: T[] = [];
  for (const u of users) {
    const id = u?.id != null && u.id !== "" ? String(u.id) : "";
    if (!id) {
      out.push(u);
      continue;
    }
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(u);
  }
  return out;
}

export function sortUsersAlphabeticallyByName<T extends UserLike>(users: T[]): T[] {
  if (!Array.isArray(users) || users.length <= 1) {
    return Array.isArray(users) ? users.slice() : [];
  }
  return [...users].sort((a, b) => {
    const aLast = String(a?.lname ?? "").trim().toLocaleLowerCase();
    const bLast = String(b?.lname ?? "").trim().toLocaleLowerCase();
    const last = aLast.localeCompare(bLast, undefined, { sensitivity: "base" });
    if (last !== 0) return last;
    const aFirst = String(a?.fname ?? "").trim().toLocaleLowerCase();
    const bFirst = String(b?.fname ?? "").trim().toLocaleLowerCase();
    const first = aFirst.localeCompare(bFirst, undefined, { sensitivity: "base" });
    if (first !== 0) return first;
    return String(a?.email ?? "").localeCompare(String(b?.email ?? ""), undefined, {
      sensitivity: "base",
    });
  });
}
