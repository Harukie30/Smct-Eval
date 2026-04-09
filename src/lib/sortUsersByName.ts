/**
 * Stable alphabetical order for employee/user rows: last name, then first name, then email.
 * Use after each API fetch so refresh does not reshuffle rows unpredictably.
 */
export type UserLike = {
  fname?: string | null;
  lname?: string | null;
  email?: string | null;
};

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
