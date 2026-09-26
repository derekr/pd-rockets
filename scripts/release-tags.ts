/** Release tags use UTC calendar dates; -2, -3, ... distinguish later releases on the same day. */
export function isReleaseTag(tag: string): boolean {
  const match = /^v(\d{4})-(\d{2})-(\d{2})(?:-([2-9]\d*))?$/.exec(tag);
  if (!match) return false;
  const [, year, month, day] = match;
  const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === `${year}-${month}-${day}`;
}

export function nextReleaseTag(date: Date, existing: Iterable<string>): string {
  const base = `v${date.toISOString().slice(0, 10)}`;
  const used = new Set(existing);
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
}
